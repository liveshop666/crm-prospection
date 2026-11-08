# Mise en route de l'espace de travail (≈ 30 min)

Ce guide branche les nouveautés du CRM : **📬 Messages** (ta boîte mail pro + Codeur, Fiverr, Malt…), **🤖 Agent**, **🤝 Clients & suivis** et **💶 Chiffre d'affaires**.

Tout est gratuit. Ordre : **1. Supabase** → **2. Mettre en ligne** → **3. n8n** → **4. Vercel** → **5. Plateformes** → **6. Tester**.

Ne colle jamais une clé dans une discussion : elles vont seulement dans Supabase, Vercel ou n8n.

---

## 1. Supabase : ajouter les nouvelles tables (2 min)

1. Va sur **supabase.com** → ouvre ton projet `crm`.
2. Menu de gauche → **SQL Editor** (icône `>_`) → bouton **New query**.
3. Ouvre sur GitHub le fichier [`supabase/migrations/0003_espace_de_travail.sql`](../supabase/migrations/0003_espace_de_travail.sql) → bouton 📋 **Copy raw file**.
4. Reviens dans Supabase, colle dans la grande zone → **Run** (en bas à droite).
5. Tu dois voir **« Success. No rows returned »** ✅

Rien n'est effacé : on ajoute seulement des tables. Tu peux le relancer sans risque.

---

## 2. Mettre la nouvelle version en ligne (1 min)

1. Sur GitHub, dépôt **crm-prospection** → onglet **Pull requests** → ouvre la demande « Espace de travail… ».
2. Bouton vert **Ready for review**, puis **Merge pull request** → **Confirm merge**.
3. Vercel met le CRM à jour tout seul en 1 à 2 minutes. Dans le menu du CRM, tu vois maintenant **Messages**, **Agent**, **Clients & suivis**, **Chiffre d'affaires**.

---

## 3. n8n : brancher ta boîte mail (15 min)

### 3.1 L'IA qui trie les emails : Gemini (gratuit)
Le workflow 07 utilise **Google Gemini**, gratuit, avec la connexion « Google Gemini(PaLM) Api account » déjà présente dans ton n8n. Rien à payer.
Pour passer plus tard à Claude (≈ 1 €/mois) : dans le nœud 3, remplace l'adresse par `https://api.anthropic.com/v1/messages`, la connexion par **Anthropic**, ajoute l'en-tête `anthropic-version: 2023-06-01` et mets le corps `{{ JSON.stringify($json.anthropic_body) }}`.

### 3.2 Créer les 3 connexions dans n8n
Dans n8n : menu de gauche → **Overview** (ou **Home**) → onglet **Credentials** → bouton **Create credential** (ou la flèche à côté de *Create workflow*).

| Connexion | Cherche | Remplis | Nom à donner |
|---|---|---|---|
| CRM | `Header Auth` | **Name** : `x-api-key` · **Value** : ta `CRM_API_KEY` (dans Vercel → Settings → Environment Variables) | `CRM x-api-key` |
| Gmail | `Gmail OAuth2` | clique **Sign in with Google** → choisis ton adresse pro → **Autoriser** | `Gmail pro` |

Pour chaque connexion : **Save**. La pastille verte « Connection tested successfully » doit apparaître (sauf pour Header Auth, qui n'a pas de test : c'est normal).

### 3.3 Importer le workflow 07 – Boîte mail → CRM
1. Télécharge le fichier [`n8n/07-boite-mail.json`](../n8n/07-boite-mail.json) (sur GitHub : bouton **⬇ Download raw file**).
2. Dans n8n : **Create workflow** → en haut à droite **⋯** → **Import from File…** → choisis le fichier.
3. Ouvre les nœuds marqués d'un ⚠️ un par un et choisis la bonne connexion :
   - **1. Nouvel email (Gmail)** → `Gmail pro`
   - **3. IA (Gemini, gratuit) : trier l'email** → `Google Gemini(PaLM) Api account` (déjà choisi)
   - **5. Envoyer au CRM** → `CRM x-api-key`
4. **Save** (en haut à droite) → interrupteur **Inactive → Active**.

Il vérifie ta boîte toutes les minutes. Seuls les emails reçus **à partir de maintenant** arrivent dans le CRM.

