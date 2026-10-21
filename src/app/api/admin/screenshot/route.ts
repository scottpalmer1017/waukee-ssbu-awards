import { NextResponse } from "next/server";
import { GROUPS } from "@/lib/data";
import { isTeacher } from "@/lib/server/adminAuth";
import { setGroupScreenshot } from "@/lib/server/store";

const MAX_DATA_URL_LENGTH = 3_500_000; // ~2.6 MB of image — plenty after client compression

export async function POST(request: Request) {
  if (!(await isTeacher())) return NextResponse.json({ error: "Teacher login required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { groupId?: string; imageDataUrl?: string | null };
  if (!body.groupId || !GROUPS.some((g) => g.id === body.groupId)) {
    return NextResponse.json({ error: "Unknown group." }, { status: 400 });
  }
  if (body.imageDataUrl !== null) {
    if (
      typeof body.imageDataUrl !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,/.test(body.imageDataUrl) ||
      body.imageDataUrl.length > MAX_DATA_URL_LENGTH
    ) {
      return NextResponse.json({ error: "That image is too large or not a supported format." }, { status: 400 });
    }
  }
  try {
    await setGroupScreenshot(body.groupId, body.imageDataUrl);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
