import { NextResponse } from "next/server";
import { submitBallot } from "@/lib/server/store";

export async function POST(request: Request) {
  let body: { deviceToken?: unknown; selections?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid ballot." }, { status: 400 });
  }
  if (typeof body.deviceToken !== "string" || body.deviceToken.length < 8) {
    return NextResponse.json({ error: "Missing device token." }, { status: 400 });
  }
  const result = await submitBallot(body.deviceToken, body.selections ?? {});
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
