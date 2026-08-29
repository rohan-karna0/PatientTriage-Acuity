import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { surgeSchema } from "@/lib/schemas";
import { assessEncounter, writeAudit } from "@/lib/triage-service";

export const dynamic = "force-dynamic";

/**
 * Surge mode (~3×): shortens WATCH SLAs and re-scores waiting patients
 * so uncertain presentations escalate rather than average down.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = surgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const hospital = await prisma.hospitalProfile.findFirst();
  if (!hospital) {
    return NextResponse.json({ error: "Hospital profile missing — run db:seed" }, { status: 500 });
  }

  const updated = await prisma.hospitalProfile.update({
    where: { id: hospital.id },
    data: { surgeMode: parsed.data.surgeMode },
  });

  await writeAudit({
    action: "SURGE_MODE_CHANGED",
    entityType: "HospitalProfile",
    entityId: hospital.id,
    payload: {
      surgeMode: parsed.data.surgeMode,
      multiplier: hospital.surgeMultiplier,
    },
  });

  // Re-score waiting patients when surge toggles (restore or shorten WATCH SLAs)
  let rescored = 0;
  const waiting = await prisma.encounter.findMany({
    where: { active: true, status: "waiting" },
    select: { id: true },
  });

  if (parsed.data.surgeMode) {
    for (const e of waiting) {
      const enc = await prisma.encounter.findUnique({ where: { id: e.id } });
      if (!enc) continue;
      await prisma.encounter.update({
        where: { id: e.id },
        data: { waitingMinutesSim: Math.min(180, Math.round(enc.waitingMinutesSim * 1.5) + 10) },
      });
      await assessEncounter(e.id);
      rescored += 1;
    }
  } else {
    for (const e of waiting) {
      await assessEncounter(e.id);
      rescored += 1;
    }
  }

  return NextResponse.json({ hospital: updated, rescored });
}
