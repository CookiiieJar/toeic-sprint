import type { DayLog, Part, Profile, Session } from './types';
import { addDays, dayKey, diffDays, isWeekend } from './dates';
import { studied } from './stats';

export type TaskKind = 'diagnostic' | 'daily' | 'intensive' | 'errors' | 'flashcards' | 'grammar' | 'exam-full' | 'mini-exam' | 'checklist';

export interface PlanTask {
  id: string;
  kind: TaskKind;
  label: string;
  detail?: string;
  minutes: number;
  parts?: Part[];
  scope?: 'listening' | 'reading' | 'mixed' | 'weak';
  hard?: boolean;
  size?: number;
  timed?: boolean;
  done: boolean;
}

export interface PlanDay {
  day: string;
  j: number; // jours avant l'examen
  phase: string;
  focus: string;
  tasks: PlanTask[];
  isToday: boolean;
  isPast: boolean;
  studied: boolean;
  budget: number;
  note?: string;
}

type T = Omit<PlanTask, 'id' | 'done'>;
const t = (kind: TaskKind, minutes: number, label: string, extra: Partial<T> = {}): T => ({ kind, minutes, label, ...extra });

export const PHASES: { from: number; to: number; name: string; focus: string }[] = [
  { from: 17, to: 15, name: 'Diagnostic & fondamentaux', focus: 'Identifier tes faiblesses, revoir la grammaire clé, traiter tes premières erreurs.' },
  { from: 14, to: 10, name: 'Progression ciblée', focus: 'Sessions intensives sur tes parties faibles, vocabulaire, compréhension orale.' },
  { from: 9, to: 5, name: 'Vitesse & examens', focus: 'Reading chronométré, examen blanc complet, analyse systématique des erreurs.' },
  { from: 4, to: 2, name: 'Consolidation', focus: 'Difficultés persistantes, dernières grosses sessions, vérification en conditions réelles.' },
  { from: 1, to: 1, name: 'Révisions légères', focus: 'Flashcards, erreurs récurrentes, exercices courts. Pas de grosse session.' },
  { from: 0, to: 0, name: 'Jour J', focus: 'Checklist, gestion du temps, confiance. Aucun entraînement épuisant.' },
];

/** Programme type par nombre de jours avant l'examen (J-17 = 11 novembre pour un examen le 28) */
const TEMPLATE: Record<number, T[]> = {
  17: [t('diagnostic', 45, 'Test diagnostic (50 questions)'), t('grammar', 15, 'Fiche de grammaire prioritaire')],
  16: [t('errors', 15, 'Comprendre mes erreurs du diagnostic'), t('grammar', 15, 'Fiche de grammaire + mini-quiz'), t('daily', 20, 'Révision du jour ciblée', { scope: 'weak' })],
  15: [t('intensive', 45, 'Session intensive — parties faibles', { scope: 'weak' }), t('flashcards', 10, 'Flashcards vocabulaire'), t('errors', 10, 'Erreurs à revoir')],
  14: [t('intensive', 90, 'Grosse session — parties faibles', { scope: 'weak' }), t('flashcards', 15, 'Flashcards'), t('errors', 15, 'Erreurs à revoir')],
  13: [t('mini-exam', 35, 'Mini-examen 50 questions', { size: 50 }), t('intensive', 45, 'Listening : conversations & monologues', { parts: [3, 4] }), t('flashcards', 10, 'Flashcards')],
  12: [t('intensive', 45, 'Reading ciblé', { scope: 'reading' }), t('flashcards', 10, 'Flashcards'), t('errors', 15, 'Erreurs à revoir')],
  11: [t('intensive', 45, 'Listening intensif', { scope: 'listening' }), t('grammar', 15, 'Fiche de grammaire'), t('errors', 10, 'Erreurs à revoir')],
  10: [t('intensive', 60, 'Session mixte — difficulté élevée', { scope: 'mixed', hard: true }), t('flashcards', 10, 'Flashcards')],
  9: [t('intensive', 45, 'Reading chronométré (Parts 5 & 7)', { parts: [5, 7], timed: true }), t('errors', 15, 'Erreurs à revoir')],
  8: [t('mini-exam', 25, 'Mini-examen 30 questions', { size: 30 }), t('errors', 20, 'Analyse des erreurs'), t('flashcards', 10, 'Flashcards')],
  7: [t('exam-full', 120, 'Examen blanc complet (200 questions)'), t('errors', 20, "Correction de l'examen blanc")],
  6: [t('errors', 30, "Erreurs de l'examen blanc"), t('intensive', 60, 'Parties faibles', { scope: 'weak' })],
  5: [t('intensive', 45, 'Part 7 chronométrée — vitesse', { parts: [7], timed: true }), t('flashcards', 10, 'Flashcards'), t('errors', 10, 'Erreurs à revoir')],
  4: [t('errors', 30, 'Difficultés persistantes'), t('intensive', 45, 'Session difficile sur les points faibles', { scope: 'weak', hard: true })],
  3: [t('mini-exam', 35, 'Mini-examen 50 questions en conditions réelles', { size: 50 }), t('errors', 20, 'Erreurs à revoir')],
  2: [t('intensive', 60, 'Dernière grosse session mixte', { scope: 'mixed' }), t('flashcards', 15, 'Flashcards')],
  1: [t('flashcards', 15, 'Flashcards (léger)'), t('errors', 15, 'Erreurs récurrentes'), t('daily', 10, 'Quelques exercices courts')],
  0: [t('checklist', 5, 'Checklist du jour J')],
};

export interface PlanInput {
  profile: Profile;
  sessions: Session[];
  logs: DayLog[];
  weakParts: Part[];
  today?: string;
  startDay?: string;
}

const sessionDay = (s: Session) => dayKey(s.finishedAt ?? s.updatedAt);

