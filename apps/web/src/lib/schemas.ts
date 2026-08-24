import { z } from "zod";

export const vitalsSchema = z.object({
  heartRate: z.number().optional().nullable(),
  respiratoryRate: z.number().optional().nullable(),
  systolicBp: z.number().optional().nullable(),
  diastolicBp: z.number().optional().nullable(),
  spo2: z.number().optional().nullable(),
  temperatureC: z.number().optional().nullable(),
  painScore: z.number().min(0).max(10).optional().nullable(),
  gcs: z.number().min(3).max(15).optional().nullable(),
});

export const intakeSchema = z.object({
  displayName: z.string().min(1).max(120),
  ageYears: z.number().int().min(0).max(120),
  sex: z.enum(["M", "F", "O", "U"]).default("U"),
  chiefComplaint: z.string().min(1).max(500),
  observedCues: z.array(z.string()).default([]),
  vitals: vitalsSchema.optional(),
  hasPriorRecord: z.boolean().default(false),
  priorHistory: z
    .object({
      conditions: z.array(z.string()),
      allergies: z.array(z.string()),
      medications: z.array(z.string()),
      recentAdmissions: z.number().int().min(0),
      notes: z.string().optional(),
    })
    .nullable()
    .optional(),
  arrivalMode: z.enum(["walk_in", "ambulance", "transfer"]).default("walk_in"),
  languageBarrier: z.boolean().default(false),
  underReportingSuspected: z.boolean().default(false),
  consentNoticeAcknowledged: z.literal(true),
});

export const overrideSchema = z.object({
  encounterId: z.string().min(1),
  newEsi: z.number().int().min(1).max(5),
  reasonCode: z.enum([
    "CLINICAL_JUDGMENT",
    "ADDITIONAL_HISTORY",
    "VITALS_RECHECK",
    "RESOURCE_CONSTRAINT",
    "PATIENT_DETERIORATION",
    "OTHER",
  ]),
  note: z.string().min(3).max(1000),
});

export const surgeSchema = z.object({
  surgeMode: z.boolean(),
});

export const vitalsUpdateSchema = z.object({
  encounterId: z.string().min(1),
  vitals: vitalsSchema,
});
