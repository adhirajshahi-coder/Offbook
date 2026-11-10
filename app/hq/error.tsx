"use client";

import { ErrorView } from "@/components/ErrorView";

export default function HqError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} home="/hq" />;
}
