import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/crm";
import { date, euro } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Offer, Prospect } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Votre proposition", robots: { index: false } };

const BRAND = process.env.BRAND_NAME ?? "Ma société";

async function load(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const db = createAdminClient();
  const { data } = await db.from("offers").select("*, prospects(*)").eq("public_token", token).maybeSingle();
  return data as (Offer & { prospects: Prospect }) | null;
}

async function answer(token: string, accepted: boolean) {
  "use server";
  const offer = await load(token);
  if (!offer || !["envoyee", "brouillon"].includes(offer.status)) return;
  const db = createAdminClient();
  await db.from("offers").update({ status: accepted ? "acceptee" : "refusee", answered_at: new Date().toISOString() }).eq("id", offer.id);
  await logActivity(db, {
    prospect: offer.prospects, type: accepted ? "offre_acceptee" : "offre_refusee",
    content: `${offer.title} — ${euro(offer.amount_cents)}`, metadata: { offer_id: offer.id, amount_cents: offer.amount_cents },
    created_by: "client",
  });
  revalidatePath(`/offre/${token}`);
}

export default async function PublicOffer({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const offer = await load(token);
  if (!offer) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 text-sm font-semibold text-accent">{BRAND}</div>
      <div className="card p-6">
        <p className="text-sm text-muted">Proposition pour {offer.prospects.company_name} · {date(offer.created_at)}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{offer.title}</h1>
        {offer.description && <p className="mt-4 text-sm whitespace-pre-line">{offer.description}</p>}
        <div className="mt-6 flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-sm text-muted">Montant</span>
          <span className="text-2xl font-semibold tabular-nums">{euro(offer.amount_cents)}</span>
        </div>

        {offer.status === "acceptee" ? (
          <p className="mt-6 rounded-lg bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            ✅ Merci ! Proposition acceptée. Je reviens vers vous très vite pour la suite.
          </p>
        ) : offer.status === "refusee" ? (
          <p className="mt-6 rounded-lg bg-bg p-4 text-center text-sm text-muted">Proposition déclinée. Merci pour votre retour.</p>
        ) : (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <form action={answer.bind(null, token, true)}><button className="btn-primary w-full py-3">J&apos;accepte la proposition</button></form>
            <form action={answer.bind(null, token, false)}><button className="btn-ghost w-full py-3">Non merci</button></form>
          </div>
        )}
      </div>
    </main>
  );
}
