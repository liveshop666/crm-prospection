# Workflows n8n

Les workflows seront exportés ici en `.json` (n8n → menu ⋯ → *Download*), pour pouvoir les réimporter sur n'importe quel compte n8n (*Import from file*).

| # | Workflow | Déclencheur | Rôle | État |
|---|---|---|---|---|
| 1 | `01-recherche-prospects` | tous les jours 8h | Google Maps / Pappers → score IA → `POST /api/n8n/prospects` | à faire |
| 2 | `02-premier-contact` | lun-ven, 9h-18h, étalé | `GET prospects?status=nouveau` → message IA personnalisé → SMS (Brevo) ou email → `POST activities` (sms_sortant) | à faire |
| 3 | `03-reponses-entrantes` | webhook SMS Brevo + Gmail | réponse → IA classe (chaud / à relancer / perdu / STOP) → `POST activities` | à faire |
| 4 | `04-relances` | tous les jours 10h | `GET prospects?due_followup=true` → relance douce → `POST activities` (relance) | à faire |
| 5 | `05-rdv` | webhook Cal.com | `POST activities` (type `rdv`) | à faire |
| 6 | `06-notifications` | webhook du CRM | event → Telegram / push sur ton téléphone | à faire |
| 7 | `07-recap-quotidien` | tous les jours 19h | `GET /api/n8n/stats` → résumé sur ton téléphone | à faire |

Contrat d'API complet : [`../docs/API-N8N.md`](../docs/API-N8N.md)
