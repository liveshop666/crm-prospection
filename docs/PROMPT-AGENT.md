# Prompt pour créer l'agent de prospection (nouvelle discussion)

Copie tout le bloc ci-dessous dans une nouvelle discussion.

```
Je veux créer mon agent de prospection dans n8n. Mon CRM est déjà fait et en ligne, il ne faut pas y toucher : l'agent doit seulement l'alimenter et obéir à sa page « Agent ».

CONTEXTE
- Ma société : SolveLab, agence digitale à Caen (sites internet, automatisation/IA, outils sur mesure, pub vidéo). Site : https://www.solvelab.fr
- CRM (Next.js + Supabase) : https://crm-prospection-eight.vercel.app
- Dépôt GitHub du CRM : liveshop666/crm-prospection. Lis en priorité docs/API-N8N.md (contrat d'API complet) et n8n/README.md (plan des workflows).
- Déjà branché et testé : formulaires de solvelab.fr, réservation Cal.com (cal.com/solvelab/15min), suivi des visites et des clics, et ma boîte mail Gmail pro (workflows 07 et 08 : les réponses des prospects arrivent déjà dans le CRM, triées par l'IA). Tout arrive dans le CRM tout seul.
- Le CRM a une page « Agent » : j'y choisis les métiers, les villes, la limite d'emails par jour, je peux mettre l'agent en pause et lui donner des ordres (recherche, envoi, relances, consigne libre). Voir docs/API-N8N.md § 8 et § 9.

CE QUE L'AGENT DOIT FAIRE (workflows n8n)
1. Trouver des entreprises (B2B) par métier et ville, avec des sources GRATUITES : OpenStreetMap (Overpass) pour téléphone/site/email, et l'API « Recherche d'entreprises » du gouvernement (recherche-entreprises.api.gouv.fr) pour SIRET/dirigeant/activité. Récupérer l'email pro sur la page contact du site de l'entreprise quand il existe. L'IA donne un score (0-100) et un résumé (ex : pas de site, site vieux). Envoi au CRM : POST /api/n8n/prospects.
2. Premier contact PAR EMAIL (pas de SMS pour l'instant), via Brevo (offre gratuite, 300/jour). Email court, personnalisé par l'IA, qui ne fait pas robot, signé de mon prénom, avec UN SEUL lien : le tracking_url du prospect renvoyé par le CRM. Lun-ven 9h-18h, étalé, 20-30 par jour au début. Puis POST /api/n8n/activities (type email_sortant + next_followup_at).
3. Relances : GET /api/n8n/prospects?due_followup=true, une ou deux relances douces maximum, puis on arrête.
4. Réponses : RIEN À FAIRE, c'est déjà géré par le workflow 07 du CRM. Dans Brevo, l'adresse « Reply-to » doit être mon Gmail pro.
5. Écouter la page Agent : un nœud Webhook (POST, Header Auth avec la credential « CRM x-api-key ») qui reçoit les ordres { action: "agent_tache", task_id, type, params } et lance le bon workflow (recherche / envoi / relances / consigne). Donner des nouvelles avec PATCH /api/n8n/tasks/:task_id (en_cours → termine + summary en une phrase, ou erreur). Me dire où copier l'adresse du webhook (variable Vercel N8N_AGENT_WEBHOOK_URL).
6. Au début de chaque workflow automatique : GET /api/n8n/settings. Si agent_paused = true, ne rien faire. Utiliser target_sectors / target_cities pour la recherche du matin, daily_email_limit pour l'envoi, sender_first_name pour signer.

RÈGLES
- Toujours inclure le tracking_url dans l'email : c'est lui qui relie clics, demandes et RDV à la bonne fiche du CRM.
- Authentification au CRM : header x-api-key = ma CRM_API_KEY (credential Header Auth dans n8n). Ne me demande jamais de coller une clé dans le chat.
- B2B uniquement, l'offre doit concerner leur activité, toujours un moyen de se désinscrire.
- Budget minimum : tout gratuit sauf l'IA (Claude, modèle pas cher, environ 1 €/mois).
- Pas de notifications sur le téléphone : tout se consulte dans le CRM.
- Je ne suis pas développeur : explique étape par étape, en français simple, écran par écran.

CE QUE J'AI DÉJÀ / À CRÉER
- n8n (abonnement payant) sur mon compte, Brevo (compte existant), Gmail pro.
- À créer : clé API Claude, credential Header Auth « x-api-key » dans n8n.

Les métiers et les villes se choisissent dans la page Agent du CRM (pas besoin de me les demander). Construis les workflows dans l'ordre 1 → 2 → 3 (relances) → webhook de la page Agent, et donne-les-moi en fichiers JSON à importer dans n8n.
```
