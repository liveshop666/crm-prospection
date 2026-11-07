"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions";

const LINKS = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/pipeline", label: "Pipeline", icon: "📊" },
  { href: "/prospects", label: "Prospects", icon: "👥" },
  { href: "/offres", label: "Offres", icon: "📄" },
];

export function Nav({ unread }: { unread: number }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">C</span> CRM
        </div>
        <nav className="flex flex-col gap-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active(l.href) ? "bg-bg font-semibold" : "text-muted hover:bg-bg hover:text-text"}`}>
              <span>{l.icon}</span>{l.label}
              {l.href === "/" && unread > 0 && <span className="ml-auto rounded-full bg-accent px-1.5 text-xs text-accent-fg">{unread}</span>}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="mt-auto"><button className="btn-ghost w-full">Se déconnecter</button></form>
      </aside>
      {/* Mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`relative flex flex-col items-center py-2 text-[11px] ${active(l.href) ? "font-semibold text-accent" : "text-muted"}`}>
            <span className="text-lg">{l.icon}</span>{l.label}
            {l.href === "/" && unread > 0 && <span className="absolute top-1 right-[30%] size-2 rounded-full bg-accent" />}
          </Link>
        ))}
      </nav>
    </>
  );
}
