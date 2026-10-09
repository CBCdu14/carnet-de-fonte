# Carnet de Fonte

Appli de suivi de musculation pour iPhone et Android (Expo / React Native).

- **Séances types** (Push, Pull…) composées d'exercices avec séries × reps.
- **Une seule charge par exercice** : la monter dans une séance la monte dans toutes les séances qui utilisent cet exercice.
- **Séance en cours** : saisie kg / reps par série, validation ✓, minuteur de repos (vibration), écran maintenu allumé, disques à mettre par côté pour la barre.
- **Fin de séance** : propositions de charge (double progression : toutes les séries réussies → + le pas de l'exercice).
- **Progrès** : courbe de la série la plus lourde et du 1RM estimé (Epley), volume hebdomadaire, historique.
- **Coach** : questions à ChatGPT (API OpenAI, ta clé, stockée chiffrée sur le téléphone) avec tes données en contexte. Bouton pour copier tes données vers l'app ChatGPT.
- **Données sur le téléphone** (SQLite), fonctionne sans réseau. Export / import JSON dans Réglages.

---

## Mise en ligne, pas à pas

Tout se fait depuis ton PC (Windows, macOS ou Linux). **Pas besoin de Mac** : les applis sont compilées dans le cloud par EAS.

### 0. Comptes à créer (une fois)

| Compte | Coût | Pourquoi |
|---|---|---|
| [Apple Developer Program](https://developer.apple.com/programs/enroll/) | 99 $/an | Installer l'appli sur ton iPhone via TestFlight. Validation Apple : 24-48 h. |
| [Expo](https://expo.dev/signup) | gratuit | Compilation dans le cloud (EAS Build) et mises à jour à distance (EAS Update). |
| [Google Play Console](https://play.google.com/console/signup) | 25 $ une fois | **Facultatif** : seulement si tu veux passer par le Play Store. Sinon, installation directe de l'APK (voir 3b). |
| [OpenAI Platform](https://platform.openai.com/api-keys) | à l'usage | Clé API du coach, avec quelques euros de crédit. |

### 1. Préparer le projet

Installe [Node.js LTS](https://nodejs.org) puis :

```bash
git clone https://github.com/<toi>/carnet-de-fonte.git
cd carnet-de-fonte
npm install
npx eas-cli@latest login          # ton compte Expo
npx eas-cli@latest init           # crée le projet chez Expo (ajoute projectId dans app.json)
npx eas-cli@latest update:configure   # branche les mises à jour à distance
git commit -am "Configuration EAS" && git push
```

### 2. iPhone (TestFlight)

```bash
npx eas-cli@latest build -p ios --profile production
```
EAS te demande ton identifiant Apple et crée seul les certificats. Compter 15-30 min. Ensuite :

```bash
npx eas-cli@latest submit -p ios --latest
```
L'appli arrive dans App Store Connect → onglet **TestFlight** (traitement Apple : ~15 min).
1. Dans TestFlight, ajoute-toi comme **testeur interne** (pas de validation Apple pour les testeurs internes).
2. Installe l'app **TestFlight** sur ton iPhone et accepte l'invitation.

> ⚠️ Un build TestFlight expire au bout de **90 jours** : relance les deux commandes ci-dessus avant l'échéance. Tes données restent sur le téléphone.

### 3a. Android, le plus simple : APK direct

```bash
npx eas-cli@latest build -p android --profile preview
```
À la fin, EAS affiche un lien et un QR code : ouvre-le sur ton téléphone Android, télécharge l'APK et installe-le (autorise « sources inconnues » quand Android le demande).

### 3b. Android via le Play Store (test interne)

```bash
npx eas-cli@latest build -p android --profile production
```
Le **premier** fichier `.aab` doit être envoyé à la main dans Play Console : crée l'appli → Tests → **Test interne** → importe le `.aab` → ajoute ton adresse e-mail comme testeur → ouvre le lien d'inscription sur ton téléphone. Les envois suivants : `npx eas-cli@latest submit -p android --latest`.

### 4. Première utilisation

- Ajuste les charges du programme de départ avec − / +, ou crée tes séances.
- Réglages (roue dentée sur l'écran Séances) → colle ta clé OpenAI pour activer le coach.
- Pense à **Exporter** tes données de temps en temps (iCloud Drive / Google Drive).

---

## Correctifs et évolutions

1. Tu décris le problème à Claude (avec ce dépôt GitHub branché).
2. Claude corrige et pousse sur `main`.
3. La correction arrive sur ton téléphone :
   - **Automatiquement** si le workflow GitHub `eas-update` est activé (voir ci-dessous) : au prochain lancement de l'appli, puis un redémarrage.
   - **Ou à la main** : `npx eas-cli@latest update --channel production --message "Correctif"`.

Les mises à jour à distance couvrent tout le code de l'appli (écrans, calculs, coach). Seuls l'ajout d'un module natif ou un changement de `app.json` demandent un nouveau build (étapes 2 / 3) : dans ce cas, augmenter `version` dans `app.json`.

### Activer les mises à jour automatiques

1. Sur expo.dev → Account settings → **Access tokens** → crée un token.
2. Sur GitHub → ton dépôt → Settings → Secrets and variables → Actions → **New repository secret** : nom `EXPO_TOKEN`, valeur = le token.

Chaque push sur `main` publie alors une mise à jour sur le canal `production`.

---

## Développement

```bash
npx tsc --noEmit        # vérification des types
npx expo start          # serveur de dev (nécessite un development build : eas build --profile development)
```

Structure :

```
App.tsx              barre d'onglets, minuteur de repos, toasts
src/store.tsx        données (SQLite kv-store), toutes les actions
src/logic.ts         calculs : disques, 1RM, volume, propositions de charge
src/coach.ts         contexte envoyé à ChatGPT + appel API OpenAI
src/screens/         Séances, Séance en cours, Exercices, Progrès, Coach, Réglages
src/sheets/          feuilles d'édition (séance, exercice, fin de séance)
```
