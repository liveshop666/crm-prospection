import { createProspect } from "@/app/actions";
import { ProspectFields } from "@/components/ProspectFields";
import { PageHeader } from "@/components/ui";

export default function NewProspect() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nouveau prospect" subtitle="Ajout manuel. L'agent n8n ajoute les siens tout seul." />
      <form action={createProspect} className="card space-y-4 p-5">
        <ProspectFields />
        <button className="btn-primary w-full">Créer</button>
      </form>
    </div>
  );
}
