import { describe, expect, it } from 'vitest';
import { getBank } from '../src/lib/bank';
import { selectQuestions, unitCost, buildMiniExam } from '../src/lib/selection';
import { toUnits } from '../src/lib/bankCore';
import { applyResult } from '../src/lib/sessions';
import type { Attempt, QState } from '../src/lib/types';

const bank = getBank();
const seq = () => { let i = 0; return () => ((i = (i * 9301 + 49297) % 233280) / 233280); };
const mkAttempt = (qid: string, correct: boolean, at: number): Attempt => {
  const q = bank.questions.get(qid)!;
  return { qid, part: q.part, category: q.category, level: q.level, correct, choice: 'A', timeMs: 10000, at, day: '2026-11-11', sessionId: 's', sessionType: 'daily', mode: 'practice' };
};

describe('sélection adaptative', () => {
  it('respecte approximativement la durée demandée', () => {
    for (const minutes of [5, 10, 20, 45]) {
      const { qids } = selectQuestions(bank, [], new Map(), { minutes, pools: ['practice'], rng: seq() });
      const cost = toUnits(bank, qids).reduce((s, u) => s + unitCost(bank, u), 0);
      expect(cost).toBeGreaterThan(minutes * 60 * 0.6);
      expect(cost).toBeLessThan(minutes * 60 * 1.35);
    }
  });
  it("n'utilise que les pools autorisés (examen blanc réservé)", () => {
    const { qids } = selectQuestions(bank, [], new Map(), { minutes: 45, pools: ['practice'], rng: seq() });
    expect(qids.every((id) => bank.questions.get(id)!.pool === 'practice')).toBe(true);
  });
  it('place les erreurs dues en tête', () => {
    const now = Date.now();
    const target = [...bank.questions.values()].find((q) => q.pool === 'practice' && q.part === 5)!;
    const st = applyResult(undefined, target.id, false, 'A', 5000, 20, now - 3600_000);
    const { qids, dueIncluded } = selectQuestions(bank, [], new Map([[target.id, st]]), { minutes: 10, pools: ['practice'], rng: seq(), now });
    expect(dueIncluded).toBe(1);
    expect(qids[0]).toBe(target.id);
  });
  it('privilégie les parties faibles', () => {
    const now = Date.now();
    const p5 = [...bank.questions.values()].filter((q) => q.pool === 'practice' && q.part === 5).slice(0, 8);
    const p2 = [...bank.questions.values()].filter((q) => q.pool === 'practice' && q.part === 2).slice(0, 8);
    const attempts = [...p5.map((q) => mkAttempt(q.id, false, now - 1e8)), ...p2.map((q) => mkAttempt(q.id, true, now - 1e8))];
    const { qids } = selectQuestions(bank, attempts, new Map(), { minutes: 20, pools: ['practice'], parts: [2, 5], rng: seq(), now });
    const n5 = qids.filter((id) => bank.questions.get(id)!.part === 5).length;
    const n2 = qids.filter((id) => bank.questions.get(id)!.part === 2).length;
    expect(n5).toBeGreaterThan(n2);
  });
  it('filtre par partie et garde les groupes complets', () => {
    const { qids } = selectQuestions(bank, [], new Map(), { minutes: 20, pools: ['practice'], parts: [7], rng: seq() });
    expect(qids.every((id) => bank.questions.get(id)!.part === 7)).toBe(true);
    for (const u of toUnits(bank, qids)) expect(u.qids.length).toBe(bank.sets.get(u.setId!)!.questionIds.length);
  });
  it('compose un mini-examen proportionnel', () => {
    const q = buildMiniExam(bank, ['practice', 'diag'], 50, new Map<string, QState>(), seq());
    expect(q.length).toBeGreaterThanOrEqual(42);
    expect(q.length).toBeLessThanOrEqual(62);
    expect(new Set(q.map((id) => bank.questions.get(id)!.part)).size).toBe(7);
  });
});
