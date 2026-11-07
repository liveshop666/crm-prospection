"use client";
import { useActionState } from "react";
import { createProspect } from "@/app/actions";
import { ProspectFields } from "@/components/ProspectFields";

export function NewProspectForm() {
  const [state, action, pending] = useActionState(createProspect, undefined);
  return (
    <form action={action} className="card space-y-4 p-5">
      <ProspectFields />
      {state?.error && (
        <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Création…" : "Créer"}</button>
    </form>
  );
}
