/**
 * Calm motion: the in-app version of "reduce motion" (Me → Settings). Kept
 * apart from feedback.ts so pages that only need this don't load confetti.
 */

const CALM_KEY = "offbook:calm";

export function isCalm(): boolean {
  try {
    return localStorage.getItem(CALM_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCalm(calm: boolean) {
  try {
    localStorage.setItem(CALM_KEY, calm ? "1" : "0");
  } catch {
    // Storage blocked: applies to this page only.
  }
  document.documentElement.dataset.calm = calm ? "true" : "false";
  window.dispatchEvent(new Event("offbook:calm"));
}
