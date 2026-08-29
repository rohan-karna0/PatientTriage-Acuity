import { describe, expect, it } from "vitest";
import { evaluateWatch, computeReassessMinutes } from "../src/watch";

const OVERRIDE_REASON_CODES = [
  "CLINICAL_JUDGMENT",
  "ADDITIONAL_HISTORY",
  "VITALS_RECHECK",
  "RESOURCE_CONSTRAINT",
  "PATIENT_DETERIORATION",
  "OTHER",
] as const;

function assertOverrideAuditPayload(payload: {
  assessmentId: string;
  previousEsi: number;
  newEsi: number;
  reasonCode: string;
  note: string;
  clinicianId: string;
  clinicianRole: string;
}) {
  expect(payload.assessmentId.length).toBeGreaterThan(0);
  expect(payload.previousEsi).toBeGreaterThanOrEqual(1);
  expect(payload.previousEsi).toBeLessThanOrEqual(5);
  expect(payload.newEsi).toBeGreaterThanOrEqual(1);
  expect(payload.newEsi).toBeLessThanOrEqual(5);
  expect(OVERRIDE_REASON_CODES).toContain(payload.reasonCode);
  expect(payload.note.length).toBeGreaterThanOrEqual(3);
  expect(payload.clinicianId.length).toBeGreaterThan(0);
  expect(payload.clinicianRole.length).toBeGreaterThan(0);
}

describe("WATCH integration contracts", () => {
  it("fires reassess alert when wait exceeds ESI-3 threshold", () => {
    const alerts = evaluateWatch([
      {
        encounterId: "enc-001",
        esi: 3,
        arrivedAt: new Date(Date.now() - 45 * 60000).toISOString(),
        lastAssessedAt: new Date(Date.now() - 45 * 60000).toISOString(),
        waitingMinutes: 45,
        reassessDueMinutes: 30,
      },
    ]);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].recommendedAction).toBe("REASSESS_NOW");
    expect(["WAIT_THRESHOLD_EXCEEDED", "VITALS_WORSENING"]).toContain(alerts[0].reason);
  });

  it("always alerts for ESI-1 patients in waiting queue", () => {
    const alerts = evaluateWatch([
      {
        encounterId: "enc-critical",
        esi: 1,
        arrivedAt: new Date().toISOString(),
        lastAssessedAt: new Date().toISOString(),
        waitingMinutes: 1,
        reassessDueMinutes: 0,
      },
    ]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe("critical");
  });

  it("shortens reassess SLA under surge mode", () => {
    const normal = computeReassessMinutes(3, false);
    const surge = computeReassessMinutes(3, true);
    expect(surge).toBeLessThan(normal);
  });

  it("does not alert when within safe wait window", () => {
    const alerts = evaluateWatch([
      {
        encounterId: "enc-ok",
        esi: 4,
        arrivedAt: new Date().toISOString(),
        lastAssessedAt: new Date().toISOString(),
        waitingMinutes: 10,
        reassessDueMinutes: 60,
      },
    ]);
    expect(alerts.length).toBe(0);
  });
});

describe("override audit integration contract", () => {
  it("accepts complete override audit payload", () => {
    const payload = {
      assessmentId: "assess-123",
      previousEsi: 3,
      newEsi: 2,
      reasonCode: "CLINICAL_JUDGMENT",
      note: "Bedside reassessment — patient appears more ill than initial score",
      clinicianId: "nurse-demo-01",
      clinicianRole: "TRIAGE_NURSE",
    };
    assertOverrideAuditPayload(payload);
    expect(payload.newEsi).toBeLessThan(payload.previousEsi);
  });

  it("rejects override without sufficient clinical note", () => {
    expect(() =>
      assertOverrideAuditPayload({
        assessmentId: "x",
        previousEsi: 3,
        newEsi: 2,
        reasonCode: "OTHER",
        note: "ab",
        clinicianId: "nurse",
        clinicianRole: "TRIAGE_NURSE",
      }),
    ).toThrow();
  });
});
