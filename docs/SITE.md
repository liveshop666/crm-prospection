# Relier ton site au CRM

Deux branchements :
1. **Formulaire de contact** → chaque demande arrive dans le CRM (🔥 Chaud, « Nouveau à voir »)
2. **Prise de RDV (Cal.com)** → chaque RDV arrive dans le CRM (📅 RDV, « Nouveau à voir »)

Si la personne vient du lien envoyé par l'agent (`https://ton-crm/r/xxxx`), son adresse sur ton site contient `?ref=xxxx` : la demande ou le RDV se range **automatiquement sur sa fiche**.

> Dans les exemples, remplace `https://TON-CRM.vercel.app` par l'adresse de ton CRM et `TON-PSEUDO/rdv` par ton lien Cal.com.

---

## Étape A — Réglages dans Vercel

Vercel → ton projet → **Settings** → **Environment Variables** → ajoute :

| Key | Value |
|---|---|
| `PUBLIC_SITE_URL` | l'adresse de ton site, ex : `https://tonsite.fr` (là où le lien de l'agent amène) |
| `PUBLIC_SITE_ORIGINS` | ton site avec et sans www, séparés par une virgule : `https://tonsite.fr,https://www.tonsite.fr` |
| `CALCOM_WEBHOOK_SECRET` | un mot de passe que tu inventes (tu le remettras dans Cal.com) |

Puis **Deployments** → **⋯** → **Redeploy**.

---

## Étape B — Cal.com (prise de RDV, gratuit)

1. Crée un compte sur **cal.com** → connecte ton agenda (Google Agenda…).
2. **Event Types** : crée un type de RDV, ex : « Appel découverte — 20 min ». Dans *Advanced*, tu peux ajouter une question « Entreprise » (identifiant : `company`) et « Téléphone ».
3. Note ton lien, ex : `https://cal.com/TON-PSEUDO/rdv`.
4. **Settings** → **Developer** → **Webhooks** → **New** :
   - **Subscriber URL** : `https://TON-CRM.vercel.app/api/public/calcom`
   - **Secret** : la même valeur que `CALCOM_WEBHOOK_SECRET`
   - **Event triggers** : coche *Booking Created*, *Booking Rescheduled*, *Booking Cancelled*
   - **Create** → bouton **Ping test** : doit répondre ✅

---

## Étape C — Le bloc à coller sur ton site

Ce bloc contient le formulaire **et** le bouton de RDV. Il garde le `ref` du prospect même s'il change de page sur ton site.

```html
<!-- ===== CRM : formulaire de contact + RDV ===== -->
<form id="crm-form" action="https://TON-CRM.vercel.app/api/public/lead" method="POST" style="display:grid;gap:10px;max-width:520px">
  <input type="hidden" name="ref">
  <input type="hidden" name="redirect" value="https://tonsite.fr/merci">
  <input name="hp" style="display:none" tabindex="-1" autocomplete="off">
  <input name="name" placeholder="Votre nom" required>
  <input name="company" placeholder="Votre entreprise">
  <input name="email" type="email" placeholder="Email" required>
  <input name="phone" type="tel" placeholder="Téléphone">
  <select name="interest">
    <option>Site internet</option>
    <option>Automatisation</option>
    <option>Logiciel sur mesure</option>
    <option>Autre</option>
  </select>
  <input name="budget" placeholder="Budget (facultatif)">
  <textarea name="message" rows="4" placeholder="Votre projet en quelques mots"></textarea>
  <button type="submit">Envoyer ma demande</button>
</form>

<p><a id="crm-rdv" href="https://cal.com/TON-PSEUDO/rdv" target="_blank">📅 Prendre rendez-vous</a></p>

<script>
(function () {
  var p = new URLSearchParams(location.search), ref = p.get('ref');
  try { if (ref) localStorage.setItem('crm_ref', ref); else ref = localStorage.getItem('crm_ref'); } catch (e) {}
  if (!ref) return;
  var f = document.querySelector('#crm-form input[name=ref]'); if (f) f.value = ref;
  document.querySelectorAll('a[href*="cal.com/"]').forEach(function (a) {
    var u = new URL(a.href); u.searchParams.set('metadata[ref]', ref); a.href = u.toString();
  });
})();
</script>
<!-- ===== fin CRM ===== -->
```

- `redirect` : la page où arrive le client après l'envoi (crée une page « Merci » sur ton site). Sans ce champ, il voit juste `{"ok":true}`.
- Le script ajoute le `ref` à **tous** les liens Cal.com de la page : tu peux mettre plusieurs boutons RDV.
- Le style (couleurs, police) est à adapter à ton site.

### Où le coller selon ton site
| Site fait avec | Où coller |
|---|---|
| **WordPress** | Page Contact → bloc **« HTML personnalisé »** → coller |
| **Webflow** | Glisser un élément **Embed** → coller |
| **Shopify** | Page → éditeur en mode **< >** (HTML) → coller |
| **Code maison** | Dans la page contact, à l'endroit voulu |
| **Wix / Squarespace** | ⚠️ leurs blocs HTML sont isolés : le `ref` se perd. Me demander la version adaptée. |

---

## Étape D — Tester

1. Dans le CRM, crée un prospect test → copie son **lien personnalisé** → ouvre-le : tu arrives sur ton site avec `?ref=…`, et sa fiche affiche 👀 *A visité ton site*.
2. Remplis le formulaire → sa fiche passe en 🔥 *Chaud* avec ta demande dans l'historique.
3. Clique sur 📅 *Prendre rendez-vous* → réserve un créneau → la fiche passe en 📅 *RDV*.
4. Annule le RDV dans Cal.com → la fiche affiche « ❌ RDV annulé ».
