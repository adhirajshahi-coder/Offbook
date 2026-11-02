import type { Metadata } from "next";
import { PolicyPage } from "@/components/marketing/blocks";
import { getPolicy } from "@/lib/public-data";

export const metadata: Metadata = { title: "Privacy notice" };

export default async function Page() {
  return <PolicyPage policy={await getPolicy("privacy")} fallbackTitle="Privacy notice" />;
}
