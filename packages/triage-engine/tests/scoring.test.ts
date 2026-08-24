import { describe, expect, it } from "vitest";
import { scoreTriage, isWorseningVitals, evaluateWatch } from "../src";

describe("scoreTriage safety contracts", () => {
  it("always returns a confidence indicator", () => {
    const r = scoreTriage({
      ageYears: 40,
      chiefComplaint: "ankle sprain",
      hasPriorRecord: false,
      vitals: {
        heartRate: 72,
        respiratoryRate: 16,
        systolicBp: 120,
        spo2: 98,
        temperatureC: 36.8,
        painScore: 4,
      },
    });
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.esi).toBeGreaterThanOrEqual(1);
    expect(r.esi).toBeLessThanOrEqual(5);
  });

  it("treats pediatric fever more urgently than adult fever at same temp", () => {
    const peds = scoreTriage({
      ageYears: 3,
      chiefComplaint: "fever and cough",
      hasPriorRecord: false,
      vitals: { temperatureC: 38.5, heartRate: 130, respiratoryRate: 32, spo2: 96 },
    });
    const adult = scoreTriage({
      ageYears: 35,
      chiefComplaint: "fever and cough",
      hasPriorRecord: false,
      vitals: { temperatureC: 38.5, heartRate: 88, respiratoryRate: 18, spo2: 97 },
    });
    expect(peds.ageStratum).toBe("pediatric");
    expect(adult.ageStratum).toBe("adult");
    expect(peds.esi).toBeLessThanOrEqual(adult.esi);
  });

  it("escalates ambiguous geriatric presentations", () => {
    const r = scoreTriage({
      ageYears: 78,
      chiefComplaint: "weakness and dizziness",
      hasPriorRecord: true,
      priorHistory: {
        conditions: ["hypertension"],
        allergies: [],
        medications: ["amlodipine"],
        recentAdmissions: 0,
      },
      vitals: { heartRate: 90, spo2: 95 },
      tags: ["ambiguous", "geriatric"],
    });
    expect(r.ageStratum).toBe("geriatric");
    expect(r.esi).toBeLessThanOrEqual(3);
    expect(r.escalationBiasApplied || r.uncertaintyDrivers.length > 0).toBe(true);
  });

  it("raises uncertainty and may escalate when vitals are missing", () => {
    const sparse = scoreTriage({
      ageYears: 45,
      chiefComplaint: "abdominal discomfort",
      hasPriorRecord: false,
    });
    expect(sparse.uncertaintyDrivers.some((d) => d.code === "SPARSE_VITALS")).toBe(true);
    expect(sparse.escalationBiasApplied).toBe(true);
    expect(sparse.confidence).toBeLessThan(0.8);
  });

  it("scores critical keyword as ESI 1", () => {
    const r = scoreTriage({
      ageYears: 50,
      chiefComplaint: "unresponsive after collapse",
      hasPriorRecord: false,
      arrivalMode: "ambulance",
    });
    expect(r.esi).toBe(1);
    expect(r.bucket).toBe("RED");
    expect(r.recommendedRoute).toBe("resus");
  });

  it("applies surge uncertainty escalation", () => {
    const quiet = scoreTriage(
      {
        ageYears: 42,
        chiefComplaint: "weakness",
        hasPriorRecord: false,
        vitals: { heartRate: 80, spo2: 97 },
      },
      { surgeMode: false },
    );
    const surge = scoreTriage(
      {
        ageYears: 42,
        chiefComplaint: "weakness",
        hasPriorRecord: false,
        vitals: { heartRate: 80, spo2: 97 },
      },
      { surgeMode: true },
    );
    expect(surge.esi).toBeLessThanOrEqual(quiet.esi);
    expect(surge.watchReassessMinutes).toBeLessThanOrEqual(quiet.watchReassessMinutes);
  });

  it("escalates suspected under-reporting", () => {
    const r = scoreTriage({
      ageYears: 55,
      chiefComplaint: "mild chest discomfort",
      hasPriorRecord: false,
      underReportingSuspected: true,
      vitals: { heartRate: 100, spo2: 96, painScore: 2 },
    });
    expect(r.escalationBiasApplied).toBe(true);
    expect(r.uncertaintyDrivers.some((d) => d.code === "UNDER_REPORTING")).toBe(true);
  });

  it("detects worsening vitals", () => {
    expect(
      isWorseningVitals(
        { spo2: 96, heartRate: 88, systolicBp: 120, gcs: 15 },
        { spo2: 90, heartRate: 118, systolicBp: 100, gcs: 14 },
        70,
      ),
    ).toBe(true);
  });
});

describe("WATCH evaluateWatch", () => {
  it("alerts when wait exceeds safe threshold", () => {
    const alerts = evaluateWatch([
      {
        encounterId: "e1",
        esi: 3,
        arrivedAt: new Date(Date.now() - 40 * 60000).toISOString(),
        lastAssessedAt: new Date(Date.now() - 40 * 60000).toISOString(),
        waitingMinutes: 40,
        reassessDueMinutes: 30,
      },
    ]);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].reason).toBe("WAIT_THRESHOLD_EXCEEDED");
  });
});
