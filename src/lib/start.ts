import { db } from './db';
import { getBank } from './bank';
import { byPool, examPools } from './bankCore';
import { buildMiniExam, errorQuestionIds, selectQuestions } from './selection';
import { createSession, practicePools } from './sessions';
import type { ExamPool, Part, QState } from './types';
import { LISTENING_PARTS, READING_PARTS, PART_FR } from './labels';
import { navigate } from './router';

async function context() {
  const [attempts, states] = await Promise.all([db.attempts.toArray(), db.qstate.toArray()]);
  return { attempts, states: new Map<string, QState>(states.map((s) => [s.qid, s])), stateList: states };
}

const go = (id: string) => navigate(`/session?id=${id}`);

export async function startDaily(minutes: number, parts?: Part[]) {
  const { attempts, states } = await context();
  const pools = await practicePools();
  const { qids } = selectQuestions(getBank(), attempts, states, { minutes, pools, parts, errorShare: 0.35 });
  const s = await createSession({ type: 'daily', title: `Révision du jour — ${minutes} min`, mode: 'practice', qids, immediateFeedback: true, meta: { minutes } });
  go(s.id);
}

export interface IntensiveOptions {
  minutes: number;
  scope: 'listening' | 'reading' | 'mixed';
  parts: Part[];
  hard: boolean;
  feedback: boolean;
  timer: boolean;
  breaks: boolean;
}

export async function startIntensive(o: IntensiveOptions) {
  const { attempts, states } = await context();
  const pools = await practicePools();
  const parts = o.parts.length ? o.parts : o.scope === 'listening' ? LISTENING_PARTS : o.scope === 'reading' ? READING_PARTS : undefined;
  const sel = selectQuestions(getBank(), attempts, states, { minutes: o.minutes, pools, parts, hard: o.hard, errorShare: 0.25 });
  const label = o.parts.length ? `Parts ${o.parts.join(', ')}` : o.scope === 'listening' ? 'Listening' : o.scope === 'reading' ? 'Reading' : 'Mixte';
  const s = await createSession({
    type: 'intensive',
    title: `Session intensive ${o.minutes} min — ${label}${o.hard ? ' (difficile)' : ''}`,
    mode: 'practice',
    qids: sel.qids,
    immediateFeedback: o.feedback,
    showTimer: o.timer,
    timeLimitSec: o.timer ? o.minutes * 60 : undefined,
    breakEveryMin: o.breaks ? 25 : undefined,
    meta: { ...o, repeatedShare: sel.repeatedShare },
  });
  go(s.id);
}

export async function startPart(part: Part, minutes = 15) {
  const { attempts, states } = await context();
  const pools = await practicePools();
  const { qids } = selectQuestions(getBank(), attempts, states, { minutes, pools, parts: [part], errorShare: 0.3 });
  const s = await createSession({ type: 'part', title: `Part ${part} — ${PART_FR[part]}`, mode: 'practice', qids });
  go(s.id);
}

export async function startDiagnostic() {
  const qids = byPool(getBank(), 'diag').map((q) => q.id);
  const s = await createSession({ type: 'diagnostic', title: 'Test diagnostic', mode: 'exam', qids, showTimer: true, examKind: 'mini' });
  go(s.id);
}

export async function startExam(kind: 'full' | 'listening' | 'reading', pool: ExamPool = 'exam1') {
  const all = byPool(getBank(), pool);
  const num = pool.slice(4);
  const qids = all.filter((q) => (kind === 'full' ? true : kind === 'listening' ? q.part <= 4 : q.part >= 5)).map((q) => q.id);
  const title = kind === 'full' ? `Examen blanc n°${num} — complet` : kind === 'listening' ? `Examen blanc n°${num} — Listening` : `Examen blanc n°${num} — Reading`;
  const s = await createSession({ type: 'exam', title, mode: 'exam', qids, examKind: kind, readingLimitSec: kind === 'listening' ? undefined : 75 * 60, meta: { bank: pool } });
  go(s.id);
}

/** Prochain examen blanc jamais commencé (sinon le dernier) */
export async function nextExamPool(): Promise<ExamPool> {
  const all = examPools(getBank());
  const used = new Set((await db.sessions.filter((s) => s.type === 'exam' && s.examKind !== 'mini' && s.status !== 'abandoned').toArray()).map((s) => (s.meta?.bank as string) ?? 'exam1'));
  return all.find((p) => !used.has(p)) ?? all[all.length - 1];
}

export async function startMiniExam(size: number) {
  const { states } = await context();
  const pools = await practicePools();
  const qids = buildMiniExam(getBank(), pools, size, states);
  const bank = getBank();
  const reading = qids.filter((id) => bank.questions.get(id)!.part >= 5).length;
  const s = await createSession({ type: 'exam', title: `Mini-examen ${qids.length} questions`, mode: 'exam', qids, examKind: 'mini', readingLimitSec: Math.round(reading * 45) });
  go(s.id);
}

export async function startErrors(mode: 'due' | 'all' | 'hard' | 'favorites', limit = 40) {
  const { stateList } = await context();
  const qids = mode === 'favorites' ? stateList.filter((s) => s.favorite).map((s) => s.qid) : errorQuestionIds(stateList, mode);
  const valid = qids.filter((id) => getBank().questions.has(id)).slice(0, limit);
  if (!valid.length) throw new Error(mode === 'due' ? "Aucune erreur à revoir pour l'instant. Bravo !" : 'Aucune question dans cette liste.');
  const title = { due: 'Erreurs à revoir', all: 'Refaire mes erreurs', hard: 'Questions difficiles', favorites: 'Mes favoris' }[mode];
  const s = await createSession({ type: 'errors', title, mode: 'practice', qids: valid });
  go(s.id);
}

export async function startQuestions(qids: string[], title: string) {
  const s = await createSession({ type: 'errors', title, mode: 'practice', qids });
  go(s.id);
}
