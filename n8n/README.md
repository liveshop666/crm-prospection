# Workflows n8n

Les workflows seront exportés ici en `.json` (n8n → menu ⋯ → *Download*), pour pouvoir les réimporter sur n'importe quel compte n8n (*Import from file*).

| # | Workflow | Déclencheur | Rôle | État |
|---|---|---|---|---|
| 1 | `01-recherche-prospects` | tous les jours 8h | OpenStreetMap (gratuit) + API Recherche d'entreprises du gouvernement (gratuite) → score IA → `POST /api/n8n/prospects` | à faire |
| 2 | `02-premier-contact` | lun-ven, 9h-18h, étalé | `GET prospects?status=nouveau` → message IA personnalisé → SMS (passerelle sur ton téléphone Android ou Brevo) ou email (Brevo) → `POST activities` (sms_sortant) | à faire |
| 3 | `03-reponses-entrantes` | webhook SMS + Gmail | réponse → IA classe (chaud / à relancer / perdu / STOP) → `POST activities` | à faire |
| 4 | `04-relances` | tous les jours 10h | `GET prospects?due_followup=true` → relance douce → `POST activities` (relance) | à faire |
| 5 | `05-rdv` | webhook Cal.com | `POST activities` (type `rdv`) | à faire |
| 6 | `06-recap-quotidien` | tous les jours 19h | `GET /api/n8n/stats` → résumé par email | à faire |

Les **notifications sur ton téléphone** sont gérées directement par le CRM (notifications push de l'appli installée), pas par n8n.

Contrat d'API complet : [`../docs/API-N8N.md`](../docs/API-N8N.md)
