import type { Metadata } from "next";
import { ActionButton } from "@/components/hq/forms";
import { Card, PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteCustomField } from "../crm-actions";
import { NewFieldForm } from "./NewFieldForm";

export const metadata: Metadata = { title: "Custom fields" };

const OBJECTS = [
  ["contact", "Contacts"],
  ["organization", "Organizations"],
  ["deal", "Deals"],
  ["family", "Families"],
] as const;
const TYPE_LABEL: Record<string, string> = { text: "Text", number: "Number", date: "Date", select: "Select", multi_select: "Multi-select", url: "URL" };

export default async function FieldsSettingsPage() {
  await requireStaff([]);
  const supabase = await createClient();
  const { data } = await supabase.from("custom_fields").select("id, object, key, label, type, options").order("order_index");

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="Custom fields" description="Extra fields on CRM records (PRD §12.1). They appear on each record's form." />
      <Card title="Add a field">
        <NewFieldForm />
      </Card>
      {OBJECTS.map(([object, label]) => {
        const list = (data ?? []).filter((f) => f.object === object);
        return (
          <Card key={object} title={label}>
            {list.length === 0 ? (
              <p className="text-sm text-[#6b6778]">No custom fields.</p>
            ) : (
              <ul className="divide-y divide-[#eeecf2] text-sm">
                {list.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span>
                      <span className="font-semibold">{f.label}</span> <span className="text-xs text-[#6b6778]">{TYPE_LABEL[f.type]}</span>
                      {(f.options as string[]).length > 0 && <span className="block text-xs text-[#6b6778]">{(f.options as string[]).join(" · ")}</span>}
                    </span>
                    <ActionButton variant="ghost" confirm={`Remove "${f.label}"?`} onClick={deleteCustomField.bind(null, f.id)}>
                      Remove
                    </ActionButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
