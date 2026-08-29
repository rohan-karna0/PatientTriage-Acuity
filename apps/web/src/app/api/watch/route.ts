import { NextResponse } from "next/server";
import type { EsiLevel } from "@acuity/shared";
import { evaluateWatch, computeReassessMinutes, isWorseningVitals } from "@acuity/triage-engine";
import type { Vitals } from "@acuity/shared";
import { prisma } from "@/lib/prisma";
import { vitalsUpdateSchema } from "@/lib/schemas";
import { writeAudit } from "@/lib/triage-service";
import { parseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Advance simulation clock + emit WATCH alerts for overdue / ESI-1 waiters. */
export async function POST() {
  const hospital = await prisma.hospitalProfile.findFirst();
  const surgeMode = hospital?.surgeMode ?? false;

  const encounters = await prisma.encounter.findMany({
    where: { active: true, status: "waiting" },
    include: {
      patient: true,
      assessments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // Tick wait clocks (surge advances faster)
  const tick = surgeMode ? 8 : 3;
  for (const e of encounters) {
    await prisma.encounter.update({
      where: { id: e.id },
      data: { waitingMinutesSim: e.waitingMinutesSim + tick },
    });
  }

  const refreshed = await prisma.encounter.findMany({
    where: { active: true, status: "waiting" },
    include: {
      patient: true,
      assessments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const states = refreshed
    .filter((e) => e.assessments[0])
    .map((e) => {
      const a = e.assessments[0];
      const esi = a.esi as EsiLevel;
      return {
        encounterId: e.id,
        esi,
        arrivedAt: e.arrivedAt.toISOString(),
        lastAssessedAt: e.lastAssessedAt.toISOString(),
        waitingMinutes: e.waitingMinutesSim,
        reassessDueMinutes: computeReassessMinutes(esi, surgeMode),
      };
    });

  const alerts = evaluateWatch(states);

  for (const alert of alerts) {
    const enc = refreshed.find((e) => e.id === alert.encounterId);
    await writeAudit({
      action: "REASSESS_TRIGGERED",
      entityType: "Encounter",
      entityId: alert.encounterId,
      payload: {
        ...alert,
        patientDisplayName: enc?.patient.displayName,
        patientExternalId: enc?.patient.externalId,
        chiefComplaint: enc?.chiefComplaint,
      },
    });
  }

  await writeAudit({
    action: "WATCH_TICK",
    entityType: "HospitalProfile",
    entityId: hospital?.id ?? "unknown",
    payload: { tickMinutes: tick, alertCount: alerts.length, surgeMode },
  });

  return NextResponse.json({ tickMinutes: tick, alerts, surgeMode });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const parsed = vitalsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { encounterId, vitals } = parsed.data;

  const encounter = await prisma.encounter.findUniqueOrThrow({
    where: { id: encounterId },
    include: { patient: true },
  });
  const previous = parseJson<Vitals>(encounter.vitalsJson, {});
  const worsening = isWorseningVitals(previous, vitals, encounter.patient.ageYears);

  await prisma.encounter.update({
    where: { id: encounterId },
    data: {
      vitalsJson: JSON.stringify({ ...previous, ...vitals }),
      lastAssessedAt: new Date(),
    },
  });

  await writeAudit({
    action: "VITALS_UPDATED",
    entityType: "Encounter",
    entityId: encounterId,
    payload: {
      previous,
      next: vitals,
      worsening,
      patientDisplayName: encounter.patient.displayName,
      patientExternalId: encounter.patient.externalId,
      chiefComplaint: encounter.chiefComplaint,
    },
  });

  let alert = null;
  if (worsening) {
    alert = {
      encounterId,
      reason: "VITALS_WORSENING" as const,
      message: "Re-recorded vitals indicate deterioration — reassess now",
      recommendedAction: "REASSESS_NOW" as const,
      severity: "critical" as const,
    };
    await writeAudit({
      action: "REASSESS_TRIGGERED",
      entityType: "Encounter",
      entityId: encounterId,
      payload: {
        ...alert,
        patientDisplayName: encounter.patient.displayName,
        patientExternalId: encounter.patient.externalId,
        chiefComplaint: encounter.chiefComplaint,
      },
    });
  }

  return NextResponse.json({ worsening, alert });
}
