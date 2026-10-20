import { NextResponse } from "next/server";
import { isTeacher } from "@/lib/server/adminAuth";
import { getResults } from "@/lib/server/store";

/** Teacher-only: results are never exposed to students. */
export async function GET() {
  if (!(await isTeacher())) return NextResponse.json({ error: "Teacher login required." }, { status: 401 });
  return NextResponse.json(await getResults());
}
