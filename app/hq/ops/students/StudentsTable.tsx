"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/hq/DataTable";
import { StatusBadge } from "@/components/hq/ui";

export type StudentRow = {
  id: string;
  name: string;
  class: number;
  band: string;
  level: number;
  xpLevel: number;
  parent: string;
  school: string;
  plan: string;
  lastActive: string;
  status: string;
};

const columns: ColumnDef<StudentRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Student",
    cell: ({ row }) => (
      <Link href={`/hq/ops/students/${row.original.id}`} className="font-semibold text-violet-700 hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "class", header: "Class" },
  { accessorKey: "level", header: "Course level" },
  { accessorKey: "xpLevel", header: "XP level" },
  { accessorKey: "parent", header: "Parent" },
  { accessorKey: "school", header: "School" },
  { accessorKey: "plan", header: "Plan" },
  { accessorKey: "lastActive", header: "Last active" },
  { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
];

export function StudentsTable({ rows }: { rows: StudentRow[] }) {
  return <DataTable data={rows} columns={columns} searchPlaceholder="Search name, parent, school" csvName="students" />;
}
