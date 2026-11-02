import type { Metadata } from "next";
import { PolicyPage } from "@/components/marketing/blocks";
import { getPolicy } from "@/lib/public-data";

export const metadata: Metadata = { title: "Refund and cancellation policy" };

export default async function Page() {
  return <PolicyPage policy={await getPolicy("refunds")} fallbackTitle="Refund and cancellation policy" />;
}
