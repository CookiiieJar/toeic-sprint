/**
 * MOTEUR DE MAÎTRISE — modèle de compétences par « partie × catégorie ».
 *
 * Principe : chaque compétence (ex. « p5:word-form ») a un niveau θ estimé en rejouant
 * l'historique des tentatives dans l'ordre chronologique (aucune donnée supplémentaire à stocker :
 * tout se recalcule depuis la table `attempts`, donc aucun changement de schéma).
 *
 * Probabilité de réussite d'une question (modèle logistique avec hasard) :
 *   P = g + (1 − g) · σ(θ − b)     g = 1/4 (1/3 en Part 2), b = difficulté selon le niveau 1/2/3
 * Mise à jour après chaque réponse (type Elo) : θ += K · poids · (résultat − P), K décroît avec
 * le nombre de réponses. Conséquences voulues :
 *  - réussir une question difficile compte plus que réussir une question facile ;
 *  - les réponses récentes pèsent plus que les anciennes ;
 *  - refaire une question déjà vue compte peu (on peut avoir mémorisé la réponse) ;
 *  - une bonne réponse « pas sûre » ne vaut qu'un demi-succès ;
 *  - une question laissée sans réponse (temps écoulé en examen) n'informe pas sur la compétence.
 *
 * Ce modèle est une heuristique raisonnée, pas une mesure psychométrique calibrée.
 */
import type { Bank } from './bankCore';
import { targetSec } from './bankCore';
import type { Attempt, Level, Part } from './types';
import { ALL_PARTS, EXAM_STRUCTURE, PART_FR, READING_PARTS, catLabel, isListening } from './labels';
import { requiredRates } from './scoring';

export const skillKey = (part: Part, category: string) => `p${part}:${category}`;

/** Niveau a priori : ≈ 70 % de réussite sur une question de niveau moyen */
export const THETA0 = 0.4;
const DIFFICULTY: Record<Level, number> = { 1: -0.9, 2: 0, 3: 0.9 };
/** nombre de réponses « fictives » tirant une compétence peu observée vers le niveau de sa partie */
const SHRINK = 4;
/** poids d'une question déjà vue : une réussite peut venir de la mémoire, un nouvel échec reste parlant */
const REPEAT_WEIGHT = { correct: 0.3, wrong: 0.6 };

/** pas d'apprentissage : K = max(K_MIN, K_START / (1 + K_DECAY·n)) — réglé par simulation (voir docs/ARCHITECTURE.md § Moteur de maîtrise) */
const K_START = 0.9;
const K_DECAY = 0.08;
const K_MIN = 0.2;

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
export const guessRate = (part: Part) => (part === 2 ? 1 / 3 : 1 / 4);

/** Probabilité de réussite d'une question de ce niveau pour un niveau de compétence θ */
export function pCorrect(theta: number, level: Level, part: Part): number {
  const g = guessRate(part);
  return g + (1 - g) * sigmoid(theta - DIFFICULTY[level]);
}

interface Track {
  theta: number;
  /** somme des poids (nombre effectif de réponses informatives) */
  n: number;
}
const newTrack = (): Track => ({ theta: THETA0, n: 0 });
function update(t: Track, part: Part, level: Level, outcome: number, weight: number) {
  const k = Math.max(K_MIN, K_START / (1 + K_DECAY * t.n));
  t.theta += k * weight * (outcome - pCorrect(t.theta, level, part));
  t.theta = Math.max(-3, Math.min(3.5, t.theta));
  t.n += weight;
}

export interface Skill {
  key: string;
  part: Part;
  category: string;
  label: string;
  /** niveau estimé, déjà rapproché du niveau de la partie si peu de données */
  theta: number;
  /** réponses réelles (hors « sans réponse ») */
  attempts: number;
  correct: number;
  /** nombre effectif de réponses informatives */
  n: number;
  lastAt: number;
  /** réussite attendue sur les questions de ce type telles qu'elles tombent en examen (0..1) */
  mastery: number;
  /** nombre moyen de questions de ce type dans un examen complet */
  examWeight: number;
  /** questions récupérables par examen si la compétence atteint la cible */
  potential: number;
  /** temps médian / temps cible (Reading uniquement, ≥ 4 réponses) */
  pace?: number;
}

export interface Mastery {
  skills: Map<string, Skill>;
  parts: Record<Part, { theta: number; n: number; mastery: number }>;
  /** réussite attendue en conditions d'examen, par section (0..1) */
  expected: { listening: number; reading: number };
  target: { listening: number; reading: number };
}

