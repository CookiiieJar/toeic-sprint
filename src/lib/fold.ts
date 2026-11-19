import type { Question, Session } from './types';

/**
 * Repli / dépli des questions déjà traitées dans le lecteur de session.
 * État purement visuel : il ne touche ni aux réponses, ni aux tentatives, ni au chronomètre.
 */
export type FoldStatus = 'correct' | 'wrong' | 'answered';

/**
 * Statut d'une question pour l'en-tête repliable, ou `null` si elle n'est pas encore traitée
 * (une question non traitée n'est jamais repliable).
 * - Entraînement avec correction immédiate : traitée = validée ; le résultat est déjà affiché, on peut l'indiquer.
 * - Examen ou entraînement sans correction : traitée = une réponse est enregistrée ; on n'indique **jamais**
 *   si elle est juste (la correction n'arrive qu'au bilan).
 */
export function foldStatus(
  s: Pick<Session, 'mode' | 'immediateFeedback' | 'validated' | 'answers'>,
  q: Pick<Question, 'id' | 'answer'>,
): FoldStatus | null {
  const choice = s.answers[q.id]?.choice ?? null;
  if (s.mode === 'practice' && s.immediateFeedback) {
    if (!s.validated?.includes(q.id)) return null;
    return choice === q.answer ? 'correct' : 'wrong';
  }
  return choice ? 'answered' : null;
}

/** Replie (`fold = true`) ou déplie les questions données ; renvoie un nouvel ensemble. */
export function setFolded(collapsed: ReadonlySet<string>, qids: readonly string[], fold: boolean): Set<string> {
  const next = new Set(collapsed);
  for (const id of qids) {
    if (fold) next.add(id);
    else next.delete(id);
  }
  return next;
}

/** Une question est affichée repliée seulement si elle est traitée ET repliée par l'utilisatrice. */
export const isFolded = (collapsed: ReadonlySet<string>, qid: string, status: FoldStatus | null) => status !== null && collapsed.has(qid);
