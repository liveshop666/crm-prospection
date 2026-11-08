# Mise en route de l'espace de travail

État au 8 novembre 2026 : **tout est en place et testé.** Ce guide sert à refaire l'installation si besoin.

Tout est gratuit : IA Gemini (Google), n8n (ton abonnement), Supabase, Vercel.

---

## Ce qui tourne

| Élément | Où | Rôle |
|---|---|---|
| CRM | Vercel + Supabase | ton espace de travail : Messages, Agent, Prospects, Offres, Clients & suivis, Chiffre d'affaires |
| **07 – Boîte mail → CRM** | n8n | lit contact@solvelab.fr (OVH, IMAP), l'IA trie (client / plateforme / autre / spam), envoie au CRM |
| **08 – Envoi depuis le CRM (OVH)** | n8n | les emails écrits dans le CRM partent de contact@solvelab.fr (SMTP) |
| Fiverr | notifications email | chaque message Fiverr arrive dans Messages → Plateformes |

---

## Refaire l'installation

### 1. Supabase
SQL Editor → New query → coller [`supabase/migrations/0003_espace_de_travail.sql`](../supabase/migrations/0003_espace_de_travail.sql) → **Run**.

### 2. n8n : les 4 connexions
| Connexion | Type | Réglages |
|---|---|---|
| CRM | Header Auth | Name `x-api-key` · Value = `CRM_API_KEY` (la même que dans Vercel) |
| Boîte OVH (lire) | IMAP | User = contact@solvelab.fr · mot de passe · Host `ssl0.ovh.net` · Port `993` · SSL |
| Boîte OVH (envoyer) | SMTP | User + mot de passe · Host `ssl0.ovh.net` · Port `465` · SSL (actuellement : SMTP Brevo, ça marche aussi) |
| IA | Google Gemini (PaLM) Api | clé gratuite de Google AI Studio |

### 3. n8n : les automatisations
Importer [`n8n/07-boite-mail.json`](../n8n/07-boite-mail.json) et [`n8n/08-envoi-depuis-crm.json`](../n8n/08-envoi-depuis-crm.json) (⋯ → Import from File), choisir les connexions dans les nœuds marqués ⚠️, **Save**, **Active**.

### 4. Vercel
Settings → Environment Variables → `N8N_MAIL_WEBHOOK_URL` = Production URL du nœud 1 de la 08 (`…/webhook/crm-envoi-email`) → Redeploy.

### 5. Plateformes
Fiverr : Settings → Notifications → cocher Email pour les messages. L'email du compte doit être contact@solvelab.fr. Même chose plus tard pour Codeur, Malt…

---

## Filtre anti-spam

1. **Indices automatiques** (avant l'IA) : WhatsApp / Telegram, crypto / carte cadeau, faux email « Fiverr » qui ne vient pas de fiverr.com, vente d'avis ou de promotion, rachat du compte, lien ou fichier suspect.
2. **L'IA Gemini** juge avec ces indices : `ok` / `a_verifier` / `spam`.
3. Si l'IA ne répond pas, l'email part quand même dans **À vérifier** : rien n'est perdu.
4. Le spam reste 30 jours dans l'onglet Spam, puis il est effacé.

## Passer à Claude plus tard (≈ 1 €/mois)
Dans la 07, nœud 3 : adresse `https://api.anthropic.com/v1/messages`, connexion **Anthropic**, en-tête `anthropic-version: 2023-06-01`, corps `{{ JSON.stringify($json.anthropic_body) }}`.

## En cas de souci
n8n → l'automatisation → onglet **Executions** : la ligne rouge dit ce qui bloque.
