import { NextResponse } from "next/server";
import { ADMIN_COOKIE, checkPassword, sessionToken } from "@/lib/server/adminAuth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  if (!body.password || !checkPassword(body.password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
