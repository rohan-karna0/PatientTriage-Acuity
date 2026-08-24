/** ESI 1 (most urgent) → 5 (least urgent) */
export type EsiLevel = 1 | 2 | 3 | 4 | 5;

/** Nurse-facing acuity buckets mapped from ESI */
export type AcuityBucket = "RED" | "ORANGE" | "YELLOW" | "GREEN" | "BLUE";

export type AgeStratum = "pediatric" | "adult" | "geriatric";

export type CareRoute = "resus" | "acute" | "fast_track" | "waiting";

export type ClinicianRole = "TRIAGE_NURSE" | "CHARGE_NURSE" | "AUDITOR";

export type DataClassification = "TRIAGE_OPERATIONAL" | "CLINICAL_DECISION" | "AUDIT";

export type ConsentPurpose = "TRIAGE_DECISION_SUPPORT";

export type OverrideReasonCode =
  | "CLINICAL_JUDGMENT"
  | "ADDITIONAL_HISTORY"
  | "VITALS_RECHECK"
  | "RESOURCE_CONSTRAINT"
  | "PATIENT_DETERIORATION"
  | "OTHER";

export type AuditAction =
  | "SCORE_ISSUED"
  | "OVERRIDE"
  | "REASSESS_TRIGGERED"
  | "SURGE_MODE_CHANGED"
  | "PATIENT_VIEWED"
  | "INTAKE_CREATED"
  | "VITALS_UPDATED"
  | "WATCH_TICK";

export interface Vitals {
  heartRate?: number | null;
  respiratoryRate?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  spo2?: number | null;
  temperatureC?: number | null;
  painScore?: number | null;
  gcs?: number | null;
}

export interface PriorHistory {
  conditions: string[];
  allergies: string[];
  medications: string[];
  recentAdmissions: number;
  notes?: string;
}

export interface TriageInput {
  ageYears: number;
  sex?: "M" | "F" | "O" | "U";
  chiefComplaint: string;
  observedCues?: string[];
  vitals?: Vitals;
  priorHistory?: PriorHistory | null;
  hasPriorRecord: boolean;
  arrivalMode?: "walk_in" | "ambulance" | "transfer";
  languageBarrier?: boolean;
  underReportingSuspected?: boolean;
  tags?: string[];
}

export interface UncertaintyDriver {
  code: string;
  message: string;
  impact: "raise_acuity" | "widen_confidence" | "both";
}

export interface TriageExplanationFactor {
  code: string;
  label: string;
  contribution: "critical" | "high" | "moderate" | "low" | "protective";
  detail: string;
}

export interface TriageResult {
  esi: EsiLevel;
  bucket: AcuityBucket;
  confidence: number;
  escalationBiasApplied: boolean;
  uncertaintyDrivers: UncertaintyDriver[];
  factors: TriageExplanationFactor[];
  ageStratum: AgeStratum;
  recommendedRoute: CareRoute;
  watchReassessMinutes: number;
  summary: string;
}

export interface HospitalProfile {
  id: string;
  name: string;
  profileType: "rural" | "urban_trauma" | "community";
  visitsPerDay: number;
  resusBeds: number;
  acuteBeds: number;
  fastTrackSlots: number;
  surgeMultiplier: number;
  languages: string[];
}

export const ESI_TO_BUCKET: Record<EsiLevel, AcuityBucket> = {
  1: "RED",
  2: "ORANGE",
  3: "YELLOW",
  4: "GREEN",
  5: "BLUE",
};

export const BUCKET_LABEL: Record<AcuityBucket, string> = {
  RED: "Immediate",
  ORANGE: "Emergent",
  YELLOW: "Urgent",
  GREEN: "Less urgent",
  BLUE: "Non-urgent",
};

export function ageStratumFromYears(ageYears: number): AgeStratum {
  if (ageYears < 18) return "pediatric";
  if (ageYears >= 65) return "geriatric";
  return "adult";
}

export function escalateEsi(esi: EsiLevel): EsiLevel {
  return Math.max(1, esi - 1) as EsiLevel;
}

export function deescalateEsi(esi: EsiLevel): EsiLevel {
  return Math.min(5, esi + 1) as EsiLevel;
}
