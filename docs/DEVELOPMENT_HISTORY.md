# Historique du développement

Reconstitué à partir des commits Git et du contexte de la conversation de développement initiale (novembre 2026). Ajouter une entrée à chaque session.

## Session 1 — 11 au 13 novembre 2026 (conversation initiale avec Claude Code)

### Mise en place
- Node.js absent de la machine. L'installation via le script `nvm` (téléchargé puis exécuté) a été refusée par le contrôle de sécurité ; installation du binaire officiel Node 22.11.0 dans `~/.local/node` après vérification SHA-256.
- Versions figées et éprouvées (Vite 6, React 19.1, Tailwind 4.1, Vitest 3, TypeScript 5.8) plutôt que les toutes dernières majeures (Vite 8 incompatible avec Node 22.11, TypeScript 7 en cours de réécriture).

### Commit `7c4c44b` — première version
- Application complète : tous les écrans, banque de 389 questions (examen 1, diagnostic, 139 questions d'entraînement), validateur, rééquilibreur de réponses, 34 tests, PWA, workflow GitHub Pages, README.
- Problèmes rencontrés et résolus :
  - Bug de répétition espacée détecté par un test : une bonne réponse juste après une erreur faisait progresser la carte (tolérance de 2 h) → tolérance réduite à 5 min.
  - Tests de bout en bout (Playwright + Chromium headless, bibliothèques système extraites sans sudo) : aucun appareil sans voix anglaise n'affichait de message clair → mode dégradé « Aucune voix anglaise installée » avec transcription.
  - Mini-examen « 20 questions » qui en produisait 25 (groupes indivisibles) → tolérance resserrée (~22).
- Correctif audio (signalé par l'utilisatrice : « je n'entends qu'un personnage puis plus rien ») : interruptions de la synthèse traitées à tort comme un arrêt volontaire, et voix « en ligne » muettes. Ajout de nouvelles tentatives, voix de secours, préférence pour les voix locales, option « Une seule voix », unité d'examen marquée « écoutée » seulement après lecture complète. **Non vérifié sur l'appareil de l'utilisatrice.**
- Déploiement : push refusé (token sans permission `workflow`) → nouveau token ; GitHub Pages indisponible pour un dépôt privé en compte gratuit → dépôt rendu public par l'utilisatrice et source Pages réglée sur « GitHub Actions ». Le bon fonctionnement final du site n'a pas été vérifié par Claude.
- Note : Playwright a été désinstallé du projet après les tests ; les bibliothèques de Chromium étaient dans un dossier temporaire supprimé depuis.

### Commit `a91d5a5` — plusieurs examens blancs
- Type `ExamPool` (`exam1`…`exam6`), `examPools()`, validateur par examen, `startExam(kind, pool)`, `nextExamPool()`, `practicePools()` qui n'inclut un examen qu'après qu'il a été passé, écran Examens par examen, planning avec examens à J-13, J-10, J-7, J-5, J-3.

### Commits `2949b10` → `cef0379` — examens blancs n°2 à 5
- 4 × 200 questions originales. Format et formulations calés sur les exemples du guide officiel ETS (Examinee Handbook), sans reprise de contenu.
- À chaque lot : rééquilibrage des lettres, validation, corrections (surtout des explications trop courtes), tests, commit.

### Commits `10c1917` → `855848e` — réserve d'entraînement
- +259 questions (Parts 1, 2, 3, 4, 5, 6, 7). 3 questions ambiguës repérées à la relecture et corrigées.

### Commit `7b3b81f` — tests multi-examens, README
- 38 tests. Total banque : 1 448 questions (1 059 ajoutées lors de la 2e demande, en dessous de l'objectif initial de 1 500–2 000).

### Documentation de continuité (session de clôture)
- Ajout de `CLAUDE.md` et `docs/` (cette documentation), `.gitignore` complété, `tsconfig.tsbuildinfo` retiré du suivi Git (fichier généré).

### Session 3 (15 novembre 2026) — moteur de maîtrise (non committé à la fin de la session)
- Audit du dépôt. Constats pédagogiques : faiblesses calculées sur la précision brute (sans difficulté, questions refaites comptées comme les nouvelles), niveau de difficulté global unique, bonnes réponses au hasard jamais revues, estimation /990 gonflée par les questions refaites, intervalles pouvant dépasser la date d'examen.
- Ajout de `src/lib/mastery.ts`, sélection pilotée par le moteur, `startFocus`, bouton « Pas sûre », `examHorizon`, écrans Accueil / Stats / Erreurs adaptés, `weaknesses()` et `targetLevel()` supprimés. 55 tests.
- Vérification : simulation d'élève, calibrage des constantes, parcours Chromium headless avec données synthétiques.

### Session 4 (19 novembre 2026) — questions repliables
- Lecteur de session : une question traitée (validée en entraînement avec correction ; avec une réponse enregistrée en examen / sans correction) peut être repliée en un en-tête compact (numéro, statut, début de l'énoncé, chevron) et dépliée à tout moment. Commandes « Replier / Déplier les questions répondues » dans les unités de plusieurs questions.
- Logique pure dans `src/lib/fold.ts` (+ `tests/fold.test.ts`, 59 tests). Vérification Chromium headless (390 px) : 31 contrôles, aucune erreur console.

## Décisions techniques importantes

| Décision | Raison |
|---|---|
| Tout côté client, IndexedDB | gratuit, hors ligne, sans compte |
| Banque en JSON dans le dépôt + packs importables | ajout de questions sans code, validation automatique |
| Citations `evidence` vérifiées | garantir la cohérence réponse / support |
| Synthèse vocale plutôt qu'audio | aucun coût, aucun fichier ; limite assumée |
| Scènes SVG décrites en JSON | illustrations Part 1 sans droits d'image |
| Routeur par hash, `base: './'` | compatible GitHub Pages sans configuration |
| Estimation de score en fourchette | le score TOEIC est échelonné par ETS, aucune table publique |
| Examen exclu de l'entraînement tant qu'il n'est pas passé | évaluation non biaisée |
| Moteur de maîtrise recalculé depuis `attempts` (aucun stockage) | pas de migration, pas de risque pour les données, effet immédiat sur l'historique existant |
| Modèle logistique simple (type Elo avec hasard) plutôt qu'IRT/BKT complet | trop peu de données par compétence pour estimer plus de paramètres ; explicable et testable |
| Questions refaites faiblement pondérées, estimation sur premières tentatives | mémoriser une réponse n'est pas maîtriser la compétence |
| Repli des questions = état React non persisté | purement visuel : aucun risque pour les réponses, les tentatives ni le schéma Dexie |
| Difficulté visée ≈ 72 % de réussite | assez difficile pour apprendre, sans décourager à J-13 |
