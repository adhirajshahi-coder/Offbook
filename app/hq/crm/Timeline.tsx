import type { TimelineEvent } from "@/lib/crm/data";
import { cn } from "@/lib/utils";
import { CompleteButton } from "./ActivityComposer";

const ICON: Record<string, string> = { call: "📞", meeting: "🗓", whatsapp: "💬", email: "✉", note: "📝", task: "☐", stage: "➜", created: "＋", payment: "₹", usage: "📚" };

export function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

export function Timeline({ events, canWrite }: { events: TimelineEvent[]; canWrite: boolean }) {
  if (events.length === 0) return <p className="text-sm text-[#6b6778]">Nothing yet. Log a call or add a note.</p>;
  const now = new Date().toISOString();
  return (
    <ol className="space-y-2">
      {events.map((e, i) => {
        const overdue = e.kind === "activity" && !e.done && e.at < now;
        return (
          <li key={`${e.at}-${i}`} className="flex gap-2 text-sm">
            <span aria-hidden className="w-5 shrink-0 text-center">
              {ICON[e.activityType ?? e.kind] ?? "•"}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn(e.kind === "activity" && !e.done && "font-semibold", e.done && e.activityType === "task" && "line-through text-[#6b6778]")}>
                {e.title}
                {e.kind === "activity" && !e.done && <span className={cn("ml-2 text-xs font-normal", overdue ? "text-[#b4233f]" : "text-[#6b6778]")}>{overdue ? "Overdue" : "Due"}</span>}
              </p>
              {e.detail && <p className="whitespace-pre-line text-xs text-[#6b6778]">{e.detail}</p>}
              <p className="text-xs text-[#8a8697]">{fmtWhen(e.at)}</p>
            </div>
            {canWrite && e.kind === "activity" && e.id && e.activityType !== "note" && <CompleteButton id={e.id} done={Boolean(e.done)} />}
          </li>
        );
      })}
    </ol>
  );
}
