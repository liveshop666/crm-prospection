"use client";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { setStatus } from "@/app/actions";
import { STATUSES } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import type { Prospect, ProspectStatus } from "@/lib/types";

export function Kanban({ prospects }: { prospects: Prospect[] }) {
  const [, start] = useTransition();
  const [items, move] = useOptimistic(prospects, (state, { id, status }: { id: string; status: ProspectStatus }) =>
    state.map((p) => (p.id === id ? { ...p, status } : p)));

  const drop = (status: ProspectStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    start(async () => { move({ id, status }); await setStatus(id, status); });
  };

  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-4">
      {STATUSES.map((s) => {
        const col = items.filter((p) => p.status === s.value);
        return (
          <div key={s.value} onDragOver={(e) => e.preventDefault()} onDrop={drop(s.value)}
            className="flex w-72 shrink-0 snap-start flex-col rounded-xl border border-border bg-surface/60">
            <div className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold">
              <span>{s.emoji} {s.label}</span><span className="text-xs font-normal text-muted">{col.length}</span>
            </div>
            <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
              {col.map((p) => (
                <Link key={p.id} href={`/prospects/${p.id}`} draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                  className="card block cursor-grab p-3 hover:border-accent active:cursor-grabbing">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {p.is_unread && <span className="size-2 shrink-0 rounded-full bg-accent" />}
                    <span className="truncate">{p.company_name}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">{[p.sector, p.city].filter(Boolean).join(" · ") || "—"}</div>
                  {p.interest && <div className="mt-2 inline-block rounded bg-soft px-1.5 py-0.5 text-[11px]">{p.interest}</div>}
                  <div className="mt-2 text-[11px] text-muted">{timeAgo(p.updated_at)}{p.link_clicks > 0 && ` · 👀 ${p.link_clicks}`}</div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
