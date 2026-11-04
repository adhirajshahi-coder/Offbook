"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/hq/DataTable";
import { StatusBadge } from "@/components/hq/ui";

export type GroupRow = { key: string; prompt: string; type: string; where: string; skill: string; variants: number; published: number };

const columns: ColumnDef<GroupRow, unknown>[] = [
  {
    accessorKey: "prompt",
    header: "Question",
    cell: ({ row }) => (
      <Link href={`/hq/content/questions/group/${encodeURIComponent(row.original.key)}`} className="font-semibold text-violet-700 hover:underline">
        {row.original.prompt.slice(0, 90)}
        {row.original.prompt.length > 90 ? "…" : ""}
      </Link>
    ),
  },
  { accessorKey: "where", header: "Where" },
  { accessorKey: "type", header: "Type", cell: ({ getValue }) => String(getValue()).replace("_", " ") },
  { accessorKey: "skill", header: "Skill" },
  { accessorKey: "variants", header: "Variants" },
  {
    accessorKey: "published",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.published === 0 ? "draft" : "published"} />,
  },
  { accessorKey: "key", header: "Key", cell: ({ getValue }) => <span className="font-mono text-xs text-[#6b6778]">{String(getValue())}</span> },
];

export function QuestionGroupsTable({ rows }: { rows: GroupRow[] }) {
  return <DataTable data={rows} columns={columns} searchPlaceholder="Search questions" csvName="questions" />;
}
