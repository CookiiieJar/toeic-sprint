import { examPools } from '../lib/bankCore';
import { useMemo, useState } from 'react';
import { useAttempts, useLogs, useProfile, useSessions, useStates, run } from '../lib/hooks';
import { accOf, dailySeries, masteredCount, recent, sections, streak, weaknesses } from '../lib/stats';
import { buildPlan, todayPlan, type PlanTask } from '../lib/plan';
import { dayKey, diffDays, formatDayFr, formatDuration } from '../lib/dates';
import { getBank } from '../lib/bank';
import { estimateFromRates, requiredRates } from '../lib/scoring';
import { encouragement } from '../lib/badges';
import { navigate } from '../lib/router';
import { nextExamPool, startDaily, startDiagnostic, startErrors, startExam, startIntensive, startMiniExam } from '../lib/start';
import type { Part, Session } from '../lib/types';
import { Button, Card, Icon, Notice, Page, Pct, Progress, SectionTitle, Sheet, Stat, cx } from '../components/ui';
import { LineChart } from '../components/Charts';

export const DURATIONS = [
  { m: 5, label: 'Révision éclair' },
  { m: 10, label: 'Révision rapide' },
  { m: 20, label: 'Routine quotidienne' },
  { m: 30, label: 'Entraînement court' },
  { m: 45, label: 'Séance ciblée' },
];

export function weakPartsOf(attempts: Parameters<typeof weaknesses>[0]): Part[] {
  return weaknesses(attempts, getBank(), 10).filter((w) => w.kind === 'part').slice(0, 2).map((w) => Number(w.key.split(':')[1]) as Part);
}

export async function launchTask(t: PlanTask) {
  switch (t.kind) {
    case 'diagnostic': return startDiagnostic();
    case 'daily': return startDaily(t.minutes, t.parts);
    case 'intensive':
      return startIntensive({ minutes: t.minutes, scope: t.scope === 'listening' || t.scope === 'reading' ? t.scope : 'mixed', parts: t.parts ?? [], hard: !!t.hard, feedback: !t.timed, timer: true, breaks: t.minutes >= 60 });
    case 'errors': return startErrors('due').catch(() => startErrors('all'));
    case 'flashcards': return navigate('/flashcards');
    case 'grammar': return navigate('/grammar');
    case 'exam-full': return startExam('full', await nextExamPool());
    case 'mini-exam': return startMiniExam(t.size ?? 30);
    case 'checklist': return navigate('/exam-day');
  }
}

