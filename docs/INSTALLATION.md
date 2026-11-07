# Installation pas à pas (sans connaissances techniques)

Durée : ~15 minutes. Ordre : **1. Supabase** → **2. Vercel** → **3. Première connexion**.

Garde un bloc-notes ouvert : tu vas y coller 3 valeurs de Supabase pour les recopier dans Vercel.

---

## ÉTAPE 1 — Supabase (la base de données)

### 1.1 Créer le projet
1. Va sur **supabase.com** → connecte-toi → bouton vert **New project**.
2. **Name** : `crm` · **Database Password** : clique *Generate a password* (pas besoin de le retenir) · **Region** : *West EU (Paris)*.
3. **Create new project** → attends 1 à 2 minutes que le projet soit prêt.

### 1.2 Créer les tables
1. Menu de gauche → icône **SQL Editor** (symbole `>_`).
2. Ouvre ce fichier sur GitHub : [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) → bouton **Copy raw file** (icône 📋 en haut à droite du fichier).
3. Reviens dans Supabase, colle dans la grande zone de texte → bouton **Run** (en bas à droite).
4. Tu dois voir **"Success. No rows returned"**. ✅

### 1.3 Créer ton compte pour te connecter au CRM
1. Menu de gauche → **Authentication** → **Users** → bouton **Add user** → **Create new user**.
2. Mets **ton email** et **un mot de passe** (c'est celui que tu taperas pour ouvrir le CRM) → coche *Auto Confirm User* → **Create user**.
3. Toujours dans Authentication → **Sign In / Providers** (ou *Providers*) → **désactive "Allow new users to sign up"** → **Save**. (Comme ça personne d'autre ne peut se créer un compte.)

### 1.4 Récupérer les 3 valeurs (URL + 2 clés)

Ce sont les "codes d'accès" de ta base de données. Le CRM en a besoin pour lire et écrire dedans.

| Valeur | C'est quoi ? | Où la trouver |
|---|---|---|
| **URL du projet** | l'adresse de ta base | En haut de l'écran, bouton **Connect** → onglet **App Frameworks** → ligne `NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co`. *(Ou : ⚙️ Project Settings → **Data API** → **Project URL**)* |
| **Clé publique** (anon / publishable) | clé "normale", utilisée quand tu es connecté au CRM | ⚙️ **Project Settings** → **API Keys** → **Publishable key** (commence par `sb_publishable_…`) → 📋 copier. *(Si tu as l'onglet **Legacy API Keys** : la clé **anon public**, commence par `eyJ…` — les deux fonctionnent)* |
| **Clé secrète** (service_role / secret) | clé "admin", utilisée par n8n et les pages publiques. **Ne jamais la partager.** | Même page **API Keys** → **Secret keys** → **Reveal** → 📋 copier (commence par `sb_secret_…`). *(Ou dans **Legacy API Keys** : la clé **service_role**, cliquer **Reveal**)* |

Colle ces 3 valeurs dans ton bloc-notes.

---

### 1.5 Journal du site (visites, clics « Réserver »)
Toujours dans **SQL Editor** → **New query** → colle [`supabase/migrations/0002_site_events.sql`](../supabase/migrations/0002_site_events.sql) → **Run**.

---

## ÉTAPE 2 — Vercel (mettre le CRM en ligne)

### 2.1 Importer le projet GitHub
1. Va sur **vercel.com** → connecte-toi **avec GitHub** (*Continue with GitHub*).
2. Bouton **Add New…** (en haut à droite) → **Project**.
3. Dans **Import Git Repository**, tu vois la liste de tes dépôts GitHub → à côté de **crm-prospection**, clique **Import**.
   - Tu ne le vois pas ? Clique **Adjust GitHub App Permissions** (ou *Configure GitHub App*) → coche le dépôt `crm-prospection` → **Save** → reviens sur Vercel.

👉 C'est bien **Importer** (pas "créer un nouveau projet vide", pas un template).

### 2.2 L'écran "Configure Project" / "New Project"

| Champ | Quoi mettre |
|---|---|
| **Project Name** | `crm-prospection` (ou ce que tu veux, ça donne l'adresse) |
| **Framework Preset** | **Next.js** (déjà sélectionné normalement) |
| **Root Directory** | ne touche pas (`./`) |
| **Build and Output Settings** | ne touche pas |
| **Environment Variables** | ⬇️ voir ci-dessous |

### 2.3 Environment Variables (le plus important)

Clique sur **Environment Variables** pour déplier. Pour chaque ligne : colle le nom dans **Key**, la valeur dans **Value**, puis **Add**.

| Key (copie exactement) | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | l'**URL du projet** Supabase (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la **clé publique** (`sb_publishable_…` ou `eyJ…` anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | la **clé secrète** (`sb_secret_…` ou `eyJ…` service_role) |
| `ALLOWED_EMAILS` | ton email (celui de l'étape 1.3) |
| `CRM_API_KEY` | un long mot de passe inventé (ex : 40 lettres/chiffres au hasard). C'est la clé que n8n utilisera. Garde-la. |
| `NEXT_PUBLIC_APP_URL` | `https://crm-prospection.vercel.app` (le nom du projet + `.vercel.app`) |
| `PUBLIC_SITE_URL` | l'adresse de ton site (ex : `https://tonsite.fr`). Pas encore de site ? mets `https://google.fr` pour l'instant |
| `BRAND_NAME` | le nom de ta société |

💡 Astuce : tu peux tout coller d'un coup. Copie ce bloc dans ton bloc-notes, remplace les valeurs, puis colle-le dans le premier champ **Key** — Vercel crée toutes les lignes tout seul :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=colle_ici_la_cle_publique
SUPABASE_SERVICE_ROLE_KEY=colle_ici_la_cle_secrete
ALLOWED_EMAILS=ton@email.fr
CRM_API_KEY=invente_un_long_mot_de_passe
NEXT_PUBLIC_APP_URL=https://crm-prospection.vercel.app
PUBLIC_SITE_URL=https://tonsite.fr
BRAND_NAME=Ma société
```

### 2.4 Déployer
Clique **Deploy**. Attends 1 à 2 minutes → confettis 🎉 → **Continue to Dashboard**.

Vérifie l'adresse affichée sous **Domains** :
- c'est bien `crm-prospection.vercel.app` → rien à faire ✅
- c'est autre chose (ex : `crm-prospection-abc12.vercel.app`) → **Settings** → **Environment Variables** → modifie `NEXT_PUBLIC_APP_URL` avec la bonne adresse → onglet **Deployments** → **⋯** sur le dernier → **Redeploy**.

---

## ÉTAPE 3 — Première connexion
1. Ouvre l'adresse du CRM → page de connexion.
2. Email + mot de passe créés à l'étape 1.3 → **Se connecter**.
3. Sur ton téléphone : ouvre l'adresse → menu Partager (iPhone) / ⋮ (Android) → **Ajouter à l'écran d'accueil**. Le CRM devient une appli.

---

## Problèmes fréquents

| Problème | Solution |
|---|---|
| "Email ou mot de passe incorrect" | Vérifie l'utilisateur dans Supabase → Authentication → Users. Il doit être *confirmé* (sinon supprime-le et recrée-le en cochant *Auto Confirm User*). |
| "Ce compte n'a pas accès au CRM" | L'email dans `ALLOWED_EMAILS` (Vercel) n'est pas le même que dans Supabase. Corrige puis **Redeploy**. |
| Page d'erreur / build rouge sur Vercel | Une variable est mal copiée (espace en trop, nom mal écrit). Vérifie dans Settings → Environment Variables puis **Redeploy**. |
| Pages vides / erreur après connexion | Le SQL de l'étape 1.2 n'a pas été exécuté. Refais-le. |

La variable `PUBLIC_SITE_ORIGINS` (adresse de ton site, pour le formulaire) sera ajoutée plus tard, quand on reliera ton site.
