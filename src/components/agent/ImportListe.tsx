"use client";
import { useState } from "react";
import { finImport, importerPaquet } from "@/app/actions-agent";
import { parseCsv, preparer } from "@/lib/import-liste";

/** Bouton « Importer une liste (CSV) » : tout se fait dans le CRM, sans terminal. Rejouable, les doublons sont fusionnés. */
export function ImportListe() {
  const [etat, setEtat] = useState<string | null>(null);
  const [encours, setEncours] = useState(false);

  async function importer(f: File) {
    setEncours(true);
    try {
      const lignes = preparer(parseCsv(await f.text()));
      const exclues = lignes.filter((l) => l.chaine).length;
      const total: Record<string, number> = {};
      for (let i = 0; i < lignes.length; i += 500) {
        setEtat(`⏳ ${i} / ${lignes.length} entreprises envoyées…`);
        const r = await importerPaquet(lignes.slice(i, i + 500));
        if (!r.ok) { setEtat(`❌ Arrêt au paquet ${i / 500 + 1} : ${r.erreur}. Relance l'import : ce qui est déjà importé ne sera pas doublé.`); return; }
        for (const [k, v] of Object.entries(r.bilan ?? {})) if (typeof v === "number") total[k] = (total[k] ?? 0) + v;
      }
      await finImport();
      setEtat(`✅ Terminé : ${lignes.length} lignes lues · ${Object.entries(total).map(([k, v]) => `${k} : ${v}`).join(" · ")} · dont ${exclues} enseignes ou lieux non ciblés mis de côté.`);
    } catch (e) {
      setEtat(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setEncours(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="font-semibold">📥 Importer une liste d&apos;entreprises (CSV)</div>
      <p className="mt-1 text-xs text-muted">Colonnes attendues : entreprise, ville, departement, telephone, metier, secteur, priorite… (le format de « Prospects_Normandie »). Tu peux relancer sans risque : les doublons sont fusionnés.</p>
      <label className={`btn-primary mt-3 cursor-pointer px-5 py-3 text-base ${encours ? "pointer-events-none opacity-50" : ""}`}>
        {encours ? "Import en cours…" : "Choisir le fichier CSV"}
        <input type="file" accept=".csv,text/csv" className="hidden" disabled={encours}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
      </label>
      {etat && <p className="mt-2 text-sm">{etat}</p>}
    </div>
  );
}
