# Transmission (handoff)

> À mettre à jour à la fin de chaque session qui modifie le projet.
> Dernière mise à jour : **15 novembre 2026** (session 3 : moteur de maîtrise). Examen visé : 28 novembre 2026 (J-13 à cette date) — vérifier `profile.examDate` et la date du jour avant tout raisonnement de planning.

## 1. Contexte en une minute

PWA React/TypeScript 100 % cliente pour préparer le TOEIC L&R (score de départ 680, objectif 800+). Lire d'abord `CLAUDE.md` (règles impératives : données IndexedDB, identifiants de questions, pas de `git push` sans demande), puis ce fichier, puis `docs/ARCHITECTURE.md`.

La session 3 répondait à la demande : « analyser le dépôt, concevoir un moteur de révision qui identifie les faiblesses, adapte la difficulté et programme les révisions, l'implémenter et le tester ». Le choix a été d'**ajouter un moteur au-dessus de l'existant** (sélection, SRS, écrans), sans rien reconstruire et sans toucher au schéma de la base.

## 2. État exact

- Branche `main`. **Les modifications de la session 3 ne sont pas committées** (ni poussées) : l'utilisatrice n'a pas demandé de commit. `git status` montre aussi `CLAUDE.md` et `docs/` non suivis depuis la session 2.
- `npm run check` : ✅ banque valide (1 448 questions, 5 examens), ✅ **55 tests** (38 auparavant), ✅ build.
- Schéma Dexie inchangé (`version(1)`) : aucune migration, les données existantes sont réutilisées telles quelles.

## 3. Ce qui a été fait en session 3

### Nouveau : `src/lib/mastery.ts` (moteur de maîtrise, pur, testé)
- Compétence = `partie × catégorie` (clé `p5:word-form`). Niveau θ estimé en **rejouant la table `attempts`** dans l'ordre chronologique (rien de nouveau à stocker).
- Modèle : `P(réussite) = g + (1−g)·σ(θ − b)` ; `g` = hasard (1/4, 1/3 en Part 2), `b` = −0,9 / 0 / +0,9 selon le niveau 1/2/3 ; mise à jour type Elo `θ += K·poids·(résultat − P)`, `K = max(0,2 ; 0,9/(1+0,08·n))`.
- Pondérations : question déjà vue = 0,3 (réussite) ou 0,6 (échec) ; bonne réponse « pas sûre » = 0,5 ; **sans réponse = ignorée**. Une compétence peu observée est rapprochée du niveau de sa partie (4 réponses fictives).
- Sorties : `mastery` (réussite attendue sur la difficulté réelle des examens blancs), `examWeight` (questions de ce type par examen, normalisé sur la structure officielle), `potential = (cible − mastery) × examWeight`, `pace` (temps médian / cible, Reading).
- Fonctions : `computeMastery`, `priorities`, `weakParts`, `readingPace` (projection de la durée des 100 questions du Reading), `firstExposures`, `targetsFor`, `pCorrect`, `examMix`.

### Sélection (`src/lib/selection.ts`)
- La note d'une unité repose désormais sur le moteur : gain potentiel (racine carrée normalisée), **difficulté adaptée par compétence** (probabilité de réussite visée 72 %, 55 % en mode difficile), exploration des compétences peu observées, option `focus` (compétences ciblées). Les règles existantes sont conservées : erreurs dues en tête, nouveauté, plafond de 40 % par partie, budget de temps.
- `targetLevel` (niveau global unique) supprimé.

### Répétition espacée (`src/lib/srs.ts`, `sessions.ts`, `cards.ts`)
- Bouton **« Pas sûre »** à côté de « Valider » (entraînement avec correction immédiate). Bonne réponse hésitante → carte `err.soft` à reconfirmer le lendemain ; l'indicateur `unsure` est enregistré dans `AnswerRec` et `Attempt` (champs facultatifs, non indexés).
- `examHorizon()` : plafond d'intervalle = jours restants − 1, pour que chaque erreur et chaque flashcard repasse avant l'examen. Sans examen à venir, plafond normal (21 j).

### Écrans
- **Accueil** : bloc « Mes priorités » (3 compétences, maîtrise estimée, gain en questions/examen, bouton « Travailler » → `startFocus`), bouton « Session ciblée 20 min », alerte si le Reading projeté dépasse 75 min. Année de l'examen plus codée en dur.
- **Stats** : potentiel par compétence, « Maîtrise estimée par partie », « Rythme en Reading ».
- **Erreurs** : libellé des cartes « réussie avec hésitation ».
- Estimation /990 (Accueil, Stats) calculée sur les **premières tentatives uniquement** (les questions refaites gonflaient le résultat).

### Supprimé
- `weaknesses()` de `stats.ts` (remplacé par `priorities()` ; précision brute sur 400 réponses, sans difficulté ni mémorisation).

## 4. Vérifié / non vérifié

