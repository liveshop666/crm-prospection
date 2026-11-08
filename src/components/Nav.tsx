"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/actions";
import { Brand } from "@/components/Brand";

type L = { href: string; label: string; icon: string; badge?: "unread" | "messages" };

const GROUPS: { title?: string; links: L[] }[] = [
  { links: [
    { href: "/", label: "Accueil", icon: "🏠", badge: "unread" },
    { href: "/messages", label: "Messages", icon: "📬", badge: "messages" },
    { href: "/agent", label: "Agent", icon: "🤖" },
  ] },
  { title: "Prospection", links: [
    { href: "/pipeline", label: "Pipeline", icon: "📊" },
    { href: "/prospects", label: "Prospects", icon: "👥" },
    { href: "/site", label: "Site", icon: "🌐" },
  ] },
  { title: "Ventes", links: [
    { href: "/offres", label: "Offres", icon: "📄" },
    { href: "/clients", label: "Clients & suivis", icon: "🤝" },
    { href: "/chiffre", label: "Chiffre d'affaires", icon: "💶" },
  ] },
];
const ALL = GROUPS.flatMap((g) => g.links);
/** Barre du bas sur téléphone : 4 raccourcis + « Plus ». */
const MOBILE = ["/", "/messages", "/agent", "/prospects"];

export function Nav({ unread, messages }: { unread: number; messages: number }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [path]);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const count = (l: L) => (l.badge === "unread" ? unread : l.badge === "messages" ? messages : 0);

  return (
    <>
      {/* Ordinateur */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface/70 p-4 backdrop-blur md:flex">
        <div className="mb-6 px-1"><Brand /></div>
        <nav className="flex flex-col gap-4">
          {GROUPS.map((g, i) => (
            <div key={i} className="flex flex-col gap-1">
              {g.title && <div className="px-3 text-[11px] font-semibold tracking-wider text-muted uppercase">{g.title}</div>}
              {g.links.map((l) => (
                <Link key={l.href} href={l.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active(l.href) ? "bg-accent/15 font-semibold text-text shadow-[inset_3px_0_0_var(--accent)]" : "text-muted hover:bg-soft hover:text-text"}`}>
                  <span>{l.icon}</span>{l.label}
                  {count(l) > 0 && <span className="ml-auto rounded-full bg-accent px-1.5 text-xs text-accent-fg">{count(l)}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <form action={signOut} className="mt-auto pt-4"><button className="btn-ghost w-full">Se déconnecter</button></form>
      </aside>

      {/* Téléphone */}
      {more && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-2">
              {ALL.filter((l) => !MOBILE.includes(l.href)).map((l) => (
                <Link key={l.href} href={l.href} className={`flex flex-col items-center gap-1 rounded-xl border border-border p-3 text-center text-xs ${active(l.href) ? "border-accent font-semibold text-accent" : "text-text"}`}>
                  <span className="text-xl">{l.icon}</span>{l.label}
                </Link>
              ))}
            </div>
            <form action={signOut} className="mt-3"><button className="btn-ghost w-full">Se déconnecter</button></form>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/90 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE.map((href) => ALL.find((l) => l.href === href)!).map((l) => (
          <Link key={l.href} href={l.href} className={`relative flex flex-col items-center py-2 text-[11px] ${active(l.href) ? "font-semibold text-accent" : "text-muted"}`}>
            <span className="text-lg">{l.icon}</span>{l.label}
            {count(l) > 0 && <span className="absolute top-1 right-[30%] size-2 rounded-full bg-accent" />}
          </Link>
        ))}
        <button type="button" onClick={() => setMore((m) => !m)}
          className={`flex flex-col items-center py-2 text-[11px] ${more || !MOBILE.some((h) => active(h)) ? "font-semibold text-accent" : "text-muted"}`}>
          <span className="text-lg">☰</span>Plus
        </button>
      </nav>
    </>
  );
}
