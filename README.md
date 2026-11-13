# TOEIC Sprint

Application de révision intensive du **TOEIC Listening & Reading** : gratuite, sans compte, sans API payante, installable sur téléphone (PWA) et utilisable hors ligne.
Conçue pour une préparation de 17 jours (11 → 28 novembre 2026), de 680 vers 800–850+.

## Fonctionnalités

| Module | Contenu |
|---|---|
| **Accueil** | Compte à rebours, score de référence / objectifs / estimation indicative (clairement distingués), programme du jour coché automatiquement, questions et temps du jour, série, score moyen récent, 3 faiblesses, erreurs à revoir, courbe Listening/Reading |
| **Diagnostic** | 50 questions chronométrées couvrant les 7 parties ; analyse par partie et par catégorie, temps moyen vs cible, priorités, planning adapté |
| **Révision du jour** | 5 / 10 / 20 / 30 / 45 min ; sélection adaptative (erreurs dues, parties et catégories faibles, nouveauté, difficulté, date de dernière révision) |
| **Session intensive** | 30 à 180 min, Listening / Reading / mixte, parties au choix, difficulté élevée, correction immédiate ou différée, chronomètre, pauses, reprise après interruption, bilan détaillé |
| **Examens blancs** | 5 examens complets et distincts de 200 questions (structure officielle), Listening ou Reading seul, mini-examens 20/30/50 ; lecture audio unique, grille, questions marquées, Reading 75 min, correction finale |
| **Mes erreurs** | Cahier d'erreurs à répétition espacée (SM-2 adaptée), statut de maîtrise, « Pourquoi je me suis trompée ? », favoris, questions difficiles |
| **Grammaire & vocabulaire** | 13 fiches (explication, exemples, pièges, mini-quiz, maîtrise calculée), flashcards à répétition espacée (vocabulaire pro, faux amis, collocations, règles et mots ajoutés depuis les corrections) |
| **Planning** | Programme du 11 au 28 novembre en 5 phases, adapté aux faiblesses, aux jours manqués, au diagnostic / examen non faits et à la disponibilité |
| **Statistiques** | Uniquement à partir de tes réponses : précision L/R, par partie, erreurs par catégorie, temps moyen, maîtrise, temps cumulé, calendrier, examens, premières vs dernières réponses, potentiel d'amélioration, badges |
| **Réglages** | Thème clair/sombre, voix et vitesse, rappels (.ics + notifications), export/import JSON, import de packs de questions |

## Démarrer en local

Prérequis : Node.js 20.19+ ou 22.12+.

```bash
npm install
```

```bash
npm run dev
```

Ouvre l'adresse affichée (sur le téléphone : l'adresse « Network », même Wi-Fi).

Autres commandes :

```bash
npm run validate   # vérifie la banque de questions
```

```bash
npm test           # tests unitaires (Vitest)
```

```bash
npm run build      # version de production dans dist/
```

```bash
npm run check      # validation + tests + build
```

## Déploiement gratuit

**GitHub Pages (recommandé)** : pousse le projet sur un dépôt GitHub (branche `main`), puis *Settings › Pages › Source : GitHub Actions*. Le workflow `.github/workflows/deploy.yml` valide la banque, lance les tests, construit et publie. L'app utilise des chemins relatifs et un routage par `#`, donc aucune configuration de sous-dossier n'est nécessaire.

**Cloudflare Pages** : commande de build `npm run build`, dossier de sortie `dist`.

## Installer sur le téléphone

1. Ouvre l'adresse de l'app déployée (HTTPS obligatoire pour la PWA).
2. **Android (Chrome)** : menu ⋮ › *Installer l'application* / *Ajouter à l'écran d'accueil*.
   **iPhone (Safari)** : bouton Partager › *Sur l'écran d'accueil*.
3. Ouvre l'app une fois en ligne : tout est mis en cache pour l'usage hors ligne.
4. Audio : installe une voix anglaise hors ligne si besoin (Android : *Paramètres › Synthèse vocale* ; iPhone : *Réglages › Accessibilité › Contenu énoncé › Voix*). L'app indique dans *Réglages › Audio* si tes voix fonctionnent hors ligne.

Pense à exporter régulièrement tes données (*Réglages › Sauvegarde*).

## Choix techniques

- **React 19 + TypeScript + Vite 6 + Tailwind 4** : rapide, typé, sans backend.
- **Dexie (IndexedDB)** : sauvegarde automatique et fiable sur l'appareil ; stockage persistant demandé au navigateur.
- **vite-plugin-pwa** : installation et hors ligne (Workbox).
- **Web Speech API** : audio gratuit ; chaque réplique est lue séparément (contournement des coupures de Chrome), avec voix différentes par interlocuteur quand l'appareil en propose, et watchdog en cas de blocage.
- **Routage par hash** maison et graphiques SVG maison : aucune dépendance superflue.

## Banque de questions

1 448 questions originales (aucun contenu ETS), réparties en :

| Pool | Total | P1 | P2 | P3 | P4 | P5 | P6 | P7 |
|---|---|---|---|---|---|---|---|---|
| Examens blancs n°1 à 5 (200 chacun) | 1 000 | 30 | 125 | 195 | 150 | 150 | 80 | 270 |
| Diagnostic | 50 | 3 | 8 | 9 | 6 | 10 | 4 | 10 |
| Entraînement | 398 | 12 | 84 | 42 | 39 | 141 | 32 | 48 |

