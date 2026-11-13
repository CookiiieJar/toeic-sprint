import type { Bank } from './bankCore';
import { targetSec, toUnits } from './bankCore';
import type { Attempt, Part, Pool, QState, Question, Unit } from './types';
import { byCategory, byPart, recent, smoothed, accOf } from './stats';
import { ALL_PARTS, EXAM_STRUCTURE } from './labels';
import { DAY_MS } from './dates';

export interface SelectOptions {
  minutes: number;
  parts?: Part[];
  hard?: boolean;
  /** part du temps réservée aux erreurs à revoir (0..1) */
  errorShare?: number;
  pools: Pool[];
  /** générateur aléatoire (injectable pour les tests) */
  rng?: () => number;
  now?: number;
}

export interface Candidate {
  unit: Unit;
  part: Part;
  cost: number; // secondes estimées
  score: number;
  dueErrors: number;
  seen: boolean;
}

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Durée estimée d'une unité : lecture audio (~2,6 mots/s) + temps de réponse cible */
export function unitCost(bank: Bank, unit: Unit): number {
  const qs = unit.qids.map((id) => bank.questions.get(id)!);
  let audio = 0;
  if (unit.setId) {
    const set = bank.sets.get(unit.setId)!;
    if (set.audio) audio = set.audio.reduce((s, l) => s + wordCount(l.t) / 2.6 + 0.6, 0);
  } else {
    const q0 = qs[0];
    if (q0.part === 1) audio = q0.options.reduce((s, o) => s + wordCount(o) / 2.6 + 1.5, 2);
    if (q0.part === 2) audio = [q0.prompt ?? '', ...q0.options].reduce((s, o) => s + wordCount(o) / 2.6 + 1.2, 1);
  }
  return audio + qs.reduce((s, q) => s + targetSec(q), 0) + 4; // + lecture de la correction / transition
}

export function eligibleQuestions(bank: Bank, pools: Pool[], parts?: Part[]): Question[] {
  return bank.order
    .map((id) => bank.questions.get(id)!)
    .filter((q) => pools.includes(q.pool) && (!parts?.length || parts.includes(q.part)));
}

/** Niveau de difficulté visé selon la précision récente */
export function targetLevel(attempts: Attempt[], hard?: boolean): number {
  if (hard) return 3;
  const r = accOf(recent(attempts, 60));
  if (r.total < 10) return 2;
  if (r.rate >= 0.82) return 2.8;
  if (r.rate >= 0.65) return 2.3;
  return 1.7;
}

/**
 * Sélection adaptative (pas de hasard pur) :
 * 1. erreurs dont la révision est due (répétition espacée) ;
 * 2. puis unités notées selon : faiblesse de la partie et de la catégorie, nouveauté,
 *    adéquation de difficulté, date de dernière révision, avec une légère variation aléatoire.
 * Le temps total respecte la durée demandée ; aucune partie ne dépasse ~40 % du temps en mode mixte.
 */
