# API du CRM pour n8n

Toutes les routes `/api/n8n/*` demandent le header :

```
x-api-key: <CRM_API_KEY>
```

Dans n8n : nœud **HTTP Request** → Authentication : *Generic Credential Type* → *Header Auth* → Name `x-api-key`, Value = ta clé.

---

## 1. Ajouter des prospects (agent de recherche)

`POST /api/n8n/prospects`

Un prospect seul, ou plusieurs avec `{ "prospects": [ ... ] }`. Les doublons (même téléphone, email ou SIRET) sont fusionnés automatiquement.

```json
{
  "prospects": [
    {
      "company_name": "Boulangerie Martin",
      "contact_name": "Paul Martin",
      "sector": "boulangerie",
      "city": "Lyon",
      "address": "12 rue X, 69003 Lyon",
      "phone": "06 12 34 56 78",
      "email": "contact@boulangerie-martin.fr",
      "website": null,
      "siret": "12345678900011",
      "size": "tpe",
      "channel": "sms",
      "source": "google_maps",
      "score": 82,
      "interest": "site vitrine",
      "ai_summary": "Pas de site, 4,8★ sur Google (230 avis). Bon candidat pour un site vitrine + commande en ligne.",
      "tags": ["sans-site", "lyon"]
    }
  ]
}
```

Réponse : `{ created, updated, failed, results: [{ ok, created, prospect: { id, ref_slug, tracking_url, ... } }] }`

👉 `tracking_url` est **le lien personnalisé à mettre dans le SMS / email** (ex : `https://crm.tondomaine.fr/r/a9c9ef62`). Il enregistre le clic puis redirige vers ton site avec `?ref=a9c9ef62`.

---

## 2. Récupérer les prospects à contacter

`GET /api/n8n/prospects?status=nouveau&channel=sms&limit=20`

| Paramètre | Exemple | Effet |
|---|---|---|
| `status` | `nouveau` ou `nouveau,contacte` | filtre par statut |
| `channel` | `sms` / `email` | filtre par canal |
| `due_followup` | `true` | uniquement ceux dont `next_followup_at` est passé (relances) |
| `limit` | `20` | max 500 |

Les prospects qui ont répondu **STOP ne sont jamais renvoyés**.

---

## 3. Enregistrer un événement (SMS envoyé, réponse reçue, RDV…)

`POST /api/n8n/activities`

```json
{
  "phone": "+33612345678",
  "type": "sms_sortant",
  "content": "Bonjour M. Martin, c'est Nolla…",
  "metadata": { "provider_id": "abc123" },
  "prospect": { "next_followup_at": "2026-11-10T09:30:00+01:00" }
}
```

Pour retrouver le prospect, donne **un** de : `prospect_id`, `ref`, `phone`, `email`.

| `type` | Quand | Effet automatique |
|---|---|---|
| `sms_sortant` / `email_sortant` | l'agent a envoyé un message | statut → **contacté** |
| `relance` | relance envoyée | met à jour la date de dernier contact |
| `sms_entrant` / `email_entrant` | le prospect a répondu | 🔔 notification, fiche marquée « à voir », relances stoppées. Un « STOP » coupe tout définitivement. |
| `rdv` | RDV pris (Cal.com…) | statut → **RDV**, 🔔 notification |
| `formulaire` | demande via ton site | statut → **chaud**, 🔔 notification |
| `note` | info libre | — |
| `stop` | désinscription | ne plus jamais contacter |

Champs optionnels :
- `"status": "chaud"` → force le statut (ex : l'IA a classé la réponse). Valeurs : `nouveau, contacte, a_visite, chaud, rdv, offre_envoyee, valide, perdu`
- `"prospect": { "ai_summary": "...", "interest": "...", "score": 90 }` → met à jour la fiche en même temps
- `"notify": false` → pas de notification

Un message entrant d'un numéro / email inconnu **crée automatiquement** un prospect.

---

## 4. Lire / modifier une fiche

- `GET /api/n8n/prospects/:id` → fiche + 30 dernières activités (donne-les à l'IA pour qu'elle réponde avec le contexte). `:id` peut aussi être le `ref_slug`.
- `PATCH /api/n8n/prospects/:id` → `{ "status": "perdu", "reason": "Pas intéressé", "ai_summary": "..." }`

---

## 5. Statistiques

`GET /api/n8n/stats` → envoyés / réponses / clics du jour et de la semaine, montant signé… Parfait pour un récap quotidien sur ton téléphone.

---

## Webhooks envoyés PAR le CRM vers n8n

Quand quelque chose d'important arrive, le CRM fait un `POST` sur `N8N_NOTIFY_WEBHOOK_URL` (header `x-crm-secret`) :

```json
{
  "event": "prospect.formulaire",
  "at": "2026-11-07T15:02:11.000Z",
  "prospect": { "id": "...", "company_name": "Boulangerie Martin", "phone": "+33612345678", "status": "chaud", "interest": "site vitrine" },
  "activity": { "type": "formulaire", "content": "Besoin : Site internet\nBudget : 1500 €\n..." },
  "link": "https://crm.tondomaine.fr/prospects/..."
}
```

| `event` | Quand |
|---|---|
| `prospect.formulaire` | demande reçue via ton site |
| `prospect.rdv` | RDV pris |
| `prospect.reponse` | réponse SMS / email |
| `prospect.chaud` | passé en chaud (classement IA) |
| `offre.acceptee` | ✅ le client a accepté ton offre |
| `offre.refusee` | le client a refusé |

→ Dans n8n : **Webhook** → **IF** sur `event` → **Telegram** / push : « 🔥 Boulangerie Martin veut un site — [ouvrir] ».

---

## Formulaire de ton site → CRM

`POST /api/public/lead` (pas de clé, appelé par ton site). JSON ou formulaire HTML classique :

```html
<form action="https://crm.tondomaine.fr/api/public/lead" method="POST">
  <input type="hidden" name="ref" id="ref">
  <input type="hidden" name="redirect" value="https://tonsite.fr/merci">
  <input name="hp" style="display:none" tabindex="-1" autocomplete="off"> <!-- anti-spam -->
  <input name="name" placeholder="Votre nom">
  <input name="company" placeholder="Entreprise">
  <input name="email" type="email">
  <input name="phone" type="tel">
  <select name="interest">
    <option>Site internet</option><option>Automatisation</option><option>Logiciel sur mesure</option>
  </select>
  <input name="budget" placeholder="Budget">
  <textarea name="message"></textarea>
  <button>Envoyer</button>
</form>
<script>
  // relie la demande au prospect qui vient du SMS
  document.getElementById('ref').value = new URLSearchParams(location.search).get('ref')
    || localStorage.getItem('ref') || '';
  const r = new URLSearchParams(location.search).get('ref'); if (r) localStorage.setItem('ref', r);
</script>
```