Chaque examen blanc respecte la structure officielle (P7 : 29 questions sur documents simples + 25 sur documents doubles et triples). Les questions d'un examen blanc restent réservées tant que cet examen n'a pas été passé ; celles du diagnostic rejoignent l'entraînement une fois le diagnostic terminé. Le planning programme les examens à J-13, J-10, J-7, J-5 et J-3.

Répartition par difficulté : 385 de niveau B1+, 718 de niveau B2, 345 de niveau B2+/C1 (cible 800–850+). Le format, les formulations des questions et les types de pièges ont été calés sur les exemples officiels du guide du candidat ETS (TOEIC Listening & Reading Examinee Handbook), sans en reprendre le contenu.

### Ajouter des questions

Fichiers JSON dans `src/data/bank/**` (pris en compte au build) ou import dans l'app (*Réglages › Banque de questions*, ajoutés à l'entraînement). Format :

```json
{
  "part": 5,
  "pool": "practice",
  "questions": [
    {
      "id": "x-p5-001", "level": 2, "category": "preposition",
      "prompt": "The documents must be submitted ____ Friday.",
      "options": ["until", "by", "during", "since"], "answer": "B",
      "explanation": "« By » indique une date limite : au plus tard vendredi.",
      "traps": "« Until » indique qu'une situation se poursuit jusqu'à un moment.",
      "takeaway": "By + date = au plus tard à cette date.",
      "targetSec": 20
    }
  ],
  "sets": [
    {
      "id": "x-p3-c01", "part": 3, "kind": "conversation",
      "audio": [{ "s": "W", "t": "…" }, { "s": "M", "t": "…" }],
      "questions": [{ "id": "x-p3-01", "level": 2, "category": "detail", "prompt": "…", "options": ["…","…","…","…"], "answer": "C",
                      "evidence": "citation exacte de l'audio", "explanation": "…", "takeaway": "…" }]
    }
  ]
}
```

- Part 6 : blancs `{{1}}`…`{{4}}` dans `docs[].body` ; Part 7 : positions `[1]`…`[4]` pour l'insertion de phrase.
- Interlocuteurs : `M`, `W`, `M2`, `W2`, `N` (narrateur). Part 1 : illustration décrite par `scene`.
- Audio enregistré facultatif : champ `audioFile` (fichier placé dans `public/`), prioritaire sur la synthèse vocale.
- `npm run validate -- mon-pack.json` vérifie un pack. Le validateur contrôle : identifiants uniques, nombre d'options, lettre de réponse, explication qui cite la bonne réponse (Parts 5–6), citations (`evidence`) réellement présentes dans le support (Parts 3, 4, 7), groupes complets, blancs et positions présents, structure exacte de l'examen, équilibre des lettres.
- `scripts/rebalance-answers.ts` rééquilibre la position des bonnes réponses en remappant les références (A)–(D).

## Estimation du score

Aucune conversion n'est présentée comme officielle. Le score affiché est d'abord un **nombre de bonnes réponses** et une **précision par section**. L'estimation sur 990 est une **fourchette indicative** (±35 pts par section après une section complète, ±55 à partir de l'entraînement), obtenue avec une courbe moyenne inspirée de tables de conversion non officielles. Le vrai TOEIC est échelonné par ETS pour chaque formulaire, et nos questions ne sont pas calibrées.

## Tests effectués

- `npm run validate` : banque valide (1 448 questions, 267 groupes, structure exacte des 5 examens).
- `npm test` : 38 tests unitaires OK (dont : 5 examens complets sans question commune, examen exclu de l'entraînement tant qu'il n'est pas passé) (banque et validateur, répétition espacée, sélection adaptative, mini-examen, estimation, planning adaptatif, sessions et enregistrement, examens, sauvegarde export/import, série, faiblesses).
- Parcours de bout en bout dans Chromium headless en format mobile (390×844), thèmes clair et sombre : onboarding → révision du jour → corrections → bilan → toutes les pages → reprise de session → mini-examen (Listening verrouillé, grille, rendu de copie). Aucune erreur JavaScript.

## Limites connues

- **Audio** : synthèse vocale de l'appareil (qualité et accents variables, pas de vrais enregistrements). Sans voix anglaise installée, l'app passe en mode dégradé avec transcription, clairement signalé. Le rythme du Listening en examen dépend de la vitesse de la voix.
- **Banque** : 5 examens blancs ; refaire un examen déjà passé surestime le niveau (avertissement affiché). Les questions ne sont pas calibrées par ETS : leur difficulté est estimée. Les longues sessions sur une seule partie finissent par reproposer des questions déjà vues (en priorité les ratées). Des packs JSON permettent d'agrandir la banque.
- **Illustrations Part 1** : scènes vectorielles simplifiées, pas de photos réelles ; moins riches en détails que le vrai test.
- **Rappels** : sans serveur, les notifications ne partent que si l'app est ouverte ou récemment utilisée ; le fichier .ics est la méthode fiable. Sur iPhone, les notifications web exigent l'installation sur l'écran d'accueil.
- **Données** : stockées sur l'appareil uniquement (pas de synchronisation) ; utiliser l'export/import JSON pour changer d'appareil.
- **Tests sur appareils réels** : non réalisés ici (environnement sans téléphone ni voix de synthèse) ; testé en émulation mobile Chromium.

TOEIC est une marque d'ETS ; ce projet n'est ni affilié ni approuvé par ETS.
