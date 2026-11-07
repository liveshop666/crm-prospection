# CRM SolveLab

Mon CRM à moi : **tout ce que fait l'agent de prospection (n8n) et tout ce que font les prospects sur solvelab.fr arrive ici.** Plus besoin d'ouvrir les mails pour savoir où en est un client.

En ligne : https://crm-prospection-eight.vercel.app · Site relié : https://www.solvelab.fr (dépôt `liveshop666/Solvelab`)

```
        ┌──────────── n8n · agent de prospection (autre compte) ────────────┐
        │  trouve les entreprises · email IA avec lien perso · relances     │
        └──────────────┬────────────────────────────────────────────────────┘
          API (x-api-key)
                       ▼
   ┌──────────────────────────── CRM (ce projet) ─────────────────────────────┐
   │ Accueil · Pipeline · Prospects · Site (visites) · Offres                 │
   └────▲───────────────▲───────────────────▲──────────────────▲──────────────┘
        │ /r/xxx        │ formulaires +     │ webhook Cal.com  │ /offre/xxx
        │ (clic email)  │ visites du site   │ (RDV pris/annulé)│ (« J'accepte »)
     le prospect      solvelab.fr        cal.com/solvelab     le client
```

## Le parcours d'un client

1. **L'agent** trouve l'entreprise → elle apparaît dans le CRM en 🆕 *Nouveau* (avec son lien perso `tracking_url`)
2. **L'agent** envoie un email personnalisé avec **ce lien** → 📨 *Contacté*
3. Le prospect clique → 👀 *A visité* (le CRM compte ses visites)
4. Il remplit un formulaire de solvelab.fr ou réserve un appel Cal.com → 🔥 *Chaud* / 📅 *RDV*, visible dans **🔔 Nouveau à voir**
5. Tu le rappelles, tu crées une **offre** dans sa fiche et tu lui envoies le lien → 📄 *Offre envoyée*
6. Il clique « J'accepte » → ✅ *Validé*

S'il répond **STOP**, il est marqué ⛔ et l'agent ne le recontacte plus jamais. Pas de notification sur le téléphone : tout se consulte dans le CRM.

## Pages

| Page | Contenu |
|---|---|
| `/` Accueil | chiffres du jour, « Nouveau à voir », clients chauds, activité récente (menu ⋯ pour supprimer) |
| `/pipeline` | tableau Kanban, glisser-déposer pour changer de statut |
| `/prospects` | liste + recherche + filtres · `/prospects/nouveau` pour un ajout manuel |
| `/prospects/:id` | fiche : appeler / email / WhatsApp, lien perso, résumé IA, historique, notes, offres |
| `/site` | visites de solvelab.fr, clics « Réserver un appel », demandes, RDV, graphique 14 jours. Journal conservé même si une fiche est supprimée ; ⋯ « Retirer de la liste » garde les chiffres |
| `/offres` | toutes les offres, montants signés / en attente |
| `/offre/:token` | **page publique** (logo SolveLab) que reçoit le client pour accepter l'offre |
| `/r/:slug` | **lien perso** mis dans l'email → enregistre le clic → redirige vers solvelab.fr `?ref=…` |

Design aux couleurs de solvelab.fr (mode nuit par défaut, bouton **Clair / Nuit** en haut à droite), bouton **Rafraîchir**, installable sur le téléphone (« Ajouter à l'écran d'accueil »).

## Ce qui appelle le CRM

| Qui | Route | Protection |
|---|---|---|
| Agent n8n | `/api/n8n/prospects`, `/api/n8n/prospects/:id`, `/api/n8n/activities`, `/api/n8n/stats` | header `x-api-key` = `CRM_API_KEY` — détail : [`docs/API-N8N.md`](docs/API-N8N.md) |
| solvelab.fr (fonction `api/send.js`) | `/api/public/lead` | origines `PUBLIC_SITE_ORIGINS`, anti-spam |
| solvelab.fr (fonction `api/track.js`) | `/api/public/track` | facultatif : `TRACK_SECRET` (même valeur des deux côtés) |
| Cal.com (webhook) | `/api/public/calcom` | signature `CALCOM_WEBHOOK_SECRET` |

Branchement du site et de Cal.com : [`docs/SITE.md`](docs/SITE.md).

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind 4) — hébergé sur Vercel
- **Supabase** (Postgres + connexion) — tables `prospects`, `activities`, `offers` (`0001_init.sql`) et `site_events` (`0002_site_events.sql`)
- **n8n** pour l'agent (voir [`n8n/`](n8n/README.md))

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
- Les pages publiques (`/r`, `/offre`, formulaire, suivi des visites, webhook Cal.com) n'exposent que le strict nécessaire.
- Mesure d'audience sans cookie : identifiant anonyme du jour, aucune adresse IP stockée (voir mentions légales de solvelab.fr).

## Règles de prospection (France)
- **B2B uniquement** : email (et SMS) autorisés vers des professionnels si l'offre concerne leur activité.
- Toujours s'identifier et permettre de refuser (« STOP ») — géré automatiquement par le CRM.
- Pas de démarchage téléphonique de particuliers sans consentement (interdit depuis le 11/08/2026).

## Où on en est
- [x] CRM en ligne (design SolveLab, mode clair / nuit)
- [x] solvelab.fr relié : formulaires, visites, bouton « Réserver un appel » → [`docs/SITE.md`](docs/SITE.md)
- [x] Cal.com relié (`cal.com/solvelab/15min`)
- [ ] Agent de prospection n8n (sur l'autre compte) → [`n8n/README.md`](n8n/README.md) + [`docs/API-N8N.md`](docs/API-N8N.md)
