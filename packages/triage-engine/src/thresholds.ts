import type { AgeStratum, Vitals } from "@acuity/shared";

export interface VitalThresholds {
  hrHigh: number;
  hrLow: number;
  rrHigh: number;
  rrLow: number;
  spo2Critical: number;
  spo2Low: number;
  sbpCritical: number;
  sbpLow: number;
  tempFever: number;
  tempHighFever: number;
}

/** Age-stratified vital thresholds — deliberately NOT adult-only. */
export const VITAL_THRESHOLDS: Record<AgeStratum, VitalThresholds> = {
  pediatric: {
    hrHigh: 140,
    hrLow: 70,
    rrHigh: 40,
    rrLow: 16,
    spo2Critical: 90,
    spo2Low: 94,
    sbpCritical: 70,
    sbpLow: 85,
    tempFever: 38.0,
    tempHighFever: 39.0,
  },
  adult: {
    hrHigh: 120,
    hrLow: 50,
    rrHigh: 24,
    rrLow: 10,
    spo2Critical: 88,
    spo2Low: 92,
    sbpCritical: 80,
    sbpLow: 90,
    tempFever: 38.5,
    tempHighFever: 39.5,
  },
  geriatric: {
    hrHigh: 110,
    hrLow: 50,
    rrHigh: 22,
    rrLow: 10,
    spo2Critical: 88,
    spo2Low: 92,
    sbpCritical: 85,
    sbpLow: 95,
    tempFever: 38.0,
    tempHighFever: 38.8,
  },
};

export const CRITICAL_KEYWORDS = [
  "unresponsive",
  "cardiac arrest",
  "not breathing",
  "severe bleeding",
  "anaphylaxis",
  "stroke",
  "chest pain radiating",
  "seizure ongoing",
  "cyanosis",
];

export const HIGH_KEYWORDS = [
  "chest pain",
  "shortness of breath",
  "difficulty breathing",
  "altered mental",
  "confusion",
  "severe abdominal",
  "hemorrhage",
  "overdose",
  "suicidal",
  "trauma",
  "head injury",
  "allergic reaction",
];

export const AMBIGUOUS_KEYWORDS = [
  "weakness",
  "dizziness",
  "fatigue",
  "unwell",
  "generally ill",
  "not feeling well",
  "malaise",
];

/** Safe wait (minutes) before WATCH forces reassessment, by ESI. Surge shortens these. */
export const WATCH_MINUTES_BY_ESI: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 10,
  3: 30,
  4: 60,
  5: 120,
};

export const SURGE_WATCH_FACTOR = 0.5;

export function countPresentVitals(vitals?: Vitals | null): { present: number; total: number } {
  const keys: (keyof Vitals)[] = [
    "heartRate",
    "respiratoryRate",
    "systolicBp",
    "spo2",
    "temperatureC",
    "painScore",
    "gcs",
  ];
  if (!vitals) return { present: 0, total: keys.length };
  let present = 0;
  for (const k of keys) {
    const v = vitals[k];
    if (v !== undefined && v !== null) present += 1;
  }
  return { present, total: keys.length };
}
