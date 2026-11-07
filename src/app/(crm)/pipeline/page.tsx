import { Kanban } from "@/components/Kanban";
import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Prospect } from "@/lib/types";

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data } = await supabase.from("prospects").select("*").order("updated_at", { ascending: false }).limit(1000);
  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Glisse une carte pour changer son statut. Ouvre-la pour tout l'historique." />
      <Kanban prospects={(data ?? []) as Prospect[]} />
    </div>
  );
}
