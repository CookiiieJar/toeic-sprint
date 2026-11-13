import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FICHES, type Fiche } from '../data/grammar';
import { useAttempts, useStates, run } from '../lib/hooks';
import { accOf, smoothed } from '../lib/stats';
import { db } from '../lib/db';
import { getBank } from '../lib/bank';
import { practicePools } from '../lib/sessions';
import { startQuestions } from '../lib/start';
import { navigate } from '../lib/router';
import type { Attempt, ConceptState } from '../lib/types';
import { Button, Card, Header, Notice, Page, Progress, SectionTitle, cx } from '../components/ui';
import { OptionButton } from '../components/QuestionView';

function mastery(f: Fiche, attempts: Attempt[], c?: ConceptState): { value: number; label: string; detail: string } {
  if (c?.manualMastered) return { value: 1, label: 'Maîtrisée', detail: 'marquée par toi' };
  const a = accOf(attempts.filter((x) => f.categories.includes(x.category)).sort((x, y) => y.at - x.at).slice(0, 30));
  const quiz = c?.quizBest ?? null;
  const parts: number[] = [];
  if (a.total >= 3) parts.push(smoothed(a, 0.6, 3));
  if (quiz !== null) parts.push(quiz);
  if (!parts.length) return { value: 0, label: 'Non évaluée', detail: 'fais le mini-quiz' };
  const v = parts.reduce((s, x) => s + x, 0) / parts.length;
  return { value: v, label: v >= 0.85 ? 'Maîtrisée' : v >= 0.65 ? 'En progrès' : 'À travailler', detail: `${a.total} question(s) en exercice${quiz !== null ? ` · quiz ${Math.round(quiz * 100)} %` : ''}` };
}

export function GrammarList() {
  const attempts = useAttempts();
  const concepts = useLiveQuery(() => db.concepts.toArray(), []) ?? [];
  const cmap = new Map(concepts.map((c) => [c.key, c]));
  const rows = FICHES.map((f) => ({ f, m: mastery(f, attempts, cmap.get(f.id)) })).sort((a, b) => a.m.value - b.m.value);
  return (
    <>
      <Header title="Grammaire & vocabulaire" onBack={() => navigate('/practice')} />
      <Page>
        <p className="mt-0 text-sm text-muted">Fiches triées de la moins maîtrisée à la plus maîtrisée, d'après tes réponses réelles et tes mini-quiz.</p>
        <div className="space-y-2">
          {rows.map(({ f, m }) => (
            <Card key={f.id} as="button" onClick={() => navigate(`/grammar/${f.id}`)} className="!p-3">
              <div className="flex items-center justify-between gap-2">
                <b>{f.title}</b>
                <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', m.value >= 0.85 ? 'bg-ok-soft text-ok' : m.value >= 0.65 ? 'bg-primary-soft text-primary' : m.value > 0 ? 'bg-bad-soft text-bad' : 'bg-surface-2 text-muted')}>{m.label}</span>
              </div>
              <Progress value={m.value} className="mt-2" label={`Maîtrise : ${f.title}`} />
              <p className="m-0 mt-1 text-xs text-muted">{m.detail}</p>
            </Card>
          ))}
        </div>
        <SectionTitle>Vocabulaire</SectionTitle>
        <Card as="button" onClick={() => navigate('/flashcards')}>
          <b>Flashcards</b>
          <p className="m-0 text-sm text-muted">Vocabulaire professionnel, faux amis, collocations, et les règles que tu ajoutes depuis tes corrections.</p>
        </Card>
      </Page>
    </>
  );
}

