"use client";

import dynamic from "next/dynamic";
import type { ShellLevel } from "@/components/kid/GameShell";
import type { BotConfig } from "@/lib/games/bot-builder";
import type { BudgetConfig } from "@/lib/games/budget-bazaar";
import type { DojoConfig } from "@/lib/games/decision-dojo";
import type { GameSlug } from "@/lib/games/registry";
import type { SayConfig } from "@/lib/games/say-it-better";
import type { SprintConfig } from "@/lib/games/startup-sprint";

// Each game loads only when opened (PRD §17: lazy-load games).
const loading = () => <p className="p-8 text-center text-muted">Loading the game…</p>;
const BudgetBazaar = dynamic(() => import("./BudgetBazaar").then((m) => m.BudgetBazaar), { loading });
const DecisionDojo = dynamic(() => import("./DecisionDojo").then((m) => m.DecisionDojo), { loading });
const SayItBetter = dynamic(() => import("./SayItBetter").then((m) => m.SayItBetter), { loading });
const BotBuilder = dynamic(() => import("./BotBuilder").then((m) => m.BotBuilder), { loading });
const StartupSprint = dynamic(() => import("./StartupSprint").then((m) => m.StartupSprint), { loading });

export function GameView({ slug, config, ...rest }: { slug: GameSlug; config: unknown; levels: ShellLevel[]; xpToday: number; title: string; intro: string; preview?: boolean }) {
  switch (slug) {
    case "budget-bazaar":
      return <BudgetBazaar config={config as BudgetConfig} {...rest} />;
    case "decision-dojo":
      return <DecisionDojo config={config as DojoConfig} {...rest} />;
    case "say-it-better":
      return <SayItBetter config={config as SayConfig} {...rest} />;
    case "bot-builder":
      return <BotBuilder config={config as BotConfig} {...rest} />;
    case "startup-sprint":
      return <StartupSprint config={config as SprintConfig} {...rest} />;
  }
}
