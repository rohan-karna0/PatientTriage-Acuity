/** Nurse-facing display helpers — keeps UI labels consistent and clinical. */

export type AcuityColor = "RED" | "AMBER" | "GREEN" | "BLUE";

export function bucketToAcuityColor(bucket: string): AcuityColor {
  if (bucket === "RED" || bucket === "ORANGE") return "RED";
  if (bucket === "YELLOW") return "AMBER";
  if (bucket === "GREEN") return "GREEN";
  return "BLUE";
}

export function formatWaitClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const s = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatToken(externalId: string): string {
  const num = externalId.replace(/\D/g, "") || "000";
  return `A-${num.padStart(3, "0")}`;
}

export function routeDisplay(route: string): string {
  const map: Record<string, string> = {
    resus: "Resus",
    acute: "Acute care",
    fast_track: "Fast-track",
    waiting: "Waiting",
  };
  return map[route] ?? route;
}

export type VitalsSnapshot = {
  heartRate?: number | null;
  respiratoryRate?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  spo2?: number | null;
  temperatureC?: number | null;
  painScore?: number | null;
  gcs?: number | null;
};

export function formatVitalsSummary(vitals: VitalsSnapshot | null | undefined): string {
  if (!vitals) return "No vitals recorded";
  const parts: string[] = [];
  if (vitals.heartRate != null) parts.push(`HR ${vitals.heartRate} bpm`);
  if (vitals.systolicBp != null) parts.push(`BP ${vitals.systolicBp} mmHg`);
  if (vitals.spo2 != null) parts.push(`SpO₂ ${vitals.spo2}%`);
  if (vitals.temperatureC != null) parts.push(`Temp ${vitals.temperatureC}°C`);
  if (vitals.respiratoryRate != null) parts.push(`RR ${vitals.respiratoryRate}`);
  if (vitals.painScore != null) parts.push(`Pain ${vitals.painScore}/10`);
  if (vitals.gcs != null) parts.push(`GCS ${vitals.gcs}`);
  return parts.length > 0 ? parts.join(" · ") : "No vitals recorded at intake";
}

export function countRecordedVitals(vitals: VitalsSnapshot | null | undefined): number {
  if (!vitals) return 0;
  return [
    vitals.heartRate,
    vitals.systolicBp,
    vitals.spo2,
    vitals.temperatureC,
    vitals.respiratoryRate,
    vitals.painScore,
    vitals.gcs,
  ].filter((v) => v != null).length;
}
