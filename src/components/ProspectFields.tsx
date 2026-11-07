import type { Prospect } from "@/lib/types";

const F = ({ name, label, p, type = "text", placeholder }: { name: keyof Prospect; label: string; p?: Prospect; type?: string; placeholder?: string }) => (
  <label className="block">
    <span className="label">{label}</span>
    <input name={name} type={type} placeholder={placeholder} defaultValue={(p?.[name] as string | number | null) ?? ""} className="input" required={name === "company_name"} />
  </label>
);

export function ProspectFields({ p }: { p?: Prospect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <F name="company_name" label="Entreprise *" p={p} />
      <F name="contact_name" label="Contact" p={p} placeholder="M. Martin" />
      <F name="sector" label="Métier" p={p} placeholder="Boulangerie" />
      <F name="city" label="Ville" p={p} />
      <F name="phone" label="Téléphone" p={p} type="tel" placeholder="06 12 34 56 78" />
      <F name="email" label="Email" p={p} type="email" />
      <F name="website" label="Site actuel" p={p} placeholder="vide = pas de site" />
      <F name="siret" label="SIRET" p={p} />
      <F name="interest" label="Besoin / intérêt" p={p} placeholder="Site vitrine, automatisation…" />
      <F name="score" label="Score (0-100)" p={p} type="number" />
      <label className="block">
        <span className="label">Taille</span>
        <select name="size" defaultValue={p?.size ?? ""} className="input">
          <option value="">—</option><option value="tpe">TPE / artisan</option><option value="pme">PME</option><option value="grande">Grande société</option>
        </select>
      </label>
      <label className="block">
        <span className="label">Canal de contact</span>
        <select name="channel" defaultValue={p?.channel ?? ""} className="input">
          <option value="">—</option><option value="sms">SMS</option><option value="email">Email</option><option value="autre">Autre</option>
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Adresse</span>
        <input name="address" defaultValue={p?.address ?? ""} className="input" />
      </label>
    </div>
  );
}
