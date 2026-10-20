import { NextResponse } from "next/server";
import { getVotingOpen } from "@/lib/server/store";

export async function GET() {
  return NextResponse.json({ votingOpen: await getVotingOpen() });
}
