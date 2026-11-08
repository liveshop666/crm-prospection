import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteMessage, setMessageVerdict } from "@/app/actions-workspace";
import { ConfirmButton } from "@/components/client";
import { Pill, SourceBadge, StatusBadge } from "@/components/ui";
import { ComposeForm, MarkMessageRead } from "@/components/workspace";
import { platformName } from "@/lib/constants";
import { dateTime } from "@/lib/format";
import type { LeadInfo } from "@/lib/messages";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { Message, Prospect } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("messages").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const msg = data as Message;

  const [{ data: p }, { data: threadRows }, settings] = await Promise.all([
    msg.prospect_id ? supabase.from("prospects").select("*").eq("id", msg.prospect_id).maybeSingle() : Promise.resolve({ data: null }),
    msg.thread_id
      ? supabase.from("messages").select("*").eq("thread_id", msg.thread_id).neq("verdict", "spam").order("received_at").limit(50)
      : Promise.resolve({ data: [msg] }),
    getSettings(supabase),
  ]);
  const prospect = p as Prospect | null;
  const thread = ((threadRows ?? [msg]) as Message[]);
  if (!thread.some((m) => m.id === msg.id)) thread.push(msg);

  const lead = (msg.metadata?.lead ?? {}) as LeadInfo;
  const leadLines = [
    lead.contact_name && ["Contact", lead.contact_name], lead.company_name && ["Entreprise", lead.company_name],
    lead.email && ["Email", lead.email], lead.phone && ["Téléphone", lead.phone], lead.city && ["Ville", lead.city],
    lead.interest && ["Besoin", lead.interest], lead.budget && ["Budget", lead.budget],
  ].filter(Boolean) as [string, string][];

  const isPlatform = msg.category === "plateforme";
  const lastIn = [...thread].reverse().find((m) => m.direction === "entrant");
  const replyTo = msg.direction === "sortant" ? msg.to_email : (lead.email && isPlatform ? lead.email : msg.from_email);
  const canReplyByEmail = !!replyTo && !/no-?reply|ne-pas-repondre|notification/i.test(replyTo);
  const replySubject = msg.subject ? `Re: ${msg.subject.replace(/^re:\s*/i, "")}` : "";

  return (
    <div className="mx-auto max-w-5xl">
      <MarkMessageRead id={msg.id} unread={!msg.is_read} />
      <Link href="/messages" className="text-sm text-muted hover:text-text">← Messages</Link>

      <div className="mt-2 mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words">{msg.subject || "(sans objet)"}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <SourceBadge m={msg} />
            <span>{msg.direction === "sortant" ? `À ${msg.to_email}` : `De ${msg.from_name ? `${msg.from_name} ` : ""}${msg.from_email ? `<${msg.from_email}>` : ""}`}</span>
            <span>· {dateTime(msg.received_at)}</span>
          </div>
        </div>
        {prospect && (
          <Link href={`/prospects/${prospect.id}`} className="btn-ghost">👤 {prospect.company_name} <StatusBadge status={prospect.status} /></Link>
        )}
      </div>

      {/* Filtre anti-spam */}
      {msg.verdict === "a_verifier" && (
        <div className="card mb-4 border-amber-400/50 p-4">
          <p className="text-sm font-medium">🧐 Le filtre a un doute sur ce message.</p>
          {msg.ai_summary && <p className="mt-1 text-sm text-muted">{msg.ai_summary}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={setMessageVerdict.bind(null, msg.id, "ok")}><button className="btn-primary">✅ C&apos;est un vrai client</button></form>
            <form action={setMessageVerdict.bind(null, msg.id, "spam")}><button className="btn-ghost">🚫 C&apos;est du spam</button></form>
          </div>
          <p className="mt-2 text-xs text-muted">« Vrai client » crée (ou retrouve) sa fiche et l&apos;ajoute à « Nouveau à voir ».</p>
        </div>
      )}
      {msg.verdict === "spam" && (
        <div className="card mb-4 p-4 text-sm">
          🚫 Classé en spam : aucune fiche n&apos;a été créée.
          <form action={setMessageVerdict.bind(null, msg.id, "ok")} className="mt-2"><button className="btn-ghost">Ce n&apos;est pas du spam</button></form>
        </div>
      )}
      {msg.verdict === "ok" && msg.category === "autre" && !prospect && msg.direction === "entrant" && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
          <span className="text-muted">🗂️ Rangé dans « Autres » (pas une demande client).</span>
          <form action={setMessageVerdict.bind(null, msg.id, "ok")}><button className="btn-ghost">➕ C&apos;est un client : créer sa fiche</button></form>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {thread.map((m) => (
            <article key={m.id} className={`card p-4 ${m.id === msg.id ? "ring-1 ring-accent/40" : ""} ${m.direction === "sortant" ? "ml-6 bg-accent/5" : "mr-6"}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="font-medium text-text">{m.direction === "sortant" ? "Toi" : (m.from_name || m.from_email)}</span>
                <span>{dateTime(m.received_at)}</span>
                {m.send_status === "a_envoyer" && <Pill className="bg-amber-500/15 text-amber-700 dark:text-amber-300">⏳ en cours d&apos;envoi</Pill>}
                {m.send_status === "erreur" && <Pill className="bg-rose-500/15 text-rose-600 dark:text-rose-300">⚠️ pas envoyé</Pill>}
                {m.send_status === "envoye" && <Pill>✓ envoyé</Pill>}
              </div>
              {m.id !== msg.id && m.subject && <div className="mb-1 text-sm font-medium">{m.subject}</div>}
              <div className="text-sm break-words whitespace-pre-line">{m.body || "(message vide)"}</div>
              {m.error && m.send_status !== "envoye" && <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{m.error}</p>}
            </article>
          ))}

          {isPlatform && (
            <div className="card p-4">
              <p className="text-sm">{platformName(msg.source)} ne permet pas de répondre depuis un autre logiciel : on te met directement sur la bonne conversation.</p>
              {msg.platform_url
                ? <a href={msg.platform_url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3">Répondre sur {platformName(msg.source)} ↗</a>
                : <p className="mt-2 text-xs text-muted">Le lien de la conversation n&apos;a pas été trouvé dans l&apos;email : ouvre {platformName(msg.source)} pour répondre.</p>}
            </div>
          )}

          {canReplyByEmail && msg.verdict !== "spam" && (
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">↩️ Répondre par email</h2>
              <ComposeForm to={replyTo} subject={replySubject} replyTo={(lastIn ?? msg).id} prospectId={prospect?.id ?? null} signature={settings.signature} />
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {msg.ai_summary && msg.verdict === "ok" && (
            <section className="card p-4">
              <h2 className="mb-1 text-sm font-semibold">🤖 Résumé</h2>
              <p className="text-sm text-muted">{msg.ai_summary}</p>
            </section>
          )}
          {leadLines.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">🧾 Infos récupérées</h2>
              <dl className="space-y-1 text-sm">
                {leadLines.map(([k, v]) => <div key={k} className="flex justify-between gap-2"><dt className="text-muted">{k}</dt><dd className="truncate text-right">{v}</dd></div>)}
              </dl>
            </section>
          )}
          <form action={deleteMessage.bind(null, msg.id)}>
            <ConfirmButton message="Supprimer ce message du CRM ? (il reste dans ta boîte Gmail)">🗑️ Supprimer du CRM</ConfirmButton>
          </form>
        </aside>
      </div>
    </div>
  );
}
