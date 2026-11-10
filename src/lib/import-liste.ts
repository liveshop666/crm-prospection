/**
 * Import d'une liste de prospects (CSV) pour l'agent : lecture et préparation dans le navigateur,
 * puis envoi par paquets à la fonction Supabase agent_importer (doublons fusionnés, rejouable).
 * Même logique que agent/import/importer.mjs (dépôt agent-de-solvelab).
 */
// --- métiers en français (la liste mélange des catégories Google en anglais) ---
const METIERS: Record<string, string> = {
  "general contractor": "entreprise du bâtiment", plumber: "plombier", electrician: "électricien",
  "roofing contractor": "couvreur", painter: "peintre", locksmith: "serrurier", "car repair": "garage automobile",
  "tire shop": "spécialiste pneus", "car dealer": "concessionnaire automobile", "car wash": "station de lavage",
  "auto parts store": "magasin de pièces auto", "car rental": "loueur de véhicules", bakery: "boulangerie",
  "pastry shop": "pâtisserie", "butcher shop": "boucherie", "chocolate shop": "chocolaterie", "candy store": "confiserie",
  florist: "fleuriste", "hair salon": "salon de coiffure", "barber shop": "barbier", "beauty salon": "institut de beauté",
  beautician: "esthéticienne", "nail salon": "onglerie", "massage spa": "spa", spa: "spa", "tanning studio": "centre de bronzage",
  "wellness center": "centre de bien-être", "real estate agency": "agence immobilière", "insurance agency": "agence d'assurance",
  "travel agency": "agence de voyages", "tour agency": "agence de voyages", hotel: "hôtel", lodging: "hébergement",
  "bed and breakfast": "chambre d'hôtes", "guest house": "maison d'hôtes", cottage: "gîte", restaurant: "restaurant",
  "french restaurant": "restaurant", "pizza restaurant": "pizzeria", "pizza delivery": "pizzeria", "italian restaurant": "restaurant italien",
  "japanese restaurant": "restaurant japonais", "asian restaurant": "restaurant asiatique", "indian restaurant": "restaurant indien",
  "vietnamese restaurant": "restaurant vietnamien", "seafood restaurant": "restaurant de fruits de mer", "spanish restaurant": "restaurant espagnol",
  "american restaurant": "restaurant", "barbecue restaurant": "restaurant", "mediterranean restaurant": "restaurant",
  "buffet restaurant": "restaurant", "fine dining restaurant": "restaurant gastronomique", "hamburger restaurant": "restaurant de burgers",
  "western restaurant": "restaurant", "african restaurant": "restaurant africain", "brunch restaurant": "restaurant",
  "halal restaurant": "restaurant", "tibetan restaurant": "restaurant", "chicken restaurant": "restaurant", "steak house": "grill",
  "fast food restaurant": "restauration rapide", "meal takeaway": "vente à emporter", "kebab shop": "kebab", "sandwich shop": "sandwicherie",
  "snack bar": "snack", bistro: "bistrot", bar: "bar", pub: "pub", "cocktail bar": "bar à cocktails", "wine bar": "bar à vin",
  "lounge bar": "bar", "sports bar": "bar", brewpub: "brasserie", brewery: "brasserie", cafe: "café", "coffee shop": "café",
  "tea house": "salon de thé", "dessert shop": "glacier", "catering service": "traiteur", "banquet hall": "salle de réception",
  "event venue": "salle de réception", "night club": "discothèque", "dance hall": "salle de danse", "bowling alley": "bowling",
  "amusement center": "centre de loisirs", gym: "salle de sport", "fitness center": "salle de sport", "sports club": "club de sport",
  "sports complex": "complexe sportif", "swimming pool": "piscine", "furniture store": "magasin de meubles",
  "home goods store": "magasin de décoration", "garden center": "jardinerie", garden: "jardinerie",
  "building materials store": "négoce de matériaux", "clothing store": "boutique de vêtements", "womens clothing store": "boutique de mode",
  "sportswear store": "magasin de sport", "jewelry store": "bijouterie", "gift shop": "boutique de cadeaux", "toy store": "magasin de jouets",
  "book store": "librairie", "electronics store": "magasin d'électronique", "cell phone store": "magasin de téléphonie",
  "cosmetics store": "parfumerie", "pet store": "animalerie", "pet care": "toilettage", "veterinary care": "vétérinaire",
  "liquor store": "caviste", "grocery store": "épicerie", "asian grocery store": "épicerie", "food store": "épicerie", deli: "traiteur",
  "general store": "commerce", "convenience store": "supérette", market: "marché", "thrift store": "dépôt-vente", "discount store": "magasin discount",
  laundry: "laverie", storage: "garde-meubles", "moving company": "déménageur", "taxi service": "taxi", "chauffeur service": "VTC",
  "transportation service": "transporteur", "shipping service": "transporteur", "funeral home": "pompes funèbres",
  "child care agency": "garde d'enfants", "medical clinic": "cabinet médical", doctor: "cabinet médical", health: "santé",
  accounting: "cabinet comptable", consultant: "consultant", "marketing consultant": "consultant", finance: "conseil financier",
  "employment agency": "agence d'intérim", "coworking space": "espace de coworking", "art gallery": "galerie d'art",
  farm: "ferme", wholesaler: "grossiste", supplier: "fournisseur", manufacturer: "fabricant", "corporate office": "entreprise",
  "telecommunications service provider": "opérateur télécom", "internet cafe": "cybercafé", "coffee stand": "café",
  "food delivery": "livraison de repas", food: "commerce alimentaire", "association or organization": "association",
};
// Lieux qui ne sont pas des cibles (services publics, grandes surfaces, lieux génériques)
const EXCLUS = new Set([
  "post office", "local government office", "school", "educational institution", "hypermarket", "supermarket",
  "discount supermarket", "department store", "gas station", "electric vehicle charging station", "airport shuttle service",
  "taxi stand", "shopping mall", "movie theater", "tourist information center",
]);
const PAR_SECTEUR: Record<string, string> = {
  "Restaurants et bars": "restaurant", "Commerces de proximité": "commerce", "Coiffure, beauté, bien-être": "salon de coiffure ou de beauté",
  "Hébergement touristique": "hébergement", "Garages auto": "garage automobile", "Immobilier": "agence immobilière",
  "Industrie, négoce, services": "entreprise", "Fermes et vente directe": "ferme", "Associations, clubs, auto-écoles": "association",
  "Cabinets (comptables, avocats, notaires)": "cabinet", "Artisans du bâtiment": "artisan du bâtiment",
};
const GENERIQUES = new Set(["point of interest", "service", "store", "establishment"]);

