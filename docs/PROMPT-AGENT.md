# Prompt pour créer l'agent de prospection (nouvelle discussion)

Copie tout le bloc ci-dessous dans une nouvelle discussion.

```
Je veux créer mon agent de prospection dans n8n. Mon CRM est déjà fait et en ligne, il ne faut pas y toucher : l'agent doit seulement l'alimenter.

CONTEXTE
- Ma société : SolveLab, agence digitale à Caen (sites internet, automatisation/IA, outils sur mesure, pub vidéo). Site : https://www.solvelab.fr
- CRM (Next.js + Supabase) : https://crm-prospection-eight.vercel.app
- Dépôt GitHub du CRM : liveshop666/crm-prospection. Lis en priorité docs/API-N8N.md (contrat d'API complet) et n8n/README.md (plan des workflows).
- Déjà branché et testé : formulaires de solvelab.fr, réservation Cal.com (cal.com/solvelab/15min), suivi des visites et des clics. Tout arrive dans le CRM tout seul.

CE QUE L'AGENT DOIT FAIRE (workflows n8n)
1. Trouver des entreprises (B2B) par métier et ville, avec des sources GRATUITES : OpenStreetMap (Overpass) pour téléphone/site/email, et l'API « Recherche d'entreprises » du gouvernement (recherche-entreprises.api.gouv.fr) pour SIRET/dirigeant/activité. Récupérer l'email pro sur la page contact du site de l'entreprise quand il existe. L'IA donne un score (0-100) et un résumé (ex : pas de site, site vieux). Envoi au CRM : POST /api/n8n/prospects.
2. Premier contact PAR EMAIL (pas de SMS pour l'instant), via Brevo (offre gratuite, 300/jour). Email court, personnalisé par l'IA, qui ne fait pas robot, signé de mon prénom, avec UN SEUL lien : le tracking_url du prospect renvoyé par le CRM. Lun-ven 9h-18h, étalé, 20-30 par jour au début. Puis POST /api/n8n/activities (type email_sortant + next_followup_at).
3. Relances : GET /api/n8n/prospects?due_followup=true, une ou deux relances douces maximum, puis on arrête.
4. Réponses : lire les réponses dans mon Gmail pro, l'IA les classe (chaud / à relancer / pas intéressé / STOP), puis POST /api/n8n/activities (type email_entrant + status). Un STOP coupe tout définitivement (le CRM le gère).
5. Facultatif : récap du soir par email avec GET /api/n8n/stats.

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

Commence par me demander les métiers et les villes à cibler, puis construis les workflows dans l'ordre 1 → 4, et donne-les-moi en fichiers JSON à importer dans n8n.
```
