# Feuille de route

Statuts : ✅ terminé · 🔄 en cours / à vérifier · ⬜ à faire.

## Statut des grands blocs

| Tâche | Statut |
|---|---|
| Application complète (écrans, sessions, corrections, stats, planning, PWA) | ✅ |
| 5 examens blancs de 200 questions | ✅ |
| Banque de 1 448 questions | ✅ |
| Moteur de maîtrise (compétences, difficulté adaptative, sessions ciblées, « Pas sûre », horizon d'examen) | ✅ session 3, non committé |
| Correctif audio « un seul personnage entendu » | 🔄 livré, non confirmé sur l'appareil de l'utilisatrice |
| Écran Examens (5 examens) | 🔄 compilé et testé unitairement, jamais vu dans un navigateur |
| Déploiement GitHub Pages | 🔄 configuré ; fonctionnement final non vérifié par Claude |
| Objectif initial de 1 500–2 000 nouvelles questions | 🔄 1 059 ajoutées |

## Priorités recommandées

1. ⬜ Vérifier l'application déployée sur téléphone (son, écran Examens, installation PWA).
2. ⬜ Enrichir la réserve d'entraînement, surtout Part 7 (48), Parts 3/4 (42/39) et Part 1 (12) — voir docs/QUESTION_BANK.md.
3. ⬜ Remettre en place un test de bout en bout reproductible (Playwright en devDependency + script `npm run e2e`), aujourd'hui absent.
4. ⬜ Mode « saisie des résultats d'un test officiel papier » (précision par partie ajoutée aux statistiques).

5. ⬜ Révision finale J-2/J-1 reprenant toutes les erreurs, y compris maîtrisées.
6. ⬜ Brancher le planning (`plan.ts`) sur `priorities()` du moteur de maîtrise.
7. ⬜ Vérifier le moteur sur un export réel de l'utilisatrice et ajuster ses constantes.

## Améliorations possibles

- ⬜ Examens supplémentaires (`exam6` déjà déclaré ; au-delà, adapter `ExamPool` et `examPools()`).
- ⬜ Fichiers audio enregistrés (champ `audioFile` déjà pris en charge).
- ⬜ Chargement différé de la banque par pool si elle dépasse quelques milliers de questions.
- ⬜ Découper le bundle (avertissement Vite au-delà de 1,5 Mo).
- ⬜ Synchronisation entre appareils (nécessiterait un service externe : contraire au principe « sans compte » actuel).
- ⬜ Rappels push fiables (nécessiterait un serveur).

## Bugs et limites connus

- La synthèse vocale dépend des voix installées ; certaines voix « en ligne » de Chrome peuvent rester muettes (atténué, non éliminé).
- La taille d'un mini-examen est approximative (groupes indivisibles).
- `examPools()` ne reconnaît que `exam` + un chiffre.
- Le planning est construit sur J-17 → J-0 autour de `profile.examDate` ; une fois la date passée, il faut la modifier dans les réglages.
- Estimation /990 non calibrée (volontairement présentée comme indicative).

- Les priorités du moteur reposant sur moins de ~10 réponses sont fragiles (incertitude ≈ ±0,5 logit à 30 réponses).
- Une question laissée sans réponse en examen crée une carte d'erreur (le moteur de maîtrise, lui, l'ignore).
- Le temps par question utilise l'horloge murale (plafonné à 5× la cible dans le moteur).

## Dette technique

- Table Dexie `meta` déclarée mais inutilisée.
- Pas de linter (ESLint) configuré.
- `SessionPlayer.tsx` concentre beaucoup de logique (~450 lignes) ; candidat à un découpage.
- Les catégories sont des chaînes libres validées seulement à l'affichage (`CATEGORY_FR`), pas par le validateur.
