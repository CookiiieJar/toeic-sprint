import type { Bank } from './bankCore';
import { targetSec, toUnits } from './bankCore';
import type { Attempt, Part, Pool, QState, Question, Unit } from './types';
import { computeMastery, pCorrect, skillKey, type Mastery } from './mastery';
import { ALL_PARTS, EXAM_STRUCTURE } from './labels';
import { DAY_MS } from './dates';

export interface SelectOptions {
  minutes: number;
  parts?: Part[];
  hard?: boolean;
  /** part du temps réservée aux erreurs à revoir (0..1) */
  errorShare?: number;
  pools: Pool[];
  /** compétences à cibler en priorité (clés `p5:word-form`, voir mastery.ts) */
  focus?: string[];
  /** modèle de maîtrise déjà calculé (sinon recalculé depuis les tentatives) */
  mastery?: Mastery;
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

/** Réussite visée sur une question nouvelle : assez difficile pour apprendre, assez accessible pour ne pas décourager */
export const DESIRED_SUCCESS = { normal: 0.72, hard: 0.55 };

/**
 * Sélection adaptative pilotée par le moteur de maîtrise (pas de hasard pur) :
 * 1. erreurs dont la révision est due (répétition espacée) ;
 * 2. puis unités notées selon : gain potentiel de la compétence (écart à la cible × fréquence à l'examen),
 *    difficulté adaptée compétence par compétence (probabilité de réussite proche de 72 %),
 *    exploration des compétences encore peu observées,
 *    nouveauté, date de dernière révision, compétences ciblées, et une légère variation aléatoire.
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
  const mastery = opts.mastery ?? computeMastery(bank, attempts);
  const maxPotential = Math.max(0.01, ...[...mastery.skills.values()].map((s) => s.potential));
  const desired = opts.hard ? DESIRED_SUCCESS.hard : DESIRED_SUCCESS.normal;
  const focus = new Set(opts.focus ?? []);

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
    let focused = 0;
    for (const q of qs) {
      const st = states.get(q.id);
      if (st?.seen) seen = true;
      if (st && now - st.lastSeen < DAY_MS) recentlySeen = true;
      if (st?.err && st.err.status !== 'mastered' && st.err.srs.due <= now) dueErrors++;
      if (!st?.lastResult) allSolid = false;
      const key = skillKey(q.part, q.category);
      const skill = mastery.skills.get(key);
      // racine carrée : les compétences fréquentes passent d'abord sans étouffer les autres
      score += Math.sqrt((skill?.potential ?? 0) / maxPotential) * 3;
      score -= Math.abs(pCorrect(skill?.theta ?? mastery.parts[q.part].theta, q.level, q.part) - desired) * 2.5;
      // exploration : une compétence d'examen encore peu observée doit être mesurée
      if (skill?.examWeight) score += 1 / (1 + skill.n / 2);
      if (focus.has(key)) focused++;
    }
    score /= qs.length;
    if (focused) score += 2 + (3 * focused) / qs.length;
    if (!seen) score += 1.3;
    if (recentlySeen && !dueErrors) score -= 2.5;
    else if (seen && !dueErrors) score -= 0.8;
    if (seen && allSolid) score -= 1.2;
    if (opts.hard && qs.reduce((s, q) => s + q.level, 0) / qs.length >= 2.5) score += 0.8;
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
