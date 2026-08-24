import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { scoreTriage } from "@acuity/triage-engine";
import { createHash } from "crypto";
import type { PriorHistory, TriageInput, Vitals } from "@acuity/shared";

const prisma = new PrismaClient();

type SeedPatient = {
  id: string;
  displayName: string;
  ageYears: number;
  sex: string;
  chiefComplaint: string;
  observedCues: string[];
  vitals: Vitals;
  hasPriorRecord: boolean;
  priorHistory: PriorHistory | null;
  arrivalMode: string;
  languageBarrier: boolean;
  underReportingSuspected: boolean;
  tags: string[];
  demoNotes: string;
};

function hashInputs(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.triageAssessment.deleteMany();
  await prisma.encounter.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.hospitalProfile.deleteMany();

  const hospital = await prisma.hospitalProfile.create({
    data: {
      name: "Acuity Demo ED — Community / Urban Hybrid",
      profileType: "community",
      visitsPerDay: 220,
      resusBeds: 4,
      acuteBeds: 18,
      fastTrackSlots: 8,
      surgeMultiplier: 3,
      languagesJson: JSON.stringify(["en", "hi", "ta"]),
      surgeMode: false,
    },
  });

  const seedPath = path.resolve(__dirname, "../../../data/patients.seed.json");
  const patients = JSON.parse(readFileSync(seedPath, "utf-8")) as SeedPatient[];

  // Simulate staggered arrivals and some already waiting past WATCH thresholds
  const waitSims = [5, 12, 35, 8, 22, 2, 45, 18, 55, 7, 15, 40, 10, 3, 28, 14, 33, 9, 20, 6, 50, 11];

  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    const retention = new Date();
    retention.setFullYear(retention.getFullYear() + 7);

    const patient = await prisma.patient.create({
      data: {
        externalId: p.id,
        displayName: p.displayName,
        ageYears: p.ageYears,
        sex: p.sex,
        hasPriorRecord: p.hasPriorRecord,
        priorHistoryJson: p.priorHistory ? JSON.stringify(p.priorHistory) : null,
        tagsJson: JSON.stringify(p.tags),
        demoNotes: p.demoNotes,
        dataClass: "TRIAGE_OPERATIONAL",
        retentionUntil: retention,
      },
    });

    const arrivedAt = new Date(Date.now() - waitSims[i % waitSims.length] * 60000);
    const encounter = await prisma.encounter.create({
      data: {
        patientId: patient.id,
        chiefComplaint: p.chiefComplaint,
        observedCuesJson: JSON.stringify(p.observedCues),
        vitalsJson: JSON.stringify(p.vitals ?? {}),
        arrivalMode: p.arrivalMode,
        languageBarrier: p.languageBarrier,
        underReportingSuspected: p.underReportingSuspected,
        status: "waiting",
        arrivedAt,
        lastAssessedAt: arrivedAt,
        waitingMinutesSim: waitSims[i % waitSims.length],
        active: true,
      },
    });

    const input: TriageInput = {
      ageYears: p.ageYears,
      sex: p.sex as TriageInput["sex"],
      chiefComplaint: p.chiefComplaint,
      observedCues: p.observedCues,
      vitals: p.vitals,
      priorHistory: p.priorHistory,
      hasPriorRecord: p.hasPriorRecord,
      arrivalMode: p.arrivalMode as TriageInput["arrivalMode"],
      languageBarrier: p.languageBarrier,
      underReportingSuspected: p.underReportingSuspected,
      tags: p.tags,
    };

    const result = scoreTriage(input, { surgeMode: false });
    const inputHash = hashInputs(input);

    await prisma.triageAssessment.create({
      data: {
        encounterId: encounter.id,
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
        source: "ENGINE",
        clinicianId: "system-seed",
        clinicianRole: "TRIAGE_NURSE",
        inputHash,
      },
    });

    await prisma.auditEvent.create({
      data: {
        action: "SCORE_ISSUED",
        entityType: "Encounter",
        entityId: encounter.id,
        clinicianId: "system-seed",
        clinicianRole: "TRIAGE_NURSE",
        purpose: "TRIAGE_DECISION_SUPPORT",
        dataClass: "AUDIT",
        payloadJson: JSON.stringify({
          seed: true,
          patientExternalId: p.id,
          esi: result.esi,
          confidence: result.confidence,
        }),
        inputHash,
      },
    });
  }

  console.log(`Seeded hospital ${hospital.name} with ${patients.length} patients.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
