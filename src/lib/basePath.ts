/**
 * The app is served under /awards (LineupPro proxies mylineuppro.com/awards
 * to this deployment — a Next.js "multi-zone" setup), so client fetches and
 * plain anchors must include the base path. Keep in sync with next.config.ts.
 */
export const BASE_PATH = "/awards";
export const apiPath = (path: string) => `${BASE_PATH}${path}`;
