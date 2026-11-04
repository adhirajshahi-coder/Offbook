"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/hq/DataTable";

type Row = { when: string; who: string; action: string; target: string; targetType: string; targetId: string; details: string };

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "when", header: "When" },
  { accessorKey: "who", header: "Who" },
  { accessorKey: "action", header: "Action", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
  {
    accessorKey: "target",
    header: "Target",
    cell: ({ row }) =>
      row.original.targetType === "student" ? (
        <Link href={`/hq/ops/students/${row.original.targetId}`} className="text-violet-700 hover:underline">
          {row.original.target}
        </Link>
      ) : (
        row.original.target
      ),
  },
  { accessorKey: "details", header: "Details", cell: ({ getValue }) => <span className="break-all font-mono text-xs text-[#6b6778]">{String(getValue())}</span> },
];

export function AuditTable({ rows }: { rows: Row[] }) {
  return <DataTable data={rows} columns={columns} searchPlaceholder="Search actions, people, targets" csvName="audit-log" />;
}
