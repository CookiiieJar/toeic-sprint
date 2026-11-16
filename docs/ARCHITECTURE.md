# Architecture

Décrit le code tel qu'il existe. En cas de doute, le code fait foi.

## Stack (versions figées dans package.json)

| Rôle | Outil | Version |
|---|---|---|
| UI | React / React DOM | 19.1.0 |
| Langage | TypeScript (strict) | 5.8.3 |
| Build / dev | Vite + @vitejs/plugin-react | 6.3.5 / 4.5.2 |
| Styles | Tailwind CSS v4 (@tailwindcss/vite) | 4.1.10 |
| Persistance | Dexie (IndexedDB) + dexie-react-hooks | 4.0.11 / 1.1.7 |
| PWA | vite-plugin-pwa (Workbox, `registerType: autoUpdate`) | 1.0.0 |
| Tests | Vitest + jsdom + fake-indexeddb | 3.2.4 / 26.1.0 / 6.0.1 |
| Scripts | tsx | 4.20.3 |
| Runtime de dev | Node.js | 22.11.0 (dans `~/.local/node`) |

Choix volontaires : versions éprouvées plutôt que dernières majeures (Vite 8 exige Node ≥ 22.12, TypeScript 7 est la réécriture Go). Pas de routeur ni de bibliothèque de graphiques : routeur par hash maison (`src/lib/router.ts`) et graphiques SVG maison (`src/components/Charts.tsx`).

## Fichiers de configuration

- `package.json` / `package-lock.json` : dépendances et scripts.
- `vite.config.ts` : plugins, manifeste PWA, cache Workbox (`globPatterns`, limite 6 Mo), `base: './'` (surcharge possible via `BASE_PATH`), config Vitest (`tests/**/*.test.ts`, setup `tests/setup.ts`).
- `tsconfig.json` : strict, `noEmit`, types vite/vitest/pwa/node.
- `index.html` : métadonnées PWA, script anti-flash du thème (`localStorage.theme`).
- `.github/workflows/deploy.yml` : CI GitHub Pages (validate → test → build → deploy) sur push `main`.
- `public/` : icônes (`icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`).

## Organisation

```
src/
  main.tsx            démarrage : service worker, stockage persistant, seed des flashcards, packs, voix, rappel
  App.tsx             routes (hash), barre de navigation, onboarding, ErrorBoundary
  index.css           tokens de couleur clair/sombre + Tailwind
  lib/
    types.ts          tous les types (banque, sessions, tentatives, états, profil…)
    labels.ts         noms des parties, catégories FR, structure d'examen, temps cibles
    bankCore.ts       buildBank, validateBank, toUnits, examPools, stimulusText (pur, utilisé par les scripts)
    bank.ts           chargement de la banque (import.meta.glob) + packs importés
    db.ts             schéma Dexie
    sessions.ts       profil, création/fin de session, enregistrement des réponses, practicePools
    start.ts          lanceurs : révision du jour, session ciblée (startFocus), intensive, partie, diagnostic, examens, erreurs
    mastery.ts        moteur de maîtrise : niveau par compétence (partie × catégorie), priorités, rythme Reading
    selection.ts      sélection adaptative (pilotée par mastery.ts), coût estimé, mini-examens, erreurs dues
    srs.ts            répétition espacée (SM-2 adaptée)
    stats.ts          précision, séries, séries temporelles
    plan.ts           planning adaptatif J-17 → J-0
    scoring.ts        estimation indicative /990 (fourchette)
    audio.ts          moteur de synthèse vocale
    cards.ts          flashcards (seed, file de révision)
    backup.ts         export / import JSON, réinitialisation
    badges.ts, ics.ts, notify.ts, dates.ts, hooks.ts, router.ts
  components/         ui.tsx, AudioPanel, QuestionView (options + correction), DocView, Scene, Charts
  screens/            Home, Practice (+ IntensiveSetup), Exams, Errors, Stats, SessionPlayer, Summary,
                      Grammar, Flashcards, Plan, Settings, Onboarding, ExamDay
  data/               bank/**.json, grammar.ts (13 fiches), vocab.ts (vocabulaire, faux amis, collocations)
scripts/              validate-bank.ts, rebalance-answers.ts
tests/              8 fichiers de tests Vitest + setup.ts
```

## Persistance (IndexedDB, Dexie, base `toeic-sprint`, `version(1)`)

| Table | Clé | Contenu |
|---|---|---|
| `profile` | `id` = `me` | score de référence, objectifs, date d'examen, disponibilité, vitesse audio, voix, rappel, `singleVoice`, `diagnosticSessionId`, `onboarded` |
| `sessions` | `id` | session complète (unités, réponses, curseur, temps, statut `active/paused/done/abandoned`, `summary`, `meta`) — reprise possible |
| `attempts` | `++id` | une ligne par réponse enregistrée |
| `qstate` | `qid` | état par question + carte d'erreur `err` (SM-2) + favori |
| `cards` | `id` | flashcards (intégrées `v-`, `ff-`, `co-` ; règles `r-<qid>` ; perso `w-`, `m-`) |
| `daylog` | `day` | secondes, questions, réussites, cartes par jour |
| `concepts` | `key` | maîtrise manuelle et meilleur score des fiches |
| `packs` | `id` | packs de questions importés |
| `meta` | `key` | déclarée, non utilisée |

`localStorage` : uniquement `theme` et la checklist `examday` (préférences non critiques).

