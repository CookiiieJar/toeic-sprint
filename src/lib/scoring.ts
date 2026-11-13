/**
 * ESTIMATION INDICATIVE — NON OFFICIELLE.
 *
 * Le score TOEIC officiel est un score « échelonné » (equating) calculé par ETS pour chaque
 * formulaire d'examen ; aucune table de conversion publique n'est valable pour tous les tests.
 * On utilise ici une courbe d'ancrage moyenne inspirée des tables de conversion non officielles
 * couramment diffusées (Listening plus « généreux » que Reading), interpolée linéairement,
 * puis on affiche une FOURCHETTE dont la largeur dépend de la quantité de données :
 *  - section complète de 100 questions : ± 35 points par section ;
 *  - estimation à partir de l'entraînement : ± 55 points par section (questions non calibrées,
 *    conditions différentes de l'examen réel).
 * Les questions de cette application sont originales et non calibrées par ETS.
 */
const L_ANCHORS: [number, number][] = [[0, 5], [10, 25], [20, 75], [30, 130], [40, 185], [50, 240], [60, 295], [70, 345], [80, 400], [90, 450], [95, 480], [100, 495]];
const R_ANCHORS: [number, number][] = [[0, 5], [10, 10], [20, 60], [30, 110], [40, 160], [50, 210], [60, 260], [70, 315], [80, 370], [90, 430], [95, 465], [100, 495]];

function interp(anchors: [number, number][], pct: number): number {
  const x = Math.max(0, Math.min(100, pct));
  for (let i = 1; i < anchors.length; i++) {
    const [x0, y0] = anchors[i - 1];
    const [x1, y1] = anchors[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return 495;
}

const round5 = (n: number) => Math.round(n / 5) * 5;
const clamp = (n: number) => Math.max(5, Math.min(495, n));

export interface Estimate {
  listening: { low: number; mid: number; high: number };
  reading: { low: number; mid: number; high: number };
  total: { low: number; mid: number; high: number };
  basis: 'full-exam' | 'practice';
}

export function estimateFromRates(lRate: number, rRate: number, basis: Estimate['basis']): Estimate {
  const margin = basis === 'full-exam' ? 35 : 55;
  const lm = interp(L_ANCHORS, lRate * 100);
  const rm = interp(R_ANCHORS, rRate * 100);
  const sec = (m: number) => ({ low: round5(clamp(m - margin)), mid: round5(clamp(m)), high: round5(clamp(m + margin)) });
  const l = sec(lm);
  const r = sec(rm);
  return { listening: l, reading: r, total: { low: l.low + r.low, mid: l.mid + r.mid, high: l.high + r.high }, basis };
}

/** Précision approximative nécessaire par section pour viser un total (répartition L légèrement > R) */
export function requiredRates(target: number): { listening: number; reading: number } {
  let best = { listening: 1, reading: 1 };
  for (let l = 50; l <= 100; l++) {
    const r = Math.max(0, l - 5);
    if (interp(L_ANCHORS, l) + interp(R_ANCHORS, r) >= target) {
      best = { listening: l / 100, reading: r / 100 };
      break;
    }
  }
  return best;
}

export const METHOD_TEXT =
  "Estimation indicative et non officielle : la précision obtenue est convertie avec une courbe moyenne inspirée de tables de conversion non officielles, puis élargie en fourchette (±35 pts par section après un examen complet, ±55 pts à partir de l'entraînement). Le vrai TOEIC utilise un score échelonné propre à chaque formulaire ; les questions de l'application ne sont pas calibrées par ETS. Seul le score officiel fait foi.";
