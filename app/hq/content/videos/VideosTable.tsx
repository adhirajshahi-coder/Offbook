"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/hq/DataTable";
import { ActionButton } from "@/components/hq/forms";
import { StatusBadge } from "@/components/hq/ui";
import { refreshVideo } from "./actions";

type Row = { id: string; title: string; teacher: string; zone: string; status: string; duration: number; created: string; error: string };

const fmt = (s: number) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "");

const columns: ColumnDef<Row, unknown>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <Link href={`/hq/content/videos/${row.original.id}`} className="font-semibold text-violet-700 hover:underline">
        {row.original.title}
      </Link>
    ),
  },
  { accessorKey: "teacher", header: "Teacher" },
  { accessorKey: "zone", header: "Zone" },
  {
    accessorKey: "duration",
    header: "Length",
    cell: ({ row }) => (
      <span>
        {fmt(row.original.duration)}
        {row.original.duration > 360 && <span className="ml-1 text-xs font-semibold text-[#7a5410]">Over 6 min</span>}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <StatusBadge status={row.original.status} />
        {row.original.error && <span className="text-xs text-[#b4233f]">{row.original.error}</span>}
      </div>
    ),
  },
  { accessorKey: "created", header: "Added" },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      row.original.status === "uploading" || row.original.status === "processing" ? (
        <ActionButton variant="ghost" className="h-7 text-xs" onClick={() => refreshVideo(row.original.id)}>
          Check status
        </ActionButton>
      ) : null,
  },
];

export function VideosTable({ rows }: { rows: Row[] }) {
  return <DataTable data={rows} columns={columns} searchPlaceholder="Search videos" csvName="videos" empty="No videos yet. Upload the first one above." />;
}
