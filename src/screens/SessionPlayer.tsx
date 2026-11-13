import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Letter, Session } from '../lib/types';
import { db } from '../lib/db';
import { getBank } from '../lib/bank';
import { LETTERS } from '../lib/bankCore';
import { isListening, PART_FR } from '../lib/labels';
import { addStudySeconds, finishSession, recordAttempt, saveSession, getProfile } from '../lib/sessions';
import { speech, itemScript } from '../lib/audio';
import { formatClock } from '../lib/dates';
import { navigate } from '../lib/router';
import { AudioPanel, type AudioStatus } from '../components/AudioPanel';
import { SceneView } from '../components/Scene';
import { DocView } from '../components/DocView';
import { Correction, OptionButton, VocabBox } from '../components/QuestionView';
import { Button, Icon, Notice, Progress, Sheet, cx } from '../components/ui';

const RESPONSE_SEC = { short: 8, perQuestion: 8 };

export function SessionPlayer({ id }: { id: string }) {
  const [s, setS] = useState<Session | null>(null);
  const [missing, setMissing] = useState(false);
  const [started, setStarted] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [rate, setRate] = useState(1);
  const [tick, setTick] = useState(0);
  const [gridOpen, setGridOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [showText, setShowText] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [pending, setPending] = useState<Record<string, Letter>>({});
  const [finishing, setFinishing] = useState(false);
  const unitShownAt = useRef(Date.now());
  /** début de la mesure pour la prochaine question (temps propre à chaque question d'un groupe) */
  const mark = () => {
    const now = Date.now();
    const t = now - unitShownAt.current;
    unitShownAt.current = now;
    return t;
  };
  const sRef = useRef<Session | null>(null);
  sRef.current = s;
  const bank = getBank();

  useEffect(() => {
    db.sessions.get(id).then((x) => {
      if (!x) return setMissing(true);
      if (x.status === 'done') return navigate(`/summary?id=${x.id}`, true);
      setS(x);
    });
    getProfile().then((p) => {
      setRate(p.rate);
      speech.prefs = p.voicePrefs ?? {};
      speech.singleVoice = !!p.singleVoice;
    });
  }, [id]);

  const persist = useCallback(async (next: Session) => {
    setS({ ...next });
    await saveSession(next);
  }, []);

  const unit = s?.units[s.cursor];
  const qs = useMemo(() => (unit ? unit.qids.map((qid) => bank.questions.get(qid)!).filter(Boolean) : []), [unit, bank]);
  const set = unit?.setId ? bank.sets.get(unit.setId) : undefined;
  const part = qs[0]?.part ?? 5;
  const listening = isListening(part);
  const exam = s?.mode === 'exam';
  const firstReading = s ? s.units.findIndex((u) => !isListening(bank.questions.get(u.qids[0])!.part)) : -1;
  const hasListening = !!s && s.units.some((u) => isListening(bank.questions.get(u.qids[0])!.part));
  const needReadingGate = !!s && exam && s.examKind === 'full' && s.cursor === firstReading && firstReading > 0 && !s.meta?.readingStarted;
  const unitKey = unit ? unit.setId ?? unit.qids[0] : '';
  const allValidated = !!s && qs.every((q) => s.validated?.includes(q.id));
  const globalIndex = useMemo(() => (s ? s.units.slice(0, s.cursor).reduce((n, u) => n + u.qids.length, 0) : 0), [s]);
  const totalQ = useMemo(() => (s ? s.units.reduce((n, u) => n + u.qids.length, 0) : 0), [s]);

  // Réinitialisations à chaque changement d'unité
  useEffect(() => {
    unitShownAt.current = Date.now();
    setTranscript(false);
    setShowText(false);
    setCountdown(null);
    setPending({});
    setAudioStatus('idle');
  }, [unitKey]);

  // Chronomètre (pause si l'onglet est masqué ou pendant une pause)
  useEffect(() => {
    if (!started || onBreak || needReadingGate) return;
    let acc = 0;
    const iv = window.setInterval(() => {
      const cur = sRef.current;
      if (!cur || document.hidden) return;
      cur.elapsedSec++;
      const u = cur.units[cur.cursor];
      const p = bank.questions.get(u?.qids[0] ?? '')?.part;
      if (cur.mode === 'exam' && p && !isListening(p)) cur.readingElapsedSec = (cur.readingElapsedSec ?? 0) + 1;
      acc++;
      if (acc >= 10) {
        acc = 0;
        addStudySeconds(10);
        saveSession(cur);
      }
      setTick((t) => t + 1);
    }, 1000);
    const vis = () => document.hidden && sRef.current && saveSession(sRef.current);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', vis);
      if (acc) addStudySeconds(acc);
    };
  }, [started, onBreak, needReadingGate, bank]);

  const finish = useCallback(async () => {
    const cur = sRef.current;
    if (!cur || finishing) return;
    setFinishing(true);
    speech.cancel();
    const done = await finishSession(cur);
    navigate(`/summary?id=${done.id}`, true);
  }, [finishing]);

  // Limites de temps
  useEffect(() => {
    if (!s || !started) return;
    if (s.timeLimitSec && s.elapsedSec >= s.timeLimitSec) finish();
    if (s.readingLimitSec && (s.readingElapsedSec ?? 0) >= s.readingLimitSec) finish();
  }, [tick, s, started, finish]);

  const goTo = useCallback(
    async (i: number) => {
      const cur = sRef.current;
      if (!cur) return;
      speech.cancel();
      if (i >= cur.units.length) return finish();
      const prev = cur.cursor;
      cur.cursor = Math.max(0, i);
      await persist(cur);
      if (cur.breaks?.includes(prev) && i === prev + 1) setOnBreak(true);
    },
    [persist, finish],
  );

  // Fenêtre de réponse après l'audio (examen Listening)
  useEffect(() => {
    if (!exam || !listening || !started) return;
    if (audioStatus !== 'done') return;
    const secs = part <= 2 ? RESPONSE_SEC.short : RESPONSE_SEC.perQuestion * qs.length;
    setCountdown(secs);
  }, [audioStatus, exam, listening, started, part, qs.length]);
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      goTo((sRef.current?.cursor ?? 0) + 1);
      return;
    }
    const t = setTimeout(() => !document.hidden && setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, goTo]);

  if (missing) return <div className="p-6"><Notice tone="bad">Session introuvable.</Notice><Button className="mt-4" onClick={() => navigate('/')}>Accueil</Button></div>;
  if (!s || !unit) return <div className="p-6 text-muted">Chargement…</div>;

  const choose = async (qid: string, l: Letter) => {
    if (s.mode === 'practice' && s.immediateFeedback) {
      if (s.validated?.includes(qid)) return;
      setPending((p) => ({ ...p, [qid]: l }));
      return;
    }
    // examen ou entraînement sans correction immédiate : la réponse est enregistrée, modifiable
    const prev = s.answers[qid];
    s.answers[qid] = { choice: l, timeMs: prev?.choice ? prev.timeMs : mark(), at: Date.now(), flagged: prev?.flagged };
    await persist(s);
  };

  const validate = async (qid: string) => {
    const l = pending[qid];
    if (!l) return;
    s.answers[qid] = { choice: l, timeMs: mark(), at: Date.now() };
    s.validated = [...(s.validated ?? []), qid];
    await recordAttempt(s, qid);
    await persist(s);
  };

  const toggleFlag = async (qid: string) => {
    const a = s.answers[qid] ?? { choice: null, timeMs: 0, at: Date.now() };
    s.answers[qid] = { ...a, flagged: !a.flagged };
    await persist(s);
  };

  const quit = async () => {
    speech.cancel();
    s.status = 'paused';
    await saveSession(s);
    navigate('/');
  };

  const start = () => {
    if (hasListening) speech.unlock(' ');
    unitShownAt.current = Date.now();
    setStarted(true);
  };

  const remaining = s.readingLimitSec ? s.readingLimitSec - (s.readingElapsedSec ?? 0) : s.timeLimitSec ? s.timeLimitSec - s.elapsedSec : null;
  const isLast = s.cursor === s.units.length - 1;
  const canGoBack = s.cursor > 0 && !(exam && listening) && !(exam && s.examKind === 'full' && s.cursor === firstReading);
  const unanswered = s.units.flatMap((u) => u.qids).filter((q) => !s.answers[q]?.choice).length;
  const answeredHere = qs.every((q) => s.answers[q.id]?.choice);

  // ─── Écrans intermédiaires ───
  if (!started) {
    return (
      <Gate title={s.title} onQuit={() => navigate('/')}>
        <p className="text-muted">{totalQ} questions{s.timeLimitSec ? ` · ${Math.round(s.timeLimitSec / 60)} min` : ''}{s.readingLimitSec ? ` · Reading : ${Math.round(s.readingLimitSec / 60)} min` : ''}</p>
        {s.cursor > 0 && <Notice>Session reprise là où tu l'avais laissée (question {globalIndex + 1}).</Notice>}
        {exam && <Notice tone="warn">Conditions d'examen : pas de correction avant la fin{hasListening ? ', audio joué une seule fois, sans retour en arrière en Listening' : ''}.</Notice>}
        {hasListening && !speech.supported && <Notice tone="bad">La synthèse vocale n'est pas disponible sur ce navigateur : les transcriptions seront affichées à la place (mode dégradé).</Notice>}
        {hasListening && speech.supported && <p className="text-sm text-muted">Monte le volume ou mets des écouteurs. Le bouton ci-dessous active aussi le son sur mobile.</p>}
        <Button size="lg" block onClick={start}>
          {hasListening && <Icon name="sound" />} {s.cursor > 0 || globalIndex > 0 ? 'Reprendre' : 'Commencer'}
        </Button>
      </Gate>
    );
  }
  if (onBreak) {
    return (
      <Gate title="Pause facultative" onQuit={quit}>
        <p>Bravo, un bloc est terminé. Lève-toi, bois un verre d'eau, regarde au loin 1 à 2 minutes : la concentration remonte nettement après une courte pause.</p>
        <p className="text-sm text-muted">Le chronomètre est arrêté pendant la pause.</p>
        <Button size="lg" block onClick={() => { setOnBreak(false); unitShownAt.current = Date.now(); }}>Continuer</Button>
      </Gate>
    );
  }
  if (needReadingGate) {
    return (
      <Gate title="Fin du Listening" onQuit={quit}>
        <p>La partie Listening est terminée. La partie Reading comporte 100 questions (Parts 5, 6 et 7) en <b>75 minutes</b>.</p>
        <p className="text-sm text-muted">Conseil : Part 5 en ~10 min, Part 6 en ~8 min, garde au moins 55 min pour la Part 7. Tu peux passer une question et y revenir grâce à la grille.</p>
        <Button size="lg" block onClick={async () => { s.meta = { ...s.meta, readingStarted: true }; await persist(s); unitShownAt.current = Date.now(); }}>Commencer le Reading</Button>
      </Gate>
    );
  }

  // ─── Rendu d'une unité ───
  const listeningLines = set?.audio ?? (part <= 2 ? itemScript(part as 1 | 2, qs[0].prompt, qs[0].options) : []);
  const hideP12Text = part <= 2 && (exam || (!showText && !qs.every((q) => s.validated?.includes(q.id))));
  const docs = set?.docs ?? [];
  const blankLabel = (n: number) => {
    const q = qs[n - 1];
    if (!q) return `(${n})`;
    const a = pending[q.id] ?? s.answers[q.id]?.choice;
    const num = globalIndex + n;
    return a ? `${num}. ${q.options[LETTERS.indexOf(a)]}` : `${num}. ______`;
  };

  return (
    <div className="min-h-dvh bg-bg">
      <header className="safe-top sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2">
          <button onClick={() => setQuitOpen(true)} aria-label="Quitter la session" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2">
            <Icon name="close" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-xs font-semibold text-muted">
              <span className="truncate">Part {part} · {PART_FR[part]}</span>
              <span className="tabular-nums">{Math.min(globalIndex + qs.length, totalQ)}/{totalQ}</span>
            </div>
            <Progress value={(globalIndex + (answeredHere ? qs.length : 0)) / totalQ} className="mt-1" label="Progression de la session" />
          </div>
          {s.showTimer && (
            <div className={cx('rounded-lg px-2 py-1 text-sm font-bold tabular-nums', remaining !== null && remaining < 300 ? 'bg-bad-soft text-bad' : 'bg-surface-2')} aria-label="Chronomètre">
              {remaining !== null ? formatClock(remaining) : formatClock(s.elapsedSec)}
            </div>
          )}
          {exam && !listening && (
            <button onClick={() => setGridOpen(true)} aria-label="Grille des questions" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2">
              <Icon name="grid" />
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 pb-36 pt-4" key={unitKey}>
        {/* Support Listening */}
        {listening && (
          <>
            {part === 1 && qs[0].scene && <SceneView scene={qs[0].scene} />}
            <AudioPanel
              unitKey={unitKey}
              lines={listeningLines}
              file={set?.audioFile ?? qs[0].audioFile}
              mode={exam ? 'exam' : 'practice'}
              autoPlay
              alreadyPlayed={exam && s.played?.includes(unitKey)}
              rate={rate}
              showTranscript={!exam && transcript}
              onStatus={(st) => {
                setAudioStatus(st);
                // marqué « écouté » seulement si l'audio est allé jusqu'au bout (un échec technique reste rejouable)
                if (st === 'done' && exam && !s.played?.includes(unitKey)) {
                  s.played = [...(s.played ?? []), unitKey];
                  saveSession(s);
                }
              }}
            />
            {!exam && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => setTranscript((t) => !t)}>
                  <Icon name="text" size={16} /> {transcript ? 'Masquer la transcription' : 'Transcription'}
                </Button>
                {part <= 2 && hideP12Text && <Button size="sm" variant="ghost" onClick={() => setShowText(true)}>Afficher les propositions écrites</Button>}
              </div>
            )}
            {set?.graphic && <DocView doc={set.graphic} />}
            {exam && countdown !== null && (
              <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm" role="timer">
                <span>Temps de réponse</span>
                <span className="font-bold tabular-nums">{countdown} s</span>
              </div>
            )}
          </>
        )}

        {/* Support Reading */}
        {!listening && docs.length > 0 && (
          <div className="space-y-3">
            {docs.length > 1 && <p className="text-xs font-semibold text-muted">{docs.length} documents liés — lis-les tous avant de répondre aux questions de croisement.</p>}
            {docs.map((d, i) => <DocView key={i} doc={d} blankLabel={part === 6 ? blankLabel : undefined} />)}
          </div>
        )}

        {/* Questions */}
        {qs.map((q, qi) => {
          const n = globalIndex + qi + 1;
          const validated = s.validated?.includes(q.id);
          const ans = s.answers[q.id];
          const chosen = pending[q.id] ?? ans?.choice ?? null;
          const showFeedback = s.mode === 'practice' && s.immediateFeedback && validated;
          return (
            <section key={q.id} className="space-y-2" aria-label={`Question ${n}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[15px] font-semibold leading-snug">
                  <span className="mr-1 text-primary">{n}.</span>
                  {part === 1 && 'Choisis la phrase qui décrit le mieux l\'image.'}
                  {part === 2 && (hideP12Text ? 'Écoute la question et choisis la meilleure réponse.' : q.prompt)}
                  {part === 5 && q.prompt}
                  {part === 6 && `Blanc (${qi + 1}) du texte`}
                  {[3, 4, 7].includes(part) && q.prompt}
                </h3>
                {exam && !listening && (
                  <button onClick={() => toggleFlag(q.id)} aria-label="Marquer pour y revenir" className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', ans?.flagged ? 'bg-warn-soft text-warn' : 'text-muted')}>
                    <Icon name="flag" size={18} filled={ans?.flagged} />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {q.options.map((o, i) => {
                  const L = LETTERS[i];
                  let state: 'idle' | 'selected' | 'correct' | 'wrong' | 'missed' = chosen === L ? 'selected' : 'idle';
                  if (showFeedback) state = L === q.answer ? (chosen === L ? 'correct' : 'missed') : chosen === L ? 'wrong' : 'idle';
                  return <OptionButton key={L} letter={L} text={o} state={state} disabled={showFeedback} hideText={part <= 2 && hideP12Text} onClick={() => choose(q.id, L)} />;
                })}
              </div>
              {s.mode === 'practice' && s.immediateFeedback && !validated && (
                <Button block variant={pending[q.id] ? 'primary' : 'ghost'} disabled={!pending[q.id]} onClick={() => validate(q.id)}>
                  Valider
                </Button>
              )}
              {showFeedback && <Correction q={q} choice={ans?.choice ?? null} />}
            </section>
          );
        })}

        {part === 1 && !exam && allValidated && qs[0].scene && <Notice>Description de l'image : {qs[0].scene.alt}</Notice>}
        {!exam && allValidated && (set?.vocab?.length || qs.some((q) => q.vocab?.length)) ? (
          <VocabBox items={[...(set?.vocab ?? []), ...qs.flatMap((q) => q.vocab ?? [])]} source={unitKey} />
        ) : null}
      </main>

      {/* Barre d'actions */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2 px-4 pt-3">
          {canGoBack && (
            <Button variant="ghost" onClick={() => goTo(s.cursor - 1)} aria-label="Question précédente">
              <Icon name="back" size={18} />
            </Button>
          )}
          {exam && !listening && (
            <Button variant="ghost" onClick={() => setFinishOpen(true)}>Terminer</Button>
          )}
          <Button
            block
            className="flex-1"
            variant={s.mode === 'practice' && s.immediateFeedback && !allValidated ? 'ghost' : 'primary'}
            onClick={() => (isLast ? (exam ? setFinishOpen(true) : finish()) : goTo(s.cursor + 1))}
            disabled={finishing}
          >
            {isLast ? 'Terminer' : s.mode === 'practice' && s.immediateFeedback && !allValidated ? 'Passer' : 'Suivant'}
          </Button>
        </div>
      </nav>

      <Sheet open={quitOpen} onClose={() => setQuitOpen(false)} title="Quitter la session ?">
        <p className="mb-4 text-sm text-muted">Ta progression est enregistrée. Tu pourras reprendre cette session depuis l'accueil.</p>
        <div className="space-y-2">
          <Button block onClick={quit}>Mettre en pause et quitter</Button>
          {!exam && <Button block variant="soft" onClick={finish}>Terminer maintenant et voir le bilan</Button>}
          <Button block variant="ghost" onClick={() => setQuitOpen(false)}>Continuer la session</Button>
        </div>
      </Sheet>

      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title="Terminer l'examen ?">
        {unanswered > 0 ? <Notice tone="warn">{unanswered} question(s) sans réponse. Au TOEIC, il n'y a pas de pénalité : réponds à tout, même au hasard.</Notice> : <Notice tone="ok">Toutes les questions ont une réponse.</Notice>}
        <div className="mt-4 space-y-2">
          <Button block onClick={finish} disabled={finishing}>Rendre ma copie</Button>
          <Button block variant="ghost" onClick={() => setFinishOpen(false)}>Revenir à l'examen</Button>
        </div>
      </Sheet>

      <Sheet open={gridOpen} onClose={() => setGridOpen(false)} title="Grille des réponses">
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-primary" /> répondue</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-line bg-surface" /> sans réponse</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-warn" /> à revoir</span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {s.units.flatMap((u, ui) =>
            u.qids.map((qid) => {
              const a = s.answers[qid];
              const p = bank.questions.get(qid)!.part;
              const locked = isListening(p) && exam;
              const num = s.units.slice(0, ui).reduce((k, x) => k + x.qids.length, 0) + u.qids.indexOf(qid) + 1;
              return (
                <button
                  key={qid}
                  disabled={locked}
                  onClick={() => { setGridOpen(false); goTo(ui); }}
                  className={cx('relative grid h-9 place-items-center rounded-lg text-xs font-semibold', a?.choice ? 'bg-primary text-primary-ink' : 'border border-line bg-surface', ui === s.cursor && 'ring-2 ring-ink', locked && 'opacity-35')}
                  aria-label={`Question ${num}${a?.choice ? ', répondue' : ', sans réponse'}${a?.flagged ? ', marquée' : ''}`}
                >
                  {num}
                  {a?.flagged && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-warn" />}
                </button>
              );
            }),
          )}
        </div>
      </Sheet>
    </div>
  );
}

function Gate({ title, children, onQuit }: { title: string; children: React.ReactNode; onQuit: () => void }) {
  return (
    <div className="safe-top mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-6 anim-in">
      <button onClick={onQuit} className="self-start text-sm text-muted underline">Quitter</button>
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