export function Home() {
  const profile = useProfile();
  const attempts = useAttempts();
  const states = useStates();
  const sessions = useSessions();
  const logs = useLogs();
  const [pick, setPick] = useState(false);
  const today = dayKey();

  const data = useMemo(() => {
    const bank = getBank();
    const weak = weaknesses(attempts, bank, 3);
    const wp = weakPartsOf(attempts);
    const plan = profile ? buildPlan({ profile, sessions, logs, weakParts: wp, examCount: examPools(bank).length }) : [];
    const tp = todayPlan(plan, today);
    const todayLog = logs.find((l) => l.day === today);
    const rec = accOf(recent(attempts, 50));
    const last = recent(attempts, 300);
    const sec = sections(last);
    const est = sec.listening.total >= 40 && sec.reading.total >= 40 ? estimateFromRates(sec.listening.rate, sec.reading.rate, 'practice') : null;
    const series = dailySeries(attempts).slice(-10).map((d) => ({ label: formatDayFr(d.day, false), l: d.listening, r: d.reading }));
    return { weak, plan, tp, todayLog, rec, est, series, sec, err: masteredCount(states) };
  }, [attempts, states, sessions, logs, profile, today]);

  if (!profile) return null;
  const j = diffDays(today, profile.examDate);
  const resume = [...sessions].reverse().find((s: Session) => s.status === 'active' || s.status === 'paused');
  const req = requiredRates(profile.targetMin);
  const tasks = data.tp?.tasks ?? [];
  const doneTasks = tasks.filter((t) => t.done).length;
  const nextTask = tasks.find((t) => !t.done && t.kind !== 'checklist');
  const suggested = nextTask?.kind === 'daily' ? nextTask.minutes : 20;

  return (
    <Page>
      <div className="safe-top flex items-center justify-between pt-2">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-wider text-muted">{formatDayFr(today)}</p>
          <h1 className="m-0 text-2xl font-extrabold">TOEIC Sprint</h1>
        </div>
        <button onClick={() => navigate('/settings')} aria-label="Réglages" className="grid h-11 w-11 place-items-center rounded-full bg-surface">
          <Icon name="settings" />
        </button>
      </div>

      {/* Compte à rebours */}
      <Card className="mt-4 overflow-hidden !bg-primary !text-primary-ink !border-0">
        <div className="flex items-end justify-between">
          <div>
            <p className="m-0 text-sm opacity-90">{j > 0 ? 'Examen TOEIC dans' : j === 0 ? "C'est aujourd'hui !" : 'Examen passé'}</p>
            <p className="m-0 text-5xl font-black tabular-nums">{j > 0 ? `J-${j}` : j === 0 ? 'Jour J' : '—'}</p>
            <p className="m-0 text-sm opacity-90">{formatDayFr(profile.examDate)} 2026</p>
          </div>
          <div className="text-right text-sm">
            <p className="m-0 opacity-90">Série</p>
            <p className="m-0 text-3xl font-black">🔥 {streak(logs)}</p>
            <p className="m-0 opacity-90">jour(s)</p>
          </div>
        </div>
        {j === 0 && <Button variant="soft" className="mt-3" block onClick={() => navigate('/exam-day')}>Ma checklist du jour J</Button>}
      </Card>

      {resume && (
        <Card className="mt-3 flex items-center gap-3 !border-primary">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-xs font-semibold text-primary">Session interrompue</p>
            <p className="m-0 truncate font-semibold">{resume.title}</p>
            <p className="m-0 text-xs text-muted">{Object.keys(resume.answers).length} réponses · {formatDuration(resume.elapsedSec)}</p>
          </div>
          <Button size="sm" onClick={() => navigate(`/session?id=${resume.id}`)}>Reprendre</Button>
        </Card>
      )}

      {!profile.diagnosticSessionId && (
        <Notice className="mt-3">
          <b>Commence par le diagnostic</b> (50 questions, ~40 min) : il identifie tes points faibles et adapte ton planning.
          <Button size="sm" className="mt-2" onClick={() => run(startDiagnostic)}>Lancer le diagnostic</Button>
        </Notice>
      )}

      {/* Actions principales */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button size="lg" onClick={() => setPick(true)}>Commencer ma révision</Button>
        <Button size="lg" variant="soft" onClick={() => navigate('/intensive')}><Icon name="bolt" size={18} /> Session intensive</Button>
      </div>

      {/* Score */}
      <SectionTitle>Objectif score</SectionTitle>
      <Card>
        <ScoreScale base={profile.baseScore} min={profile.targetMin} ideal={profile.targetIdeal} est={data.est?.total} />
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-2 p-2"><div className="text-[11px] text-muted">Score officiel de référence</div><div className="text-lg font-bold">{profile.baseScore}</div></div>
          <div className="rounded-xl bg-surface-2 p-2"><div className="text-[11px] text-muted">Objectif minimum</div><div className="text-lg font-bold">{profile.targetMin}</div></div>
          <div className="rounded-xl bg-surface-2 p-2"><div className="text-[11px] text-muted">Objectif idéal</div><div className="text-lg font-bold">{profile.targetIdeal}+</div></div>
        </div>
        <p className="mt-3 text-xs text-muted">
          {data.est
            ? <>Estimation <b>indicative et non officielle</b> d'après tes 300 dernières réponses d'entraînement : <b>{data.est.total.low}–{data.est.total.high}</b>. Elle ne prédit pas ton score réel.</>
            : <>Pas encore d'estimation : il faut au moins 40 réponses en Listening et 40 en Reading.</>}
          {' '}Repère pour {profile.targetMin} : ≈ {Math.round(req.listening * 100)} % en Listening et {Math.round(req.reading * 100)} % en Reading en conditions d'examen.
        </p>
      </Card>

      {/* Aujourd'hui */}
      <SectionTitle>Aujourd'hui</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Questions traitées" value={data.todayLog?.questions ?? 0} sub={<Progress value={(data.todayLog?.questions ?? 0) / profile.dailyGoalQuestions} className="mt-1.5" label="Objectif de questions du jour" />} />
        <Stat label="Temps de révision" value={formatDuration(data.todayLog?.seconds ?? 0)} sub={`objectif ${data.tp?.budget ?? profile.dailyMinutes} min`} />
        <Stat label="Score moyen récent" value={<Pct v={data.rec.total ? data.rec.rate : null} />} sub={`${data.rec.total} dernières réponses`} />
        <Stat label="Erreurs à revoir" value={data.err.due} sub={`${data.err.mastered} maîtrisée(s) / ${data.err.errors}`} />
      </div>
      <p className="mt-2 text-sm">{encouragement(data.rec.total ? data.rec.rate : null, data.rec.total)}</p>
      {data.err.due > 0 && <Button block variant="soft" className="mt-2" onClick={() => run(() => startErrors('due'))}>Revoir mes {data.err.due} erreurs du jour</Button>}

      {/* Programme du jour */}
      <SectionTitle action={<button className="text-sm font-semibold text-primary" onClick={() => navigate('/plan')}>Tout le planning</button>}>
        Programme du jour {tasks.length > 0 && <span className="text-sm font-normal text-muted">({doneTasks}/{tasks.length})</span>}
      </SectionTitle>
      {data.tp ? (
        <Card className="space-y-1">
          <p className="m-0 text-xs font-semibold text-primary">{data.tp.phase}</p>
          <p className="m-0 mb-2 text-sm text-muted">{data.tp.focus}</p>
          {data.tp.note && <Notice tone="warn" className="mb-2">{data.tp.note}</Notice>}
          {tasks.map((t) => <TaskRow key={t.id} t={t} />)}
        </Card>
      ) : (
        <Card><p className="m-0 text-sm text-muted">Le planning couvre la période des 17 jours avant l'examen ({formatDayFr(profile.examDate)}). Utilise les sessions libres en attendant.</p></Card>
      )}

      {/* Faiblesses */}
      <SectionTitle>Mes 3 principales faiblesses</SectionTitle>
      <Card>
        {data.weak.length ? (
          <ol className="space-y-2">
            {data.weak.map((w, i) => (
              <li key={w.key} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-bad-soft text-sm font-bold text-bad">{i + 1}</span>
                <span className="min-w-0 flex-1 text-sm"><b>{w.label}</b><span className="block text-xs text-muted">{Math.round(w.rate * 100)} % de réussite sur {w.total} questions</span></span>
                {w.kind === 'part' && <Button size="sm" variant="soft" onClick={() => run(() => startDaily(15, [Number(w.key.split(':')[1]) as Part]))}>Travailler</Button>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 text-sm text-muted">Pas encore assez de données. Le diagnostic et tes premières sessions vont les révéler automatiquement.</p>
        )}
      </Card>

      {/* Évolution */}
      <SectionTitle action={<button className="text-sm font-semibold text-primary" onClick={() => navigate('/stats')}>Statistiques</button>}>Évolution Listening / Reading</SectionTitle>
      <Card>
        {data.series.length >= 1 ? <LineChart data={data.series} target={{ l: req.listening, r: req.reading }} /> : <p className="m-0 text-sm text-muted">La courbe apparaîtra après ta première session.</p>}
        {data.series.length >= 1 && <p className="mt-2 text-xs text-muted">Précision quotidienne à l'entraînement. Pointillés : repères pour {profile.targetMin}.</p>}
      </Card>

      <Sheet open={pick} onClose={() => setPick(false)} title="Révision du jour">
        <p className="mb-3 text-sm text-muted">Sélection adaptative : erreurs dues, parties faibles, questions jamais vues, difficulté ajustée.</p>
        <div className="grid gap-2">
          {DURATIONS.map((d) => (
            <button key={d.m} onClick={() => { setPick(false); run(() => startDaily(d.m)); }} className={cx('flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left', d.m === suggested ? 'border-primary bg-primary-soft' : 'border-line')}>
              <span><b>{d.m} min</b> <span className="text-sm text-muted">· {d.label}</span></span>
              {d.m === suggested && <span className="text-xs font-semibold text-primary">Recommandé</span>}
            </button>
          ))}
        </div>
      </Sheet>
    </Page>
  );
}

export function TaskRow({ t, disabled }: { t: PlanTask; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs', t.done ? 'border-ok bg-ok text-white' : 'border-line')} aria-label={t.done ? 'Fait' : 'À faire'}>{t.done ? '✓' : ''}</span>
      <span className={cx('min-w-0 flex-1 text-sm', t.done && 'text-muted line-through')}>
        {t.label}
        <span className="block text-xs text-muted no-underline">{t.kind === 'checklist' ? '' : `${t.minutes} min`}{t.parts?.length ? ` · Parts ${t.parts.join(', ')}` : ''}</span>
      </span>
      {!t.done && !disabled && <Button size="sm" variant="soft" onClick={() => run(() => launchTask(t))}>Lancer</Button>}
    </div>
  );
}

function ScoreScale({ base, min, ideal, est }: { base: number; min: number; ideal: number; est?: { low: number; high: number } }) {
  const lo = 550, hi = 990;
  const pos = (v: number) => `${((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="pt-6 pb-5">
      <div className="relative h-3 rounded-full bg-surface-2">
        <div className="absolute inset-y-0 rounded-full bg-primary-soft" style={{ left: pos(base), right: `calc(100% - ${pos(ideal)})` }} />
        {est && (
          <div className="absolute -inset-y-1 rounded-full border-2 border-dashed border-primary" style={{ left: pos(est.low), width: `calc(${pos(est.high)} - ${pos(est.low)})`, background: 'repeating-linear-gradient(135deg, color-mix(in srgb, var(--primary) 25%, transparent) 0 4px, transparent 4px 8px)' }} title="Estimation indicative" />
        )}
        {[{ v: base, l: 'Réf.' }, { v: min, l: String(min) }, { v: ideal, l: String(ideal) }].map((m) => (
          <div key={m.l} className="absolute -top-6 -translate-x-1/2 text-[11px] font-semibold text-muted" style={{ left: pos(m.v) }}>
            {m.l}
            <div className="mx-auto mt-0.5 h-[34px] w-0.5 bg-ink/50" />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted"><span>{lo}</span><span>{hi}</span></div>
      {est && <p className="m-0 mt-1 text-[11px] text-muted">▨ zone hachurée = estimation indicative (non officielle)</p>}
    </div>
  );
}
