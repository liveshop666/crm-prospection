import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { count } = await supabase.from("prospects").select("id", { count: "exact", head: true }).eq("is_unread", true);
  return (
    <div className="flex min-h-dvh">
      <Nav unread={count ?? 0} />
      <main className="min-w-0 flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-10">{children}</main>
    </div>
  );
}
