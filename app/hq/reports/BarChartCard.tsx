"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Format = "rupees" | "count" | "pct" | "hours";

const fmt = (v: number, f: Format) =>
  f === "rupees" ? `₹${Math.round(v / 100).toLocaleString("en-IN")}` : f === "pct" ? `${v}%` : f === "hours" ? `${v} h` : v.toLocaleString("en-IN");
const short = (v: number, f: Format) => {
  if (f !== "rupees") return fmt(v, f);
  const r = v / 100;
  return r >= 1e7 ? `₹${(r / 1e7).toFixed(1)}Cr` : r >= 1e5 ? `₹${(r / 1e5).toFixed(1)}L` : r >= 1e3 ? `₹${Math.round(r / 1e3)}k` : `₹${Math.round(r)}`;
};

/**
 * One series, one hue (violet-600, validated against the white HQ surface),
 * thin bars with rounded data ends, recessive grid, hover tooltip, and a
 * table view for screen readers and exact values.
 */
export function BarChartCard({ title, format, data }: { title: string; format: Format; data: { label: string; value: number }[] }) {
  const empty = data.every((d) => d.value === 0);
  return (
    <figure className="rounded-lg border border-[#e4e2ea] bg-white p-4">
      <figcaption className="text-sm font-bold">{title}</figcaption>
      {empty ? (
        <p className="py-10 text-center text-sm text-[#6b6778]">No data for these filters.</p>
      ) : (
        <div className="mt-3 h-56" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="#eeecf2" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#d9d6e2" }} tick={{ fontSize: 11, fill: "#6b6778" }} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11, fill: "#6b6778" }} tickFormatter={(v: number) => short(v, format)} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "#f4f2f8" }}
                formatter={(v) => [fmt(Number(v), format), title]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e4e2ea", fontSize: 12, color: "#121214" }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="value" fill="#7B14FF" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-[#6b6778]">Show as table</summary>
        <table className="mt-1 w-full">
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-[#eeecf2]">
                <td className="py-1">{d.label}</td>
                <td className="py-1 text-right tabular-nums">{fmt(d.value, format)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
