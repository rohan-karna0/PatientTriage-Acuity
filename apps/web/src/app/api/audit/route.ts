import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(500, Number(searchParams.get("limit") ?? 80));

  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    jurisdiction: {
      primary: "India DPDP Act 2023",
      secondary: "HIPAA-aligned audit & minimum-necessary patterns",
      purpose: "TRIAGE_DECISION_SUPPORT",
    },
    events: events.map((e) => ({
      id: e.id,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      clinicianId: e.clinicianId,
      clinicianRole: e.clinicianRole,
      purpose: e.purpose,
      dataClass: e.dataClass,
      inputHash: e.inputHash,
      payload: parseJson(e.payloadJson, {}),
      createdAt: e.createdAt,
    })),
  });
}
