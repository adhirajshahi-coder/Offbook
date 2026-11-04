"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { hqButton, hqInput } from "./ui";

/**
 * Every HQ list (PRD §10.1): search, sort and CSV export. Columns with an
 * `accessorKey` export their raw value.
 */
export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Search",
  csvName,
  empty = "Nothing here yet.",
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  csvName?: string;
  empty?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function exportCsv() {
    const cols = table.getAllLeafColumns().filter((c) => "accessorKey" in c.columnDef);
    const header = cols.map((c) => String(c.columnDef.header ?? c.id));
    const rows = table.getFilteredRowModel().rows.map((r) => cols.map((c) => r.getValue(c.id)));
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvName ?? "export"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rows = table.getRowModel().rows;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="table-search">
          {searchPlaceholder}
        </label>
        <input
          id="table-search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className={`${hqInput} max-w-xs`}
        />
        <span className="text-xs text-[#6b6778]">
          {table.getFilteredRowModel().rows.length} of {data.length}
        </span>
        {csvName && (
          <button type="button" onClick={exportCsv} className={hqButton("secondary", "ml-auto")}>
            Export CSV
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-[#e4e2ea] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#fafafb] text-left text-xs text-[#6b6778]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 font-semibold">
                    {h.column.getCanSort() ? (
                      <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-ink">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <span aria-hidden>{{ asc: "↑", desc: "↓" }[h.column.getIsSorted() as string] ?? ""}</span>
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#eeecf2] hover:bg-[#fafafb]">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-3 py-2 align-top">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-[#6b6778]">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
