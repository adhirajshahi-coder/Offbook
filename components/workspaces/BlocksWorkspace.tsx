"use client";

import * as Blockly from "blockly/core";
import "blockly/blocks";
import * as En from "blockly/msg/en";
import { useEffect, useRef, useState } from "react";
import { useCalm } from "@/components/kid/Wellbeing";
import { Button } from "@/components/ui/button";
import { checkPuzzle, parseGrid, type Block, type Pos } from "@/lib/workspaces/blocks";
import type { BlocksContent } from "@/lib/workspaces/schemas";
import type { WorkspaceProps } from "./CodeStep";

Blockly.setLocale(En as unknown as Record<string, string>);

let defined = false;
function defineBlocks() {
  if (defined) return;
  defined = true;
  Blockly.common.defineBlocksWithJsonArray([
    { type: "ob_forward", message0: "move forward", previousStatement: null, nextStatement: null, colour: 265, tooltip: "Kube moves one square the way it's facing." },
    { type: "ob_left", message0: "turn left ↺", previousStatement: null, nextStatement: null, colour: 200, tooltip: "Kube turns left on the spot." },
    { type: "ob_right", message0: "turn right ↻", previousStatement: null, nextStatement: null, colour: 200, tooltip: "Kube turns right on the spot." },
    {
      type: "ob_repeat",
      message0: "repeat %1 times",
      args0: [{ type: "field_number", name: "TIMES", value: 2, min: 1, max: 20, precision: 1 }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: 40,
      tooltip: "Run the blocks inside again and again.",
    },
  ]);
}

/** Workspace blocks → program tree. Only the stack under "when run" (the first top block) counts. */
function toProgram(first: Blockly.Block | null): Block[] {
  const out: Block[] = [];
  for (let b = first; b; b = b.getNextBlock()) {
    if (b.type === "ob_forward") out.push({ op: "forward" });
    else if (b.type === "ob_left") out.push({ op: "left" });
    else if (b.type === "ob_right") out.push({ op: "right" });
    else if (b.type === "ob_repeat") out.push({ op: "repeat", times: Math.max(1, Math.min(20, Number(b.getFieldValue("TIMES")) || 1)), body: toProgram(b.getInputTargetBlock("DO")) });
  }
  return out;
}

function describe(program: Block[], depth = 0): string {
  return program.map((b) => `${"  ".repeat(depth)}${b.op === "repeat" ? `repeat ${b.times} times\n${describe(b.body, depth + 1)}` : b.op}`).join("\n");
}

/** Block coding (Blockly): guide Kube to the star. Runs locally and on the server, no eval. */
export function BlocksWorkspace({ content, onResult }: WorkspaceProps<BlocksContent>) {
  const host = useRef<HTMLDivElement>(null);
  const ws = useRef<Blockly.WorkspaceSvg | null>(null);
  const calm = useCalm();
  const { start } = parseGrid(content.grid);
  const [pos, setPos] = useState<Pos>(start);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    defineBlocks();
    const contents = [{ kind: "block", type: "ob_forward" }, { kind: "block", type: "ob_left" }, { kind: "block", type: "ob_right" }, ...(content.allowRepeat ? [{ kind: "block", type: "ob_repeat" }] : [])];
    const w = Blockly.inject(host.current, {
      toolbox: { kind: "flyoutToolbox", contents },
      trashcan: true,
      scrollbars: true,
      zoom: { controls: true, startScale: 0.95 },
      renderer: "zelos",
      theme: Blockly.Themes.Zelos ?? undefined,
      move: { scrollbars: true, drag: true, wheel: false },
    });
    ws.current = w;
    return () => w.dispose();
  }, [content.allowRepeat, content.maxBlocks]);

  async function run() {
    if (!ws.current || running) return;
    const tops = ws.current.getTopBlocks(true);
    const program = toProgram(tops[0] ?? null);
    const check = checkPuzzle(content.grid, program, content.maxBlocks);
    setMessage(null);
    setRunning(true);
    // Walk the path so students see what their program did.
    const path = check.result.path;
    for (let i = 0; i < path.length; i++) {
      setPos(path[i]);
      if (!calm) await new Promise((r) => setTimeout(r, 280));
    }
    setRunning(false);
    setMessage(tops.length > 1 && !check.passed ? `${check.message} Only the top stack of blocks runs; join loose blocks to it.` : check.message);
    onResult({ source: describe(program), results: [{ label: "Kube reaches the star", passed: check.passed }], program }, check.passed);
  }

  const cell = 44;
  const width = content.grid[0].length * cell;
  const height = content.grid.length * cell;
  const rot = [0, 90, 180, 270][pos.dir];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[auto_1fr]">
        <svg viewBox={`0 0 ${width} ${height}`} width={Math.min(width, 320)} className="mx-auto rounded-band border border-line bg-surface" role="img" aria-label={`Grid: Kube at column ${pos.x + 1}, row ${pos.y + 1}`}>
          {content.grid.map((row, y) =>
            [...row].map((ch, x) => (
              <g key={`${x}-${y}`}>
                <rect x={x * cell + 1} y={y * cell + 1} width={cell - 2} height={cell - 2} rx="6" fill={ch === "#" ? "#3B3F6B" : "#E9DEFF"} stroke={ch === "#" ? "none" : "#C9B5F5"} />
                {ch === "G" && (
                  <text x={x * cell + cell / 2} y={y * cell + cell / 2 + 8} textAnchor="middle" fontSize="24">
                    ⭐
                  </text>
                )}
              </g>
            )),
          )}
          <g transform={`translate(${pos.x * cell + cell / 2} ${pos.y * cell + cell / 2}) rotate(${rot})`} style={{ transition: calm ? "none" : "transform 0.25s" }}>
            <rect x="-14" y="-14" width="28" height="28" rx="6" fill="#7B14FF" />
            <path d="M6 -6 L14 0 L6 6 Z" fill="#FFD23F" />
            <circle cx="0" cy="-4" r="3" fill="#fff" />
            <circle cx="0" cy="5" r="3" fill="#fff" />
          </g>
        </svg>
        <div ref={host} className="h-[320px] w-full overflow-hidden rounded-band border border-line" aria-label="Block workspace: drag blocks from the left into a stack" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run} disabled={running}>
          {running ? "Running…" : "▶ Run"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setPos(start);
            setMessage(null);
          }}
        >
          Reset Kube
        </Button>
        {content.maxBlocks && <span className="text-sm text-muted">Goal: {content.maxBlocks} blocks or fewer.</span>}
      </div>
      {message && (
        <p className="rounded-band bg-surface p-3 text-sm" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
