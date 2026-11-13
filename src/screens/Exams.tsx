import { useSessions, run } from '../lib/hooks';
import { startExam, startMiniExam } from '../lib/start';
import { examPools } from '../lib/bankCore';
import { getBank } from '../lib/bank';
import type { ExamPool } from '../lib/types';
import { navigate } from '../lib/router';
import { formatDayFr, dayKey, formatDuration } from '../lib/dates';
import { estimateFromRates } from '../lib/scoring';
import { Button, Card, Header, Notice, Page, Pct, SectionTitle } from '../components/ui';
import { LineChart } from '../components/Charts';

export function Exams() {
  const sessions = useSessions();
  const exams = sessions.filter((s) => s.type === 'exam' || s.type === 'diagnostic');
  const done = exams.filter((s) => s.status === 'done').reverse();
  const pools = examPools(getBank());
  const examSessions = (ep: string) => exams.filter((s) => s.type === 'exam' && s.examKind !== 'mini' && ((s.meta?.bank as string) ?? 'exam1') === ep);
  const series = [...done].reverse().map((s) => ({
    label: formatDayFr(dayKey(s.finishedAt!), false),
    l: s.summary?.listening?.total ? s.summary.listening.correct / s.summary.listening.total : null,
    r: s.summary?.reading?.total ? s.summary.reading.correct / s.summary.reading.total : null,
  }));
  const launch = (ep: ExamPool, kind: 'full' | 'listening' | 'reading') => () => {
    const already = examSessions(ep).some((s) => s.status === 'done' && (s.examKind === 'full' || s.examKind === kind));
    if (already && !confirm('Tu as déjà passé cet examen blanc : le refaire surestimera ton niveau (questions déjà vues). Continuer ?')) return;
    run(() => startExam(kind, ep));
  };
  const next = pools.find((ep) => !examSessions(ep).length);
  return (
    <>
      <Header title="Examens blancs" />
      <Page>
        <p className="mt-0 text-sm text-muted">{pools.length} examens blancs complets de 200 questions, tous différents et jamais proposés en entraînement tant que tu ne les as pas passés. Listening (~45 min, une seule écoute) puis Reading en 75 min chronométrées.</p>
        <div className="space-y-3">
          {pools.map((ep) => {
            const ss = examSessions(ep);
            const fin = ss.filter((s) => s.status === 'done');
            const full = fin.find((s) => s.examKind === 'full');
            const inProgress = ss.find((s) => s.status === 'active' || s.status === 'paused');
            const sum = full?.summary;
            const est = sum ? estimateFromRates(sum.listening!.correct / Math.max(1, sum.listening!.total), sum.reading!.correct / Math.max(1, sum.reading!.total), 'full-exam') : null;
            return (
              <Card key={ep} className={ep === next ? '!border-primary' : ''}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="m-0 text-base font-bold">Examen blanc n°{ep.slice(4)}</h2>
                    <p className="m-0 text-xs text-muted">
                      {full ? `Passé le ${formatDayFr(dayKey(full.finishedAt!), false)} · ${sum!.correct}/200${est ? ` · estimation indicative ${est.total.low}–${est.total.high}` : ''}` : fin.length ? `Section(s) passée(s) : ${fin.map((s) => (s.examKind === 'listening' ? 'Listening' : 'Reading')).join(', ')}` : inProgress ? 'En cours — reprends-le depuis l\'accueil' : 'Jamais commencé'}
                    </p>
                  </div>
                  {ep === next && <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">Suivant</span>}
                </div>
                {inProgress ? (
                  <Button block className="mt-3" onClick={() => navigate(`/session?id=${inProgress.id}`)}>Reprendre</Button>
                ) : (
                  <>
                    <Button block className="mt-3" variant={full ? 'ghost' : 'primary'} onClick={launch(ep, 'full')}>{full ? 'Repasser (déconseillé)' : 'Examen complet (2 h)'}</Button>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button size="sm" variant="soft" onClick={launch(ep, 'listening')}>Listening seul</Button>
                      <Button size="sm" variant="soft" onClick={launch(ep, 'reading')}>Reading seul</Button>
                    </div>
                  </>
                )}
                {full && <Button size="sm" variant="ghost" className="mt-2" onClick={() => navigate(`/summary?id=${full.id}`)}>Voir la correction</Button>}
              </Card>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">Conseil : passe-les dans l'ordre, en conditions réelles (2 h d'affilée), en espaçant de 2 à 3 jours pour analyser tes erreurs entre deux.</p>

        <SectionTitle>Mini-examens</SectionTitle>
        <Card>
          <p className="mt-0 text-sm text-muted">Questions de la réserve d'entraînement, réparties selon la structure officielle, en conditions d'examen.</p>
          <div className="grid grid-cols-3 gap-2">
            {[20, 30, 50].map((n) => <Button key={n} variant="soft" onClick={() => run(() => startMiniExam(n))}>{n} q.</Button>)}
          </div>
        </Card>

        <SectionTitle>Progression aux examens</SectionTitle>
        <Card>{series.length ? <LineChart data={series} /> : <p className="m-0 text-sm text-muted">Aucun examen terminé pour l'instant.</p>}</Card>

        <SectionTitle>Historique</SectionTitle>
        {!done.length && <p className="text-sm text-muted">Tes examens terminés apparaîtront ici.</p>}
        <div className="space-y-2">
          {done.map((s) => {
            const sum = s.summary!;
            const l = sum.listening?.total ? sum.listening.correct / sum.listening.total : 0;
            const r = sum.reading?.total ? sum.reading.correct / sum.reading.total : 0;
            const est = s.type === 'exam' && s.examKind === 'full' ? estimateFromRates(l, r, 'full-exam') : null;
            return (
              <Card key={s.id} as="button" onClick={() => navigate(`/summary?id=${s.id}`)} className="!p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="m-0 truncate font-semibold">{s.title}</p>
                    <p className="m-0 text-xs text-muted">{formatDayFr(dayKey(s.finishedAt!))} · {formatDuration(s.elapsedSec)}{est ? ` · estimation indicative ${est.total.low}–${est.total.high}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="m-0 font-bold tabular-nums">{sum.correct}/{sum.total}</p>
                    <p className="m-0 text-xs text-muted"><Pct v={sum.total ? sum.correct / sum.total : 0} /></p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <Notice className="mt-4">Le score affiché est un nombre de bonnes réponses. Toute estimation sur 990 est indicative : le TOEIC officiel utilise un score échelonné propre à chaque session.</Notice>
      </Page>
    </>
  );
}
