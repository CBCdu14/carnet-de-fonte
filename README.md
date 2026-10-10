# Carnet de Fonte

Appli de suivi de musculation pour iPhone et Android : web app installable (PWA), avec option appli native. Expo / React Native.

- **Séances types** (Push, Pull…) composées d'exercices avec séries × reps.
- **Une seule charge par exercice** : la monter dans une séance la monte dans toutes les séances qui utilisent cet exercice.
- **Séance en cours** : saisie kg / reps par série, validation ✓, minuteur de repos (vibration), écran maintenu allumé, disques à mettre par côté pour la barre.
- **Fin de séance** : propositions de charge (double progression : toutes les séries réussies → + le pas de l'exercice).
- **Progrès** : courbe de la série la plus lourde et du 1RM estimé (Epley), volume hebdomadaire, historique.
- **Coach** : questions à ChatGPT (API OpenAI, ta clé, stockée chiffrée sur le téléphone) avec tes données en contexte. Bouton pour copier tes données vers l'app ChatGPT.
- **Garmin** (montre + balance) : poids, calories dépensées, pas, sommeil, FC repos et activités, via le dépôt privé `carnet-data` (synchro nocturne). Réglages → Garmin.
- **Synchro entre appareils** via le dépôt privé `carnet-data` (fichier `data/carnet.json`), fusion par élément (la modification la plus récente gagne). Fonctionne aussi hors ligne : les données restent sur l'appareil et partent à la synchro suivante. Export / import JSON dans Réglages.

---

## Web app sur iPhone et Android (gratuit)

L'appli est publiée gratuitement sur GitHub Pages et s'installe sur l'écran d'accueil. Elle marche ensuite sans réseau.

### 1. Mettre en ligne (une fois)

1. Crée un dépôt GitHub nommé **`carnet-de-fonte`** (le nom compte : il fait partie de l'adresse ; s'il change, adapter `experiments.baseUrl` dans `app.json`).
2. Pousse ce code sur la branche `main`.
3. Dans le dépôt : **Settings → Pages → Source : GitHub Actions**.
4. Onglet **Actions** : le workflow « Publier la web app » tourne (2-3 min). L'appli est alors en ligne à
   `https://<ton-pseudo-github>.github.io/carnet-de-fonte/`

### 2. Installer sur le téléphone

- **iPhone** : ouvre l'adresse dans **Safari** → bouton Partager → **Sur l'écran d'accueil**.
- **Android** : ouvre l'adresse dans **Chrome** → menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).

Ouvre-la toujours depuis l'icône : c'est là que tes données vivent (elles restent sur le téléphone, pas sur GitHub).

### 3. Mises à jour

Chaque push sur `main` republie l'appli. Elle se met à jour toute seule à l'ouverture suivante quand le téléphone a du réseau (deux ouvertures au plus).

### Bon à savoir

- **Sauvegarde** : Réglages → Exporter, de temps en temps (iCloud Drive, Google Drive…). Si tu supprimes l'icône de l'écran d'accueil sur iPhone, ses données sont effacées avec.
- **Vibrations** : sur Android uniquement (Safari ne laisse pas les pages vibrer).
- **Coach** : Réglages → colle ta clé API OpenAI (platform.openai.com → API keys, avec un peu de crédit).

---

## Option : appli native (TestFlight / APK)

Le même code peut aussi être compilé en vraie appli avec EAS (`eas.json` est prêt) :
`npx eas-cli@latest build -p android --profile preview` donne un APK installable directement (gratuit).
Pour l'iPhone, il faut un compte Apple Developer (99 $/an) : `eas build -p ios` puis `eas submit -p ios` → TestFlight.
Le workflow `eas-update.yml` ne fait rien tant que le secret `EXPO_TOKEN` n'est pas défini.

---

## Développement

```bash
npx tsc --noEmit        # vérification des types
npx expo start --web    # serveur de dev web (http://localhost:8081/carnet-de-fonte)
npx expo export -p web  # build web dans dist/
```

Structure :

```
App.tsx              barre d'onglets, minuteur de repos, toasts
src/store.tsx        données (SQLite kv-store), toutes les actions
src/logic.ts         calculs : disques, 1RM, volume, propositions de charge
src/coach.ts         contexte envoyé à ChatGPT + appel API OpenAI
src/screens/         Séances, Séance en cours, Exercices, Progrès, Coach, Réglages
src/sheets/          feuilles d'édition (séance, exercice, fin de séance)
src/platform/        différences web / natif (stockage, clé, vibration, écran allumé, sauvegarde)
public/              index.html, manifest et service worker de la web app
```
