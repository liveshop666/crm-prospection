import Link from "next/link";
import { STATUS_MAP } from "@/lib/constants";
import type { Prospect, ProspectStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ProspectStatus }) {
  const s = STATUS_MAP[status];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${s.color}`}>{s.emoji} {s.label}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
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
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function ProspectLine({ p, right }: { p: Prospect; right?: React.ReactNode }) {
  return (
    <Link href={`/prospects/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
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
