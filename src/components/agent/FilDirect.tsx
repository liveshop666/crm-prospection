"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type AgentEvent, NIVEAU, heure } from "@/lib/agent";
import { createClient } from "@/lib/supabase/client";

/**
 * Fil en direct : chaque ligne écrite par n8n dans agent_events apparaît ici en moins de 2 secondes
 * (Supabase Realtime), sans recharger la page. Les compteurs se rafraîchissent aussi.
 */
export function FilDirect({ initial, entrepriseId, hauteur = "h-[28rem]", titre }: { initial: AgentEvent[]; entrepriseId?: string; hauteur?: string; titre?: string }) {
  const [events, setEvents] = useState<AgentEvent[]>(initial);
  const [connecte, setConnecte] = useState(false);
  const router = useRouter();
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`agent-fil-${entrepriseId ?? "tout"}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "agent_events",
        ...(entrepriseId ? { filter: `entreprise_id=eq.${entrepriseId}` } : {}),
      }, (payload) => {
        setEvents((prev) => [payload.new as AgentEvent, ...prev].slice(0, 200));
        // les compteurs suivent, sans recharger à chaque ligne
        if (minuteur.current) clearTimeout(minuteur.current);
        minuteur.current = setTimeout(() => router.refresh(), 1500);
      })
      .subscribe((status) => setConnecte(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(canal); };
  }, [entrepriseId, router]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted">
        <span className={titre ? "text-sm font-semibold text-text" : ""}>{titre ?? (entrepriseId ? "Ce que l'agent a fait" : "Fil en direct")}</span>
        <span className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${connecte ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`} />
          {connecte ? "en direct" : "connexion…"}
        </span>
      </div>
      <ol className={`${hauteur} divide-y divide-border overflow-y-auto`}>
        {events.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">L&apos;agent n&apos;a encore rien raconté.</li>}
        {events.map((e) => (
          <li key={e.id} className="flex gap-3 px-4 py-2 text-sm">
            <span className="w-11 shrink-0 tabular-nums text-xs text-muted">{heure(e.created_at)}</span>
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${NIVEAU[e.niveau]?.pastille ?? "bg-slate-400"}`} title={e.niveau} />
            <span className={e.niveau === "erreur" || e.niveau === "alerte" ? NIVEAU[e.niveau].texte : ""}>{e.phrase}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Rafraîchit les zones de la page quand un message ou un réglage change (validation, quota…). */
export function RafraichirEnDirect() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout> | null = null;
    const plus_tard = () => { if (t) clearTimeout(t); t = setTimeout(() => router.refresh(), 1200); };
    const canal = supabase.channel("agent-etat")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_messages" }, plus_tard)
      .on("postgres_changes", { event: "*", schema: "public", table: "config_agent" }, plus_tard)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget" }, plus_tard)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [router]);
  return null;
}