export function selectQuestions(
  bank: Bank,
  attempts: Attempt[],
  states: Map<string, QState>,
  opts: SelectOptions,
): { qids: string[]; repeatedShare: number; dueIncluded: number } {
  const now = opts.now ?? Date.now();
  const rng = opts.rng ?? Math.random;
  const budget = opts.minutes * 60;
  const pool = eligibleQuestions(bank, opts.pools, opts.parts);
  const window = recent(attempts, 400);
  const partAcc = byPart(window);
  const catAcc = byCategory(window);
  const tLevel = targetLevel(attempts, opts.hard);

  // Unités complètes (les groupes gardent leur support commun)
  const units = toUnits(bank, pool.map((q) => q.id));
  const cands: Candidate[] = units.map((unit) => {
    const qs = unit.qids.map((id) => bank.questions.get(id)!);
    const part = qs[0].part;
    let score = 0;
    let dueErrors = 0;
    let seen = false;
    let recentlySeen = false;
    let allSolid = true;
    for (const q of qs) {
      const st = states.get(q.id);
      if (st?.seen) seen = true;
      if (st && now - st.lastSeen < DAY_MS) recentlySeen = true;
      if (st?.err && st.err.status !== 'mastered' && st.err.srs.due <= now) dueErrors++;
      if (!st?.lastResult) allSolid = false;
      const cAcc = catAcc.get(q.category);
      score += (1 - (cAcc ? smoothed(cAcc) : 0.7)) * 1.2;
    }
    score /= qs.length;
    score += (1 - smoothed(partAcc[part])) * 2.5;
    if (!seen) score += 1.3;
    if (recentlySeen && !dueErrors) score -= 2.5;
    else if (seen && !dueErrors) score -= 0.8;
    if (seen && allSolid) score -= 1.2;
    const avgLevel = qs.reduce((s, q) => s + q.level, 0) / qs.length;
    score -= Math.abs(avgLevel - tLevel) * 0.6;
    if (opts.hard && avgLevel >= 2.5) score += 0.8;
    score += rng() * 0.7;
    return { unit, part, cost: unitCost(bank, unit), score, dueErrors, seen };
  });

  const chosen: Candidate[] = [];
  let used = 0;
  const partUsed = new Map<Part, number>();
  const distinctParts = new Set(cands.map((c) => c.part)).size;
  const partCap = distinctParts > 2 ? 0.4 : 1;

  // 1) Erreurs dues : on ne reprend que les questions concernées du groupe
  const errBudget = budget * (opts.errorShare ?? 0.35);
  const dueC = cands.filter((c) => c.dueErrors > 0).sort((a, b) => b.dueErrors - a.dueErrors || b.score - a.score);
  let dueIncluded = 0;
  for (const c of dueC) {
    if (used >= errBudget) break;
    const qids = c.unit.qids.filter((id) => {
      const st = states.get(id);
      return st?.err && st.err.status !== 'mastered' && st.err.srs.due <= now;
    });
    const unit: Unit = { setId: c.unit.setId, qids };
    const cost = unitCost(bank, unit);
    chosen.push({ ...c, unit, cost });
    used += cost;
    dueIncluded += qids.length;
    partUsed.set(c.part, (partUsed.get(c.part) ?? 0) + cost);
  }

  // 2) Nouvelles unités par score
  const usedSets = new Set(chosen.map((c) => c.unit.setId ?? c.unit.qids[0]));
  const rest = cands.filter((c) => !usedSets.has(c.unit.setId ?? c.unit.qids[0])).sort((a, b) => b.score - a.score);
  for (const c of rest) {
    if (used >= budget) break;
    if (used + c.cost > budget * 1.15 && used > budget * 0.7) continue;
    if ((partUsed.get(c.part) ?? 0) + c.cost > budget * partCap && rest.some((o) => o.part !== c.part && !chosen.includes(o))) continue;
    chosen.push(c);
    used += c.cost;
    partUsed.set(c.part, (partUsed.get(c.part) ?? 0) + c.cost);
  }
  // Si le plafond par partie a bloqué la sélection, on complète sans plafond
  if (used < budget * 0.85) {
    for (const c of rest) {
      if (used >= budget) break;
      if (chosen.includes(c)) continue;
      chosen.push(c);
      used += c.cost;
    }
  }

  // Ordre : erreurs d'abord, puis par partie (comme à l'examen)
  const errs = chosen.filter((c) => c.dueErrors > 0 && c.unit.qids.length);
  const fresh = chosen.filter((c) => !errs.includes(c)).sort((a, b) => a.part - b.part);
  const ordered = [...errs, ...fresh];
  const qids = ordered.flatMap((c) => c.unit.qids);
  const repeated = qids.filter((id) => states.get(id)?.seen).length;
  return { qids, repeatedShare: qids.length ? repeated / qids.length : 0, dueIncluded };
}

/** Composition d'un mini-examen proportionnel à la structure officielle */
export function buildMiniExam(bank: Bank, pools: Pool[], size: number, states: Map<string, QState>, rng = Math.random): string[] {
  const out: string[] = [];
  for (const p of ALL_PARTS) {
    const want = Math.max(1, Math.round((size * EXAM_STRUCTURE[p]) / 200));
    const units = toUnits(bank, eligibleQuestions(bank, pools, [p]).map((q) => q.id))
      // priorité aux unités jamais vues, puis au hasard
      .map((u) => ({ u, k: (u.qids.some((id) => states.get(id)?.seen) ? 1 : 0) + rng() * 0.9 }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.u);
    let n = 0;
    for (const u of units) {
      if (n >= want) break;
      if (n + u.qids.length > want + 1 && n > 0) continue;
      out.push(...u.qids);
      n += u.qids.length;
    }
  }
  return out;
}

/** Questions d'erreurs à revoir */
export function errorQuestionIds(states: QState[], mode: 'due' | 'all' | 'hard', now = Date.now()): string[] {
  return states
    .filter((s) => s.err && s.err.status !== 'mastered')
    .filter((s) => (mode === 'due' ? s.err!.srs.due <= now : mode === 'hard' ? s.wrong >= 2 || s.err!.srs.lapses >= 2 : true))
    .sort((a, b) => a.err!.srs.due - b.err!.srs.due)
    .map((s) => s.qid);
}