function isDone(task: T, day: string, done: Session[], log: DayLog | undefined, diagDone: boolean): boolean {
  const ofDay = done.filter((s) => sessionDay(s) === day);
  switch (task.kind) {
    case 'diagnostic':
      return diagDone && ofDay.some((s) => s.type === 'diagnostic');
    case 'daily':
      return ofDay.some((s) => s.type === 'daily' || s.type === 'part');
    case 'intensive': {
      const sec = ofDay.filter((s) => s.type === 'intensive').reduce((a, s) => a + s.elapsedSec, 0);
      return sec >= task.minutes * 60 * 0.6;
    }
    case 'errors':
      return ofDay.some((s) => s.type === 'errors');
    case 'grammar':
      return ofDay.some((s) => s.type === 'grammar');
    case 'flashcards':
      return (log?.cards ?? 0) >= Math.max(10, task.minutes * 1.5);
    case 'exam-full':
      return ofDay.some((s) => s.type === 'exam' && s.examKind !== 'mini');
    case 'mini-exam':
      return ofDay.some((s) => s.type === 'exam' && s.examKind === 'mini');
    case 'checklist':
      return false;
  }
}

export function phaseFor(j: number) {
  return PHASES.find((p) => j <= p.from && j >= p.to) ?? PHASES[0];
}

export function buildPlan({ profile, sessions, logs, weakParts, today = dayKey(), startDay }: PlanInput): PlanDay[] {
  const exam = profile.examDate;
  const start = startDay ?? addDays(exam, -17);
  const done = sessions.filter((s) => s.status === 'done');
  const diagDone = !!profile.diagnosticSessionId || done.some((s) => s.type === 'diagnostic');
  const fullExamDone = done.some((s) => s.type === 'exam' && s.examKind === 'full');
  const logMap = new Map(logs.map((l) => [l.day, l]));
  const days: PlanDay[] = [];
  const total = diffDays(start, exam);
  for (let i = 0; i <= total; i++) {
    const day = addDays(start, i);
    const j = diffDays(day, exam);
    const tpl = (TEMPLATE[Math.min(17, j)] ?? TEMPLATE[10]).map((x) => ({ ...x }));
    const isToday = day === today;
    const isPast = day < today;
    const budget = isWeekend(day) ? profile.weekendMinutes : profile.dailyMinutes;
    let note: string | undefined;

    // Adaptations
    if (diagDone) {
      const di = tpl.findIndex((x) => x.kind === 'diagnostic');
      if (di >= 0 && !(isPast || isToday)) tpl[di] = t('intensive', 45, 'Session intensive — parties faibles', { scope: 'weak' });
    } else if (isToday && j > 0 && !tpl.some((x) => x.kind === 'diagnostic')) {
      tpl.unshift(t('diagnostic', 45, 'Test diagnostic (non fait)'));
      note = 'Le diagnostic n\'a pas encore été fait : il passe en priorité pour cibler ton travail.';
    }
    if (fullExamDone) {
      const ei = tpl.findIndex((x) => x.kind === 'exam-full');
      if (ei >= 0 && !isPast && !(isToday && done.some((s) => s.type === 'exam' && s.examKind === 'full' && sessionDay(s) === day)))
        tpl[ei] = t('mini-exam', 35, 'Mini-examen 50 questions (examen complet déjà passé)', { size: 50 });
    } else if (isToday && j <= 6 && j >= 2 && !tpl.some((x) => x.kind === 'exam-full')) {
      const ii = tpl.findIndex((x) => x.kind === 'intensive' || x.kind === 'mini-exam');
      const ex = t('exam-full', 120, 'Examen blanc complet (reporté — à faire dès que possible)');
      if (ii >= 0) tpl[ii] = ex;
      else tpl.unshift(ex);
      note = "L'examen blanc complet n'a pas encore été passé : il remplace la session prévue aujourd'hui (ou fais-le au plus vite).";
    }
    for (const x of tpl) if (x.scope === 'weak' && weakParts.length) x.parts = weakParts;

    // Mise à l'échelle selon la disponibilité (les examens ne sont pas raccourcis)
    const sum = tpl.filter((x) => !['exam-full', 'mini-exam', 'diagnostic', 'checklist'].includes(x.kind)).reduce((s, x) => s + x.minutes, 0);
    const fixed = tpl.filter((x) => ['exam-full', 'mini-exam', 'diagnostic'].includes(x.kind)).reduce((s, x) => s + x.minutes, 0);
    if (sum > 0) {
      const factor = Math.max(0.3, Math.min(1.5, (budget - fixed) / sum));
      if (j > 1) for (const x of tpl) if (['intensive', 'daily', 'errors', 'flashcards', 'grammar'].includes(x.kind)) x.minutes = Math.max(5, Math.round((x.minutes * factor) / 5) * 5);
      for (const x of tpl) if (x.kind === 'intensive') x.minutes = Math.max(30, Math.min(180, x.minutes));
    }

    if (isToday) {
      const y = addDays(day, -1);
      if (y >= start && !studied(logMap.get(y)) && !note)
        note = "Hier n'a pas été travaillé : pas de rattrapage épuisant, le programme du jour reste prioritaire et les erreurs dues sont reprises automatiquement.";
    }

    const tasks: PlanTask[] = tpl.map((x, k) => ({ ...x, id: `${day}-${k}`, done: isDone(x, day, done, logMap.get(day), diagDone) }));
    const ph = phaseFor(j);
    days.push({ day, j, phase: ph.name, focus: ph.focus, tasks, isToday, isPast, studied: studied(logMap.get(day)), budget, note });
  }
  return days;
}

export function todayPlan(days: PlanDay[], today = dayKey()): PlanDay | undefined {
  return days.find((d) => d.day === today);
}