export function GrammarDetail({ id }: { id: string }) {
  const f = FICHES.find((x) => x.id === id);
  const attempts = useAttempts();
  const states = useStates();
  const concept = useLiveQuery(() => db.concepts.get(id), [id]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const m = useMemo(() => (f ? mastery(f, attempts, concept) : null), [f, attempts, concept]);
  if (!f || !m) return <Page><Notice tone="bad">Fiche introuvable.</Notice></Page>;
  const done = Object.keys(answers).length === f.quiz.length;
  const score = f.quiz.filter((q, i) => answers[i] === q.answer).length;

  const answer = async (i: number, k: number) => {
    if (answers[i] !== undefined) return;
    const next = { ...answers, [i]: k };
    setAnswers(next);
    if (Object.keys(next).length === f.quiz.length) {
      const sc = f.quiz.filter((q, j) => next[j] === q.answer).length / f.quiz.length;
      const prev = await db.concepts.get(f.id);
      await db.concepts.put({ ...(prev ?? { key: f.id }), quizBest: Math.max(sc, prev?.quizBest ?? 0) });
      const now = Date.now();
      await db.sessions.put({ id: `g-${now.toString(36)}`, type: 'grammar', title: `Quiz : ${f.title}`, mode: 'practice', units: [], answers: {}, cursor: 0, createdAt: now, updatedAt: now, finishedAt: now, status: 'done', elapsedSec: 60, immediateFeedback: true, showTimer: false, meta: { fiche: f.id, score: sc } });
    }
  };

  const practice = async () => {
    const pools = await practicePools();
    const st = new Map(states.map((s) => [s.qid, s]));
    const qs = [...getBank().questions.values()]
      .filter((q) => pools.includes(q.pool) && f.categories.includes(q.category) && q.part >= 5)
      .sort((a, b) => Number(!!st.get(a.id)?.lastResult) - Number(!!st.get(b.id)?.lastResult) || (st.get(a.id)?.seen ?? 0) - (st.get(b.id)?.seen ?? 0));
    if (!qs.length) throw new Error('Aucune question disponible pour cette notion dans la réserve.');
    await startQuestions(qs.slice(0, 12).map((q) => q.id), `Entraînement : ${f.title}`);
  };

  return (
    <>
      <Header title={f.title} onBack={() => navigate('/grammar')} />
      <Page>
        <Card>
          <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">Maîtrise : {m.label}</span><span className="text-muted">{m.detail}</span></div>
          <Progress value={m.value} label="Indicateur de maîtrise" />
        </Card>
        <SectionTitle>L'essentiel</SectionTitle>
        <Card>
          <p className="mt-0">{f.intro}</p>
          <ul className="mb-0 list-disc space-y-1.5 pl-5">{f.points.map((p) => <li key={p}>{p}</li>)}</ul>
        </Card>
        <SectionTitle>Exemples</SectionTitle>
        <Card className="space-y-3">
          {f.examples.map(([en, fr]) => (
            <div key={en}><p className="m-0 font-semibold">{en}</p><p className="m-0 text-sm text-muted">{fr}</p></div>
          ))}
        </Card>
        <SectionTitle>Pièges fréquents</SectionTitle>
        <Card className="!bg-warn-soft"><ul className="m-0 list-disc space-y-1 pl-5">{f.traps.map((t) => <li key={t}>{t}</li>)}</ul></Card>

        <SectionTitle>Mini-quiz</SectionTitle>
        <div className="space-y-4">
          {f.quiz.map((q, i) => (
            <Card key={i}>
              <p className="mt-0 font-semibold">{i + 1}. {q.q}</p>
              <div className="space-y-2">
                {q.options.map((o, k) => {
                  const a = answers[i];
                  const state = a === undefined ? 'idle' : k === q.answer ? (a === k ? 'correct' : 'missed') : a === k ? 'wrong' : 'idle';
                  return <OptionButton key={k} letter={'ABCD'[k]} text={o} state={state} disabled={a !== undefined} onClick={() => answer(i, k)} />;
                })}
              </div>
              {answers[i] !== undefined && <p className="mb-0 mt-2 text-sm">{answers[i] === q.answer ? '✅ ' : '❌ '}{q.ex}</p>}
            </Card>
          ))}
        </div>
        {done && <Notice className="mt-3" tone={score === f.quiz.length ? 'ok' : 'info'}>Score : {score}/{f.quiz.length}. {score === f.quiz.length ? 'Parfait !' : 'Relis les pièges puis entraîne-toi sur de vraies questions.'}</Notice>}
        {done && <Button variant="ghost" className="mt-2" onClick={() => setAnswers({})}>Refaire le quiz</Button>}

        <div className="mt-5 grid gap-2">
          <Button block onClick={() => run(practice)}>Entraînement ciblé (questions TOEIC)</Button>
          <Button block variant={concept?.manualMastered ? 'ghost' : 'soft'} onClick={async () => db.concepts.put({ ...(concept ?? { key: f.id }), manualMastered: !concept?.manualMastered })}>
            {concept?.manualMastered ? 'Retirer « maîtrisée »' : 'Marquer la règle comme maîtrisée'}
          </Button>
        </div>
      </Page>
    </>
  );
}
