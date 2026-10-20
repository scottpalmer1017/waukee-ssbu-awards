import { createHash } from "crypto";
import { cookies } from "next/headers";

/**
 * Teacher gate for /admin and /present (local/LAN mode).
 * Set ADMIN_PASSWORD in .env.local to change it. When Supabase is wired up
 * (deployment stage), this is replaced by Supabase Auth email + password.
 */
export const ADMIN_COOKIE = "waukee-admin-session";

function expectedToken(): string {
  const password = process.env.ADMIN_PASSWORD ?? "waukee-admin";
  return createHash("sha256").update(`waukee-session:${password}`).digest("hex");
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "waukee-admin";
  return password === expected;
}

export function sessionToken(): string {
  return expectedToken();
}

export async function isTeacher(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === expectedToken();
}
