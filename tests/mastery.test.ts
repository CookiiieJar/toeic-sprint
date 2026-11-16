import { describe, expect, it } from 'vitest';
import { getBank } from '../src/lib/bank';
import { computeMastery, examMix, firstExposures, pCorrect, priorities, readingPace, skillKey, targetsFor, weakParts, THETA0 } from '../src/lib/mastery';
import { selectQuestions } from '../src/lib/selection';
import { EXAM_STRUCTURE, ALL_PARTS } from '../src/lib/labels';
import type { Attempt, Letter, Question } from '../src/lib/types';

const bank = getBank();
const all = [...bank.questions.values()];
const seq = () => { let i = 0; return () => ((i = (i * 9301 + 49297) % 233280) / 233280); };
let clock = 1_000_000;
const att = (q: Question, correct: boolean, extra: Partial<Attempt> = {}): Attempt => ({
  qid: q.id, part: q.part, category: q.category, level: q.level, correct, choice: 'A' as Letter, timeMs: 20_000, at: clock++, day: '2026-11-15', sessionId: 's', sessionType: 'daily', mode: 'practice', ...extra,
});
const pick = (part: number, category: string, n: number, pool = 'practice') => all.filter((q) => q.pool === pool && q.part === part && q.category === category).slice(0, n);

describe('moteur de maîtrise', () => {
  it('sans données : toutes les compétences au niveau a priori, aucune priorité affichée', () => {
    const m = computeMastery(bank, []);
    for (const s of m.skills.values()) expect(s.theta).toBeCloseTo(THETA0);
    expect(priorities(m)).toEqual([]);
    expect(weakParts(m)).toEqual([]);
  });

  it("les poids d'examen reproduisent la structure officielle (200 questions)", () => {
    const mix = examMix(bank);
    for (const p of ALL_PARTS) {
      const sum = [...mix.entries()].filter(([k]) => k.startsWith(`p${p}:`)).reduce((s, [, v]) => s + v.weight, 0);
      expect(sum).toBeCloseTo(EXAM_STRUCTURE[p]);
    }
  });

  it('les échecs font baisser la maîtrise, les réussites la font monter', () => {
    const qs = pick(5, 'word-form', 8);
    const key = skillKey(5, 'word-form');
    const base = computeMastery(bank, []).skills.get(key)!.mastery;
    const bad = computeMastery(bank, qs.map((q) => att(q, false))).skills.get(key)!;
    const good = computeMastery(bank, qs.map((q) => att(q, true))).skills.get(key)!;
    expect(bad.mastery).toBeLessThan(base - 0.08);
    expect(good.mastery).toBeGreaterThan(base + 0.03);
    expect(bad.attempts).toBe(8);
    expect(bad.potential).toBeGreaterThan(good.potential);
  });

  it('réussir une question difficile compte plus que réussir une question facile', () => {
    const p5 = all.filter((q) => q.pool === 'practice' && q.part === 5 && q.category === 'vocabulary');
    const easy = p5.find((q) => q.level === 1)!;
    const hard = p5.find((q) => q.level === 3)!;
    const key = skillKey(5, 'vocabulary');
    const afterEasy = computeMastery(bank, [att(easy, true)]).skills.get(key)!.theta;
    const afterHard = computeMastery(bank, [att(hard, true)]).skills.get(key)!.theta;
    expect(afterHard).toBeGreaterThan(afterEasy);
  });

  it('refaire une question déjà vue compte peu (mémorisation)', () => {
    const [q, ...others] = pick(5, 'word-form', 5);
    const key = skillKey(5, 'word-form');
    const fails = [q, ...others].map((x) => att(x, false));
    const before = computeMastery(bank, fails).skills.get(key)!;
    const repeated = computeMastery(bank, [...fails, ...Array.from({ length: 5 }, () => att(q, true))]).skills.get(key)!;
    const fresh = computeMastery(bank, [...fails, ...pick(5, 'word-form', 10).slice(5).map((x) => att(x, true))]).skills.get(key)!;
    expect(repeated.theta - before.theta).toBeLessThan((fresh.theta - before.theta) * 0.5);
  });

  it("ignore les questions sans réponse et compte une bonne réponse hésitante comme un demi-succès", () => {
    const qs = pick(7, 'detail', 6);
    const key = skillKey(7, 'detail');
    const none = computeMastery(bank, qs.map((q) => att(q, false, { choice: null, timeMs: 0 }))).skills.get(key)!;
    expect(none.attempts).toBe(0);
    expect(none.theta).toBeCloseTo(THETA0);
    const sure = computeMastery(bank, qs.map((q) => att(q, true))).skills.get(key)!.theta;
    const unsure = computeMastery(bank, qs.map((q) => att(q, true, { unsure: true }))).skills.get(key)!.theta;
    expect(unsure).toBeLessThan(sure);
  });

  it('les réponses récentes pèsent plus que les anciennes', () => {
    const qs = pick(5, 'vocabulary', 16);
    const key = skillKey(5, 'vocabulary');
    const improving = computeMastery(bank, [...qs.slice(0, 8).map((q) => att(q, false)), ...qs.slice(8).map((q) => att(q, true))]).skills.get(key)!.theta;
    const declining = computeMastery(bank, [...qs.slice(0, 8).map((q) => att(q, true)), ...qs.slice(8).map((q) => att(q, false))]).skills.get(key)!.theta;
    expect(improving).toBeGreaterThan(declining);
  });

  it('classe les priorités par gain potentiel et repère les parties faibles', () => {
    const attempts = [...pick(7, 'detail', 8).map((q) => att(q, false)), ...pick(2, 'wh-question', 8).map((q) => att(q, true))];
    const m = computeMastery(bank, attempts);
    expect(priorities(m)[0].key).toBe('p7:detail');
    expect(weakParts(m)[0]).toBe(7);
    expect(priorities(m).every((s) => s.attempts >= 3)).toBe(true);
  });

  it('la probabilité de réussite respecte le plancher du hasard', () => {
    expect(pCorrect(-3, 3, 5)).toBeGreaterThanOrEqual(0.25);
    expect(pCorrect(-3, 3, 2)).toBeGreaterThanOrEqual(1 / 3);
    expect(pCorrect(3, 1, 5)).toBeLessThanOrEqual(1);
  });

  it('une cible plus haute augmente le potentiel', () => {
    const attempts = pick(5, 'word-form', 6).map((q) => att(q, false));
    const lo = computeMastery(bank, attempts, { target: targetsFor(700) }).skills.get('p5:word-form')!.potential;
    const hi = computeMastery(bank, attempts, { target: targetsFor(900) }).skills.get('p5:word-form')!.potential;
    expect(hi).toBeGreaterThan(lo);
  });

  it('firstExposures ne garde que la première tentative de chaque question', () => {
    const [q, r] = pick(5, 'word-form', 2);
    const list = firstExposures([att(q, false), att(r, true), att(q, true), att(q, true)]);
    expect(list.length).toBe(2);
    expect(list.find((a) => a.qid === q.id)!.correct).toBe(false);
  });

  it('projette la durée du Reading et plafonne les temps aberrants', () => {
    const mk = (part: number, ms: number) => all.filter((q) => q.pool === 'practice' && q.part === part).slice(0, 10).map((q) => att(q, true, { timeMs: ms }));
    expect(readingPace(bank, mk(5, 20_000)).projectedMin).toBeNull();
    const pace = readingPace(bank, [...mk(5, 30_000), ...mk(6, 30_000), ...mk(7, 30_000)]);
    expect(pace.projectedMin).toBeCloseTo(50, 0);
    const idle = readingPace(bank, [...mk(5, 3_600_000), ...mk(6, 30_000), ...mk(7, 30_000)]);
    expect(idle.perPart[5]!).toBeLessThanOrEqual(5 * 60);
  });
});

