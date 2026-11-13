import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { getBank } from '../lib/bank';
import { targetSec } from '../lib/bankCore';
import { ALL_PARTS, PART_FR, catLabel, isListening } from '../lib/labels';
import { formatDuration } from '../lib/dates';
import { estimateFromRates, METHOD_TEXT, requiredRates } from '../lib/scoring';
import { encouragement } from '../lib/badges';
import { getProfile, saveProfile } from '../lib/sessions';
import { startQuestions } from '../lib/start';
import { navigate } from '../lib/router';
import type { Part, Session } from '../lib/types';
import { Button, Card, Header, Notice, Page, Pct, Ring, SectionTitle, Stat } from '../components/ui';
import { BarRows } from '../components/Charts';
import { Correction } from '../components/QuestionView';
import { SceneView } from '../components/Scene';
import { DocView } from '../components/DocView';

export function Summary({ id }: { id: string }) {
  const s = useLiveQuery(() => db.sessions.get(id), [id]);
  const profile = useLiveQuery(() => getProfile(), []);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'wrong' | 'all'>('wrong');
  const bank = getBank();

  useEffect(() => {
    if (s?.type === 'diagnostic' && s.status === 'done') {
      getProfile().then((p) => {
        if (!p.diagnosticSessionId) saveProfile({ diagnosticSessionId: s.id });
      });
    }
  }, [s]);

  const analysis = useMemo(() => (s ? analyze(s) : null), [s]);
  if (!s) return <Page>Chargement…</Page>;
  if (!s.summary || !analysis) return <Page><Notice tone="warn">Cette session n'est pas terminée.</Notice><Button className="mt-3" onClick={() => navigate(`/session?id=${s.id}`)}>Reprendre</Button></Page>;
  const sum = s.summary;
  const rate = sum.total ? sum.correct / sum.total : 0;
  const isExam = s.type === 'exam' || s.type === 'diagnostic';
  const fullSections = s.type === 'exam' && s.examKind !== 'mini';
  const lr = sum.listening && sum.listening.total ? sum.listening.correct / sum.listening.total : null;
  const rr = sum.reading && sum.reading.total ? sum.reading.correct / sum.reading.total : null;
  const est = fullSections ? estimateFromRates(lr ?? 0, rr ?? 0, 'full-exam') : null;
  const req = requiredRates(profile?.targetMin ?? 800);
  const reviewIds = filter === 'wrong' ? sum.wrongIds : s.units.flatMap((u) => u.qids).filter((qid) => bank.questions.has(qid));

  return (
    <>
      <Header title={s.type === 'diagnostic' ? 'Résultats du diagnostic' : 'Bilan de session'} subtitle={s.title} onBack={() => navigate('/')} />
      <Page>
        <Card className="flex items-center gap-4">
          <Ring value={rate} size={92} stroke={9} color={rate >= 0.8 ? 'var(--ok)' : rate >= 0.6 ? 'var(--primary)' : 'var(--bad)'}>
            <div>
              <div className="text-xl font-extrabold tabular-nums"><Pct v={rate} /></div>
              <div className="text-[10px] text-muted">réussite</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-2xl font-bold tabular-nums">{sum.correct} / {sum.total}</p>
            <p className="m-0 text-sm text-muted">bonnes réponses{isExam && sum.total - sum.answered > 0 ? ` · ${sum.total - sum.answered} sans réponse` : ''}</p>
            <p className="mt-2 text-sm">{encouragement(rate, sum.total)}</p>
          </div>
        </Card>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Questions" value={sum.total} />
          <Stat label="Temps total" value={formatDuration(sum.timeSec)} />
          <Stat label="Temps / question" value={sum.total ? `${Math.round(sum.timeSec / sum.total)} s` : '—'} />
        </div>

        {(lr !== null || rr !== null) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Listening" value={<Pct v={lr} />} sub={sum.listening ? `${sum.listening.correct}/${sum.listening.total} · repère 800 ≈ ${Math.round(req.listening * 100)} %` : ''} />
            <Stat label="Reading" value={<Pct v={rr} />} sub={sum.reading ? `${sum.reading.correct}/${sum.reading.total} · repère 800 ≈ ${Math.round(req.reading * 100)} %` : ''} />
          </div>
        )}

        {est && (
          <Card className="mt-3">
            <h3 className="text-sm font-bold">Estimation indicative (non officielle)</h3>
            <p className="my-1 text-2xl font-extrabold tabular-nums">{est.total.low} – {est.total.high}</p>
            <p className="m-0 text-xs text-muted">{s.examKind === 'full' ? `Listening ${est.listening.low}–${est.listening.high} · Reading ${est.reading.low}–${est.reading.high}` : s.examKind === 'listening' ? `Section Listening seule : ${est.listening.low}–${est.listening.high}` : `Section Reading seule : ${est.reading.low}–${est.reading.high}`}</p>
            {s.examKind !== 'full' && <p className="m-0 mt-1 text-xs text-muted">Le total n'a de sens qu'avec les deux sections : seule la fourchette de la section passée est pertinente.</p>}
            <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer font-semibold">Méthode et limites</summary><p className="mt-1">{METHOD_TEXT}</p></details>
          </Card>
        )}

        <SectionTitle>Réussite par partie</SectionTitle>
        <Card>
          <BarRows rows={ALL_PARTS.filter((p) => sum.byPart[p]).map((p) => ({ label: `Part ${p} · ${PART_FR[p]}`, value: sum.byPart[p]!.correct / sum.byPart[p]!.total, detail: `${sum.byPart[p]!.correct}/${sum.byPart[p]!.total}` }))} target={0.8} />
          <p className="mt-3 text-xs text-muted">Trait vertical : repère de 80 % de réussite.</p>
        </Card>

        {s.type === 'diagnostic' && (
          <>
            <SectionTitle>Temps moyen par question</SectionTitle>
            <Card>
              <ul className="space-y-1.5 text-sm">
                {analysis.timing.map((t) => (
                  <li key={t.part} className="flex justify-between">
                    <span>Part {t.part} · {PART_FR[t.part]}</span>
                    <span className={t.avg > t.target * 1.25 && t.part >= 5 ? 'font-semibold text-bad' : 'text-muted'}>{Math.round(t.avg)} s <span className="text-xs">(cible {t.target} s)</span></span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">En Listening, le rythme est imposé par l'audio : seul le Reading mesure vraiment ta vitesse.</p>
            </Card>
            <SectionTitle>Priorités de révision</SectionTitle>
            <Card>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                {analysis.priorities.map((p) => <li key={p}>{p}</li>)}
              </ol>
              <Notice className="mt-3">Un diagnostic de 50 questions donne une tendance, pas un score TOEIC : il sert à cibler ton travail, et ton planning s'adapte à tes résultats.</Notice>
              <Button block className="mt-3" onClick={() => navigate('/plan')}>Voir mon planning adapté</Button>
            </Card>
          </>
        )}

        {analysis.weakCats.length > 0 && (
          <>
            <SectionTitle>Points faibles de cette session</SectionTitle>
            <Card>
              <BarRows rows={analysis.weakCats.map((c) => ({ label: catLabel(c.cat), value: c.rate, detail: `${c.correct}/${c.total}` }))} />
            </Card>
          </>
        )}

        {analysis.concepts.length > 0 && (
          <>
            <SectionTitle>Concepts à retravailler</SectionTitle>
            <Card>
              <ul className="space-y-2 text-sm">
                {analysis.concepts.slice(0, 8).map((c) => <li key={c} className="rounded-lg bg-surface-2 p-2">{c}</li>)}
              </ul>
            </Card>
          </>
        )}

        <div className="mt-5 grid gap-2">
          {sum.wrongIds.length > 0 && <Button block onClick={() => startQuestions(sum.wrongIds.slice(0, 60), 'Refaire les questions ratées')}>Refaire les {sum.wrongIds.length} questions ratées</Button>}
          <Button block variant="soft" onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </div>

        <SectionTitle action={
          <div className="flex gap-1 text-xs">
            <button className={`rounded-full px-2.5 py-1 ${filter === 'wrong' ? 'bg-primary text-primary-ink' : 'bg-surface-2'}`} onClick={() => setFilter('wrong')}>Erreurs</button>
            <button className={`rounded-full px-2.5 py-1 ${filter === 'all' ? 'bg-primary text-primary-ink' : 'bg-surface-2'}`} onClick={() => setFilter('all')}>Tout</button>
          </div>
        }>Correction détaillée</SectionTitle>
        {reviewIds.length === 0 && <p className="text-sm text-muted">Aucune erreur 🎉</p>}
        <ul className="space-y-2">
          {reviewIds.map((qid) => {
            const q = bank.questions.get(qid)!;
            const a = s.answers[qid];
            const ok = a?.choice === q.answer;
            const set = q.setId ? bank.sets.get(q.setId) : undefined;
            return (
              <li key={qid}>
                <Card as="button" onClick={() => setOpen(open === qid ? null : qid)} className="!p-3">
                  <div className="flex items-start gap-2 text-sm">
                    <span aria-hidden>{ok ? '✅' : a?.choice ? '❌' : '⏭️'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-muted">Part {q.part} · {catLabel(q.category)}</span>
                      <span className="block truncate">{q.prompt ?? (q.part === 1 ? 'Photo' : set?.title ?? '')}</span>
                    </span>
                  </div>
                </Card>
                {open === qid && (
                  <div className="mt-2 space-y-2">
                    {q.scene && <SceneView scene={q.scene} />}
                    {set?.audio && (
                      <Card className="!p-3 text-sm">
                        <h4 className="mb-1 text-xs font-bold uppercase text-muted">Transcription</h4>
                        {set.audio.map((l, i) => <p key={i} className="m-0"><b className="text-xs text-muted">{l.s}</b> {l.t}</p>)}
                      </Card>
                    )}
                    {set?.graphic && <DocView doc={set.graphic} />}
                    {set?.docs?.map((d, i) => <DocView key={i} doc={d} />)}
                    {q.part === 2 && <p className="m-0 text-sm font-semibold">« {q.prompt} »</p>}
                    <ul className="space-y-1 text-sm">
                      {q.options.map((o, i) => <li key={i} className={'ABCD'[i] === q.answer ? 'font-semibold text-ok' : 'ABCD'[i] === a?.choice ? 'text-bad line-through' : ''}>{'ABCD'[i]}. {o}</li>)}
                    </ul>
                    <Correction q={q} choice={a?.choice ?? null} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Page>
    </>
  );
}

function analyze(s: Session) {
  const bank = getBank();
  const sum = s.summary!;
  const weakCats = Object.entries(sum.byCategory)
    .map(([cat, v]) => ({ cat, ...v, rate: v.correct / v.total }))
    .filter((c) => c.correct < c.total)
    .sort((a, b) => a.rate - b.rate || b.total - a.total)
    .slice(0, 5);
  const concepts = [...new Set(sum.wrongIds.map((id) => bank.questions.get(id)?.takeaway).filter(Boolean) as string[])];
  const timing: { part: Part; avg: number; target: number }[] = [];
  for (const p of ALL_PARTS) {
    const ids = s.units.flatMap((u) => u.qids).filter((id) => bank.questions.get(id)?.part === p && s.answers[id]?.choice);
    if (!ids.length) continue;
    const avg = ids.reduce((t, id) => t + (s.answers[id].timeMs || 0), 0) / ids.length / 1000;
    timing.push({ part: p, avg, target: targetSec(bank.questions.get(ids[0])!) });
  }
  const parts = ALL_PARTS.filter((p) => sum.byPart[p]).map((p) => ({ p, rate: sum.byPart[p]!.correct / sum.byPart[p]!.total }));
  const priorities: string[] = [];
  const weakParts = [...parts].sort((a, b) => a.rate - b.rate).slice(0, 2);
  for (const w of weakParts) if (w.rate < 0.85) priorities.push(`Part ${w.p} (${PART_FR[w.p]}) : ${Math.round(w.rate * 100)} % de réussite — sessions intensives ciblées.`);
  for (const c of weakCats.slice(0, 2)) priorities.push(`${catLabel(c.cat)} : revoir la fiche et refaire les questions ratées.`);
  const slow = timing.filter((t) => t.part >= 5 && t.avg > t.target * 1.25);
  if (slow.length) priorities.push(`Vitesse en Reading (Part ${slow.map((t) => t.part).join(', ')}) : entraînement chronométré pour finir les 100 questions en 75 min.`);
  const l = sum.listening && sum.listening.total ? sum.listening.correct / sum.listening.total : 1;
  const r = sum.reading && sum.reading.total ? sum.reading.correct / sum.reading.total : 1;
  if (l < r - 0.1) priorities.push('Ta compréhension orale est en retrait : 15 min de Listening chaque jour (Parts 3 et 4 en priorité).');
  if (r < l - 0.1) priorities.push('Le Reading est ton levier principal : grammaire Part 5 + lecture chronométrée Part 7.');
  if (!priorities.length) priorities.push('Résultats homogènes : travaille la difficulté élevée et la vitesse pour viser 850+.');
  void isListening;
  return { weakCats, concepts, timing, priorities };
}
