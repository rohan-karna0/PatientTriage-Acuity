import { NextResponse } from "next/server";
import { assessEncounter } from "@/lib/triage-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const encounterId = body.encounterId as string;
  if (!encounterId) {
    return NextResponse.json({ error: "encounterId required" }, { status: 400 });
  }
  const scored = await assessEncounter(encounterId);
  return NextResponse.json(scored);
}