function metierFr(metier: string | undefined, secteur: string | undefined) {
  const m = (metier ?? "").trim();
  const k = m.toLowerCase();
  if (!m || GENERIQUES.has(k) || m === secteur) return PAR_SECTEUR[secteur ?? ""] ?? "entreprise";
  if (METIERS[k]) return METIERS[k];
  if (PAR_SECTEUR[m]) return PAR_SECTEUR[m];
  // « Électricien » → « électricien », mais « BTP / travaux » reste tel quel
  return /^[A-ZÉÈ][a-zéèêàç]/.test(m) ? m.charAt(0).toLowerCase() + m.slice(1) : m;
}

// Enseignes nationales et franchises : jamais ciblées (le siège décide, pas l'établissement)
const ENSEIGNES = /\b(ibis|novotel|mercure|campanile|kyriad|premi[eè]re classe|b&b h[oô]tel|best western|leclerc|carrefour|intermarch[eé]|super u|hyper u|lidl|aldi|auchan|casino|franprix|monoprix|spar|coccimarket|basic.?fit|orange bleue|keep cool|jardiland|truffaut|mc ?donald|burger king|kfc|quick|subway|domino|matmut|maaf|macif|maif|axa|groupama|allianz|gan |mma |cr[eé]dit agricole|cr[eé]dit mutuel|caisse d.[eé]pargne|banque populaire|bnp|soci[eé]t[eé] g[eé]n[eé]rale|la poste|speedy|norauto|midas|feu vert|point s|euromaster|rent a car|ada |europcar|hertz|avis |sixt|optic 2000|afflelou|krys|g[eé]n[eé]rale d.optique|grand optical|[eé]couter voir|century 21|orpi|lafor[eê]t|guy hoquet|stéphane plaza|st[eé]phane plaza|era immobilier|foncia|citya|nexity|square habitat|weldom|bricomarch[eé]|brico d[eé]p[oô]t|leroy merlin|castorama|point p|gedimat|big mat|tout faire|but |conforama|maisons du monde|action |gifi|noz |la halle|kiabi|jules|celio|camaieu|sfr|bouygues|free |orange )(?=[^a-zà-ÿ])/i;

// --- lecture CSV (séparateur ; ou ,, guillemets gérés) ---
export function parseCsv(txt: string): Record<string, string>[] {
  txt = txt.replace(/^﻿/, "");
  const sep = (txt.split(/\r?\n/, 1)[0].match(/;/g) ?? []).length >= 3 ? ";" : ",";
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) {
      if (ch === '"' && txt[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && txt[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = (rows.shift() ?? []).map((h) => h.trim());
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

function telE164(t: string | undefined) {
  let p = (t ?? "").replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("0") && p.length === 10) p = "+33" + p.slice(1);
  return /^\+\d{8,15}$/.test(p) ? p : null;
}

export function preparer(lignes: Record<string, string>[]) {
  // enseignes : un même nom présent dans 3 villes ou plus
  const parNom = new Map<string, Set<string>>();
  for (const l of lignes) {
    const k = (l.entreprise ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    parNom.set(k, (parNom.get(k) ?? new Set()).add((l.ville ?? "").toLowerCase()));
  }
  const nationaux = new Map<string, number>();
  for (const l of lignes) { const t = telE164(l.telephone); if (t) nationaux.set(t, (nationaux.get(t) ?? 0) + 1); }

  return lignes.map((l) => {
    const k = (l.entreprise ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const tel = telE164(l.telephone);
    const brut = (l.metier ?? "").trim();
    const chaine = (parNom.get(k)?.size ?? 0) >= 3 || (tel && tel.startsWith("+331") && (nationaux.get(tel) ?? 0) >= 3)
      || EXCLUS.has(brut.toLowerCase()) || ENSEIGNES.test(` ${l.entreprise ?? ""} `);
    return {
      nom: l.entreprise, ville: l.ville, departement: l.departement, telephone: tel ?? l.telephone,
      adresse: l.adresse || null, note_google: l.note_google || null, nb_avis: l.nb_avis || null,
      priorite: l.priorite || null, secteur: l.secteur || null, metier: metierFr(brut, l.secteur), metier_brut: brut || null,
      origine: l.origine || null, chaine,
      automatisations: [l.proposition_1, l.proposition_2, l.proposition_3].filter(Boolean),
      // la colonne « email » n'est reprise que si elle contient une vraie adresse publiée
      email: /@/.test(l.email ?? "") ? l.email : null,
    };
  });
}

