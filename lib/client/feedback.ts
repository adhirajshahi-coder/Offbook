"use client";

import confetti from "canvas-confetti";

/**
 * Micro-feedback and celebrations (PRD §4.7): a short sound on every
 * answer, vibration where supported, confetti only on milestones. Sound
 * is on by default with a visible mute toggle; reduced motion disables
 * confetti.
 */

const MUTE_KEY = "offbook:muted";

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Storage blocked: the toggle still works for this page.
  }
  window.dispatchEvent(new Event("offbook:mute"));
}

let ctx: AudioContext | null = null;

function tone(freqs: number[], duration = 0.12) {
  if (isMuted()) return;
  try {
    ctx ??= new AudioContext();
    let t = ctx.currentTime;
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
      t += duration * 0.8;
    }
  } catch {
    // Audio not available: silent is fine.
  }
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported.
  }
}

export function feedbackCorrect() {
  tone([660, 880]);
  vibrate(30);
}

export function feedbackOops() {
  tone([330, 262], 0.14);
  vibrate([20, 40, 20]);
}

function reducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** One orchestrated celebration per milestone. */
export function celebrate(size: "small" | "big" = "small") {
  tone(size === "big" ? [523, 659, 784, 1047] : [523, 784], 0.14);
  if (reducedMotion()) return;
  confetti({
    particleCount: size === "big" ? 160 : 70,
    spread: size === "big" ? 100 : 70,
    origin: { y: 0.6 },
    colors: ["#7B14FF", "#FFD23F", "#1FD6A0", "#38BDF8", "#FF5C7A"],
    disableForReducedMotion: true,
  });
}
