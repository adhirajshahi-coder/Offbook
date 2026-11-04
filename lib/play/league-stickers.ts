/** Preset league reactions (no free text between children). Shared by server and client. */
export const STICKERS = ["clap", "fire", "star", "rocket", "muscle"] as const;
export type Sticker = (typeof STICKERS)[number];
export const STICKER_EMOJI: Record<Sticker, string> = { clap: "👏", fire: "🔥", star: "⭐", rocket: "🚀", muscle: "💪" };
