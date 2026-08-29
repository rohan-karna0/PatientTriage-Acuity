import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/utils";
import { computeReassessMinutes, evaluateWatch } from "@acuity/triage-engine";
import type { EsiLevel } from "@acuity/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const hospital = await prisma.hospitalProfile.findFirst();
  const encounters = await prisma.encounter.findMany({
    where: { active: true, status: "waiting" },
    include: {
      patient: true,
      assessments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ arrivedAt: "asc" }],
  });

  const board = encounters.map((e) => {
    const a = e.assessments[0];
    return {
      encounterId: e.id,
      patientExternalId: e.patient.externalId,
      displayName: e.patient.displayName,
      ageYears: e.patient.ageYears,
      sex: e.patient.sex,
      chiefComplaint: e.chiefComplaint,
      tags: parseJson<string[]>(e.patient.tagsJson, []),
      hasPriorRecord: e.patient.hasPriorRecord,
      demoNotes: e.patient.demoNotes,
      waitingMinutes: e.waitingMinutesSim,
      arrivedAt: e.arrivedAt,
      lastAssessedAt: e.lastAssessedAt,
      languageBarrier: e.languageBarrier,
      underReportingSuspected: e.underReportingSuspected,
      vitals: parseJson(e.vitalsJson, {}),
      assessment: a
        ? {
            id: a.id,
            esi: a.esi,
            bucket: a.bucket,
            confidence: a.confidence,
            escalationBiasApplied: a.escalationBiasApplied,
            ageStratum: a.ageStratum,
            recommendedRoute: a.recommendedRoute,
            watchReassessMinutes: a.watchReassessMinutes,
            summary: a.summary,
            source: a.source,
            uncertaintyDrivers: parseJson(a.uncertaintyDriversJson, []),
            factors: parseJson(a.factorsJson, []),
          }
        : null,
    };
  });

  // FIFO within acuity (lower ESI first), then arrival time
  board.sort((x, y) => {
    const ex = x.assessment?.esi ?? 5;
    const ey = y.assessment?.esi ?? 5;
    if (ex !== ey) return ex - ey;
    return new Date(x.arrivedAt).getTime() - new Date(y.arrivedAt).getTime();
  });

  const watchStates = board
    .filter((b) => b.assessment)
    .map((b) => ({
      encounterId: b.encounterId,
      esi: b.assessment!.esi as EsiLevel,
      arrivedAt: b.arrivedAt.toISOString(),
      lastAssessedAt: b.lastAssessedAt.toISOString(),
      waitingMinutes: b.waitingMinutes,
      reassessDueMinutes:
        b.assessment!.watchReassessMinutes ||
        computeReassessMinutes(b.assessment!.esi as EsiLevel, hospital?.surgeMode ?? false),
    }));

  const watchAlerts = evaluateWatch(watchStates);

  // Surface recent vitals-worsening alerts from audit (PUT /api/watch)
  const recentVitalsAlerts = await prisma.auditEvent.findMany({
    where: {
      action: "REASSESS_TRIGGERED",
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const vitalsWorseningAlerts = recentVitalsAlerts
    .map((ev) => {
      const payload = parseJson<{ reason?: string; message?: string; severity?: string }>(
        ev.payloadJson,
        {},
      );
      if (payload.reason !== "VITALS_WORSENING") return null;
      const stillWaiting = board.some((b) => b.encounterId === ev.entityId);
      if (!stillWaiting) return null;
      return {
        encounterId: ev.entityId,
        reason: "VITALS_WORSENING" as const,
        message: payload.message ?? "Vitals indicate deterioration — reassess now",
        severity: (payload.severity as "critical" | "high" | "moderate") ?? "critical",
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const mergedAlerts = [
    ...vitalsWorseningAlerts,
    ...watchAlerts.filter(
      (a) => !vitalsWorseningAlerts.some((v) => v.encounterId === a.encounterId),
    ),
  ];

  const resusCount = board.filter((b) => b.assessment?.recommendedRoute === "resus").length;
  const acuteCount = board.filter((b) => b.assessment?.recommendedRoute === "acute").length;
  const fastTrackCount = board.filter((b) => b.assessment?.recommendedRoute === "fast_track").length;

  return NextResponse.json({
    hospital,
    surgeMode: hospital?.surgeMode ?? false,
    queue: board,
    watchAlerts: mergedAlerts,
    capacity: {
      resus: {
        used: resusCount,
        total: hospital?.resusBeds ?? 4,
        label: "Resus",
      },
      acute: {
        used: acuteCount,
        total: hospital?.acuteBeds ?? 18,
        label: "Acute care",
      },
      fastTrack: {
        used: fastTrackCount,
        total: hospital?.fastTrackSlots ?? 8,
        label: "Fast-track",
      },
    },
    stats: {
      waiting: board.length,
      byEsi: [1, 2, 3, 4, 5].map((esi) => ({
        esi,
        count: board.filter((b) => b.assessment?.esi === esi).length,
      })),
      alerts: mergedAlerts.length,
    },
  });
}
