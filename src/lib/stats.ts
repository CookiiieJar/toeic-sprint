import type { Attempt, DayLog, Part, QState } from './types';
import { ALL_PARTS, isListening } from './labels';
import { addDays, dayKey } from './dates';

export interface Acc {
  total: number;
  correct: number;
  rate: number; // 0..1 (0 si aucun essai)
}

export function accOf(list: Attempt[]): Acc {
  const total = list.length;
  const correct = list.filter((a) => a.correct).length;
  return { total, correct, rate: total ? correct / total : 0 };
}

/** Taux lissé (prior bayésien) : évite qu'une seule réponse fausse fasse 0 % */
export const smoothed = (a: Acc, prior = 0.7, k = 4) => (a.correct + prior * k) / (a.total + k);

export function groupBy<T, K extends string | number>(list: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of list) {
    const k = key(x);
    const arr = m.get(k);
    if (arr) arr.push(x);
    else m.set(k, [x]);
  }
  return m;
}

export function byPart(attempts: Attempt[]): Record<Part, Acc> {
  const g = groupBy(attempts, (a) => a.part);
  return Object.fromEntries(ALL_PARTS.map((p) => [p, accOf(g.get(p) ?? [])])) as Record<Part, Acc>;
}

export function byCategory(attempts: Attempt[]): Map<string, Acc> {
  const g = groupBy(attempts, (a) => a.category);
  return new Map([...g.entries()].map(([k, v]) => [k, accOf(v)]));
}

export function sections(attempts: Attempt[]) {
  return {
    listening: accOf(attempts.filter((a) => isListening(a.part))),
    reading: accOf(attempts.filter((a) => !isListening(a.part))),
  };
}

/** N dernières tentatives (les plus récentes) */
export const recent = (attempts: Attempt[], n: number) => [...attempts].sort((a, b) => b.at - a.at).slice(0, n);

export const STUDY_DAY_SECONDS = 120;
export const studied = (d?: DayLog) => !!d && (d.seconds >= STUDY_DAY_SECONDS || d.questions >= 5 || d.cards >= 10);

/** Série de jours consécutifs (aujourd'hui compte s'il est déjà travaillé, sinon on part d'hier) */
export function streak(logs: DayLog[], today = dayKey()): number {
  const m = new Map(logs.map((l) => [l.day, l]));
  let k = studied(m.get(today)) ? today : addDays(today, -1);
  let n = 0;
  while (studied(m.get(k))) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

export function bestStreak(logs: DayLog[]): number {
  const days = logs.filter(studied).map((l) => l.day).sort();
  let best = 0, cur = 0, prev = '';
  for (const d of days) {
    cur = prev && addDays(prev, 1) === d ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

/** Précision Listening / Reading par jour (uniquement les jours avec données) */
export function dailySeries(attempts: Attempt[]) {
  const g = groupBy(attempts, (a) => a.day);
  return [...g.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, list]) => {
      const s = sections(list);
      return { day, listening: s.listening.total ? s.listening.rate : null, reading: s.reading.total ? s.reading.rate : null, total: list.length };
    });
}

export function avgTimeByPart(attempts: Attempt[]): Record<Part, number> {
  const g = groupBy(attempts, (a) => a.part);
  return Object.fromEntries(
    ALL_PARTS.map((p) => {
      const l = g.get(p) ?? [];
      return [p, l.length ? l.reduce((s, a) => s + a.timeMs, 0) / l.length / 1000 : 0];
    }),
  ) as Record<Part, number>;
}

export function masteredCount(states: QState[]): { mastered: number; errors: number; due: number } {
  const now = Date.now();
  let mastered = 0, errors = 0, due = 0;
  for (const s of states) {
    if (!s.err) continue;
    errors++;
    if (s.err.status === 'mastered') mastered++;
    else if (s.err.srs.due <= now) due++;
  }
  return { mastered, errors, due };
}

/** Questions « maîtrisées » : dernière réponse correcte et aucune erreur non maîtrisée */
export function solidQuestions(states: QState[]): number {
  return states.filter((s) => s.lastResult && (!s.err || s.err.status === 'mastered')).length;
}