**Vérifié pendant la session**
- 55 tests unitaires, validation de la banque, build de production.
- Simulation d'une élève fictive (8 jours) : les faiblesses injectées ressortent en tête des priorités ; réussite quotidienne 65–80 % (difficulté visée). Calibrage : biais < 0,2 logit et écart-type ≈ 0,5 logit après 30 réponses par compétence — **les priorités fondées sur moins de ~10 réponses sont donc fragiles** (le nombre de réponses est affiché).
- Parcours réel dans Chromium headless (390 px) avec données synthétiques : Accueil, Stats, session ciblée, « Pas sûre » → tentative `unsure`, carte `soft` due le lendemain, aucune erreur console.

**Non vérifié (à dire à l'utilisatrice)**
- **Ses vraies données** : elles sont dans l'IndexedDB de son téléphone, inaccessibles ici. Le diagnostic pédagogique porte sur le code, pas sur ses résultats réels.
- **Gain de score** : aucune preuve que le moteur améliore le score ; les constantes (72 %, poids 0,3/0,6, K) sont des choix raisonnés, pas calibrés sur des données réelles.
- Rendu sur un vrai téléphone, audio réel, site GitHub Pages, écran Examens (inchangé depuis la session 2).
- Pas de test de bout en bout dans le dépôt (le script de vérification navigateur était temporaire).

## 5. Diagnostic : problèmes connus restants (par priorité)

1. **Réserve d'entraînement trop petite pour la Part 7** (≈ 48 questions en `practice`, alors que la Part 7 pèse 54 questions/examen et que le moteur la met en avant) : les mêmes textes reviennent vite. Les questions d'un examen blanc rejoignent l'entraînement une fois l'examen passé, ce qui atténue le problème. Ajouter des groupes Part 7 (puis 3/4) reste l'amélioration de contenu la plus rentable — voir `docs/QUESTION_BANK.md` § 4, contenu original uniquement.
2. **Questions non répondues en examen** : `finishSession` les enregistre comme fausses (attendu pour le score) et crée une carte d'erreur. Le moteur les ignore, mais le cahier d'erreurs peut être gonflé après un Reading non terminé.
3. **Temps par question** : mesuré avec l'horloge murale (`mark()` dans `SessionPlayer`), donc faussé si le téléphone reste posé ; le moteur plafonne à 5× la cible. En groupe, le temps de lecture du texte est attribué à la première question.
4. **Planning** (`plan.ts`) : modèle fixe J-17 → J-0, seulement ajusté par les parties faibles ; il ne s'appuie pas encore sur `priorities()`.
5. `SessionPlayer.tsx` (~470 lignes) concentre trop de logique ; pas d'ESLint ; table `meta` inutilisée ; bundle unique de 1,36 Mo.
6. Cartes d'erreur « maîtrisées » : plus jamais reproposées, même la veille de l'examen.

## 6. Prochaines actions recommandées

1. Demander à l'utilisatrice si elle veut **committer / déployer** (elle doit pousser pour que le téléphone reçoive la version ; l'URL ne change pas, donc les données sont conservées — lui conseiller malgré tout un export dans Réglages › Sauvegarde avant).
2. Après quelques jours d'usage, lui demander un export JSON : rejouer `computeMastery` dessus pour vérifier que les priorités sont crédibles et ajuster les constantes.
3. Contenu : +30 à 50 questions Part 7 (doubles/triples documents), puis Parts 3/4.
4. « Révision finale » J-2/J-1 : session reprenant toutes les erreurs, y compris maîtrisées, et les règles associées.
5. Brancher `plan.ts` sur `priorities()` (tâches « compétence » plutôt que « partie »).
6. Test de bout en bout reproductible (Playwright en devDependency) ; il faut `libnspr4`, `libnss3`, `libasound2` sur la machine pour lancer Chromium.

## 7. Fichiers importants

| Fichier | Rôle |
|---|---|
| `src/lib/mastery.ts` | **moteur de maîtrise** (modèle, priorités, rythme) |
| `src/lib/selection.ts` | sélection adaptative (utilise le moteur) |
| `src/lib/srs.ts`, `src/lib/sessions.ts` | SM-2 adapté, `applyResult` (cartes d'erreur, hésitations, horizon d'examen) |
| `src/lib/start.ts` | lanceurs de session (`startFocus` = session ciblée) |
| `src/screens/Home.tsx`, `Stats.tsx`, `SessionPlayer.tsx` | affichage des priorités, bouton « Pas sûre » |
| `src/lib/types.ts`, `src/lib/db.ts` | contrat de données et schéma (ne pas casser) |
| `src/data/bank/**`, `src/lib/bankCore.ts` | banque et validateur |
| `tests/mastery.test.ts` | 15 tests du moteur et de la sélection |

## 8. Reprendre rapidement

```bash
cd ~/toeic-sprint
export PATH=~/.local/node/bin:$PATH
git status && git log --oneline | head -5
npm install
npm run check
npm run dev
```

Git : `git add -A && git commit -m "…"` ; `git push` **uniquement à la demande de l'utilisatrice**.

## 9. Rappel sur les données

La progression est dans **IndexedDB du navigateur de chaque appareil**, pas dans Git. Seul l'export JSON (Réglages › Sauvegarde) la sauvegarde. Changer l'URL de déploiement ou effacer les données du site la fait disparaître. Les champs ajoutés en session 3 (`unsure`, `err.soft`) sont facultatifs : les anciennes sauvegardes restent importables.
