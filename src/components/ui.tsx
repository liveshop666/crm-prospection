import Link from "next/link";
import { STATUS_MAP, platformName } from "@/lib/constants";
import type { Message, Prospect, ProspectStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ProspectStatus }) {
  const s = STATUS_MAP[status];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${s.color}`}>{s.emoji} {s.label}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: React.ReactNode; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-head text-4xl leading-none font-extrabold tracking-wide uppercase md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-head text-3xl font-extrabold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function ProspectLine({ p, right }: { p: Prospect; right?: React.ReactNode }) {
  return (
    <Link href={`/prospects/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-soft">
      {p.is_unread ? <span className="size-2 shrink-0 rounded-full bg-accent" /> : <span className="size-2 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{p.company_name}</div>
        <div className="truncate text-xs text-muted">
          {[p.sector, p.city, p.interest].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      {right ?? <StatusBadge status={p.status} />}
    </Link>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-muted">{children}</div>;
}

/** Affiché tant que le fichier SQL 0003 n'a pas été lancé dans Supabase. */
export function SetupNotice({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={title} />
      <div className="card p-5 text-sm">
        <p className="font-medium">Cette page n&apos;est pas encore installée dans ta base de données.</p>
        <p className="mt-2 text-muted">
          Dans Supabase → <b>SQL Editor</b> → <b>New query</b>, colle le contenu du fichier{" "}
          <code>supabase/migrations/0003_espace_de_travail.sql</code> (dépôt GitHub crm-prospection) puis clique sur <b>Run</b>.
          Recharge ensuite cette page.
        </p>
      </div>
    </div>
  );
}

export function Pill({ children, className = "bg-soft-2 text-muted" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}>{children}</span>;
}

/** D'où vient un message : email, site, plateforme, ou envoyé par toi. */
export function SourceBadge({ m }: { m: Pick<Message, "source" | "category" | "direction"> }) {
  if (m.direction === "sortant") return <Pill>📤 Envoyé</Pill>;
  if (m.category === "plateforme") return <Pill className="bg-violet-500/15 text-violet-600 dark:text-violet-300">🧲 {platformName(m.source)}</Pill>;
  if (m.source === "site") return <Pill className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">📝 Site</Pill>;
  return <Pill>📥 Email</Pill>;
}
