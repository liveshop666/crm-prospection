# CRM Prospection

Mon CRM à moi : **tout ce que fait l'agent de prospection (n8n) et tout ce que répondent les clients arrive ici.** Plus besoin d'ouvrir les mails ou le téléphone pour savoir où en est un client.

```
            ┌────────────── n8n (toute l'automatisation) ──────────────┐
            │  recherche prospects · SMS / emails IA · réponses · RDV  │
            └───────┬───────────────────────────────▲──────────────────┘
       API (clé)    │                               │
                    ▼                               │
   ┌───────────────────────────── CRM (ce projet) ──┴───────────────┐
   │ Accueil · Pipeline · Fiches clients + historique · Offres      │
   └───────▲──────────────────────────▲─────────────────────▲───────┘
           │ /r/xxx (clic SMS)        │ formulaire du site   │ /offre/xxx (« J'accepte »)
       le prospect               ton site vitrine        le client
```

## Le parcours d'un client

1. **n8n** trouve l'entreprise → elle apparaît dans le CRM en 🆕 *Nouveau*
2. **n8n** envoie un SMS / email personnalisé avec **son lien unique** → 📨 *Contacté*
3. Le prospect clique → 👀 *A visité* (tu vois combien de fois)
4. Il remplit le formulaire de ton site ou prend RDV → 🔥 *Chaud* / 📅 *RDV*, et il apparaît dans **🔔 Nouveau à voir** sur l'accueil du CRM
5. Tu le rappelles, tu crées une **offre** dans sa fiche et tu lui envoies le lien → 📄 *Offre envoyée*
6. Il clique « J'accepte » → ✅ *Validé*

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

👉 **Suis le guide pas à pas : [`docs/INSTALLATION.md`](docs/INSTALLATION.md)** (où trouver chaque clé Supabase, quoi mettre dans chaque champ Vercel).

En résumé : **1. Supabase** (créer le projet, coller le SQL, créer ton utilisateur, copier l'URL + 2 clés) → **2. Vercel** (*Add New → Project → Import* `crm-prospection`, coller les variables, *Deploy*) → **3. Se connecter**.

Pour développer en local :
```bash
npm install
cp .env.example .env.local   # puis remplis les valeurs
npm run dev                  # http://localhost:3000
```

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
- [ ] Workflows n8n 1 → 6 (voir [`n8n/README.md`](n8n/README.md))
- [ ] Formulaire + prise de RDV sur le site vitrine
