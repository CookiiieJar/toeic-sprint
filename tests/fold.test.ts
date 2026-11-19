import { describe, expect, it } from 'vitest';
import { foldStatus, isFolded, setFolded } from '../src/lib/fold';
import type { Session } from '../src/lib/types';

type S = Pick<Session, 'mode' | 'immediateFeedback' | 'validated' | 'answers'>;
const q1 = { id: 'q1', answer: 'B' as const };
const q2 = { id: 'q2', answer: 'C' as const };
const q3 = { id: 'q3', answer: 'A' as const };
const rec = (choice: 'A' | 'B' | 'C' | 'D') => ({ choice, timeMs: 1000, at: 1 });

describe('repli des questions traitées', () => {
  it('entraînement avec correction : seule une question validée est repliable, avec son résultat', () => {
    const s: S = { mode: 'practice', immediateFeedback: true, validated: ['q1', 'q2'], answers: { q1: rec('B'), q2: rec('A') } };
    expect(foldStatus(s, q1)).toBe('correct');
    expect(foldStatus(s, q2)).toBe('wrong');
    expect(foldStatus(s, q3)).toBeNull(); // non répondue
    // réponse choisie mais pas encore validée (sélection en attente) : pas repliable
    const pending: S = { ...s, validated: [], answers: { q1: rec('B') } };
    expect(foldStatus(pending, q1)).toBeNull();
  });

  it('examen et entraînement sans correction : jamais de résultat révélé', () => {
    for (const s of [
      { mode: 'exam', immediateFeedback: false, answers: { q1: rec('B'), q2: rec('A') } },
      { mode: 'practice', immediateFeedback: false, answers: { q1: rec('B'), q2: rec('A') } },
    ] as S[]) {
      expect(foldStatus(s, q1)).toBe('answered');
      expect(foldStatus(s, q2)).toBe('answered');
      expect(foldStatus(s, q3)).toBeNull();
    }
    // marquée « à revoir » sans réponse : pas repliable
    const flaggedOnly: S = { mode: 'exam', immediateFeedback: false, answers: { q3: { choice: null, timeMs: 0, at: 1, flagged: true } } };
    expect(foldStatus(flaggedOnly, q3)).toBeNull();
  });

  it('replier / déplier une à une puis globalement, sans muter l’état ni toucher aux réponses', () => {
    const s: S = { mode: 'practice', immediateFeedback: true, validated: ['q1', 'q2'], answers: { q1: rec('B'), q2: rec('A') } };
    const before = JSON.stringify(s);
    const empty = new Set<string>();
    const a = setFolded(empty, ['q1'], true);
    const b = setFolded(a, ['q2'], true);
    expect([...b].sort()).toEqual(['q1', 'q2']);
    expect(empty.size).toBe(0); // immuable
    const c = setFolded(b, ['q1'], false);
    expect([...c]).toEqual(['q2']);
    const all = setFolded(c, ['q1', 'q2'], true);
    expect(all.size).toBe(2);
    expect(setFolded(all, ['q1', 'q2'], false).size).toBe(0);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('une question non traitée n’est jamais affichée repliée, même si elle figure dans l’ensemble', () => {
    const s: S = { mode: 'practice', immediateFeedback: true, validated: ['q1'], answers: { q1: rec('B') } };
    const set = new Set(['q1', 'q3']);
    expect(isFolded(set, 'q1', foldStatus(s, q1))).toBe(true);
    expect(isFolded(set, 'q3', foldStatus(s, q3))).toBe(false);
    // une question validée reste ouverte tant qu'elle n'a pas été repliée à la main
    expect(isFolded(new Set(), 'q1', foldStatus(s, q1))).toBe(false);
  });
});
