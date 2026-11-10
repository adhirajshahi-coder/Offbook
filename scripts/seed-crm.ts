import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Demo CRM data (Phase 5): a handful of schools across the Schools pipeline,
 * their contacts and activities, one campaign and one creator code. Fictional
 * names on .test domains. Safe to re-run: rows are matched by name/email.
 */

const SCHOOLS = [
  { name: "Demo Public School", city: "New Delhi", board: "CBSE", stage: "Pilot running", value: 300_000, contact: { name: "Anita Rao", title: "Principal", kind: "principal", email: "principal@dps.demo.test" }, linkCode: "DEMO2026", daysInStage: 16 },
  { name: "Sunrise Academy", city: "Pune", board: "ICSE", stage: "Meeting booked", value: 150_000, contact: { name: "Vikram Joshi", title: "Activity coordinator", kind: "coordinator", email: "vikram@sunrise.demo.test" }, daysInStage: 3 },
  { name: "Green Valley School", city: "Bengaluru", board: "CBSE", stage: "Proposal sent", value: 450_000, contact: { name: "Farah Khan", title: "Vice principal", kind: "principal", email: "farah@greenvalley.demo.test" }, daysInStage: 20 },
  { name: "Lakeview International", city: "Hyderabad", board: "IB", stage: "New", value: 0, contact: { name: "Rohan Mehta", title: "Head of innovation", kind: "coordinator", email: "rohan@lakeview.demo.test" }, daysInStage: 1 },
  { name: "St. Mary's Convent", city: "Kochi", board: "State", stage: "Paid", value: 240_000, contact: { name: "Sr. Grace Thomas", title: "Principal", kind: "principal", email: "grace@stmarys.demo.test" }, daysInStage: 9 },
];

type Ctx = { salesIds: string[]; marketingId: string | null };

export async function seedCrm(db: SupabaseClient, ctx: Ctx) {
  const { data: pipeline } = await db.from("pipelines").select("id, pipeline_stages(id, name)").eq("slug", "schools").single();
  if (!pipeline) throw new Error("Run the CRM migration first (schools pipeline missing)");
  const stageId = (name: string) => (pipeline.pipeline_stages as { id: string; name: string }[]).find((s) => s.name === name)!.id;
  const now = Date.now();

  const { data: campaign } = await db
    .from("campaigns")
    .upsert({ name: "Back-to-school creator collab", kind: "creator", utm_campaign: "bts-creators", spend_paise: 2_500_000, owner_id: ctx.marketingId }, { onConflict: "utm_campaign" })
    .select("id")
    .single();

  if (!campaign) throw new Error("campaign upsert failed");
  const { data: creator, error: creatorError } = await db
    .from("contacts")
    .upsert({ name: "Neel (demo creator)", email: "neel@creator.demo.test", kind: "creator", source: "manual", owner_id: ctx.marketingId, campaign_id: campaign?.id }, { onConflict: "email" })
    .select("id")
    .single();
  if (creatorError) throw new Error(creatorError.message);
  await db.from("referral_codes").upsert({ code: "NEEL10", contact_id: creator?.id, campaign_id: campaign?.id, payout_percent: 10 }, { onConflict: "code" });

  for (const [i, s] of SCHOOLS.entries()) {
    const owner = ctx.salesIds[i % Math.max(1, ctx.salesIds.length)] ?? null;
    const { data: existingOrg } = await db.from("organizations").select("id").eq("name", s.name).maybeSingle();
    const school = s.linkCode ? (await db.from("schools").select("id").eq("school_code", s.linkCode).maybeSingle()).data : null;
    const orgRow = { name: s.name, kind: "school", city: s.city, board: s.board, owner_id: owner, school_id: school?.id ?? null };
    const orgId = existingOrg
      ? (await db.from("organizations").update(orgRow).eq("id", existingOrg.id).select("id").single()).data!.id
      : (await db.from("organizations").insert(orgRow).select("id").single()).data!.id;
    if (school) await db.from("schools").update({ crm_org_id: orgId }).eq("id", school.id);

    const { data: contact, error: contactError } = await db
      .from("contacts")
      .upsert({ ...s.contact, organization_id: orgId, owner_id: owner, source: i % 2 ? "website" : "referral:partner", campaign_id: i === 1 ? campaign?.id : null }, { onConflict: "email" })
      .select("id")
      .single();

    if (contactError) throw new Error(contactError.message);

    const key = `demo-deal:${s.name}`;
    const { data: deal } = await db.from("deals").select("id, contact_id").eq("automation_key", key).maybeSingle();
    if (deal && !deal.contact_id) await db.from("deals").update({ contact_id: contact?.id }).eq("id", deal.id);
    if (!deal) {
      const { data: created } = await db
        .from("deals")
        .insert({
          pipeline_id: pipeline.id,
          stage_id: stageId(s.stage),
          title: `${s.name} ${s.stage === "Paid" ? "annual program" : "pilot"}`,
          organization_id: orgId,
          contact_id: contact?.id,
          owner_id: owner,
          value_paise: s.value * 100,
          expected_close: new Date(now + (i + 1) * 20 * 86_400_000).toISOString().slice(0, 10),
          source: i % 2 ? "website" : "referral",
          automation_key: key,
        })
        .select("id")
        .single();
      // Backdate the stage so stale / pilot-feedback rules have something to show.
      if (created) await db.from("deals").update({ stage_changed_at: new Date(now - s.daysInStage * 86_400_000).toISOString(), created_at: new Date(now - (s.daysInStage + 10) * 86_400_000).toISOString() }).eq("id", created.id);
      if (created && i !== 2) {
        await db.from("activities").insert({
          type: i === 1 ? "meeting" : "call",
          subject: i === 1 ? "Demo for the coordinators" : "Check in on next steps",
          due_at: new Date(now + (i === 1 ? 0.1 : i + 1) * 86_400_000).toISOString(),
          owner_id: owner,
          deal_id: created.id,
          contact_id: contact?.id,
          organization_id: orgId,
        });
      }
      if (created) {
        await db.from("activities").insert({
          type: "note",
          subject: "First conversation",
          body: "Interested in a term-long pilot for classes 7 and 8. Wants the parent-consent flow explained to the PTA.",
          done_at: new Date(now - (s.daysInStage + 8) * 86_400_000).toISOString(),
          owner_id: owner,
          deal_id: created.id,
          contact_id: contact?.id,
          organization_id: orgId,
        });
      }
    }
  }
  console.log(`✓ CRM: ${SCHOOLS.length} schools with deals, 1 campaign, creator code NEEL10`);
}
