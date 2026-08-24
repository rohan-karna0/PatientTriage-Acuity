import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { intakeSchema } from "@/lib/schemas";
import { assessEncounter, writeAudit } from "@/lib/triage-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const externalId = `INTAKE-${Date.now()}`;
  const retention = new Date();
  retention.setFullYear(retention.getFullYear() + 7);

  const patient = await prisma.patient.create({
    data: {
      externalId,
      displayName: data.displayName,
      ageYears: data.ageYears,
      sex: data.sex,
      hasPriorRecord: data.hasPriorRecord,
      priorHistoryJson: data.priorHistory ? JSON.stringify(data.priorHistory) : null,
      tagsJson: JSON.stringify(["intake"]),
      demoNotes: "Live DOOR intake",
      dataClass: "TRIAGE_OPERATIONAL",
      retentionUntil: retention,
    },
  });

  const encounter = await prisma.encounter.create({
    data: {
      patientId: patient.id,
      chiefComplaint: data.chiefComplaint,
      observedCuesJson: JSON.stringify(data.observedCues),
      vitalsJson: JSON.stringify(data.vitals ?? {}),
      arrivalMode: data.arrivalMode,
      languageBarrier: data.languageBarrier,
      underReportingSuspected: data.underReportingSuspected,
      status: "waiting",
      waitingMinutesSim: 0,
      active: true,
    },
  });

  await writeAudit({
    action: "INTAKE_CREATED",
    entityType: "Encounter",
    entityId: encounter.id,
    payload: {
      patientExternalId: externalId,
      consentNoticeAcknowledged: true,
      purpose: "TRIAGE_DECISION_SUPPORT",
    },
  });

  const scored = await assessEncounter(encounter.id);

  return NextResponse.json({
    patient,
    encounter,
    assessment: scored.assessment,
    result: scored.result,
  });
}
