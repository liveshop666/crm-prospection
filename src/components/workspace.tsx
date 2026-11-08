"use client";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createAgentTask, markMessageRead, sendEmail } from "@/app/actions-workspace";

type State = { error?: string; ok?: string } | undefined;

function Submit({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={className}>{pending ? "Un instant…" : children}</button>;
}

function Feedback({ state }: { state: State }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${state.error ? "bg-rose-500/10 text-rose-600 dark:text-rose-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

export function MarkMessageRead({ id, unread }: { id: string; unread: boolean }) {
  useEffect(() => { if (unread) markMessageRead(id); }, [id, unread]);
  return null;
}

/** Écrire / répondre à un email. Il part depuis ton Gmail pro (via n8n). */
export function ComposeForm({ to, subject, replyTo, prospectId, signature, compact }: {
  to?: string | null; subject?: string | null; replyTo?: string; prospectId?: string | null; signature?: string; compact?: boolean;
}) {
  const [state, action] = useActionState<State, FormData>(sendEmail, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  const initialBody = signature ? `Bonjour,\n\n\n\n${signature}` : "Bonjour,\n\n";
  return (
    <form ref={form} action={action} className="space-y-2">
      {replyTo && <input type="hidden" name="reply_to" value={replyTo} />}
      {prospectId && <input type="hidden" name="prospect_id" value={prospectId} />}
      <div className={compact ? "grid gap-2 sm:grid-cols-2" : "space-y-2"}>
        <label className="block"><span className="label">À</span>
          <input name="to" type="email" required defaultValue={to ?? ""} placeholder="client@entreprise.fr" className="input" /></label>
        <label className="block"><span className="label">Objet</span>
          <input name="subject" defaultValue={subject ?? ""} placeholder="Objet de l'email" className="input" /></label>
      </div>
      <label className="block"><span className="label">Message</span>
        <textarea name="body" required rows={compact ? 6 : 10} defaultValue={initialBody} className="input" /></label>
      <Feedback state={state} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">Envoyé depuis ton adresse pro, la réponse reviendra ici.</span>
        <Submit>✉️ Envoyer</Submit>
      </div>
    </form>
  );
}

/** Un formulaire d'ordre pour l'agent (recherche, envoi, relances, consigne). */
export function AgentTaskForm({ type, children, button }: { type: string; children: React.ReactNode; button: string }) {
  const [state, action] = useActionState<State, FormData>(createAgentTask, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="type" value={type} />
      {children}
      <Feedback state={state} />
      <Submit className="btn-primary w-full">{button}</Submit>
    </form>
  );
}
