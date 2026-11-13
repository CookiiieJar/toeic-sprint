import type { Part } from './types';

export const PART_NAMES: Record<Part, string> = {
  1: 'Photographs',
  2: 'Question-Response',
  3: 'Conversations',
  4: 'Talks',
  5: 'Incomplete Sentences',
  6: 'Text Completion',
  7: 'Reading Comprehension',
};

export const PART_FR: Record<Part, string> = {
  1: 'Photos',
  2: 'Questions-réponses',
  3: 'Conversations',
  4: 'Monologues',
  5: 'Phrases à compléter',
  6: 'Textes à compléter',
  7: 'Compréhension écrite',
};

export const LISTENING_PARTS: Part[] = [1, 2, 3, 4];
export const READING_PARTS: Part[] = [5, 6, 7];
export const ALL_PARTS: Part[] = [1, 2, 3, 4, 5, 6, 7];
export const isListening = (p: Part) => p <= 4;

/** Nombre de questions par partie dans un examen complet (structure officielle) */
export const EXAM_STRUCTURE: Record<Part, number> = { 1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54 };

/** Temps cible par défaut (secondes) – utilisé quand la question n'en précise pas */
export const DEFAULT_TARGET_SEC: Record<Part, number> = { 1: 20, 2: 15, 3: 25, 4: 25, 5: 22, 6: 35, 7: 60 };

export const CATEGORY_FR: Record<string, string> = {
  // Listening
  'photo-action': 'Photo : action en cours',
  'photo-state': 'Photo : état / position (being vs been)',
  'wh-question': 'Questions ouvertes (Wh-)',
  'yes-no': 'Questions fermées',
  'indirect-answer': 'Réponses indirectes / implicites',
  'choice-question': 'Questions à alternative (or)',
  'request-offer': 'Demandes, offres, suggestions',
  statement: 'Affirmations / remarques',
  'tag-question': 'Questions tag / négatives',
  'main-idea': 'Sujet / objectif principal',
  detail: 'Détails précis',
  inference: 'Inférence',
  intention: 'Intention du locuteur',
  'next-action': 'Action suivante',
  graphic: 'Questions avec graphique',
  // Grammaire / vocabulaire (Parts 5–6)
  'verb-tense': 'Temps verbaux',
  passive: 'Voix passive',
  'word-form': 'Familles de mots',
  preposition: 'Prépositions',
  conjunction: 'Conjonctions et connecteurs',
  pronoun: 'Pronoms',
  relative: 'Pronoms relatifs',
  comparison: 'Comparatifs / superlatifs',
  'modal-conditional': 'Modaux et conditionnels',
  vocabulary: 'Vocabulaire en contexte',
  collocation: 'Collocations professionnelles',
  determiner: 'Déterminants et quantifieurs',
  'gerund-infinitive': 'Gérondif / infinitif',
  agreement: 'Accord sujet-verbe',
  syntax: 'Structure de phrase / inversion',
  'sentence-insertion': 'Insertion de phrase',
  coherence: 'Cohérence textuelle',
  // Part 7
  synonym: 'Synonymes en contexte',
  'not-true': 'Questions NOT / vrai-faux',
  'cross-reference': 'Croisement de documents',
};

export const catLabel = (c: string) => CATEGORY_FR[c] ?? c;

export const LEVEL_FR: Record<number, string> = { 1: 'B1+', 2: 'B2', 3: 'B2+ / C1' };
