import Link from "next/link";
import { Empty, PageHeader, Pill, SetupNotice, SourceBadge } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "boite", label: "Boîte de réception", icon: "📥", hint: "Clients, prospects et demandes vérifiées" },
  { key: "plateformes", label: "Plateformes", icon: "🧲", hint: "Codeur, Fiverr, Malt…" },
  { key: "verifier", label: "À vérifier", icon: "🧐", hint: "Le filtre a un doute : à toi de dire" },
  { key: "autres", label: "Autres", icon: "🗂️", hint: "Factures, newsletters, notifications…" },
  { key: "envoyes", label: "Envoyés", icon: "📤", hint: "Emails écrits depuis le CRM" },
  { key: "spam", label: "Spam", icon: "🚫", hint: "Bloqués par le filtre (gardés 30 jours pour vérifier)" },
] as const;
type Tab = (typeof TABS)[number]["key"];

type Row = Message & { prospects: { id: string; company_name: string } | null };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f, q } = await searchParams;
  const tab: Tab = (TABS.find((t) => t.key === f)?.key ?? "boite");
  const supabase = await createClient();

  let query = supabase.from("messages").select("*, prospects(id, company_name)").order("received_at", { ascending: false }).limit(100);
  if (tab === "boite") query = query.eq("direction", "entrant").eq("verdict", "ok").in("category", ["client", "plateforme"]);
  if (tab === "plateformes") query = query.eq("direction", "entrant").eq("verdict", "ok").eq("category", "plateforme");
  if (tab === "verifier") query = query.eq("direction", "entrant").eq("verdict", "a_verifier");
  if (tab === "autres") query = query.eq("direction", "entrant").eq("verdict", "ok").eq("category", "autre");
  if (tab === "envoyes") query = query.eq("direction", "sortant");
  if (tab === "spam") query = query.eq("verdict", "spam");
  if (q) {
    const s = q.replace(/[%,()"]/g, " ").trim();
    if (s) query = query.or(`subject.ilike.%${s}%,from_email.ilike.%${s}%,from_name.ilike.%${s}%,to_email.ilike.%${s}%,body.ilike.%${s}%`);
  }

  const [{ data, error }, { data: unreadRows }] = await Promise.all([
    query,
    supabase.from("messages").select("verdict, category").eq("direction", "entrant").eq("is_read", false).neq("verdict", "spam").limit(2000),
  ]);
  if (error) return <SetupNotice title="Messages" />;
  const rows = (data ?? []) as Row[];
  const unread = (unreadRows ?? []) as Pick<Message, "verdict" | "category">[];
  const badge: Partial<Record<Tab, number>> = {
    boite: unread.filter((m) => m.verdict === "ok" && m.category !== "autre").length,
    plateformes: unread.filter((m) => m.verdict === "ok" && m.category === "plateforme").length,
    verifier: unread.filter((m) => m.verdict === "a_verifier").length,
    autres: unread.filter((m) => m.verdict === "ok" && m.category === "autre").length,
  };
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Messages" subtitle="Ta boîte mail pro, les demandes des plateformes et du site : tout ici, déjà trié."
        action={<Link href="/messages/nouveau" className="btn-primary">✉️ Écrire</Link>} />

      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link key={t.key} href={`/messages?f=${t.key}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${t.key === tab ? "bg-accent/15 font-semibold text-text" : "text-muted hover:bg-soft hover:text-text"}`}>
            <span>{t.icon}</span>{t.label}
            {!!badge[t.key] && <span className="rounded-full bg-accent px-1.5 text-xs text-accent-fg">{badge[t.key]}</span>}
          </Link>
        ))}
      </div>

      <form className="mb-4 flex gap-2">
        <input type="hidden" name="f" value={tab} />
        <input name="q" defaultValue={q} placeholder="Rechercher : nom, email, objet, texte…" className="input min-w-0 flex-1" />
        <button className="btn-ghost">Rechercher</button>
      </form>

      <p className="mb-2 text-xs text-muted">{current.icon} {current.hint}</p>
      <div className="card divide-y divide-border overflow-hidden">
        {rows.length === 0 ? <Empty>Rien ici pour l&apos;instant.</Empty> : rows.map((m) => {
          const who = m.direction === "sortant" ? `À : ${m.to_email ?? "—"}` : (m.from_name || m.from_email || "Inconnu");
          return (
            <Link key={m.id} href={`/messages/${m.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-soft">
              {!m.is_read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" /> : <span className="mt-1.5 size-2 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`truncate text-sm ${m.is_read ? "" : "font-semibold"}`}>{who}</span>
                  <SourceBadge m={m} />
                  {m.prospects && <span className="truncate text-xs text-muted">· fiche {m.prospects.company_name}</span>}
                  {m.send_status === "a_envoyer" && <Pill className="bg-amber-500/15 text-amber-700 dark:text-amber-300">⏳ en cours d&apos;envoi</Pill>}
                  {m.send_status === "erreur" && <Pill className="bg-rose-500/15 text-rose-600 dark:text-rose-300">⚠️ pas envoyé</Pill>}
                </div>
                <div className={`truncate text-sm ${m.is_read ? "text-muted" : ""}`}>{m.subject || "(sans objet)"}</div>
                <div className="truncate text-xs text-muted">{m.ai_summary || (m.body ?? "").slice(0, 160)}</div>
              </div>
              <span className="shrink-0 text-xs text-muted">{timeAgo(m.received_at)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
