import type { PriorHistory, TriageInput, Vitals } from "@acuity/shared";
import { scoreTriage } from "@acuity/triage-engine";
import { prisma } from "./prisma";
import { getClinician, hashInputs, parseJson } from "./utils";

export async function writeAudit(params: {
  action: string;
  entityType: string;
  entityId: string;
  payload: unknown;
  inputHash?: string;
}) {
  const { clinicianId, clinicianRole } = getClinician();
  return prisma.auditEvent.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      clinicianId,
      clinicianRole,
      purpose: "TRIAGE_DECISION_SUPPORT",
      dataClass: "AUDIT",
      payloadJson: JSON.stringify(params.payload),
      inputHash: params.inputHash,
    },
  });
}

export function encounterToInput(encounter: {
  chiefComplaint: string;
  observedCuesJson: string;
  vitalsJson: string;
  arrivalMode: string;
  languageBarrier: boolean;
  underReportingSuspected: boolean;
  patient: {
    ageYears: number;
    sex: string;
    hasPriorRecord: boolean;
    priorHistoryJson: string | null;
    tagsJson: string;
  };
}): TriageInput {
  return {
    ageYears: encounter.patient.ageYears,
    sex: encounter.patient.sex as TriageInput["sex"],
    chiefComplaint: encounter.chiefComplaint,
    observedCues: parseJson<string[]>(encounter.observedCuesJson, []),
    vitals: parseJson<Vitals>(encounter.vitalsJson, {}),
    priorHistory: parseJson<PriorHistory | null>(encounter.priorHistoryJson, null),
    hasPriorRecord: encounter.patient.hasPriorRecord,
    arrivalMode: encounter.arrivalMode as TriageInput["arrivalMode"],
    languageBarrier: encounter.languageBarrier,
    underReportingSuspected: encounter.underReportingSuspected,
    tags: parseJson<string[]>(encounter.patient.tagsJson, []),
  };
}

export async function assessEncounter(encounterId: string, source = "ENGINE") {
  const hospital = await prisma.hospitalProfile.findFirst();
  const surgeMode = hospital?.surgeMode ?? false;

  const encounter = await prisma.encounter.findUniqueOrThrow({
    where: { id: encounterId },
    include: { patient: true },
  });

  const input = encounterToInput(encounter);
  const result = scoreTriage(input, { surgeMode });
  const inputHash = hashInputs(input);
  const { clinicianId, clinicianRole } = getClinician();

  const assessment = await prisma.triageAssessment.create({
    data: {
      encounterId,
      esi: result.esi,
      bucket: result.bucket,
      confidence: result.confidence,
      escalationBiasApplied: result.escalationBiasApplied,
      uncertaintyDriversJson: JSON.stringify(result.uncertaintyDrivers),
      factorsJson: JSON.stringify(result.factors),
      ageStratum: result.ageStratum,
      recommendedRoute: result.recommendedRoute,
      watchReassessMinutes: result.watchReassessMinutes,
      summary: result.summary,
      source,
      clinicianId,
      clinicianRole,
      inputHash,
    },
  });

  await prisma.encounter.update({
    where: { id: encounterId },
    data: { lastAssessedAt: new Date() },
  });

  await writeAudit({
    action: "SCORE_ISSUED",
    entityType: "Encounter",
    entityId: encounterId,
    inputHash,
    payload: {
      assessmentId: assessment.id,
      esi: result.esi,
      bucket: result.bucket,
      confidence: result.confidence,
      escalationBiasApplied: result.escalationBiasApplied,
      surgeMode,
    },
  });

  return { assessment, result, surgeMode };
}
