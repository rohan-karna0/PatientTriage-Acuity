type AuditPayload = Record<string, unknown>;

const REASON_LABELS: Record<string, string> = {
  CLINICAL_JUDGMENT: "Clinical judgment",
  ADDITIONAL_HISTORY: "Additional history",
  VITALS_RECHECK: "Vitals recheck",
  RESOURCE_CONSTRAINT: "Resource constraint",
  PATIENT_DETERIORATION: "Patient deterioration",
  OTHER: "Other",
};

function patientLabel(payload: AuditPayload): string {
  const name = payload.patientDisplayName ?? payload.displayName;
  const token = payload.patientExternalId ?? payload.patientToken;
  if (name && token) return `${name} (${formatShortToken(String(token))})`;
  if (name) return String(name);
  if (token) return formatShortToken(String(token));
  return "Patient";
}

function formatShortToken(externalId: string): string {
  const num = externalId.replace(/\D/g, "") || "000";
  return `A-${num.padStart(3, "0").slice(-3)}`;
}

export function formatAuditSummary(action: string, payload: AuditPayload): string {
  switch (action) {
    case "OVERRIDE": {
      const prevColor = payload.previousAcuityColor ?? payload.previousBucket;
      const newColor = payload.newAcuityColor ?? payload.newBucket;
      const colorPart =
        prevColor && newColor ? ` · ${prevColor} → ${newColor}` : "";
      return `${patientLabel(payload)}: ESI ${payload.previousEsi} → ${payload.newEsi}${colorPart} (${REASON_LABELS[String(payload.reasonCode)] ?? payload.reasonCode})`;
    }
    case "INTAKE_CREATED":
      return `${patientLabel(payload)} · ${payload.ageYears}y · ${payload.chiefComplaint} → ESI ${payload.esi}`;
    case "SCORE_ISSUED":
      return `${patientLabel(payload)} scored ESI ${payload.esi} (${payload.bucket}) · ${Math.round(Number(payload.confidence ?? 0) * 100)}% confidence`;
    case "REASSESS_TRIGGERED":
      return `${patientLabel(payload)} — ${payload.message ?? "Reassessment required"}`;
    case "WATCH_TICK":
      return `Simulation +${payload.tickMinutes}m · ${payload.alertCount ?? 0} alert(s)${payload.surgeMode ? " · surge on" : ""}`;
    case "SURGE_MODE_CHANGED":
      return payload.surgeMode ? "Surge mode enabled (~3× load)" : "Surge mode ended — baseline SLAs restored";
    case "VITALS_UPDATED":
      return payload.worsening
        ? `${patientLabel(payload)} vitals worsening — reassess recommended`
        : `${patientLabel(payload)} vitals updated`;
    default:
      return action.replace(/_/g, " ").toLowerCase();
  }
}

export function formatAuditDetails(action: string, payload: AuditPayload): string[] {
  const lines: string[] = [];
  const push = (label: string, value: unknown) => {
    if (value != null && value !== "") lines.push(`${label}: ${value}`);
  };

  switch (action) {
    case "OVERRIDE":
      push("Patient", patientLabel(payload));
      push("Chief complaint", payload.chiefComplaint);
      push("Previous ESI", payload.previousEsi);
      push("Previous acuity", payload.previousAcuityColor);
      push("New ESI", payload.newEsi);
      push("New acuity", payload.newAcuityColor);
      push("Reason", REASON_LABELS[String(payload.reasonCode)] ?? payload.reasonCode);
      push("Clinical note", payload.note);
      push("Clinician", payload.clinicianId);
      push("Role", payload.clinicianRole);
      break;
    case "INTAKE_CREATED":
      push("Patient name", payload.displayName);
      push("Token", formatShortToken(String(payload.patientExternalId ?? "")));
      push("Age", `${payload.ageYears} years`);
      push("Complaint", payload.chiefComplaint);
      push("ESI assigned", payload.esi);
      push("Acuity bucket", payload.bucket);
      push("Language barrier", payload.languageBarrier ? "Yes" : "No");
      break;
    case "SCORE_ISSUED":
      push("Patient", patientLabel(payload));
      push("ESI", payload.esi);
      push("Bucket", payload.bucket);
      push("Confidence", `${Math.round(Number(payload.confidence ?? 0) * 100)}%`);
      push("Escalation bias", payload.escalationBiasApplied ? "Applied" : "No");
      push("Surge mode", payload.surgeMode ? "Yes" : "No");
      break;
    case "REASSESS_TRIGGERED":
      push("Patient", patientLabel(payload));
      push("Reason", payload.reason);
      push("Message", payload.message);
      push("Severity", payload.severity);
      break;
    case "WATCH_TICK":
      push("Minutes advanced", payload.tickMinutes);
      push("Alerts generated", payload.alertCount);
      push("Surge mode", payload.surgeMode ? "On" : "Off");
      break;
    case "SURGE_MODE_CHANGED":
      push("Surge mode", payload.surgeMode ? "Enabled" : "Disabled");
      push("Multiplier", payload.multiplier);
      break;
    case "VITALS_UPDATED":
      push("Patient", patientLabel(payload));
      push("Worsening detected", payload.worsening ? "Yes" : "No");
      break;
    default:
      for (const [key, value] of Object.entries(payload)) {
        if (typeof value === "object" && value !== null) continue;
        push(key, value);
      }
  }

  return lines;
}