export interface MasteryOptions {
  /** réussite visée par section (par défaut 88 %) */
  target?: { listening: number; reading: number };
}

/** Réussite à viser par section pour un score cible : repère de la courbe indicative + 4 points de marge */
export function targetsFor(targetScore: number): { listening: number; reading: number } {
  const r = requiredRates(targetScore);
  return { listening: Math.min(0.95, r.listening + 0.04), reading: Math.min(0.95, r.reading + 0.04) };
}

interface ExamMix {
  /** questions par examen */
  weight: number;
  /** répartition des niveaux 1/2/3 */
  levels: [number, number, number];
}

const mixCache = new WeakMap<Bank, { size: number; mix: Map<string, ExamMix> }>();

/** Fréquence et difficulté de chaque compétence dans les examens blancs (image de l'examen réel) */
export function examMix(bank: Bank): Map<string, ExamMix> {
  const cached = mixCache.get(bank);
  if (cached && cached.size === bank.questions.size) return cached.mix;
  const counts = new Map<string, [number, number, number]>();
  const partTotals = new Map<Part, number>();
  for (const q of bank.questions.values()) {
    if (!q.pool.startsWith('exam')) continue;
    const k = skillKey(q.part, q.category);
    const c = counts.get(k) ?? [0, 0, 0];
    c[q.level - 1]++;
    counts.set(k, c);
    partTotals.set(q.part, (partTotals.get(q.part) ?? 0) + 1);
  }
  const mix = new Map<string, ExamMix>();
  for (const [k, c] of counts) {
    const part = Number(k[1]) as Part;
    const total = c[0] + c[1] + c[2];
    // normalisé sur la structure officielle : la somme des poids d'une partie = son nombre de questions
    mix.set(k, { weight: (total / partTotals.get(part)!) * EXAM_STRUCTURE[part], levels: [c[0] / total, c[1] / total, c[2] / total] });
  }
  mixCache.set(bank, { size: bank.questions.size, mix });
  return mix;
}

const DEFAULT_LEVELS: [number, number, number] = [0.3, 0.5, 0.2];
const expectedRate = (theta: number, part: Part, levels: [number, number, number]) =>
  levels.reduce((s, w, i) => s + w * pCorrect(theta, (i + 1) as Level, part), 0);

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Première tentative de chaque question uniquement (mesure non biaisée par la mémorisation) */
export function firstExposures(attempts: Attempt[]): Attempt[] {
  const seen = new Set<string>();
  const out: Attempt[] = [];
  for (const a of [...attempts].sort((x, y) => x.at - y.at)) {
    if (seen.has(a.qid)) continue;
    seen.add(a.qid);
    out.push(a);
  }
  return out;
}

