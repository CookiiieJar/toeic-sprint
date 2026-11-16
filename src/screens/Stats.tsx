import { useMemo } from 'react';
import { useAttempts, useLogs, useProfile, useSessions, useStates } from '../lib/hooks';
import { accOf, avgTimeByPart, bestStreak, byCategory, byPart, dailySeries, masteredCount, recent, sections, solidQuestions, streak } from '../lib/stats';
import { computeMastery, firstExposures, priorities, readingPace, targetsFor } from '../lib/mastery';
import { ALL_PARTS, DEFAULT_TARGET_SEC, PART_FR, catLabel } from '../lib/labels';
import { addDays, dayKey, daysRange, formatDayFr, formatDuration } from '../lib/dates';
import { estimateFromRates, METHOD_TEXT, requiredRates } from '../lib/scoring';
import { computeBadges } from '../lib/badges';
import { getBank } from '../lib/bank';
import { Card, Header, Notice, Page, Pct, SectionTitle, Stat, cx } from '../components/ui';
import { BarRows, LineChart, StudyCalendar } from '../components/Charts';

export function Stats() {
  const attempts = useAttempts();
  const logs = useLogs();
  const states = useStates();
  const sessions = useSessions();
  const profile = useProfile();
  const d = useMemo(() => {
    const sec = sections(attempts);
    const parts = byPart(attempts);
    const cats = [...byCategory(attempts).entries()].map(([c, a]) => ({ c, wrong: a.total - a.correct, ...a })).filter((x) => x.wrong > 0).sort((a, b) => b.wrong - a.wrong);
    const totalWrong = cats.reduce((s, c) => s + c.wrong, 0);
    const times = avgTimeByPart(attempts);
    const sorted = [...attempts].sort((a, b) => a.at - b.at);
    const n = Math.min(60, Math.floor(sorted.length / 2));
    const first = sections(sorted.slice(0, n));
    const last = sections(sorted.slice(-n));
    const r300 = sections(recent(firstExposures(attempts), 300));
    const est = r300.listening.total >= 40 && r300.reading.total >= 40 ? estimateFromRates(r300.listening.rate, r300.reading.rate, 'practice') : null;
    const series = dailySeries(attempts).map((x) => ({ label: formatDayFr(x.day, false), l: x.listening, r: x.reading }));
    const mastery = computeMastery(getBank(), attempts, { target: profile ? targetsFor(profile.targetMin) : undefined });
    const pot = priorities(mastery, 8);
    const pace = readingPace(getBank(), attempts);
    const exams = sessions.filter((s) => s.status === 'done' && (s.type === 'exam' || s.type === 'diagnostic'));
    return { sec, parts, cats, totalWrong, times, first, last, n, est, series, pot, exams, mastery, pace };
  }, [attempts, sessions, profile]);
  if (!profile) return null;
  const totalSec = logs.reduce((s, l) => s + l.seconds, 0);
  const minutes = new Map(logs.map((l) => [l.day, l.seconds / 60]));
  const calStart = addDays(profile.examDate, -17);
  const today = dayKey();
  const badges = computeBadges({ attempts, sessions, logs, states });
  const mc = masteredCount(states);
  const req = requiredRates(profile.targetMin);

  return (
    <>
      <Header title="Statistiques" subtitle="Calculées uniquement à partir de tes réponses" />
      <Page>
        {!attempts.length && <Notice>Aucune donnée pour l'instant. Termine une première session : toutes les statistiques se calculent à partir de tes vraies réponses.</Notice>}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Précision Listening" value={<Pct v={d.sec.listening.total ? d.sec.listening.rate : null} />} sub={`${d.sec.listening.total} réponses · repère ${Math.round(req.listening * 100)} %`} />
          <Stat label="Précision Reading" value={<Pct v={d.sec.reading.total ? d.sec.reading.rate : null} />} sub={`${d.sec.reading.total} réponses · repère ${Math.round(req.reading * 100)} %`} />
          <Stat label="Temps de révision cumulé" value={formatDuration(totalSec)} />
          <Stat label="Questions traitées" value={attempts.length} sub={`${accOf(attempts).correct} réussies`} />
          <Stat label="Questions maîtrisées" value={solidQuestions(states)} sub={`${mc.mastered} erreurs maîtrisées durablement`} />
          <Stat label="Série" value={`${streak(logs)} j`} sub={`record : ${bestStreak(logs)} j`} />
        </div>

        {d.est && (
          <Card className="mt-3">
            <h3 className="m-0 text-sm font-bold">Estimation indicative (non officielle)</h3>
            <p className="my-1 text-2xl font-extrabold tabular-nums">{d.est.total.low} – {d.est.total.high}</p>
            <p className="m-0 text-xs text-muted">D'après tes 300 dernières questions vues pour la première fois (Listening {d.est.listening.low}–{d.est.listening.high}, Reading {d.est.reading.low}–{d.est.reading.high}).</p>
            <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer font-semibold">Méthode et limites</summary><p className="mt-1">{METHOD_TEXT}</p></details>
          </Card>
        )}

        <SectionTitle>Plus fort potentiel d'amélioration</SectionTitle>
        <Card>
          {d.pot.length ? (
            <ul className="space-y-2 text-sm">
              {d.pot.map((w) => (
                <li key={w.key} className="flex items-center justify-between gap-2">
                  <span><b>{w.label}</b><span className="block text-xs text-muted">maîtrise estimée {Math.round(w.mastery * 100)} % · {w.correct}/{w.attempts} réussies · ≈ {w.examWeight.toFixed(1)} q./examen</span></span>
                  <span className="shrink-0 rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">≈ +{w.potential.toFixed(1)} q.</span>
                </li>
              ))}
            </ul>
          ) : <p className="m-0 text-sm text-muted">Pas encore assez de données (3 réponses minimum par compétence).</p>}
          <p className="mb-0 mt-2 text-xs text-muted">Potentiel = écart à ta cible ({Math.round(d.mastery.target.listening * 100)} % Listening, {Math.round(d.mastery.target.reading * 100)} % Reading) × nombre de questions de ce type dans un examen. La maîtrise estimée tient compte de la difficulté des questions, pèse davantage les réponses récentes et compte peu les questions refaites. C'est un modèle indicatif, non calibré.</p>
        </Card>

        <SectionTitle>Maîtrise estimée par partie</SectionTitle>
        <Card>
          <BarRows rows={ALL_PARTS.map((p) => ({ label: `Part ${p} · ${PART_FR[p]}`, value: d.mastery.parts[p].n >= 3 ? d.mastery.parts[p].mastery : null, detail: d.mastery.parts[p].n >= 3 ? '' : 'trop peu de données' }))} target={0.85} />
          <p className="mb-0 mt-2 text-xs text-muted">Réussite attendue sur des questions de difficulté d'examen. Projection par section : Listening ≈ {Math.round(d.mastery.expected.listening * 100)} %, Reading ≈ {Math.round(d.mastery.expected.reading * 100)} % (indicatif).</p>
        </Card>

        <SectionTitle>Rythme en Reading</SectionTitle>
        <Card>
          {d.pace.projectedMin !== null ? (
            <p className={cx('m-0 text-sm', d.pace.projectedMin > 75 && 'font-semibold text-bad')}>À ta vitesse actuelle, les 100 questions du Reading prendraient ≈ <b>{Math.round(d.pace.projectedMin)} min</b> (limite : 75 min).</p>
          ) : <p className="m-0 text-sm text-muted">Projection disponible après au moins 8 questions nouvelles dans chacune des Parts 5, 6 et 7.</p>}
          <p className="mb-0 mt-2 text-xs text-muted">Calculé sur tes premières tentatives récentes (temps plafonné quand le téléphone est resté posé). En entraînement avec correction immédiate, le temps peut être plus long qu'en examen.</p>
        </Card>

        <SectionTitle>Historique des performances</SectionTitle>
        <Card>{d.series.length ? <LineChart data={d.series} target={{ l: req.listening, r: req.reading }} /> : <p className="m-0 text-sm text-muted">—</p>}</Card>

        <SectionTitle>Réussite par partie</SectionTitle>
        <Card>
          <BarRows rows={ALL_PARTS.map((p) => ({ label: `Part ${p} · ${PART_FR[p]}`, value: d.parts[p].total ? d.parts[p].rate : null, detail: d.parts[p].total ? `${d.parts[p].correct}/${d.parts[p].total}` : '' }))} target={0.8} />
        </Card>

        <SectionTitle>Répartition des erreurs par catégorie</SectionTitle>
        <Card>
          {d.cats.length ? <BarRows rows={d.cats.slice(0, 10).map((c) => ({ label: catLabel(c.c), value: c.wrong / d.totalWrong, detail: `${c.wrong} err.` }))} /> : <p className="m-0 text-sm text-muted">Aucune erreur enregistrée.</p>}
          {d.cats.length > 0 && <p className="mb-0 mt-2 text-xs text-muted">Part de chaque catégorie dans l'ensemble de tes erreurs.</p>}
        </Card>

        <SectionTitle>Temps moyen par question</SectionTitle>
        <Card>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="pb-1">Partie</th><th className="pb-1 text-right">Moyenne</th><th className="pb-1 text-right">Cible</th></tr></thead>
            <tbody>
              {ALL_PARTS.map((p) => (
                <tr key={p} className="border-t border-line">
                  <td className="py-1.5">Part {p}</td>
                  <td className={cx('py-1.5 text-right tabular-nums', p >= 5 && d.times[p] > DEFAULT_TARGET_SEC[p] * 1.25 && 'font-semibold text-bad')}>{d.times[p] ? `${Math.round(d.times[p])} s` : '—'}</td>
                  <td className="py-1.5 text-right text-muted">{DEFAULT_TARGET_SEC[p]} s</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mb-0 mt-2 text-xs text-muted">En Listening, le temps inclut l'écoute. En Reading, viser la cible permet de finir les 100 questions en 75 min.</p>
        </Card>

        {d.n >= 20 && (
          <>
            <SectionTitle>Premières vs dernières performances</SectionTitle>
            <Card>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted"><th></th><th className="text-right">{d.n} premières</th><th className="text-right">{d.n} dernières</th></tr></thead>
                <tbody>
                  <tr className="border-t border-line"><td className="py-1.5">Listening</td><td className="text-right"><Pct v={d.first.listening.total ? d.first.listening.rate : null} /></td><td className="text-right font-semibold"><Pct v={d.last.listening.total ? d.last.listening.rate : null} /></td></tr>
                  <tr className="border-t border-line"><td className="py-1.5">Reading</td><td className="text-right"><Pct v={d.first.reading.total ? d.first.reading.rate : null} /></td><td className="text-right font-semibold"><Pct v={d.last.reading.total ? d.last.reading.rate : null} /></td></tr>
                </tbody>
              </table>
              <p className="mb-0 mt-2 text-xs text-muted">Attention : la difficulté des questions s'adapte à ton niveau, la comparaison est donc prudente.</p>
            </Card>
          </>
        )}

        <SectionTitle>Examens blancs et diagnostic</SectionTitle>
        <Card>
          {d.exams.length ? (
            <ul className="space-y-1.5 text-sm">
              {d.exams.map((s) => <li key={s.id} className="flex justify-between"><span className="truncate">{formatDayFr(dayKey(s.finishedAt!), false)} · {s.title}</span><b className="tabular-nums">{s.summary!.correct}/{s.summary!.total}</b></li>)}
            </ul>
          ) : <p className="m-0 text-sm text-muted">Aucun examen terminé.</p>}
        </Card>

        <SectionTitle>Calendrier des jours étudiés</SectionTitle>
        <Card><StudyCalendar days={daysRange(calStart, profile.examDate)} minutes={minutes} today={today} /></Card>

        <SectionTitle>Badges</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {badges.map((b) => (
            <div key={b.id} className={cx('rounded-xl border p-3', b.earned ? 'border-primary bg-primary-soft' : 'border-line bg-surface opacity-70')}>
              <div className="text-2xl" aria-hidden>{b.icon}</div>
              <div className="text-sm font-bold">{b.title}{b.earned && ' ✓'}</div>
              <div className="text-xs text-muted">{b.desc}{!b.earned && b.progress ? ` · ${b.progress}` : ''}</div>
            </div>
          ))}
        </div>
      </Page>
    </>
  );
}
