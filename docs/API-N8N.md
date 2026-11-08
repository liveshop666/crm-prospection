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
| `sms_entrant` / `email_entrant` | le prospect a répondu | fiche marquée « Nouveau à voir », relances stoppées. Un « STOP » coupe tout définitivement. |
| `rdv` | RDV pris (Cal.com…) | statut → **RDV**, fiche marquée « Nouveau à voir » |
| `formulaire` | demande via ton site | statut → **chaud**, fiche marquée « Nouveau à voir » |
| `note` | info libre | — |
| `stop` | désinscription | ne plus jamais contacter |
| `demande_plateforme` | demande reçue sur Codeur, Fiverr, Malt… | statut → **chaud**, fiche marquée « Nouveau à voir » |

Champs optionnels :
- `"status": "chaud"` → force le statut (ex : l'IA a classé la réponse). Valeurs : `nouveau, contacte, a_visite, chaud, rdv, offre_envoyee, valide, perdu`
- `"prospect": { "ai_summary": "...", "interest": "...", "score": 90 }` → met à jour la fiche en même temps

Un message entrant d'un numéro / email inconnu **crée automatiquement** un prospect.
Un `email_entrant` (ou `sms_entrant`) qui commence par « STOP » / « désinscription » coupe tout, comme le type `stop`.

---

## 4. Lire / modifier une fiche

- `GET /api/n8n/prospects/:id` → fiche + 30 dernières activités (donne-les à l'IA pour qu'elle réponde avec le contexte). `:id` peut aussi être le `ref_slug`.
- `PATCH /api/n8n/prospects/:id` → `{ "status": "perdu", "reason": "Pas intéressé", "ai_summary": "..." }`

---

## 5. Statistiques

`GET /api/n8n/stats` → envoyés / réponses / clics du jour et de la semaine, montant signé… Parfait pour un récap quotidien par email.

---

## 6. Boîte mail pro → CRM (workflow `07-boite-mail`)

`POST /api/n8n/messages` — un email reçu, **déjà trié par l'IA**. Un seul, ou `{ "messages": [ ... ] }`. Dédoublonné par `external_id`.

```json
{
  "external_id": "18c2f…",            // id du message Gmail
  "thread_id": "18c2e…",              // id de la conversation Gmail
  "from_email": "paul@boulangerie-martin.fr",
  "from_name": "Paul Martin",
  "to_email": "contact@solvelab.fr",
  "subject": "Re: votre site",
  "body": "Oui ça m'intéresse, rappelez-moi.",
  "received_at": "2026-11-08T10:12:00+01:00",
  "category": "client",               // client | plateforme | autre
  "verdict": "ok",                    // ok | a_verifier | spam
  "source": "email",                  // email | codeur | fiverr | malt | comeup | upwork | linkedin…
  "classement": "chaud",              // chaud | a_relancer | pas_interesse | stop | null
  "relance_le": null,                 // "2027-01-10" si « rappelez-moi en janvier »
  "ai_summary": "Intéressé, veut être rappelé.",
  "platform_url": null,               // lien direct vers la conversation sur la plateforme
  "lead": { "company_name": null, "contact_name": "Paul Martin", "email": null, "phone": null, "city": null, "interest": null, "budget": null }
}
```

Ce que fait le CRM :

| Cas | Résultat |
|---|---|
| `verdict: spam` | rangé dans **Messages → Spam** (effacé après 30 jours), rien d'autre |
| `verdict: a_verifier` | **Messages → À vérifier** : tu cliques « Vrai client » ou « Spam » |
| `category: autre` | **Messages → Autres** (factures, newsletters…) |
| `client` / `plateforme` + `ok` | fiche retrouvée (même conversation, email, téléphone, ou même nom sur la même plateforme) ou créée, ajoutée à l'historique, « Nouveau à voir » |
| contact déjà connu | toujours ajouté à sa fiche, même si l'IA hésite (sauf spam) |
| `classement` | `chaud` → statut chaud · `pas_interesse` → perdu · `stop` → ne plus jamais contacter · `a_relancer` → relance prévue à `relance_le` (ou dans 21 jours) |

Réponse : `{ ok, duplicate, message_id, verdict, category, prospect_id, prospect_created }`

## 7. Emails écrits dans le CRM → Gmail (workflow `08-envoi-depuis-crm`)

Quand tu cliques **Envoyer** dans le CRM, le CRM appelle le webhook `N8N_MAIL_WEBHOOK_URL` avec le header `x-api-key: CRM_API_KEY` :

```json
{ "action": "envoyer_email", "message_id": "uuid", "to": "client@x.fr", "subject": "Re: …", "body": "…",
  "thread_id": "18c2e…", "reply_to_external_id": "18c2f…" }
```

n8n envoie (en réponse dans la conversation si `reply_to_external_id` est rempli), puis confirme :

`PATCH /api/n8n/messages/:message_id` → `{ "send_status": "envoye", "external_id": "id Gmail", "thread_id": "…" }` ou `{ "send_status": "erreur", "error": "…" }`.
Quand c'est envoyé, le CRM l'ajoute à l'historique de la fiche (type `email_sortant`, par « moi »).

Filet de sécurité : `GET /api/n8n/messages?send_status=a_envoyer&direction=sortant` liste les emails restés en attente.

## 8. Page Agent du CRM → ton agent (webhook `N8N_AGENT_WEBHOOK_URL`)

Depuis la page **🤖 Agent**, tu donnes des ordres. Le CRM appelle le webhook de l'agent (header `x-api-key: CRM_API_KEY`) :

```json
{ "action": "agent_tache", "task_id": "uuid", "type": "recherche",
  "params": { "sectors": ["plombier", "électricien"], "cities": ["Caen", "Ifs"], "max": 30, "criteria": "sans site" },
  "settings": { "agent_paused": false, "target_sectors": [...], "target_cities": [...], "daily_email_limit": 20, "sender_first_name": "Nolla", "signature": "…" } }
```

| `type` | `params` | Ce que l'agent doit faire |
|---|---|---|
| `recherche` | `sectors[]`, `cities[]`, `max`, `criteria` | chercher les entreprises → `POST /api/n8n/prospects` |
| `envoi` | `count`, `min_score`, `sector`, `city` | premiers emails aux fiches `nouveau` avec email (étalés, lun-ven 9h-18h) |
| `relances` | `count` | relances dues (`due_followup=true`) |
| `consigne` | `instruction` (texte libre) | l'IA de l'agent interprète la consigne |

L'agent donne des nouvelles avec `PATCH /api/n8n/tasks/:task_id` :
```json
{ "status": "en_cours" }
{ "status": "termine", "summary": "28 plombiers trouvés à Caen, 19 avec un email.", "result": { "created": 28 } }
{ "status": "erreur", "error": "Overpass ne répond pas" }
```

Sans webhook (ou s'il ne répond pas), l'ordre reste en attente : l'agent peut aussi venir les chercher avec
`GET /api/n8n/tasks?status=en_attente,envoye` → `{ agent_paused, tasks: [...] }`.

## 9. Réglages de l'agent (choisis dans le CRM)

`GET /api/n8n/settings` →
```json
{ "agent_paused": false, "target_sectors": ["plombier", "restaurant"], "target_cities": ["Caen"],
  "daily_email_limit": 20, "sender_first_name": "Nolla", "signature": "Nolla\nSolveLab…" }
```
À lire au début de chaque workflow automatique : **si `agent_paused` est vrai, ne rien faire.** La recherche du matin utilise `target_sectors` / `target_cities`, l'envoi ne dépasse pas `daily_email_limit`.

---

## Formulaire de ton site → CRM

Filtre anti-spam intégré : une demande douteuse (liens en masse, démarchage SEO, alphabet étranger, email jetable…) ne crée pas de fiche, elle part dans **Messages → À vérifier**. Chaque demande valide apparaît aussi dans **Messages** pour pouvoir répondre depuis le CRM.

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
