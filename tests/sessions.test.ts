import { beforeEach, describe, expect, it } from 'vitest';
import { useTestDb } from '../src/lib/db';
import { createSession, finishSession, recordAttempt, applyResult } from '../src/lib/sessions';
import { exportData, importData } from '../src/lib/backup';
import { getBank } from '../src/lib/bank';
import { byPool } from '../src/lib/bankCore';
import { streak } from '../src/lib/stats';
import type { Letter } from '../src/lib/types';

let db: ReturnType<typeof useTestDb>;
let n = 0;
beforeEach(() => { db = useTestDb(`test-${n++}`); });
const bank = getBank();
const wrong = (l: Letter): Letter => (l === 'A' ? 'B' : 'A');

describe('sessions et suivi', () => {
  it('enregistre les réponses, crée les cartes d’erreur et calcule le bilan', async () => {
    const qs = byPool(bank, 'practice').filter((q) => q.part === 5).slice(0, 4);
    const s = await createSession({ type: 'daily', title: 't', mode: 'practice', qids: qs.map((q) => q.id) });
    s.answers[qs[0].id] = { choice: qs[0].answer, timeMs: 8000, at: Date.now() };
    s.answers[qs[1].id] = { choice: wrong(qs[1].answer), timeMs: 12000, at: Date.now() };
    await recordAttempt(s, qs[0].id);
    await recordAttempt(s, qs[1].id);
    await recordAttempt(s, qs[1].id); // doublon ignoré
    const done = await finishSession(s);
    expect(await db.attempts.count()).toBe(2);
    expect(done.summary!.total).toBe(2);
    expect(done.summary!.correct).toBe(1);
    const st = await db.qstate.get(qs[1].id);
    expect(st!.err).toBeDefined();
    expect(st!.err!.lastChoice).toBe(wrong(qs[1].answer));
    expect((await db.daylog.toArray())[0].questions).toBe(2);
  });
  it('en examen, les questions sans réponse comptent comme fausses', async () => {
    const qs = byPool(bank, 'practice').filter((q) => q.part === 5).slice(0, 3);
    const s = await createSession({ type: 'exam', title: 'e', mode: 'exam', qids: qs.map((q) => q.id), examKind: 'mini' });
    s.answers[qs[0].id] = { choice: qs[0].answer, timeMs: 5000, at: Date.now() };
    const done = await finishSession(s);
    expect(done.summary!.total).toBe(3);
    expect(done.summary!.answered).toBe(1);
    expect(done.summary!.wrongIds.length).toBe(2);
    expect(await db.attempts.count()).toBe(3);
  });
  it('une seule session active à la fois, les autres restent reprenables', async () => {
    const ids = byPool(bank, 'practice').slice(0, 2).map((q) => q.id);
    const a = await createSession({ type: 'daily', title: 'a', mode: 'practice', qids: ids });
    await createSession({ type: 'daily', title: 'b', mode: 'practice', qids: ids });
    expect((await db.sessions.get(a.id))!.status).toBe('paused');
  });
  it("une erreur n'est maîtrisée qu'après des réussites espacées", () => {
    const t0 = Date.now();
    let st = applyResult(undefined, 'q', false, 'A', 1000, 20, t0);
    st = applyResult(st, 'q', true, 'B', 1000, 20, t0 + 1000); // pas encore due → pas d'avancement
    expect(st.err!.srs.reps).toBe(0);
    st = applyResult(st, 'q', true, 'B', 1000, 20, st.err!.srs.due);
    st = applyResult(st, 'q', true, 'B', 1000, 20, st.err!.srs.due);
    st = applyResult(st, 'q', true, 'B', 1000, 20, st.err!.srs.due);
    expect(st.err!.status).toBe('mastered');
  });
  it('une bonne réponse « pas sûre » crée une carte à reconfirmer le lendemain', async () => {
    const t0 = new Date(2026, 10, 15, 10).getTime();
    let st = applyResult(undefined, 'q', true, 'B', 1000, 20, t0, { unsure: true });
    expect(st.err?.soft).toBe(true);
    expect(st.err!.status).toBe('learning');
    expect(st.err!.srs.due).toBeGreaterThan(t0 + 12 * 3600_000);
    expect(st.wrong).toBe(0);
    // sans hésitation : aucune carte
    expect(applyResult(undefined, 'q', true, 'B', 1000, 20, t0).err).toBeUndefined();
    // un vrai échec ensuite en fait une erreur ordinaire
    st = applyResult(st, 'q', false, 'A', 1000, 20, t0 + 1000);
    expect(st.err!.soft).toBeUndefined();
    // l'indicateur est conservé dans l'historique des tentatives
    const q = byPool(bank, 'practice').find((x) => x.part === 5)!;
    const s = await createSession({ type: 'daily', title: 't', mode: 'practice', qids: [q.id] });
    s.answers[q.id] = { choice: q.answer, timeMs: 8000, at: Date.now(), unsure: true };
    await recordAttempt(s, q.id);
    expect((await db.attempts.toArray())[0].unsure).toBe(true);
    expect((await db.qstate.get(q.id))!.err?.soft).toBe(true);
  });
  it("à l'approche de l'examen, les intervalles sont plafonnés à la veille", () => {
    const t0 = new Date(2026, 10, 24, 10).getTime(); // J-4
    let st = applyResult(undefined, 'q', false, 'A', 1000, 20, t0, { maxInterval: 3 });
    st = applyResult(st, 'q', true, 'B', 1000, 20, st.err!.srs.due, { maxInterval: 3 });
    st = applyResult(st, 'q', true, 'B', 1000, 20, st.err!.srs.due, { maxInterval: 2 });
    expect(st.err!.srs.interval).toBeLessThanOrEqual(2);
  });
  it('exporte puis réimporte toutes les données', async () => {
    const ids = byPool(bank, 'practice').slice(0, 2).map((q) => q.id);
    const s = await createSession({ type: 'daily', title: 'x', mode: 'practice', qids: ids });
    s.answers[ids[0]] = { choice: 'A', timeMs: 1000, at: Date.now() };
    await finishSession(s);
    const json = await exportData();
    await db.attempts.clear();
    await db.sessions.clear();
    const r = await importData(json);
    expect(r.ok).toBe(true);
    expect(await db.sessions.count()).toBe(1);
    expect(await db.attempts.count()).toBe(1);
    expect((await importData('{"foo":1}')).ok).toBe(false);
    expect((await importData('pas du json')).ok).toBe(false);
  });
});

describe('statistiques', () => {
  it('calcule la série de jours consécutifs', () => {
    const logs = ['2026-11-09', '2026-11-10', '2026-11-11'].map((day) => ({ day, seconds: 600, questions: 10, correct: 5, cards: 0 }));
    expect(streak(logs, '2026-11-11')).toBe(3);
    expect(streak(logs, '2026-11-12')).toBe(3);
    expect(streak(logs, '2026-11-13')).toBe(0);
  });
});