export function computeMastery(bank: Bank, attempts: Attempt[], opts: MasteryOptions = {}): Mastery {
  const target = opts.target ?? { listening: 0.88, reading: 0.88 };
  const mix = examMix(bank);
  const partTracks = Object.fromEntries(ALL_PARTS.map((p) => [p, newTrack()])) as Record<Part, Track>;
  const tracks = new Map<string, Track & { part: Part; category: string; attempts: number; correct: number; lastAt: number; ratios: number[] }>();
  const seen = new Set<string>();

  for (const a of [...attempts].sort((x, y) => x.at - y.at)) {
    if (a.choice === null) continue; // sans réponse : aucun signal sur la compétence
    const repeat = seen.has(a.qid);
    seen.add(a.qid);
    const key = skillKey(a.part, a.category);
    let t = tracks.get(key);
    if (!t) tracks.set(key, (t = { ...newTrack(), part: a.part, category: a.category, attempts: 0, correct: 0, lastAt: 0, ratios: [] }));
    const outcome = a.correct ? (a.unsure ? 0.5 : 1) : 0;
    const weight = repeat ? (a.correct ? REPEAT_WEIGHT.correct : REPEAT_WEIGHT.wrong) : 1;
    update(t, a.part, a.level, outcome, weight);
    update(partTracks[a.part], a.part, a.level, outcome, weight);
    t.attempts++;
    if (a.correct) t.correct++;
    t.lastAt = a.at;
    if (!repeat && !isListening(a.part) && a.timeMs > 0) {
      const q = bank.questions.get(a.qid);
      const ts = q ? targetSec(q) : 0;
      // plafonné : un téléphone posé ne doit pas fausser le rythme
      if (ts) t.ratios.push(Math.min(5, a.timeMs / 1000 / ts));
    }
  }

  const skills = new Map<string, Skill>();
  const add = (key: string, part: Part, category: string) => {
    const t = tracks.get(key);
    const pt = partTracks[part];
    const n = t?.n ?? 0;
    const theta = t ? (n * t.theta + SHRINK * pt.theta) / (n + SHRINK) : pt.theta;
    const m = mix.get(key);
    const mastery = expectedRate(theta, part, m?.levels ?? DEFAULT_LEVELS);
    const examWeight = m?.weight ?? 0;
    const goal = isListening(part) ? target.listening : target.reading;
    skills.set(key, {
      key, part, category,
      label: `Part ${part} · ${catLabel(category)}`,
      theta, n, mastery, examWeight,
      attempts: t?.attempts ?? 0,
      correct: t?.correct ?? 0,
      lastAt: t?.lastAt ?? 0,
      potential: Math.max(0, goal - mastery) * examWeight,
      pace: t && t.ratios.length >= 4 ? median(t.ratios.slice(-20)) : undefined,
    });
  };
  for (const key of mix.keys()) add(key, Number(key[1]) as Part, key.slice(3));
  for (const [key, t] of tracks) if (!skills.has(key)) add(key, t.part, t.category);

  const parts = Object.fromEntries(
    ALL_PARTS.map((p) => {
      const ofPart = [...skills.values()].filter((s) => s.part === p && s.examWeight > 0);
      const w = ofPart.reduce((s, x) => s + x.examWeight, 0);
      const mastery = w ? ofPart.reduce((s, x) => s + x.mastery * x.examWeight, 0) / w : expectedRate(partTracks[p].theta, p, DEFAULT_LEVELS);
      return [p, { theta: partTracks[p].theta, n: partTracks[p].n, mastery }];
    }),
  ) as Mastery['parts'];
  const section = (ps: Part[]) => ps.reduce((s, p) => s + parts[p].mastery * EXAM_STRUCTURE[p], 0) / ps.reduce((s, p) => s + EXAM_STRUCTURE[p], 0);
  return { skills, parts, target, expected: { listening: section([1, 2, 3, 4]), reading: section(READING_PARTS) } };
}

/** Compétences classées par gain potentiel ; `minAttempts` écarte ce qui ne repose pas sur des réponses réelles */
export function priorities(m: Mastery, n = 3, minAttempts = 3): Skill[] {
  return [...m.skills.values()]
    .filter((s) => s.attempts >= minAttempts && s.potential > 0.15)
    .sort((a, b) => b.potential - a.potential)
    .slice(0, n);
}

/** Parties les plus rentables à travailler (somme des gains potentiels de leurs compétences observées) */
export function weakParts(m: Mastery, n = 2): Part[] {
  return ALL_PARTS.map((p) => {
    const ofPart = [...m.skills.values()].filter((s) => s.part === p);
    return { p, seen: ofPart.reduce((s, x) => s + x.attempts, 0), pot: ofPart.reduce((s, x) => s + x.potential, 0) };
  })
    .filter((x) => x.seen >= 3 && x.pot > 0.3)
    .sort((a, b) => b.pot - a.pot)
    .slice(0, n)
    .map((x) => x.p);
}

export interface ReadingPace {
  /** temps moyen par question (s) */
  perPart: Partial<Record<Part, number>>;
  /** durée projetée de la section Reading complète (min) ; null si une partie manque de données */
  projectedMin: number | null;
  samples: number;
}

/**
 * Rythme en Reading : projette la durée des 100 questions (limite officielle : 75 min)
 * à partir des premières tentatives récentes, temps plafonné à 5× la cible.
 */
export function readingPace(bank: Bank, attempts: Attempt[], window = 60): ReadingPace {
  const first = firstExposures(attempts).filter((a) => !isListening(a.part) && a.choice !== null && a.timeMs > 0);
  const perPart: ReadingPace['perPart'] = {};
  let total = 0;
  let complete = true;
  let samples = 0;
  for (const p of READING_PARTS) {
    const list = first.filter((a) => a.part === p).slice(-window);
    if (list.length < 8) {
      complete = false;
      continue;
    }
    const avg = list.reduce((s, a) => {
      const q = bank.questions.get(a.qid);
      const cap = (q ? targetSec(q) : 60) * 5;
      return s + Math.min(cap, a.timeMs / 1000);
    }, 0) / list.length;
    perPart[p] = avg;
    total += avg * EXAM_STRUCTURE[p];
    samples += list.length;
  }
  return { perPart, projectedMin: complete ? total / 60 : null, samples };
}

export const partLabel = (p: Part) => `Part ${p} — ${PART_FR[p]}`;