### 3.4 Importer le workflow 08 – Envoi depuis le CRM
1. Télécharge [`n8n/08-envoi-depuis-crm.json`](../n8n/08-envoi-depuis-crm.json) → importe-le de la même façon.
2. Connexions :
   - **1. Ordre du CRM (webhook)**, **2. Emails en attente (CRM)**, **CRM : envoyé ✓**, **CRM : erreur** → `CRM x-api-key`
   - **Gmail : répondre**, **Gmail : nouvel email** → `Gmail pro`
3. **Save** → **Active**.
4. Ouvre le nœud **1. Ordre du CRM (webhook)** → en haut, onglet **Production URL** → 📋 copie l'adresse (elle finit par `/webhook/crm-envoi-email`). Garde-la pour l'étape 4.

---

## 4. Vercel : dire au CRM où est n8n (3 min)

1. **vercel.com** → projet **crm-prospection** → **Settings** → **Environment Variables**.
2. Ajoute :

| Key | Value |
|---|---|
| `N8N_MAIL_WEBHOOK_URL` | l'adresse copiée à l'étape 3.4 |
| `N8N_AGENT_WEBHOOK_URL` | l'adresse du webhook de ton agent de prospection (quand il sera fait sur l'autre compte, voir [`n8n/README.md`](../n8n/README.md)). En attendant, laisse vide : les ordres attendent sagement. |

3. Onglet **Deployments** → **⋯** sur le dernier → **Redeploy**.

---

## 5. Codeur, Fiverr, Malt… : recevoir les demandes (5 min par plateforme)

Le CRM lit les **emails de notification** des plateformes. Il faut donc que chaque plateforme t'envoie un email à chaque demande, **sur ton adresse Gmail pro** :

- **Codeur** : *Mon compte* → *Notifications* → coche les emails pour **nouveaux messages** et **projets correspondant à mes compétences**.
- **Fiverr** : photo de profil → *Settings* → *Notifications* → coche **Email** pour *Inbox messages* et *Order updates*.
- **Malt** : *Paramètres* → *Notifications* → active les emails pour les **messages** et **propositions de projet**.

Vérifie aussi que l'adresse du compte sur chaque plateforme est bien ton adresse **pro**.

Quand une demande arrive, elle apparaît dans **📬 Messages → Plateformes** avec une fiche client, et un bouton **« Répondre sur Fiverr »** (ou Codeur, Malt…) qui ouvre la bonne conversation. Ces plateformes n'autorisent pas les réponses depuis un autre logiciel : c'est le seul clic à faire chez elles.

---

## 6. Tester (3 min)

1. Depuis ton téléphone (adresse perso), envoie un email à ton adresse pro : « Bonjour, je voudrais un devis pour un site internet ».
2. Attends 1 à 2 minutes → **📬 Messages** : il est là, avec une fiche créée et un résumé de l'IA.
3. Ouvre-le → **Répondre par email** → **Envoyer**. Ta réponse arrive sur ton téléphone, dans la même conversation.
4. Sur la fiche, l'historique montre « Email reçu » puis « Email envoyé ».

Si rien n'arrive : dans n8n → workflow 07 → onglet **Executions**, la ligne rouge dit ce qui bloque (souvent une connexion pas choisie).

---

## Au quotidien

| Je veux… | Où |
|---|---|
| Voir qui m'a écrit, répondre | 📬 **Messages** (le chiffre rose = non lus) |
| Vérifier ce que le filtre a mis de côté | 📬 Messages → **À vérifier** (« Vrai client » ou « Spam ») |
| Lancer une recherche, des emails, des relances, mettre l'agent en pause | 🤖 **Agent** |
| Changer les métiers / villes ciblés chaque matin | 🤖 Agent → **⚙️ Réglages de l'agent** |
| Faire une offre (avec ou sans suivi mensuel) | fiche du prospect → **📄 Offres** |
| Noter un acompte, un paiement | fiche → offre acceptée → **💶** |
| Ajouter un suivi mensuel (30 €/mois…) | fiche → **🔁 Suivis mensuels** |
| Voir ce que je gagne | 💶 **Chiffre d'affaires** |
