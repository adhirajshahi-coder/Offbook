"use client";

import "@xyflow/react/dist/style.css";
import { Background, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { useMemo, useState } from "react";
import type { GraphLink, GraphSkill } from "@/lib/play/skills";
import { cn } from "@/lib/utils";

const MASTERY = ["Attempted", "Familiar", "Proficient", "Mastered"];

/**
 * Skill tree for a course (PRD §7.3). Solid lines are prerequisites,
 * dashed are related ideas, glowing lines show a skill used in another
 * track. Tap a skill to connect the dots.
 */
export function SkillGraph({ skills, links }: { skills: GraphSkill[]; links: GraphLink[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    // Layer in-course skills by prerequisite depth; linked skills sit in a column on the right.
    const own = skills.filter((s) => s.inCourse);
    const depth = new Map<string, number>(own.map((s) => [s.id, 0]));
    for (let i = 0; i < own.length; i++) {
      for (const l of links) {
        if (l.type === "prerequisite" && depth.has(l.from) && depth.has(l.to)) {
          depth.set(l.to, Math.max(depth.get(l.to)!, depth.get(l.from)! + 1));
        }
      }
    }
    const perLayer = new Map<number, number>();
    const nodes: Node[] = own.map((s) => {
      const d = depth.get(s.id)!;
      const row = perLayer.get(d) ?? 0;
      perLayer.set(d, row + 1);
      return { id: s.id, position: { x: row * 190, y: d * 110 }, data: { label: s.name }, className: nodeClass(s) };
    });
    const maxX = Math.max(0, ...nodes.map((n) => n.position.x)) + 260;
    skills
      .filter((s) => !s.inCourse)
      .forEach((s, i) =>
        nodes.push({ id: s.id, position: { x: maxX, y: i * 90 }, data: { label: `${s.name} · ${s.courseTitle}` }, className: nodeClass(s) }),
      );

    const edges: Edge[] = links.map((l) => ({
      id: `${l.from}-${l.to}-${l.type}`,
      source: l.from,
      target: l.to,
      animated: l.type === "applies_in",
      style:
        l.type === "prerequisite"
          ? { stroke: "var(--accent)", strokeWidth: 2 }
          : l.type === "related"
            ? { stroke: "var(--text-muted)", strokeDasharray: "6 4" }
            : { stroke: "var(--sun)", strokeWidth: 3 },
    }));
    return { nodes, edges };
  }, [skills, links]);

  const skill = skills.find((s) => s.id === selected) ?? null;
  const name = (id: string) => skills.find((s) => s.id === id)?.name ?? "";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="h-80 overflow-hidden rounded-band border border-line bg-bg" aria-label="Skill map">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_, n) => setSelected(n.id)}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1} />
        </ReactFlow>
      </div>

      <aside className="rounded-band border border-line bg-surface p-4" aria-live="polite">
        {skill ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-display text-lg font-black">{skill.name}</p>
              <p className="text-muted">{skill.description}</p>
            </div>
            <Dots title="Built from" items={links.filter((l) => l.to === skill.id && l.type === "prerequisite").map((l) => name(l.from))} />
            <Dots title="Leads to" items={links.filter((l) => l.from === skill.id && l.type === "prerequisite").map((l) => name(l.to))} />
            <Dots
              title="Used in"
              items={links
                .filter((l) => (l.from === skill.id || l.to === skill.id) && l.type !== "prerequisite")
                .map((l) => {
                  const other = skills.find((s) => s.id === (l.from === skill.id ? l.to : l.from));
                  return other ? `${other.name}${other.courseTitle ? ` (${other.courseTitle})` : ""}` : "";
                })}
            />
            <div>
              <p className="font-semibold">Your proof</p>
              <p className="text-muted">
                {skill.mastery >= 0 ? MASTERY[skill.mastery] : "Not practised yet"}
                {skill.lessons.length > 0 && ` · learned in ${skill.lessons.join(", ")}`}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Tap a skill to see what it&apos;s built from, what it leads to, and where else you&apos;ll use it.
          </p>
        )}
      </aside>
    </div>
  );
}

function Dots({ title, items }: { title: string; items: string[] }) {
  const list = items.filter(Boolean);
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <p className="text-muted">{list.length ? list.join(", ") : "Nothing yet"}</p>
    </div>
  );
}

function nodeClass(s: GraphSkill) {
  return cn(
    "!rounded-xl !border-2 !px-3 !py-2 !text-xs !font-semibold !text-ink",
    s.mastery >= 3 ? "!border-mint !bg-[#d9f8ee]" : s.mastery >= 0 ? "!border-[var(--accent)] !bg-white" : "!border-dashed !border-[#b8b2c8] !bg-[#f4f2f8]",
    !s.inCourse && "!opacity-80",
  );
}
