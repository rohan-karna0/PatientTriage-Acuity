import { createHash } from "crypto";

export function hashInputs(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getClinician() {
  return {
    clinicianId: process.env.DEFAULT_CLINICIAN_ID ?? "nurse-demo-01",
    clinicianRole: process.env.DEFAULT_CLINICIAN_ROLE ?? "TRIAGE_NURSE",
  };
}
