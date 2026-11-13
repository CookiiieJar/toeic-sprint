import { useSessions, run } from '../lib/hooks';
import { startExam, startMiniExam } from '../lib/start';
import { navigate } from '../lib/router';
import { formatDayFr, dayKey, formatDuration } from '../lib/dates';
import { estimateFromRates } from '../lib/scoring';
import { Button, Card, Header, Notice, Page, Pct, SectionTitle } from '../components/ui';
import { LineChart } from '../components/Charts';

export function Exams() {
  const sessions = useSessions();
  const exams = sessions.filter((s) => s.type === 'exam' || s.type === 'diagnostic');
  const done = exams.filter((s) => s.status === 'done').reverse();
  const exam1Done = done.some((s) => s.type === 'exam' && s.examKind !== 'mini');
  const series = [...done].reverse().map((s) => ({
    label: formatDayFr(dayKey(s.finishedAt!), false),
    l: s.summary?.listening?.total ? s.summary.listening.correct / s.summary.listening.total : null,
    r: s.summary?.reading?.total ? s.summary.reading.correct / s.summary.reading.total : null,
  }));
  const confirmRetake = (fn: () => Promise<void>) => () => {
    if (exam1Done && !confirm("Tu as déjà passé cet examen blanc : le refaire surestimera ton niveau (questions déjà vues). Continuer ?")) return;
    run(fn);
  };
  return (
    <>
      <Header title="Examens blancs" />
      <Page>
        <Card>
          <h2 className="m-0 text-lg font-bold">Examen complet — 200 questions</h2>
          <p className="mt-1 text-sm text-muted">Listening 100 q. (~45 min, rythme imposé par l'audio, lecture unique) puis Reading 100 q. en 75 min chronométrées, avec grille et questions marquées.</p>
          <Button block className="mt-3" onClick={confirmRetake(() => startExam('full'))}>Commencer l'examen complet (2 h)</Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="soft" onClick={confirmRetake(() => startExam('listening'))}>Listening seul</Button>
            <Button variant="soft" onClick={confirmRetake(() => startExam('reading'))}>Reading seul (75 min)</Button>
          </div>
          <p className="mt-2 text-xs text-muted">Les sections seules utilisent les mêmes questions que l'examen complet. Prévois l'examen complet un jour calme (planning : J-7).</p>
        </Card>

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
