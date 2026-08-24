import {
  ageStratumFromYears,
  escalateEsi,
  ESI_TO_BUCKET,
  type AcuityBucket,
  type CareRoute,
  type EsiLevel,
  type TriageExplanationFactor,
  type TriageInput,
  type TriageResult,
  type UncertaintyDriver,
} from "@acuity/shared";
import {
  AMBIGUOUS_KEYWORDS,
  CRITICAL_KEYWORDS,
  HIGH_KEYWORDS,
  SURGE_WATCH_FACTOR,
  VITAL_THRESHOLDS,
  WATCH_MINUTES_BY_ESI,
  countPresentVitals,
} from "./thresholds";

export interface ScoreOptions {
  /** When true, ambiguous / uncertain cases escalate one more step. */
  surgeMode?: boolean;
}

function containsAny(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

function routeForEsi(esi: EsiLevel): CareRoute {
  if (esi === 1) return "resus";
  if (esi === 2) return "acute";
  if (esi === 3) return "acute";
  if (esi === 4) return "fast_track";
  return "waiting";
}

function watchMinutes(esi: EsiLevel, surgeMode: boolean): number {
  const base = WATCH_MINUTES_BY_ESI[esi];
  if (esi === 1) return 0;
  return surgeMode ? Math.max(5, Math.round(base * SURGE_WATCH_FACTOR)) : base;
}

/**
 * Hybrid age-stratified acuity scorer.
 * Safety contract:
 * - Missing data never assumed normal → raises uncertainty and may escalate.
 * - Never auto-downgrades below rule floor for red-flag findings.
 * - Under uncertainty, bias toward escalation (asymmetric cost of under-triage).
 */
export function scoreTriage(input: TriageInput, options: ScoreOptions = {}): TriageResult {
  const surgeMode = options.surgeMode ?? false;
  const stratum = ageStratumFromYears(input.ageYears);
  const thresholds = VITAL_THRESHOLDS[stratum];
  const factors: TriageExplanationFactor[] = [];
  const drivers: UncertaintyDriver[] = [];
  let esi: EsiLevel = 4;
  let escalationBiasApplied = false;
  let confidence = 0.88;

  const complaint = `${input.chiefComplaint} ${(input.observedCues ?? []).join(" ")}`.trim();
  const criticalHit = containsAny(complaint, CRITICAL_KEYWORDS);
  const highHit = containsAny(complaint, HIGH_KEYWORDS);
  const ambiguousHit = containsAny(complaint, AMBIGUOUS_KEYWORDS);

  if (criticalHit) {
    esi = 1;
    factors.push({
      code: "CRITICAL_KEYWORD",
      label: "Critical presentation keyword",
      contribution: "critical",
      detail: `Matched “${criticalHit}” — immediate life-saving intervention likely needed.`,
    });
  } else if (highHit) {
    esi = 2;
    factors.push({
      code: "HIGH_KEYWORD",
      label: "High-risk complaint",
      contribution: "high",
      detail: `Matched “${highHit}”.`,
    });
  } else if (ambiguousHit) {
    esi = 3;
    factors.push({
      code: "AMBIGUOUS_PRESENTATION",
      label: "Ambiguous presentation",
      contribution: "moderate",
      detail: `Non-specific complaint (“${ambiguousHit}”) — differential includes serious pathology.`,
    });
    drivers.push({
      code: "AMBIGUOUS_SYMPTOMS",
      message: "Symptoms do not map cleanly to a single acuity band",
      impact: "both",
    });
    confidence -= 0.18;
  }

  const vitals = input.vitals ?? {};
  const { present, total } = countPresentVitals(vitals);
  const completeness = present / total;

  if (completeness < 0.4) {
    drivers.push({
      code: "SPARSE_VITALS",
      message: `Only ${present}/${total} vitals available at intake`,
      impact: "both",
    });
    confidence -= 0.2;
    if (esi > 2) {
      esi = escalateEsi(esi);
      escalationBiasApplied = true;
      factors.push({
        code: "MISSING_VITALS_ESCALATION",
        label: "Escalated due to missing vitals",
        contribution: "high",
        detail: "Fail-safe: incomplete vitals never treated as normal.",
      });
    }
  } else if (completeness < 0.7) {
    drivers.push({
      code: "PARTIAL_VITALS",
      message: "Partial vital sign set",
      impact: "widen_confidence",
    });
    confidence -= 0.08;
  }

  if (!input.hasPriorRecord || !input.priorHistory) {
    drivers.push({
      code: "ZERO_OR_THIN_HISTORY",
      message: input.hasPriorRecord
        ? "Prior record flag set but history payload empty"
        : "First-time / zero-history patient",
      impact: "widen_confidence",
    });
    confidence -= 0.1;
    factors.push({
      code: "NO_EHR_HISTORY",
      label: "Limited prior history",
      contribution: "moderate",
      detail: "Scoring relies on observed intake only.",
    });
  } else {
    const risky = input.priorHistory.conditions.some((c) =>
      /cad|copd|ckd|diabetes|cancer|heart failure|immunosuppress/i.test(c),
    );
    if (risky && esi > 2) {
      factors.push({
        code: "HIGH_RISK_HISTORY",
        label: "High-risk prior conditions",
        contribution: "high",
        detail: input.priorHistory.conditions.join(", "),
      });
      esi = escalateEsi(esi);
      escalationBiasApplied = true;
    }
  }

  // Age-stratified vital evaluation
  if (vitals.spo2 != null) {
    if (vitals.spo2 < thresholds.spo2Critical) {
      esi = 1;
      factors.push({
        code: "SPO2_CRITICAL",
        label: `SpO₂ critical for ${stratum}`,
        contribution: "critical",
        detail: `SpO₂ ${vitals.spo2}% (critical < ${thresholds.spo2Critical}% for ${stratum}).`,
      });
    } else if (vitals.spo2 < thresholds.spo2Low) {
      esi = Math.min(esi, 2) as EsiLevel;
      factors.push({
        code: "SPO2_LOW",
        label: `SpO₂ low for ${stratum}`,
        contribution: "high",
        detail: `SpO₂ ${vitals.spo2}% (low < ${thresholds.spo2Low}% for ${stratum}).`,
      });
    }
  }

  if (vitals.systolicBp != null) {
    if (vitals.systolicBp < thresholds.sbpCritical) {
      esi = 1;
      factors.push({
        code: "SBP_CRITICAL",
        label: `Hypotension critical for ${stratum}`,
        contribution: "critical",
        detail: `SBP ${vitals.systolicBp} (critical < ${thresholds.sbpCritical}).`,
      });
    } else if (vitals.systolicBp < thresholds.sbpLow) {
      esi = Math.min(esi, 2) as EsiLevel;
      factors.push({
        code: "SBP_LOW",
        label: `Hypotension for ${stratum}`,
        contribution: "high",
        detail: `SBP ${vitals.systolicBp} (low < ${thresholds.sbpLow}).`,
      });
    }
  }

  if (vitals.heartRate != null) {
    if (vitals.heartRate >= thresholds.hrHigh || vitals.heartRate <= thresholds.hrLow) {
      esi = Math.min(esi, 2) as EsiLevel;
      factors.push({
        code: "HR_ABNORMAL",
        label: `Heart rate abnormal for ${stratum}`,
        contribution: "high",
        detail: `HR ${vitals.heartRate} (range ${thresholds.hrLow}–${thresholds.hrHigh}).`,
      });
    }
  }

  if (vitals.respiratoryRate != null) {
    if (vitals.respiratoryRate >= thresholds.rrHigh || vitals.respiratoryRate <= thresholds.rrLow) {
      esi = Math.min(esi, 2) as EsiLevel;
      factors.push({
        code: "RR_ABNORMAL",
        label: `Respiratory rate abnormal for ${stratum}`,
        contribution: "high",
        detail: `RR ${vitals.respiratoryRate} (range ${thresholds.rrLow}–${thresholds.rrHigh}).`,
      });
    }
  }

  if (vitals.temperatureC != null) {
    if (vitals.temperatureC >= thresholds.tempHighFever) {
      const target = stratum === "pediatric" ? 2 : 3;
      esi = Math.min(esi, target) as EsiLevel;
      factors.push({
        code: "HIGH_FEVER",
        label: `High fever — ${stratum} threshold`,
        contribution: stratum === "pediatric" ? "high" : "moderate",
        detail: `${vitals.temperatureC}°C (high fever ≥ ${thresholds.tempHighFever}°C for ${stratum}).`,
      });
    } else if (vitals.temperatureC >= thresholds.tempFever) {
      if (stratum === "pediatric" || stratum === "geriatric") {
        esi = Math.min(esi, 3) as EsiLevel;
        factors.push({
          code: "FEVER_AGE_SENSITIVE",
          label: `Fever clinically meaningful for ${stratum}`,
          contribution: "moderate",
          detail: `${vitals.temperatureC}°C (≥ ${thresholds.tempFever}°C). Adult-calibrated models would under-weight this.`,
        });
      }
    }
  }

  if (vitals.gcs != null && vitals.gcs < 13) {
    esi = vitals.gcs <= 8 ? 1 : (Math.min(esi, 2) as EsiLevel);
    factors.push({
      code: "GCS_LOW",
      label: "Reduced consciousness",
      contribution: vitals.gcs <= 8 ? "critical" : "high",
      detail: `GCS ${vitals.gcs}.`,
    });
  }

  if (vitals.painScore != null && vitals.painScore >= 8) {
    esi = Math.min(esi, 3) as EsiLevel;
    factors.push({
      code: "SEVERE_PAIN",
      label: "Severe reported pain",
      contribution: "moderate",
      detail: `Pain ${vitals.painScore}/10.`,
    });
  }

  if (input.underReportingSuspected) {
    drivers.push({
      code: "UNDER_REPORTING",
      message: "Clinician flagged possible under-reporting of symptoms/pain",
      impact: "raise_acuity",
    });
    confidence -= 0.12;
    if (esi > 2) {
      esi = escalateEsi(esi);
      escalationBiasApplied = true;
      factors.push({
        code: "UNDER_REPORT_BIAS",
        label: "Escalated for suspected under-reporting",
        contribution: "high",
        detail: "Safety bias: treat reported severity as a lower bound.",
      });
    }
  }

  if (input.languageBarrier) {
    drivers.push({
      code: "LANGUAGE_BARRIER",
      message: "Language barrier may reduce history fidelity",
      impact: "widen_confidence",
    });
    confidence -= 0.08;
  }

  if (input.arrivalMode === "ambulance" && esi > 2) {
    factors.push({
      code: "AMBULANCE_ARRIVAL",
      label: "Ambulance arrival",
      contribution: "moderate",
      detail: "Prehospital transport increases pre-test probability of serious illness.",
    });
    esi = escalateEsi(esi);
    escalationBiasApplied = true;
  }

  // Ambiguous + surge → escalate further (asymmetric under-triage cost)
  if ((ambiguousHit || confidence < 0.65) && surgeMode && esi > 1) {
    esi = escalateEsi(esi);
    escalationBiasApplied = true;
    factors.push({
      code: "SURGE_UNCERTAINTY_ESCALATION",
      label: "Surge + uncertainty escalation",
      contribution: "high",
      detail: "During surge, uncertain presentations are prioritized upward, not averaged down.",
    });
  }

  // Geriatric atypical presentations: silent / vague complaints get extra caution
  if (stratum === "geriatric" && ambiguousHit && esi > 2) {
    esi = escalateEsi(esi);
    escalationBiasApplied = true;
    factors.push({
      code: "GERIATRIC_ATYPICAL",
      label: "Geriatric atypical risk",
      contribution: "high",
      detail: "Older adults may present without classic red-flag symptoms.",
    });
  }

  // Pediatric fever of 38.5 is more urgent than adult — already handled; document stratum
  factors.push({
    code: "AGE_STRATUM",
    label: `Scored under ${stratum} vital model`,
    contribution: "protective",
    detail: `Age ${input.ageYears} → ${stratum} thresholds (not adult-calibrated).`,
  });

  // Final confidence clamp; every result MUST expose confidence
  confidence = Math.max(0.35, Math.min(0.95, confidence));
  if (drivers.some((d) => d.impact !== "widen_confidence") && !escalationBiasApplied && confidence < 0.7 && esi > 1) {
    esi = escalateEsi(esi);
    escalationBiasApplied = true;
    factors.push({
      code: "LOW_CONFIDENCE_FAILSAFE",
      label: "Low-confidence fail-safe escalation",
      contribution: "high",
      detail: "Under-triage cost > over-triage cost — escalate when confidence is low.",
    });
  }

  const bucket: AcuityBucket = ESI_TO_BUCKET[esi];
  const summary = buildSummary(esi, bucket, stratum, escalationBiasApplied, confidence);

  return {
    esi,
    bucket,
    confidence: Number(confidence.toFixed(2)),
    escalationBiasApplied,
    uncertaintyDrivers: drivers,
    factors,
    ageStratum: stratum,
    recommendedRoute: routeForEsi(esi),
    watchReassessMinutes: watchMinutes(esi, surgeMode),
    summary,
  };
}

function buildSummary(
  esi: EsiLevel,
  bucket: AcuityBucket,
  stratum: string,
  bias: boolean,
  confidence: number,
): string {
  const biasNote = bias ? " Escalation bias applied under uncertainty." : "";
  return `ESI ${esi} (${bucket}) for ${stratum} patient — confidence ${(confidence * 100).toFixed(0)}%.${biasNote} Nurse retains final authority; system never auto-downgrades.`;
}

export function isWorseningVitals(
  previous: TriageInput["vitals"],
  next: TriageInput["vitals"],
  ageYears: number,
): boolean {
  if (!previous || !next) return false;
  const stratum = ageStratumFromYears(ageYears);
  const t = VITAL_THRESHOLDS[stratum];
  if (next.spo2 != null && previous.spo2 != null && next.spo2 < previous.spo2 - 2) return true;
  if (next.spo2 != null && next.spo2 < t.spo2Low) return true;
  if (next.heartRate != null && previous.heartRate != null && next.heartRate > previous.heartRate + 20)
    return true;
  if (next.systolicBp != null && previous.systolicBp != null && next.systolicBp < previous.systolicBp - 15)
    return true;
  if (next.gcs != null && previous.gcs != null && next.gcs < previous.gcs) return true;
  return false;
}
