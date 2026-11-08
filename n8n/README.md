# Workflows n8n

Le CRM est ton seul espace de travail. n8n travaille en coulisses : il trouve des clients, envoie les emails et range ta boîte mail dans le CRM.

**Règle d'or :** chaque email de prospection doit contenir le lien perso du prospect (`tracking_url`, renvoyé à la création). C'est lui qui relie clics, demandes et RDV à la bonne fiche.

## Les workflows

| # | Workflow | Déclencheur | Rôle | Où | État |
|---|---|---|---|---|---|
| 1 | `01-recherche-prospects` | tous les jours 8h + ordres de la page Agent | OpenStreetMap + API Recherche d'entreprises (gratuites) → score IA → `POST /api/n8n/prospects` | compte de l'agent | à faire |
| 2 | `02-premier-contact` | lun-ven, 9h-18h, étalé | `GET prospects?status=nouveau` → email IA avec `tracking_url` (Brevo) → `POST activities` (email_sortant) | compte de l'agent | à faire |
| 3 | ~~`03-reponses-entrantes`~~ | — | **remplacé par le 07** : la boîte mail entière arrive dans le CRM, déjà triée | — | ✅ remplacé |
| 4 | `04-relances` | tous les jours 10h | `GET prospects?due_followup=true` → relance douce → `POST activities` (relance) | compte de l'agent | à faire |
| 5 | ~~`05-rdv`~~ | — | **plus besoin** : Cal.com est branché directement sur le CRM | — | ✅ fait |
| 6 | `06-recap-quotidien` | — | **plus besoin** : tout se voit sur l'accueil et la page Agent du CRM | — | facultatif |
| 7 | [`07-boite-mail.json`](07-boite-mail.json) | chaque nouvel email (Gmail) | IA : vrai client / plateforme (Codeur, Fiverr, Malt…) / autre / spam → `POST /api/n8n/messages` | ton compte | ✅ prêt à importer |
| 8 | [`08-envoi-depuis-crm.json`](08-envoi-depuis-crm.json) | webhook appelé par le CRM | les emails que tu écris dans le CRM partent de ton Gmail pro → `PATCH /api/n8n/messages/:id` | ton compte | ✅ prêt à importer |

Guide pas à pas (écran par écran) : [`../docs/MISE-EN-ROUTE.md`](../docs/MISE-EN-ROUTE.md)
Contrat d'API complet : [`../docs/API-N8N.md`](../docs/API-N8N.md)

## Ce que l'agent de prospection doit respecter (workflows 1, 2, 4)

1. **Lire les réglages** au début : `GET /api/n8n/settings`. Si `agent_paused` est vrai → ne rien faire. Métiers et villes = `target_sectors` / `target_cities`. Maximum `daily_email_limit` premiers emails par jour. Signer avec `sender_first_name`.
2. **Écouter la page Agent du CRM** : un nœud *Webhook* (POST, authentification *Header Auth* avec la credential `CRM x-api-key`) qui reçoit `{ action: "agent_tache", task_id, type, params }`. Son adresse de production va dans Vercel → `N8N_AGENT_WEBHOOK_URL`. Types : `recherche`, `envoi`, `relances`, `consigne` (détail : API-N8N.md § 8).
3. **Donner des nouvelles** : `PATCH /api/n8n/tasks/:task_id` avec `status: "en_cours"`, puis `"termine"` + `summary` (une phrase lisible : « 28 plombiers trouvés à Caen, 19 avec email »), ou `"erreur"` + `error`.
4. Les réponses des prospects : **rien à faire**, le workflow 07 les range dans le CRM. Dans Brevo, mets ton adresse Gmail pro en *Reply-to* pour que les réponses y arrivent.

Pas de notifications sur le téléphone : tout ce qui arrive est visible dans le CRM (**🔔 Nouveau à voir**, **📬 Messages**, **🤖 Agent**).
