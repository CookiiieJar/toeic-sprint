import { describe, expect, it } from 'vitest';
import { estimateFromRates, requiredRates } from '../src/lib/scoring';

describe('estimation indicative', () => {
  it('produit une fourchette croissante et bornée', () => {
    let prev = 0;
    for (let r = 0; r <= 1; r += 0.1) {
      const e = estimateFromRates(r, r, 'full-exam');
      expect(e.total.low).toBeLessThanOrEqual(e.total.mid);
      expect(e.total.mid).toBeLessThanOrEqual(e.total.high);
      expect(e.total.mid).toBeGreaterThanOrEqual(prev);
      expect(e.total.high).toBeLessThanOrEqual(990);
      expect(e.total.low).toBeGreaterThanOrEqual(10);
      prev = e.total.mid;
    }
  });
  it("élargit la fourchette pour l'entraînement", () => {
    const a = estimateFromRates(0.8, 0.8, 'full-exam');
    const b = estimateFromRates(0.8, 0.8, 'practice');
    expect(b.total.high - b.total.low).toBeGreaterThan(a.total.high - a.total.low);
  });
  it('donne des repères plausibles pour 800', () => {
    const r = requiredRates(800);
    expect(r.listening).toBeGreaterThan(0.75);
    expect(r.listening).toBeLessThan(0.95);
    expect(r.reading).toBeLessThan(r.listening);
  });
});
