import { NextResponse } from "next/server";
import { GROUPS } from "@/lib/data";
import { getGroupScreenshots } from "@/lib/server/store";

/** Public: the 7 groups with the teacher-uploaded screenshots merged in. */
export async function GET() {
  const screenshots = await getGroupScreenshots().catch(() => ({} as Record<string, string>));
  return NextResponse.json({
    groups: GROUPS.map((g) => ({ ...g, screenshotUrl: screenshots[g.id] ?? g.screenshotUrl })),
  });
}
