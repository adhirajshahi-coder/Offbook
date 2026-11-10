/**
 * First-touch marketing attribution (PRD §12.5): when a visitor lands with
 * utm_* or ?ref=CODE, a first-party cookie remembers it for 30 days, and it's
 * copied onto the parent at sign-up. No third-party trackers (PRD §13).
 */

export const ATTR_COOKIE = "ob_attr";
export const ATTR_MAX_AGE = 30 * 24 * 3600;
const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"] as const;

export type Attribution = Partial<Record<(typeof KEYS)[number], string>>;

export function attributionFromSearch(params: URLSearchParams): Attribution | null {
  const out: Attribution = {};
  for (const k of KEYS) {
    const v = params.get(k)?.trim();
    if (v) out[k] = v.slice(0, 80).replace(/[^\w\-. ]/g, "");
  }
  return Object.keys(out).length ? out : null;
}

export function parseAttribution(raw: string | undefined): Attribution {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(KEYS.filter((k) => typeof v[k] === "string").map((k) => [k, String(v[k]).slice(0, 80)])) as Attribution;
  } catch {
    return {};
  }
}
