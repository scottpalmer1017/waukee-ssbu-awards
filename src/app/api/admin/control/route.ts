import { NextResponse } from "next/server";
import { isTeacher } from "@/lib/server/adminAuth";
import { resetBallots, setVotingOpen } from "@/lib/server/store";

export async function POST(request: Request) {
  if (!(await isTeacher())) return NextResponse.json({ error: "Teacher login required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action === "open") await setVotingOpen(true);
  else if (body.action === "close") await setVotingOpen(false);
  else if (body.action === "reset") await resetBallots();
  else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
