# Présentation du projet — TOEIC Sprint

## Objectif

Application personnelle, gratuite et hors ligne, pour préparer le TOEIC Listening & Reading sur smartphone. Créée pour passer de 680 à 800+ (idéalement 850) en 17 jours de préparation intensive (TOEIC prévu le 28 novembre 2026 ; date historique, modifiable dans Réglages).

Principes : aucune API payante, aucun compte, aucun backend ; données sur l'appareil ; contenu original ; statistiques calculées uniquement sur les réponses réelles ; aucune estimation de score présentée comme officielle.

## Fonctionnalités implémentées

| Domaine | Détail |
|---|---|
| Onboarding | score de référence, scores L/R facultatifs, disponibilité semaine / week-end, test du son, lancement du diagnostic |
| Accueil | compte à rebours, série, reprise de session, objectif (référence / 800 / 850 / estimation hachurée indicative), stats du jour, erreurs dues, programme du jour cliquable, 3 faiblesses, courbe L/R |
| Diagnostic | 50 questions sur les 7 parties, chronométré, analyse par partie, catégorie et temps, priorités |
| Révision du jour | 5 / 10 / 20 / 30 / 45 min, sélection adaptative |
| Session intensive | 30–180 min, L / R / mixte, parties au choix, difficulté élevée, correction immédiate ou finale, chronomètre, pauses, reprise |
| Par partie | sessions de 15 min sur une partie |
| Examens blancs | 5 examens distincts de 200 questions (complet, Listening seul, Reading seul), mini-examens 20/30/50, grille, drapeaux, historique, courbe |
| Correction | réponse, explication FR, citation du support, pièges, règle, ajout de la règle en flashcard, vocabulaire, favori |
| Cahier d'erreurs | filtres (dues, en cours, maîtrisées, favoris, partie), SM-2, « Pourquoi je me suis trompée ? » (causes), maîtrise manuelle |
| Grammaire | 13 fiches (explication, exemples, pièges, mini-quiz, maîtrise calculée), entraînement ciblé |
| Flashcards | vocabulaire pro, faux amis, collocations, règles et mots ajoutés, SM-2, création de cartes |
| Planning | J-17 → J-0 en 5 phases, adapté aux faiblesses, au diagnostic et aux examens restants, aux jours manqués et à la disponibilité ; tâches cochées automatiquement |
| Statistiques | précision L/R et par partie, erreurs par catégorie, temps par question, maîtrise, temps cumulé, calendrier, examens, premières vs dernières réponses, potentiel d'amélioration, badges |
| Jour J | checklist et conseils de gestion du temps |
| Réglages | thème, profil, voix (test, voix par locuteur, une seule voix, vitesse), rappels (.ics + notifications), export/import JSON, import de packs de questions, réinitialisation |
| PWA | installable, hors ligne après premier chargement, mise à jour automatique |

## Fonctionnalités manquantes ou partielles

- Pas de vrais enregistrements audio (synthèse vocale de l'appareil ; support `audioFile` prévu mais aucun fichier fourni).
- Pas de photos réelles en Part 1 (illustrations SVG schématiques).
- Pas de synchronisation entre appareils (export/import manuel).
- Rappels : notifications seulement si l'app est ouverte ou récente ; l'export .ics est la méthode fiable.
- Pas de mode « saisie des résultats d'un test officiel papier » (idée proposée, non faite).
- Voir docs/ROADMAP.md.

## Parcours utilisateur type

1. Premier lancement : onboarding → diagnostic → bilan et planning adapté.
2. Chaque jour : Accueil → programme du jour (révision, intensive, erreurs, flashcards, grammaire) → corrections → bilan.
3. Selon le planning : examens blancs complets (J-13, J-10, J-7, J-5, J-3) → correction → erreurs à revoir.
4. Jour de l'examen : écran Jour J.

Navigation : barre du bas (Accueil, Réviser, Examens, Erreurs, Stats) ; Réglages via l'icône de l'accueil.
