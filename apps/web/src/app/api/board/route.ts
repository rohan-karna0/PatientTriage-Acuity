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

  return NextResponse.json({
    hospital,
    surgeMode: hospital?.surgeMode ?? false,
    queue: board,
    watchAlerts,
    stats: {
      waiting: board.length,
      byEsi: [1, 2, 3, 4, 5].map((esi) => ({
        esi,
        count: board.filter((b) => b.assessment?.esi === esi).length,
      })),
      alerts: watchAlerts.length,
    },
  });
}
