# CLAUDE.md — TOEIC Sprint

## Instruction permanente (à respecter à chaque session)

Au début de toute nouvelle session de développement, commence par lire CLAUDE.md et docs/HANDOFF.md, puis consulte les autres documents pertinents.
Inspecte ensuite l'état réel du code avant de proposer des modifications.
Ne suppose jamais qu'une fonctionnalité documentée existe encore sans vérifier si nécessaire.
À la fin d'une session impliquant des modifications du projet, mets à jour les documents concernés, notamment HANDOFF.md, ROADMAP.md et DEVELOPMENT_HISTORY.md.
Les fichiers du projet constituent la source de vérité. Ne dépends pas des souvenirs d'une ancienne conversation.

## Le projet en bref

PWA personnelle (React + TypeScript) de préparation au TOEIC Listening & Reading : diagnostic, révision adaptative, sessions intensives, 5 examens blancs de 200 questions, cahier d'erreurs à répétition espacée, grammaire, flashcards, planning, statistiques. 100 % côté client, gratuite, hors ligne, sans compte ni API. Interface et corrections en français, contenu des questions en anglais.

Contexte historique : créée le 11 novembre 2026 pour un TOEIC prévu le 28 novembre 2026 (score de départ 680, objectif 800+, idéal 850). **Cette date est historique** : vérifie la date du jour et `profile.examDate` (modifiable dans Réglages) avant de raisonner sur le planning.

Utilisatrice : étudiante ingénieure francophone, usage sur smartphone. Dépôt : `https://github.com/CookiiieJar/toeic-sprint` (public), déployé par GitHub Pages via `.github/workflows/deploy.yml`.

## Commandes

Node n'est pas installé globalement sur cette machine : il est dans `~/.local/node` (v22.11.0). Toujours préfixer :

```bash
export PATH=~/.local/node/bin:$PATH
```

| Commande | Rôle |
|---|---|
| `npm install` | dépendances (versions figées, voir package.json) |
| `npm run dev` | serveur de développement (accessible sur le réseau local) |
| `npm run validate` | **valide la banque de questions** (à lancer après toute modif de `src/data/bank`) |
| `npm test` | tests Vitest (59 tests au dernier point) |
| `npm run build` | `tsc -b` + build Vite dans `dist/` |
| `npm run check` | validate + test + build (à lancer avant tout commit) |
| `npx tsx scripts/rebalance-answers.ts <fichiers.json>` | rééquilibre la position des bonnes réponses |

## Architecture (détails : docs/ARCHITECTURE.md)

- `src/lib/` : logique pure (types, banque, **moteur de maîtrise `mastery.ts`**, sélection adaptative, SRS, sessions, planning, scoring, audio, sauvegarde).
- `src/screens/` : écrans (routeur par hash maison `src/lib/router.ts`, routes dans `src/App.tsx`).
- `src/components/` : UI, lecteur audio, rendu des documents, scènes SVG de la Part 1, graphiques.
- `src/data/bank/**.json` : **banque de questions** (chargée par `import.meta.glob`). Doc : docs/QUESTION_BANK.md.
- `src/data/grammar.ts`, `src/data/vocab.ts` : fiches de grammaire et flashcards intégrées.
- `scripts/` : validateur et rééquilibreur de la banque. `tests/` : Vitest (fake-indexeddb).

## Règles et précautions (à respecter impérativement)

1. **Données utilisateur** : progression stockée dans IndexedDB (Dexie, base `toeic-sprint`, schéma `version(1)`) sur l'appareil, **pas dans Git**. Toute modification du schéma doit ajouter `this.version(2).stores(...)` avec migration ; ne jamais renommer ou supprimer la base, une table, ni changer une clé primaire.
2. **Identifiants de questions** : ne jamais renommer ou supprimer un `id` existant (les tentatives, erreurs, favoris et flashcards y font référence). Ajouter plutôt que modifier.
3. **Origine de déploiement** : IndexedDB est liée à l'URL. Changer l'URL d'hébergement fait « perdre » les données ; prévenir l'utilisatrice d'exporter (Réglages › Sauvegarde) avant.
4. **Banque** : après tout ajout, lancer `npm run validate` puis `npm test`. Contenu original uniquement (aucun contenu ETS copié).
5. **Pools d'examens** : `exam1`…`exam6` sont déclarés dans `ExamPool` (`src/lib/types.ts`) ; `examPools()` ne reconnaît que `exam` + **un chiffre**. Un `exam7`+ demande d'adapter ces deux endroits.
6. **Honnêteté du scoring** : ne jamais présenter une estimation sur 990 comme officielle (voir `src/lib/scoring.ts`).
7. Pas de dépendance payante, pas de backend, pas de clé API. Ne jamais écrire de token, mot de passe ou e-mail personnel dans le dépôt ou la doc.
8. Ne pas pousser (`git push`) ni réécrire l'historique sans demande explicite.

## Conventions

- TypeScript strict, composants fonctionnels React, Tailwind v4 avec tokens CSS (`src/index.css`, mode sombre via la classe `.dark`).
- Textes d'interface et explications en français ; contenu TOEIC en anglais.
- Messages de commit en français ; terminer par la ligne `Co-Authored-By` demandée par l'environnement si applicable.
- Les nouveaux comportements critiques ont un test dans `tests/`.

## Documentation

`docs/HANDOFF.md` (état et prochaines actions) · `docs/PROJECT_OVERVIEW.md` · `docs/ARCHITECTURE.md` · `docs/QUESTION_BANK.md` · `docs/ROADMAP.md` · `docs/DEVELOPMENT_HISTORY.md` · `docs/RESUME_PROJECT.md` (guide de reprise). `README.md` : documentation utilisateur (installation, déploiement, téléphone).
