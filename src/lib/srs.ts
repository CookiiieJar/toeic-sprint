import type { Srs } from './types';
import { DAY_MS, dayKey, diffDays, startOfDay } from './dates';

/** Délai de réapprentissage après un échec (même journée) */
export const RELEARN_MS = 10 * 60 * 1000;

export function newSrs(now = Date.now()): Srs {
  return { ease: 2.5, interval: 0, reps: 0, due: now, lapses: 0 };
}

/**
 * Révision SM-2 adaptée à une préparation courte (17 jours) :
 * - échec (q < 3) : remise à zéro, nouvel essai 10 min plus tard ;
 * - succès : intervalles 1 j → 3 j → intervalle × facilité (plafonné à 21 j).
 * q : 0..5 (5 = parfait et rapide, 4 = correct, 3 = correct avec difficulté).
 * maxInterval : plafond en jours (voir examHorizon) pour que tout repasse avant l'examen.
 */
export function review(s: Srs, q: number, now = Date.now(), maxInterval = 21): Srs {
  q = Math.max(0, Math.min(5, Math.round(q)));
  const ease = Math.max(1.3, s.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  if (q < 3) {
    return { ease, interval: 0, reps: 0, due: now + RELEARN_MS, lapses: s.lapses + 1 };
  }
  const reps = s.reps + 1;
  let interval: number;
  if (reps === 1) interval = 1;
  else if (reps === 2) interval = 3;
  else interval = Math.round(s.interval * ease);
  if (q === 3) interval = Math.max(1, Math.round(interval * 0.6));
  interval = Math.max(1, Math.min(21, maxInterval, interval));
  return { ease, interval, reps, due: startOfDay(now) + interval * DAY_MS + 4 * 3600 * 1000, lapses: s.lapses };
}

export const isDue = (s: Srs, now = Date.now()) => s.due <= now;

/** Maîtrise durable : trois réussites espacées consécutives */
export function errStatus(s: Srs): 'new' | 'learning' | 'review' | 'mastered' {
  if (s.reps >= 3) return 'mastered';
  if (s.reps === 2) return 'review';
  if (s.reps === 1 || s.lapses > 0) return 'learning';
  return 'new';
}

/** Qualité d'une réponse à une question de la banque */
export function gradeAnswer(correct: boolean, timeMs: number, targetSec: number, unsure = false): number {
  if (!correct) return 1;
  if (unsure) return 3;
  if (timeMs <= targetSec * 1000 * 1.3) return 5;
  if (timeMs <= targetSec * 1000 * 2.2) return 4;
  return 3;
}

/**
 * Plafond d'intervalle à l'approche de l'examen : chaque carte doit redevenir due au plus tard
 * la veille. Sans date d'examen à venir (passée ou lointaine), le plafond normal de 21 jours s'applique.
 */
export function examHorizon(examDate: string | undefined, now = Date.now()): number {
  if (!examDate) return 21;
  const days = diffDays(dayKey(now), examDate);
  if (days <= 0) return 21;
  return Math.max(1, Math.min(21, days - 1));
}
