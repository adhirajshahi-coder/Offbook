"use client";

import { useState } from "react";
import { ActionMessage, useAction } from "@/components/hq/forms";
import { hqButton, hqInput } from "@/components/hq/ui";
import { cn } from "@/lib/utils";
import { saveCampaign, saveReferralCode } from "../actions";

export type CampaignValues = { id: string | null; name: string; kind: string; utm_campaign: string; spend_rupees: string; starts_on: string; ends_on: string };
export type ReferralValues = { id: string | null; code: string; contact_id: string; campaign_id: string; payout_percent: string; paid_out_rupees: string; active: boolean; note: string };

const KINDS = [
  ["creator", "Creator collab"],
  ["school_outreach", "School outreach"],
  ["webinar", "Webinar"],
  ["ads", "Ads"],
  ["event", "Event"],
  ["other", "Other"],
];

function Toggle({ label, children }: { label: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="rounded-md border border-[#e4e2ea] bg-[#fbfbfd] p-3">{children(() => setOpen(false))}</div>
  ) : (
    <button type="button" className={hqButton("ghost", "h-7 px-2 text-xs")} onClick={() => setOpen(true)}>
      {label}
    </button>
  );
}

export function CampaignForm({ initial, label }: { initial: CampaignValues; label: string }) {
  return <Toggle label={label}>{(close) => <CampaignFields initial={initial} close={close} />}</Toggle>;
}

function CampaignFields({ initial, close }: { initial: CampaignValues; close: () => void }) {
  const [v, setV] = useState(initial);
  const { pending, msg, run } = useAction();
  const set = (k: keyof CampaignValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="grid gap-2 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveCampaign(v.id, { ...v, kind: v.kind as "creator", spend_paise: Math.round(Number(v.spend_rupees || 0) * 100) }));
      }}
    >
      <L t="Name">
        <input className={hqInput} value={v.name} onChange={set("name")} required maxLength={120} />
      </L>
      <L t="Type">
        <select className={hqInput} value={v.kind} onChange={set("kind")}>
          {KINDS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </L>
      <L t="UTM campaign (utm_campaign=)">
        <input className={hqInput} value={v.utm_campaign} onChange={set("utm_campaign")} placeholder="diwali-creators" maxLength={60} />
      </L>
      <L t="Spend so far (₹)">
        <input className={hqInput} type="number" min={0} value={v.spend_rupees} onChange={set("spend_rupees")} />
      </L>
      <L t="Starts">
        <input className={hqInput} type="date" value={v.starts_on} onChange={set("starts_on")} />
      </L>
      <L t="Ends">
        <input className={hqInput} type="date" value={v.ends_on} onChange={set("ends_on")} />
      </L>
      <div className="flex items-center gap-2 sm:col-span-3">
        <button type="submit" disabled={pending} className={hqButton("primary", "h-8")}>
          Save campaign
        </button>
        <button type="button" onClick={close} className={hqButton("ghost", "h-8")}>
          Close
        </button>
        <ActionMessage msg={msg} />
      </div>
    </form>
  );
}

export function ReferralForm({ initial, label, contacts, campaigns }: { initial: ReferralValues; label: string; contacts: { id: string; name: string }[]; campaigns: { id: string; name: string }[] }) {
  return <Toggle label={label}>{(close) => <ReferralFields initial={initial} close={close} contacts={contacts} campaigns={campaigns} />}</Toggle>;
}

function ReferralFields({ initial, close, contacts, campaigns }: { initial: ReferralValues; close: () => void; contacts: { id: string; name: string }[]; campaigns: { id: string; name: string }[] }) {
  const [v, setV] = useState(initial);
  const { pending, msg, run } = useAction();
  const set = (k: keyof ReferralValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="grid gap-2 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveReferralCode(v.id, { ...v, paid_out_paise: Math.round(Number(v.paid_out_rupees || 0) * 100) }));
      }}
    >
      <L t="Code">
        <input className={cn(hqInput, "uppercase")} value={v.code} onChange={set("code")} required maxLength={24} />
      </L>
      <L t="Owner (creator or ambassador)">
        <select className={hqInput} value={v.contact_id} onChange={set("contact_id")}>
          <option value="">—</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </L>
      <L t="Campaign">
        <select className={hqInput} value={v.campaign_id} onChange={set("campaign_id")}>
          <option value="">—</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </L>
      <L t="Payout (% of revenue)">
        <input className={hqInput} type="number" min={0} max={100} value={v.payout_percent} onChange={set("payout_percent")} />
      </L>
      <L t="Paid out so far (₹)">
        <input className={hqInput} type="number" min={0} value={v.paid_out_rupees} onChange={set("paid_out_rupees")} />
      </L>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />
        Active
      </label>
      <L t="Note" className="sm:col-span-3">
        <input className={hqInput} value={v.note} onChange={set("note")} maxLength={300} />
      </L>
      <div className="flex items-center gap-2 sm:col-span-3">
        <button type="submit" disabled={pending} className={hqButton("primary", "h-8")}>
          Save code
        </button>
        <button type="button" onClick={close} className={hqButton("ghost", "h-8")}>
          Close
        </button>
        <ActionMessage msg={msg} />
      </div>
    </form>
  );
}

function L({ t, children, className }: { t: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs font-semibold text-[#4f4b5c]", className)}>
      {t}
      {children}
    </label>
  );
}
