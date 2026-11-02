"use client";

import { getRound, getWarmup, submitRound, submitWarmup } from "@/app/play/learn/actions";
import { RoundRunner } from "@/components/kid/RoundRunner";

export function RoundClient({ kind, missionId, backHref }: { kind: "quiz" | "boss" | "warmup"; missionId?: string; backHref: string }) {
  if (kind === "warmup") {
    return <RoundRunner kind="warmup" load={() => getWarmup()} submit={(answers) => submitWarmup(answers)} backHref={backHref} backLabel="Back to Today" />;
  }
  return (
    <RoundRunner
      kind={kind}
      load={() => getRound(missionId!, kind)}
      submit={(answers) => submitRound({ missionId: missionId!, kind, answers })}
      backHref={backHref}
      backLabel="Back to the course"
    />
  );
}
