import { describe, expect, it } from 'vitest';
import { newSrs, review, errStatus, gradeAnswer, RELEARN_MS } from '../src/lib/srs';
import { DAY_MS } from '../src/lib/dates';

describe('répétition espacée', () => {
  const t0 = new Date(2026, 10, 11, 10).getTime();
  it('un échec reprogramme dans la journée', () => {
    const s = review(newSrs(t0), 1, t0);
    expect(s.due).toBe(t0 + RELEARN_MS);
    expect(s.reps).toBe(0);
    expect(s.lapses).toBe(1);
  });
  it('les succès espacent : 1 j puis 3 j puis plus', () => {
    let s = review(newSrs(t0), 5, t0);
    expect(s.interval).toBe(1);
    s = review(s, 5, s.due);
    expect(s.interval).toBe(3);
    s = review(s, 5, s.due);
    expect(s.interval).toBeGreaterThan(3);
    expect(errStatus(s)).toBe('mastered');
  });
  it('la facilité ne descend jamais sous 1,3', () => {
    let s = newSrs(t0);
    for (let i = 0; i < 20; i++) s = review(s, 0, t0);
    expect(s.ease).toBeGreaterThanOrEqual(1.3);
  });
  it("l'intervalle est plafonné à 21 jours", () => {
    let s = newSrs(t0);
    for (let i = 0; i < 12; i++) s = review(s, 5, s.due);
    expect(s.interval).toBeLessThanOrEqual(21);
    expect(s.due - t0).toBeGreaterThan(DAY_MS);
  });
  it('note les réponses selon exactitude et vitesse', () => {
    expect(gradeAnswer(false, 1000, 20)).toBe(1);
    expect(gradeAnswer(true, 10_000, 20)).toBe(5);
    expect(gradeAnswer(true, 40_000, 20)).toBe(4);
    expect(gradeAnswer(true, 90_000, 20)).toBe(3);
  });
});
