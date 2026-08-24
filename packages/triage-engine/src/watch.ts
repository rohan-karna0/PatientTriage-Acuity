import type { EsiLevel } from "@acuity/shared";
import { SURGE_WATCH_FACTOR, WATCH_MINUTES_BY_ESI } from "./thresholds";

export interface WatchPatientState {
  encounterId: string;
  esi: EsiLevel;
  arrivedAt: string; // ISO
  lastAssessedAt: string; // ISO
  waitingMinutes: number;
  reassessDueMinutes: number;
}

export interface WatchAlert {
  encounterId: string;
  reason: "WAIT_THRESHOLD_EXCEEDED" | "VITALS_WORSENING";
  message: string;
  recommendedAction: "REASSESS_NOW";
  severity: "critical" | "high" | "moderate";
}

export function computeReassessMinutes(esi: EsiLevel, surgeMode: boolean): number {
  const base = WATCH_MINUTES_BY_ESI[esi];
  if (esi === 1) return 0;
  return surgeMode ? Math.max(5, Math.round(base * SURGE_WATCH_FACTOR)) : base;
}

export function evaluateWatch(
  patients: WatchPatientState[],
  now: Date = new Date(),
): WatchAlert[] {
  const alerts: WatchAlert[] = [];
  for (const p of patients) {
    if (p.esi === 1) {
      alerts.push({
        encounterId: p.encounterId,
        reason: "WAIT_THRESHOLD_EXCEEDED",
        message: "ESI-1 patient must not wait — immediate reassessment / resus",
        recommendedAction: "REASSESS_NOW",
        severity: "critical",
      });
      continue;
    }
    const due = p.reassessDueMinutes;
    if (p.waitingMinutes >= due) {
      alerts.push({
        encounterId: p.encounterId,
        reason: "WAIT_THRESHOLD_EXCEEDED",
        message: `Wait ${p.waitingMinutes}m exceeds safe threshold ${due}m for ESI ${p.esi}`,
        recommendedAction: "REASSESS_NOW",
        severity: p.esi <= 2 ? "critical" : p.esi === 3 ? "high" : "moderate",
      });
    }
    // Stale clock check vs wall time (simulation support)
    const last = new Date(p.lastAssessedAt).getTime();
    const elapsedMin = Math.floor((now.getTime() - last) / 60000);
    if (elapsedMin >= due && !alerts.some((a) => a.encounterId === p.encounterId)) {
      alerts.push({
        encounterId: p.encounterId,
        reason: "WAIT_THRESHOLD_EXCEEDED",
        message: `No reassessment for ${elapsedMin}m (threshold ${due}m)`,
        recommendedAction: "REASSESS_NOW",
        severity: "high",
      });
    }
  }
  return alerts;
}
