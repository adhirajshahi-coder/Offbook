import type { Metadata } from "next";
import { PolicyPage } from "@/components/marketing/blocks";
import { getPolicy } from "@/lib/public-data";

export const metadata: Metadata = { title: "Terms of use" };

export default async function Page() {
  return <PolicyPage policy={await getPolicy("terms")} fallbackTitle="Terms of use" />;
}