describe('sélection pilotée par la maîtrise', () => {
  it('une session ciblée contient surtout la compétence demandée', () => {
    const { qids } = selectQuestions(bank, [], new Map(), { minutes: 10, pools: ['practice'], parts: [5], focus: ['p5:word-form'], rng: seq() });
    const share = qids.filter((id) => bank.questions.get(id)!.category === 'word-form').length / qids.length;
    expect(share).toBeGreaterThan(0.6);
  });

  it('adapte la difficulté compétence par compétence', () => {
    const p5 = all.filter((q) => q.pool === 'practice' && q.part === 5);
    const avgLevel = (attempts: Attempt[]) => {
      const { qids } = selectQuestions(bank, attempts, new Map(), { minutes: 10, pools: ['practice'], parts: [5], rng: seq() });
      return qids.reduce((s, id) => s + bank.questions.get(id)!.level, 0) / qids.length;
    };
    // même volume de réponses, sur des questions qui ne seront pas « déjà vues » de façon différente
    const strong = avgLevel(p5.map((q) => att(q, true)));
    const weak = avgLevel(p5.map((q) => att(q, false)));
    expect(strong).toBeGreaterThan(weak);
  });

  it('le mode difficile propose des questions de niveau plus élevé', () => {
    const lvl = (hard: boolean) => {
      const { qids } = selectQuestions(bank, [], new Map(), { minutes: 15, pools: ['practice'], parts: [5], hard, rng: seq() });
      return qids.reduce((s, id) => s + bank.questions.get(id)!.level, 0) / qids.length;
    };
    expect(lvl(true)).toBeGreaterThan(lvl(false));
  });
});
