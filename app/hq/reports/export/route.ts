import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/auth";
import { audit } from "@/lib/hq/audit";
import { defaultFilters, REPORTS, reportCsv, runReport, type ReportKey } from "@/lib/reports";

/** CSV export of the report on screen (PRD §12.7). Exports are audited (PRD §12.10). */
export async function GET(request: NextRequest) {
  const staff = await getStaff();
  if (!staff || !staff.active || !["admin", "sales", "marketing", "ops", "viewer"].includes(staff.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const tab = (REPORTS.find((r) => r.key === sp.tab)?.key ?? "executive") as ReportKey;
  const f = defaultFilters(sp);
  const csv = reportCsv(await runReport(tab, f));
  await audit("report.export", "report", tab, { ...f });
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="offbook-${tab}-${f.from}-to-${f.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
