import { beforeEach, describe, expect, it } from 'vitest';
import { getBank } from '../src/lib/bank';
import { byPool, examPools, norm } from '../src/lib/bankCore';
import { EXAM_STRUCTURE } from '../src/lib/labels';
import { useTestDb } from '../src/lib/db';
import { createSession, finishSession, practicePools } from '../src/lib/sessions';

const bank = getBank();

describe('examens blancs multiples', () => {
  it('propose au moins cinq examens complets à la structure officielle', () => {
    const pools = examPools(bank);
    expect(pools.length).toBeGreaterThanOrEqual(5);
    for (const ep of pools) {
      const qs = byPool(bank, ep);
      expect(qs.length).toBe(200);
      for (const [p, n] of Object.entries(EXAM_STRUCTURE)) expect(qs.filter((q) => q.part === Number(p)).length).toBe(n);
    }
  });
  it("aucune question ni aucun support n'est partagé entre examens", () => {
    const seenPrompt = new Map<string, string>();
    for (const ep of examPools(bank)) {
      for (const q of byPool(bank, ep)) {
        if (!q.prompt || q.part === 3 || q.part === 4 || q.part === 7) continue;
        const k = norm(q.prompt);
        expect(seenPrompt.has(k) && seenPrompt.get(k) !== ep).toBe(false);
        seenPrompt.set(k, ep);
      }
    }
  });
});

let n = 0;
beforeEach(() => { useTestDb(`exam-test-${n++}`); });

describe('séparation examen / entraînement', () => {
  it("un examen n'entre dans l'entraînement qu'après avoir été passé", async () => {
    expect(await practicePools()).not.toContain('exam2');
    const qids = byPool(bank, 'exam2').filter((q) => q.part === 5).map((q) => q.id);
    const s = await createSession({ type: 'exam', title: 'e2', mode: 'exam', qids, examKind: 'reading', meta: { bank: 'exam2' } });
    await finishSession(s);
    const pools = await practicePools();
    expect(pools).toContain('exam2');
    expect(pools).not.toContain('exam3');
  });
});
