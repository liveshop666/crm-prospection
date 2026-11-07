# CRM Prospection

Mon CRM à moi : **tout ce que fait l'agent de prospection (n8n) et tout ce que répondent les clients arrive ici.** Plus besoin d'ouvrir les mails ou le téléphone pour savoir où en est un client.

```
            ┌────────────── n8n (toute l'automatisation) ──────────────┐
            │  recherche prospects · SMS / emails IA · réponses · RDV  │
            └───────┬───────────────────────────────▲──────────────────┘
       API (clé)    │                               │ webhook « notifie-moi »
                    ▼                               │
   ┌───────────────────────────── CRM (ce projet) ──┴───────────────┐
   │ Accueil · Pipeline · Fiches clients + historique · Offres      │──► 🔔 téléphone
   └───────▲──────────────────────────▲─────────────────────▲───────┘
           │ /r/xxx (clic SMS)        │ formulaire du site   │ /offre/xxx (« J'accepte »)
       le prospect               ton site vitrine        le client
```

## Le parcours d'un client

1. **n8n** trouve l'entreprise → elle apparaît dans le CRM en 🆕 *Nouveau*
2. **n8n** envoie un SMS / email personnalisé avec **son lien unique** → 📨 *Contacté*
3. Le prospect clique → 👀 *A visité* (tu vois combien de fois)
4. Il remplit le formulaire de ton site ou prend RDV → 🔥 *Chaud* / 📅 *RDV* + **notification sur ton téléphone**
5. Tu le rappelles, tu crées une **offre** dans sa fiche et tu lui envoies le lien → 📄 *Offre envoyée*
6. Il clique « J'accepte » → ✅ *Validé* + notification

S'il répond **STOP**, il est marqué ⛔ et l'agent ne le recontacte plus jamais.

## Pages

| Page | Contenu |
|---|---|
| `/` Accueil | chiffres du jour, « Nouveau à voir », clients chauds, activité récente |
| `/pipeline` | tableau Kanban, glisser-déposer pour changer de statut |
| `/prospects` | liste + recherche + filtres |
| `/prospects/:id` | fiche : boutons appeler / SMS / WhatsApp / email, lien perso, résumé IA, historique complet, notes, offres |
| `/offres` | toutes les offres, montants signés / en attente |
| `/offre/:token` | **page publique** que reçoit le client pour accepter l'offre |
| `/r/:slug` | **lien tracké** du SMS → enregistre le clic → redirige vers ton site |

Installable sur le téléphone comme une appli (Safari / Chrome → « Ajouter à l'écran d'accueil »).

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind) — hébergement Vercel (gratuit)
- **Supabase** (Postgres + connexion) — gratuit
- **n8n** pour toutes les automatisations (voir [`n8n/`](n8n/README.md) et [`docs/API-N8N.md`](docs/API-N8N.md))

## Installation (≈ 15 min)

### 1. Supabase
1. Crée un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** → colle le contenu de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → *Run*.
3. **Authentication → Users → Add user** : crée ton compte (email + mot de passe).
4. **Authentication → Sign In / Providers** : désactive *Allow new users to sign up* (personne d'autre ne peut créer de compte).
5. **Project Settings → API** : récupère l'URL, la clé `anon` et la clé `service_role`.

### 2. En local
```bash
npm install
cp .env.example .env.local   # puis remplis les valeurs
npm run dev                  # http://localhost:3000
```

### 3. En ligne (Vercel)
1. [vercel.com/new](https://vercel.com/new) → importe ce dépôt GitHub.
2. Ajoute les variables de `.env.example` dans *Environment Variables*.
3. Deploy. Mets l'URL obtenue dans `NEXT_PUBLIC_APP_URL` (et redéploie).

### 4. n8n
Dans n8n, crée un credential **Header Auth** : `x-api-key` = ta `CRM_API_KEY`. Ensuite chaque workflow appelle l'API du CRM — tout est décrit dans [`docs/API-N8N.md`](docs/API-N8N.md).

## Sécurité
- Seuls les emails de `ALLOWED_EMAILS` peuvent ouvrir le CRM.
- n8n s'authentifie avec `CRM_API_KEY`. La clé `service_role` reste côté serveur.
- Les pages publiques (`/r`, `/offre`, formulaire) n'exposent que le strict nécessaire ; le formulaire a un anti-spam et n'accepte que les origines de `PUBLIC_SITE_ORIGINS`.

## Règles de prospection (France)
- **B2B uniquement** : SMS / email autorisés vers des professionnels si l'offre concerne leur activité.
- Toujours s'identifier et permettre de refuser (« STOP ») — géré automatiquement par le CRM.
- Pas de démarchage téléphonique de particuliers sans consentement (interdit depuis le 11/08/2026).

## Prochaines étapes
- [x] CRM (ce dépôt)
- [ ] Workflows n8n 1 → 7 (voir [`n8n/README.md`](n8n/README.md))
- [ ] Formulaire + prise de RDV sur le site vitrine
