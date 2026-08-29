import { NextResponse } from "next/server";
import { ESI_TO_BUCKET } from "@acuity/shared";
import type { EsiLevel } from "@acuity/shared";
import { prisma } from "@/lib/prisma";
import { overrideSchema } from "@/lib/schemas";
import { writeAudit } from "@/lib/triage-service";
import { getClinician, hashInputs } from "@/lib/utils";
import { computeReassessMinutes } from "@acuity/triage-engine";

export const dynamic = "force-dynamic";

/**
 * Clinician override — required for any acuity change.
 * Downgrades are allowed only via this path (system never auto-downgrades).
 * Full audit: before/after ESI, reason code, clinician, timestamp.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = overrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { encounterId, newEsi, reasonCode, note } = parsed.data;
  const hospital = await prisma.hospitalProfile.findFirst();
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    include: { patient: true },
  });
  if (!encounter) {
    return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
  }

  const prior = await prisma.triageAssessment.findFirst({
    where: { encounterId },
    orderBy: { createdAt: "desc" },
  });

  if (!prior) {
    return NextResponse.json({ error: "No prior assessment to override" }, { status: 404 });
  }

  const { clinicianId, clinicianRole } = getClinician();
  const esi = newEsi as EsiLevel;
  const bucket = ESI_TO_BUCKET[esi];
  const watchReassessMinutes = computeReassessMinutes(esi, hospital?.surgeMode ?? false);
  const inputHash = hashInputs({ encounterId, newEsi, reasonCode, priorId: prior.id });

  const assessment = await prisma.triageAssessment.create({
    data: {
      encounterId,
      esi,
      bucket,
      confidence: prior.confidence,
      escalationBiasApplied: false,
      uncertaintyDriversJson: prior.uncertaintyDriversJson,
      factorsJson: JSON.stringify([
        {
          code: "CLINICIAN_OVERRIDE",
          label: "Clinician override",
          contribution: "critical",
          detail: `${reasonCode}: ${note}`,
        },
      ]),
      ageStratum: prior.ageStratum,
      recommendedRoute:
        esi === 1 ? "resus" : esi <= 3 ? "acute" : esi === 4 ? "fast_track" : "waiting",
      watchReassessMinutes,
      summary: `Clinician override: ESI ${prior.esi} → ${esi} (${reasonCode}). Nurse accountability retained.`,
      source: "OVERRIDE",
      overrideReasonCode: reasonCode,
      overrideNote: note,
      clinicianId,
      clinicianRole,
      previousEsi: prior.esi,
      inputHash,
    },
  });

  await prisma.encounter.update({
    where: { id: encounterId },
    data: { lastAssessedAt: new Date() },
  });

  await writeAudit({
    action: "OVERRIDE",
    entityType: "Encounter",
    entityId: encounterId,
    inputHash,
    payload: {
      assessmentId: assessment.id,
      patientDisplayName: encounter.patient.displayName,
      patientExternalId: encounter.patient.externalId,
      chiefComplaint: encounter.chiefComplaint,
      previousEsi: prior.esi,
      newEsi: esi,
      reasonCode,
      note,
      clinicianId,
      clinicianRole,
      jurisdictionNote: "DPDP purpose limitation + HIPAA-aligned access/accountability log",
    },
  });

  return NextResponse.json({ assessment, previousEsi: prior.esi });
}