Sauvegarde : Réglages › Exporter (JSON `{ format: 'toeic-sprint-backup', version: 1, data: { table: rows } }`) / Importer (remplace tout après confirmation). `navigator.storage.persist()` est demandé au démarrage.

## Flux principaux

1. **Démarrage** : `main.tsx` enregistre le service worker, sème les flashcards manquantes, charge les packs, initialise les voix. `App.tsx` affiche l'onboarding tant que `profile.onboarded` est faux.
2. **Lancer une session** (`start.ts`) : choisit les questions (`selectQuestions`, `buildMiniExam` ou pool complet), les regroupe en unités (`toUnits` : un groupe = une unité), crée la session (`createSession`, qui met les autres sessions actives en pause) et navigue vers `#/session?id=…`.
3. **SessionPlayer** : écran de démarrage (déverrouillage audio), chronomètre (pause si onglet masqué, temps ajouté à `daylog` toutes les 10 s), affichage de l'unité (scène, audio, documents, questions). Entraînement avec correction immédiate : sélection puis « Valider » → `recordAttempt` (attempts + qstate + daylog) → `Correction`. Examen ou correction différée : réponses stockées dans la session, enregistrées à la fin. Listening en examen : lecture unique, fenêtre de réponse (8 s ou 8 s × nombre de questions) puis passage automatique, pas de retour ; une unité n'est marquée « écoutée » qu'après lecture complète. Reading en examen : grille, drapeaux, limite 75 min. Pauses facultatives (`breaks`).
4. **Fin** : `finishSession` enregistre les réponses restantes (en examen, sans réponse = fausse), calcule `summary`, statut `done` → écran `Summary` (bilan, estimation indicative si section complète, correction détaillée).
5. **Erreurs** : `applyResult` crée une carte SM-2 au premier échec (ou à une bonne réponse « pas sûre ») (relecture 10 min plus tard) ; une bonne réponse ne fait avancer la carte que si elle était due (tolérance 5 min) ; « maîtrisée » après 3 réussites espacées.
6. **Tableau de bord, statistiques, planning** : calculés à chaque rendu depuis `attempts`, `qstate`, `sessions`, `daylog` (`useLiveQuery`) ; aucune donnée simulée.

## Moteur de maîtrise (`src/lib/mastery.ts`)

Aucune donnée propre : tout est recalculé depuis `attempts` (≈ 0,4 ms pour 400 tentatives), donc aucun changement de schéma et l'historique existant alimente le moteur dès le premier lancement.

- **Compétence** : `p<partie>:<catégorie>`. **Modèle** : `P = g + (1−g)·σ(θ − b)`, `g` = 1/4 (1/3 en Part 2), `b` = −0,9 / 0 / +0,9 pour les niveaux 1/2/3. Départ θ = 0,4 (≈ 70 % sur un niveau 2).
- **Mise à jour** (ordre chronologique) : `θ += K·poids·(résultat − P)`, `K = max(0,2 ; 0,9/(1+0,08·n))`. Poids : 1 pour une première tentative, 0,3 / 0,6 pour une question refaite (réussie / ratée). Résultat : 1, 0, ou 0,5 pour une bonne réponse « pas sûre ». Tentatives sans réponse ignorées. Constantes choisies par simulation (compromis biais / variance) ; non calibrées sur des données réelles.
- **Lissage** : θ affiché = moyenne pondérée de la compétence et de sa partie (4 réponses fictives).
- **Maîtrise** = réussite attendue sur la répartition de niveaux de cette compétence dans les examens blancs ; **poids d'examen** = fréquence dans les examens blancs, normalisée sur la structure officielle (6/25/39/30/30/16/54) ; **potentiel** = (cible − maîtrise) × poids. Cible = repère de `requiredRates(targetMin)` + 4 points.
- **Utilisation** : `selectQuestions` (gain potentiel, difficulté visée 72 % de réussite — 55 % en mode difficile —, exploration, `focus`), Accueil et Stats (`priorities`, `readingPace`), planning (`weakParts`).
- **Hésitation** : « Pas sûre » → `AnswerRec.unsure` → `Attempt.unsure` ; si la réponse est bonne, carte `err.soft` due le lendemain.
- **Horizon d'examen** : `examHorizon(examDate)` plafonne les intervalles SM-2 (erreurs et flashcards) à « jours restants − 1 ».

## Audio (`src/lib/audio.ts`, `src/components/AudioPanel.tsx`)

Synthèse vocale découpée par réplique et par phrase ; `utter()` avec délai de démarrage (4 s), watchdog, références conservées (bug Chrome), reprise sur voix alternative puis voix par défaut, voix défaillantes mémorisées (`bad`), interruptions non demandées traitées comme fin de phrase. `singleVoice` = une voix, hauteurs différentes. Fichiers locaux via `playFile()` si `audioFile`.

## Scoring (`src/lib/scoring.ts`)

Courbe d'ancrage moyenne inspirée de tables non officielles, fourchette ±35 pts/section (section complète) ou ±55 (entraînement, ≥ 40 réponses L et R). Affiché comme « indicatif, non officiel ».

## Tests (`tests/`)

mastery (moteur, sélection ciblée, difficulté adaptative), bank (validation réelle de la banque), exams (5 examens complets, séparation entraînement), srs, selection, scoring, plan, sessions (enregistrement, examens, export/import, séries, faiblesses). `tests/setup.ts` charge fake-indexeddb ; `useTestDb(name)` isole une base par test.
