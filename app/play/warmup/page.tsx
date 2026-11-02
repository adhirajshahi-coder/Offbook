import type { Metadata } from "next";
import { requireStudent } from "@/lib/play/session";
import { RoundClient } from "../round-client";

export const metadata: Metadata = { title: "Daily warm-up" };

export default async function WarmupPage() {
  await requireStudent();
  return <RoundClient kind="warmup" backHref="/play" />;
}
