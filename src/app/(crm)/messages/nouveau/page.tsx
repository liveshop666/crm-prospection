import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ComposeForm } from "@/components/workspace";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { Prospect } from "@/lib/types";

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ prospect?: string }> }) {
  const { prospect: pid } = await searchParams;
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([
    pid ? supabase.from("prospects").select("*").eq("id", pid).maybeSingle() : Promise.resolve({ data: null }),
    getSettings(supabase),
  ]);
  const prospect = data as Prospect | null;
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={prospect ? `/prospects/${prospect.id}` : "/messages"} className="text-sm text-muted hover:text-text">← {prospect ? prospect.company_name : "Messages"}</Link>
      <PageHeader title="Nouvel email" subtitle={prospect ? `À ${prospect.company_name}` : "Il part depuis ton adresse pro. La réponse arrivera dans Messages."} />
      {prospect?.opted_out && (
        <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          ⛔ Ce contact a demandé à ne plus être contacté. N&apos;écris que s&apos;il t&apos;a recontacté lui-même.
        </div>
      )}
      <div className="card p-4">
        <ComposeForm to={prospect?.email} prospectId={prospect?.id ?? null} signature={settings.signature} />
      </div>
    </div>
  );
}
