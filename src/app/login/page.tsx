"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Brand } from "@/components/Brand";
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
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setLoading(false);
      return setError("Configuration manquante : NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY n'est pas dans Vercel (ou ajoutée sans Redeploy).");
    }
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: String(fd.get("email")).trim(), password: String(fd.get("password")),
      });
      setLoading(false);
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("email not confirmed")) return setError("Email pas confirmé : dans Supabase > Authentication > Users, recrée l'utilisateur en cochant « Auto Confirm User ».");
        if (m.includes("invalid login")) return setError("Email ou mot de passe incorrect (vérifie l'utilisateur dans Supabase > Authentication > Users).");
        if (m.includes("api key") || m.includes("apikey")) return setError("Clé Supabase invalide : vérifie NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel, puis Redeploy.");
        return setError(`Erreur Supabase : ${error.message}`);
      }
      router.replace("/"); router.refresh();
    } catch (err) {
      setLoading(false);
      setError(`Impossible de joindre Supabase : vérifie NEXT_PUBLIC_SUPABASE_URL dans Vercel (${err instanceof Error ? err.message : String(err)}).`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
      <div className="mb-2"><Brand size={48} /></div>
      <h1 className="font-head text-3xl leading-none font-extrabold uppercase">Connexion <span className="text-warm">à ton CRM</span></h1>
      <label className="block"><span className="label">Email</span><input name="email" type="email" required autoComplete="email" className="input" /></label>
      <label className="block"><span className="label">Mot de passe</span><input name="password" type="password" required autoComplete="current-password" className="input" /></label>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <button disabled={loading} className="btn-primary w-full">{loading ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}

export default function LoginPage() {
  return <main className="grid min-h-dvh place-items-center p-4"><Suspense><LoginForm /></Suspense></main>;
}
