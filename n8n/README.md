# Workflows n8n

L'agent est construit sur un autre compte n8n. Il a besoin de : l'adresse du CRM, la clé `CRM_API_KEY` (credential **Header Auth** `x-api-key`) et du contrat d'API ci-dessous.\n\n**Règle d'or :** chaque email doit contenir le lien perso du prospect (`tracking_url`, renvoyé à la création). C'est lui qui relie clics, demandes et RDV à la bonne fiche.

| # | Workflow | Déclencheur | Rôle | État |
|---|---|---|---|---|
| 1 | `01-recherche-prospects` | tous les jours 8h | OpenStreetMap (gratuit) + API Recherche d'entreprises du gouvernement (gratuite) → score IA → `POST /api/n8n/prospects` | à faire |
| 2 | `02-premier-contact` | lun-ven, 9h-18h, étalé | `GET prospects?status=nouveau` → email IA personnalisé avec `tracking_url` (Brevo) → `POST activities` (email_sortant) | à faire |
| 3 | `03-reponses-entrantes` | Gmail | réponse email → IA classe (chaud / à relancer / perdu / STOP) → `POST activities` | à faire |
| 4 | `04-relances` | tous les jours 10h | `GET prospects?due_followup=true` → relance douce → `POST activities` (relance) | à faire |
| 5 | ~~`05-rdv`~~ | — | **plus besoin** : Cal.com est branché directement sur le CRM (`/api/public/calcom`) | ✅ fait |
| 6 | `06-recap-quotidien` | tous les jours 19h | `GET /api/n8n/stats` → résumé par email | à faire |

Pas de notifications sur le téléphone : tout ce qui arrive est visible dans le CRM, rubrique **🔔 Nouveau à voir** de l'accueil.

Contrat d'API complet : [`../docs/API-N8N.md`](../docs/API-N8N.md)
