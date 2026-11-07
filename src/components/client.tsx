"use client";
import { useEffect, useState, useTransition } from "react";
import { markRead, setStatus } from "@/app/actions";
import { STATUSES } from "@/lib/constants";
import type { ProspectStatus } from "@/lib/types";

export function StatusSelect({ id, status }: { id: string; status: ProspectStatus }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Statut" disabled={pending} defaultValue={status} className="input w-auto font-medium"
      onChange={(e) => start(() => setStatus(id, e.target.value as ProspectStatus))}
    >
      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
    </select>
  );
}

export function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn-ghost"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }}>
      {ok ? "Copié ✓" : label}
    </button>
  );
}

export function MarkRead({ id, unread }: { id: string; unread: boolean }) {
  useEffect(() => { if (unread) markRead(id); }, [id, unread]);
  return null;
}

export function ConfirmButton({ children, message, className = "btn-danger" }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>
  );
}
