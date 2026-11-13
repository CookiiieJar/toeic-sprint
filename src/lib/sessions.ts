import { db } from './db';
import { getBank } from './bank';
import { letterIndex, targetSec, toUnits } from './bankCore';
import type { Attempt, ExamPool, Letter, Part, Pool, Profile, QState, Session, SessionSummary, SessionType, Unit } from './types';
import { dayKey } from './dates';
import { errStatus, gradeAnswer, newSrs, review } from './srs';
import { isListening } from './labels';

export const DEFAULT_PROFILE: Profile = {
  id: 'me',
  baseScore: 680,
  targetMin: 800,
  targetIdeal: 850,
  examDate: '2026-11-28',
  dailyMinutes: 60,
  weekendMinutes: 120,
  dailyGoalQuestions: 40,
  onboarded: false,
  rate: 1,
  createdAt: Date.now(),
};

export async function getProfile(): Promise<Profile> {
  return (await db.profile.get('me')) ?? { ...DEFAULT_PROFILE, createdAt: Date.now() };
}
export async function saveProfile(patch: Partial<Profile>) {
  const p = await getProfile();
  await db.profile.put({ ...p, ...patch, id: 'me' });
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Examens blancs (pools) déjà passés au moins en partie */
export async function doneExamPools(): Promise<ExamPool[]> {
  const done = await db.sessions.filter((s) => s.type === 'exam' && s.status === 'done' && s.examKind !== 'mini').toArray();
  return [...new Set(done.map((s) => (s.meta?.bank as ExamPool) ?? 'exam1'))];
}

/** Pools utilisables en entraînement. Les questions de l'examen blanc restent réservées tant qu'il n'a pas été passé. */
export async function practicePools(): Promise<Pool[]> {
  const pools: Pool[] = ['practice', 'custom'];
  const p = await getProfile();
  if (p.diagnosticSessionId) pools.push('diag');
  // chaque examen blanc ne rejoint l'entraînement qu'une fois passé (évaluation non biaisée)
  for (const ep of await doneExamPools()) pools.push(ep);
  return pools;
}

export interface NewSession {
  type: SessionType;
  title: string;
  mode: 'practice' | 'exam';
  qids?: string[];
  units?: Unit[];
  immediateFeedback?: boolean;
  showTimer?: boolean;
  timeLimitSec?: number;
  readingLimitSec?: number;
  examKind?: Session['examKind'];
  breakEveryMin?: number;
  meta?: Record<string, unknown>;
}

export async function createSession(n: NewSession): Promise<Session> {
  const bank = getBank();
  const units = n.units ?? toUnits(bank, n.qids ?? []);
  if (!units.length) throw new Error('Aucune question disponible pour cette sélection.');
  // pauses facultatives toutes les ~N minutes
  let breaks: number[] | undefined;
  if (n.breakEveryMin) {
    breaks = [];
    let acc = 0;
    units.forEach((u, i) => {
      acc += u.qids.reduce((s, id) => s + targetSec(bank.questions.get(id)!), 0) + 10;
      if (acc >= n.breakEveryMin! * 60 && i < units.length - 1) {
        breaks!.push(i);
        acc = 0;
      }
    });
  }
  const now = Date.now();
  const s: Session = {
    id: uid(),
    type: n.type,
    title: n.title,
    mode: n.mode,
    units,
    answers: {},
    cursor: 0,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    elapsedSec: 0,
    timeLimitSec: n.timeLimitSec,
    readingLimitSec: n.readingLimitSec,
    readingElapsedSec: 0,
    immediateFeedback: n.mode === 'practice' && (n.immediateFeedback ?? true),
    showTimer: n.showTimer ?? true,
    examKind: n.examKind,
    breaks,
    validated: [],
    played: [],
    meta: n.meta,
  };
  // une seule session active à la fois : les autres passent en pause (reprenables)
  await db.transaction('rw', db.sessions, async () => {
    const active = await db.sessions.where('status').equals('active').toArray();
    for (const a of active) await db.sessions.update(a.id, { status: 'paused' });
    await db.sessions.put(s);
  });
  return s;
}

export async function saveSession(s: Session) {
  s.updatedAt = Date.now();
  await db.sessions.put(s);
}

/** Met à jour l'état d'une question (statistiques + carte d'erreur à répétition espacée) */
export function applyResult(prev: QState | undefined, qid: string, correct: boolean, choice: Letter | null, timeMs: number, tSec: number, now = Date.now()): QState {
  const st: QState = prev ? structuredClone(prev) : { qid, seen: 0, correct: 0, wrong: 0, lastSeen: 0 };
  st.seen++;
  if (correct) st.correct++;
  else st.wrong++;
  st.lastSeen = now;
  st.lastResult = correct;
  if (!correct) {
    if (!st.err) {
      const srs = review(newSrs(now), 1, now);
      st.err = { firstWrongAt: now, lastWrongAt: now, lastChoice: choice, lastTimeMs: timeMs, srs, reviews: 0, status: 'learning' };
    } else {
      st.err.srs = review(st.err.srs, 1, now);
      st.err.lastWrongAt = now;
      st.err.lastChoice = choice;
      st.err.lastTimeMs = timeMs;
      st.err.reviews++;
      st.err.status = 'learning';
    }
  } else if (st.err && st.err.status !== 'mastered') {
    // la répétition espacée n'avance que si la révision était due (sinon on ne « triche » pas sur l'espacement)
    if (st.err.srs.due <= now + 5 * 60 * 1000) {
      st.err.srs = review(st.err.srs, gradeAnswer(true, timeMs, tSec), now);
      st.err.reviews++;
      st.err.status = errStatus(st.err.srs);
    }
  }
  return st;
}

/** Enregistre une réponse (historique, état de la question, journal du jour) */
export async function recordAttempt(session: Session, qid: string) {
  const bank = getBank();
  const q = bank.questions.get(qid);
  const a = session.answers[qid];
  if (!q || !a || a.recorded) return;
  const correct = a.choice !== null && letterIndex(a.choice) === letterIndex(q.answer);
  const now = Date.now();
  const attempt: Attempt = {
    qid,
    part: q.part,
    category: q.category,
    level: q.level,
    correct,
    choice: a.choice,
    timeMs: a.timeMs,
    at: now,
    day: dayKey(now),
    sessionId: session.id,
    sessionType: session.type,
    mode: session.mode,
  };
  await db.transaction('rw', db.attempts, db.qstate, db.daylog, async () => {
    await db.attempts.add(attempt);
    const prev = await db.qstate.get(qid);
    await db.qstate.put(applyResult(prev, qid, correct, a.choice, a.timeMs, targetSec(q), now));
    const d = (await db.daylog.get(attempt.day)) ?? { day: attempt.day, seconds: 0, questions: 0, correct: 0, cards: 0 };
    d.questions++;
    if (correct) d.correct++;
    await db.daylog.put(d);
  });
  a.recorded = true;
}

export async function addStudySeconds(sec: number, cards = 0) {
  const day = dayKey();
  await db.transaction('rw', db.daylog, async () => {
    const d = (await db.daylog.get(day)) ?? { day, seconds: 0, questions: 0, correct: 0, cards: 0 };
    d.seconds += sec;
    d.cards += cards;
    await db.daylog.put(d);
  });
}

export function summarize(s: Session): SessionSummary {
  const bank = getBank();
  const qids = s.units.flatMap((u) => u.qids);
  const sum: SessionSummary = { total: 0, answered: 0, correct: 0, timeSec: s.elapsedSec, byPart: {}, byCategory: {}, wrongIds: [], listening: { total: 0, correct: 0 }, reading: { total: 0, correct: 0 } };
  // En entraînement, seules les questions vues comptent ; en examen, toutes (non répondue = fausse)
  for (const id of qids) {
    const q = bank.questions.get(id);
    if (!q) continue;
    const a = s.answers[id];
    if (s.mode === 'practice' && (!a || a.choice === null)) continue;
    const ok = !!a && a.choice !== null && a.choice === q.answer;
    sum.total++;
    if (a?.choice) sum.answered++;
    if (ok) sum.correct++;
    else sum.wrongIds.push(id);
    const bp = (sum.byPart[q.part as Part] ??= { total: 0, correct: 0 });
    bp.total++;
    if (ok) bp.correct++;
    const bc = (sum.byCategory[q.category] ??= { total: 0, correct: 0 });
    bc.total++;
    if (ok) bc.correct++;
    const sec = isListening(q.part) ? sum.listening! : sum.reading!;
    sec.total++;
    if (ok) sec.correct++;
  }
  return sum;
}

/** Termine une session : enregistre les réponses non encore enregistrées et calcule le bilan */
export async function finishSession(s: Session): Promise<Session> {
  const bank = getBank();
  const qids = s.units.flatMap((u) => u.qids);
  for (const id of qids) {
    if (s.mode === 'exam' && !s.answers[id]) s.answers[id] = { choice: null, timeMs: 0, at: Date.now() };
    const a = s.answers[id];
    if (!a || a.recorded) continue;
    if (s.mode === 'practice' && a.choice === null) continue;
    if (!bank.questions.has(id)) continue;
    await recordAttempt(s, id);
  }
  s.summary = summarize(s);
  s.status = 'done';
  s.finishedAt = Date.now();
  await saveSession(s);
  return s;
}

export async function abandonSession(s: Session) {
  s.status = 'abandoned';
  await saveSession(s);
}

export async function setFavorite(qid: string, fav: boolean) {
  const prev = await db.qstate.get(qid);
  await db.qstate.put({ ...(prev ?? { qid, seen: 0, correct: 0, wrong: 0, lastSeen: 0 }), favorite: fav });
}

export async function markMastered(qid: string, mastered: boolean) {
  const prev = await db.qstate.get(qid);
  if (!prev?.err) return;
  const err = { ...prev.err };
  if (mastered) {
    err.status = 'mastered';
  } else {
    err.status = 'learning';
    err.srs = { ...err.srs, reps: 0, due: Date.now() };
  }
  await db.qstate.put({ ...prev, err });
}

export async function setErrorNote(qid: string, note: string) {
  const prev = await db.qstate.get(qid);
  if (!prev?.err) return;
  await db.qstate.put({ ...prev, err: { ...prev.err, note } });
}
