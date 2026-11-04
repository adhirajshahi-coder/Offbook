"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/hq/DataTable";
import { StatusBadge } from "@/components/hq/ui";
import { Extend } from "./SubscriptionControls";

export type SubRow = {
  id: string;
  studentId: string;
  student: string;
  parent: string;
  status: string;
  starts: string;
  ends: string;
  amount: string;
  code: string;
  reminders: string;
};

const columns: ColumnDef<SubRow, unknown>[] = [
  {
    accessorKey: "student",
    header: "Student",
    cell: ({ row }) => (
      <Link href={`/hq/ops/students/${row.original.studentId}`} className="font-semibold text-violet-700 hover:underline">
        {row.original.student}
      </Link>
    ),
  },
  { accessorKey: "parent", header: "Parent" },
  { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
  { accessorKey: "starts", header: "Starts" },
  { accessorKey: "ends", header: "Ends" },
  { accessorKey: "amount", header: "Paid" },
  { accessorKey: "code", header: "Coupon / school" },
  { accessorKey: "reminders", header: "Reminders" },
  { id: "extend", header: "", cell: ({ row }) => (row.original.status === "active" ? <Extend subscriptionId={row.original.id} /> : null) },
];

export function SubscriptionsTable({ rows }: { rows: SubRow[] }) {
  return <DataTable data={rows} columns={columns} searchPlaceholder="Search student or parent" csvName="subscriptions" />;
}
