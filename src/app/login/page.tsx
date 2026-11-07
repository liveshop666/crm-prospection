"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(params.get("error") === "non_autorise" ? "Ce compte n'a pas accès au CRM." : "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({ email: String(fd.get("email")), password: String(fd.get("password")) });
    setLoading(false);
    if (error) return setError("Email ou mot de passe incorrect.");
    router.replace("/"); router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">C</span> CRM Prospection
      </div>
      <label className="block"><span className="label">Email</span><input name="email" type="email" required autoComplete="email" className="input" /></label>
      <label className="block"><span className="label">Mot de passe</span><input name="password" type="password" required autoComplete="current-password" className="input" /></label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button disabled={loading} className="btn-primary w-full">{loading ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}

export default function LoginPage() {
  return <main className="grid min-h-dvh place-items-center p-4"><Suspense><LoginForm /></Suspense></main>;
}
