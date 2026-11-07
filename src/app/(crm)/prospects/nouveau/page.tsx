import { NewProspectForm } from "@/components/NewProspectForm";
import { PageHeader } from "@/components/ui";

export default function NewProspect() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nouveau prospect" subtitle="Seule l'entreprise est obligatoire." />
      <NewProspectForm />
    </div>
  );
}
