import { describe, expect, it } from 'vitest';
import { getBank } from '../src/lib/bank';
import { validateBank, toUnits, byPool, stimulusText, norm, buildBank } from '../src/lib/bankCore';
import { EXAM_STRUCTURE } from '../src/lib/labels';

describe('banque de questions', () => {
  const bank = getBank();
  it('est valide (réponses, identifiants, groupes, explications, citations)', () => {
    const r = validateBank(bank, { requireExam: true });
    expect(r.errors).toEqual([]);
  });
  it("respecte la structure officielle de l'examen blanc", () => {
    const exam = byPool(bank, 'exam1');
    expect(exam.length).toBe(200);
    for (const [p, n] of Object.entries(EXAM_STRUCTURE)) expect(exam.filter((q) => q.part === Number(p)).length).toBe(n);
  });
  it('contient un diagnostic de 40 à 60 questions couvrant les 7 parties', () => {
    const d = byPool(bank, 'diag');
    expect(d.length).toBeGreaterThanOrEqual(40);
    expect(d.length).toBeLessThanOrEqual(60);
    expect(new Set(d.map((q) => q.part)).size).toBe(7);
  });
  it("dispose d'une réserve d'entraînement distincte", () => {
    const p = byPool(bank, 'practice');
    expect(p.length).toBeGreaterThanOrEqual(100);
    expect(new Set(p.map((q) => q.part)).size).toBe(7);
  });
  it('regroupe les questions partageant un support', () => {
    const exam = byPool(bank, 'exam1');
    const units = toUnits(bank, exam.map((q) => q.id));
    const p3 = units.filter((u) => bank.questions.get(u.qids[0])!.part === 3);
    expect(p3.length).toBe(13);
    expect(p3.every((u) => u.qids.length === 3)).toBe(true);
  });
  it('les citations justificatives existent dans les supports', () => {
    for (const q of bank.questions.values()) {
      if (!q.evidence || !q.setId) continue;
      expect(norm(stimulusText(bank.sets.get(q.setId)!))).toContain(norm(q.evidence));
    }
  });
  it('le validateur détecte une réponse incohérente avec son explication', () => {
    const bad = buildBank([{ name: 't', data: { part: 5, pool: 'custom', questions: [{ id: 'x-1', level: 2, category: 'preposition', prompt: 'Submit it ____ Friday.', options: ['by', 'until', 'since', 'for'], answer: 'B', explanation: 'By exprime une date limite : au plus tard vendredi, donc la bonne réponse est by.', takeaway: 'By + date = au plus tard.' }] } }]);
    const r = validateBank(bad);
    expect(r.errors.some((e) => e.includes('ne mentionne pas la bonne réponse'))).toBe(true);
  });
  it('le validateur détecte un identifiant dupliqué', () => {
    const q = { id: 'dup', level: 1 as const, category: 'preposition', prompt: 'a ____ b', options: ['in', 'on', 'at', 'by'], answer: 'A' as const, explanation: 'La préposition in convient ici car il s’agit d’un mois de l’année.', takeaway: 'in + mois' };
    expect(() => buildBank([{ name: 't', data: { part: 5, pool: 'custom', questions: [q, q] } }])).toThrow(/dupliqué/);
  });
});
