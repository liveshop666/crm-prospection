import { Nav } from "@/components/Nav";
import { Brand } from "@/components/Brand";
import { RefreshButton } from "@/components/RefreshButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [{ count }, { count: messages }] = await Promise.all([
    supabase.from("prospects").select("id", { count: "exact", head: true }).eq("is_unread", true),
    supabase.from("messages").select("id", { count: "exact", head: true })
      .eq("is_read", false).eq("direction", "entrant").neq("verdict", "spam"),
  ]);
  return (
    <div className="flex min-h-dvh">
      <Nav unread={count ?? 0} messages={messages ?? 0} />
      <main className="min-w-0 flex-1 px-4 pt-4 pb-24 md:px-8 md:pb-10">
        <div className="mb-2 flex items-center justify-between md:justify-end"><span className="md:hidden"><Brand size={34} /></span><span className="flex gap-2"><ThemeToggle /><RefreshButton /></span></div>
        {children}
      </main>
    </div>
  );
}
