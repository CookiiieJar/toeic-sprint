import { useMemo, useState } from 'react';
import { useStates, run } from '../lib/hooks';
import { getBank } from '../lib/bank';
import { catLabel, ALL_PARTS } from '../lib/labels';
import { formatDayFr, dayKey } from '../lib/dates';
import { startErrors } from '../lib/start';
import { markMastered, setErrorNote, setFavorite } from '../lib/sessions';
import { LETTERS } from '../lib/bankCore';
import type { QState } from '../lib/types';
import { Button, Card, Chip, Header, Icon, Notice, Page, SectionTitle, Stat, cx } from '../components/ui';
import { Correction } from '../components/QuestionView';
import { SceneView } from '../components/Scene';
import { DocView } from '../components/DocView';

export const REASONS: Record<string, string> = {
  vocab: 'Vocabulaire inconnu',
  grammar: 'Règle de grammaire',
  trap: 'Piège / distracteur',
  audio: 'Audio mal compris',
  fast: 'Lu / écouté trop vite',
  time: 'Manque de temps',
  doubt: 'Hésitation entre deux réponses',
};

const STATUS_FR = { new: 'Nouvelle', learning: 'En apprentissage', review: 'En consolidation', mastered: 'Maîtrisée' };

export function Errors() {
  const states = useStates();
  const [tab, setTab] = useState<'due' | 'active' | 'mastered' | 'fav'>('due');
  const [part, setPart] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const bank = getBank();
  const now = Date.now();

  const errs = useMemo(() => states.filter((s) => s.err && bank.questions.has(s.qid)), [states, bank]);
  const due = errs.filter((s) => s.err!.status !== 'mastered' && s.err!.srs.due <= now);
  const active = errs.filter((s) => s.err!.status !== 'mastered');
  const mastered = errs.filter((s) => s.err!.status === 'mastered');
  const favs = states.filter((s) => s.favorite && bank.questions.has(s.qid));
  const list = { due, active, mastered, fav: favs }[tab].filter((s) => !part || bank.questions.get(s.qid)!.part === part).sort((a, b) => (b.err?.lastWrongAt ?? 0) - (a.err?.lastWrongAt ?? 0));
  const reasons = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of errs) if (s.err?.note) for (const r of s.err.note.split(',')) if (REASONS[r]) m.set(r, (m.get(r) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [errs]);

  return (
    <>
      <Header title="Mes erreurs" subtitle="Cahier d'erreurs à répétition espacée" />
      <Page>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="À revoir" value={due.length} />
          <Stat label="En cours" value={active.length} />
          <Stat label="Maîtrisées" value={mastered.length} />
        </div>
        <div className="mt-3 grid gap-2">
          <Button block disabled={!due.length} onClick={() => run(() => startErrors('due'))}>Réviser les {due.length} erreurs dues</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="soft" disabled={!active.length} onClick={() => run(() => startErrors('all'))}>Refaire toutes</Button>
            <Button variant="soft" disabled={!active.length} onClick={() => run(() => startErrors('hard'))}>Les plus difficiles</Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Une erreur est « maîtrisée » après trois réussites espacées (1 jour, 3 jours, puis plus) : c'est une maîtrise durable, pas un simple souvenir de la réponse.</p>

        {reasons.length > 0 && (
          <>
            <SectionTitle>Pourquoi je me trompe ?</SectionTitle>
            <Card>
              <ul className="space-y-1 text-sm">
                {reasons.map(([r, n]) => <li key={r} className="flex justify-between"><span>{REASONS[r]}</span><b>{n}</b></li>)}
              </ul>
            </Card>
          </>
        )}

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {([['due', `À revoir (${due.length})`], ['active', `En cours (${active.length})`], ['mastered', `Maîtrisées (${mastered.length})`], ['fav', `Favoris (${favs.length})`]] as const).map(([k, l]) => <Chip key={k} active={tab === k} onClick={() => setTab(k)} className="shrink-0">{l}</Chip>)}
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={part === null} onClick={() => setPart(null)} className="shrink-0">Toutes</Chip>
          {ALL_PARTS.map((p) => <Chip key={p} active={part === p} onClick={() => setPart(p)} className="shrink-0">P{p}</Chip>)}
        </div>

        {!list.length && <Notice className="mt-3" tone="ok">{tab === 'due' ? "Rien à revoir pour l'instant." : 'Aucune question dans cette liste.'}</Notice>}
        <ul className="mt-3 space-y-2">
          {list.map((s) => <ErrorItem key={s.qid} s={s} open={open === s.qid} onToggle={() => setOpen(open === s.qid ? null : s.qid)} />)}
        </ul>
      </Page>
    </>
  );
}

function ErrorItem({ s, open, onToggle }: { s: QState; open: boolean; onToggle: () => void }) {
  const bank = getBank();
  const q = bank.questions.get(s.qid)!;
  const set = q.setId ? bank.sets.get(q.setId) : undefined;
  const e = s.err;
  const reasons = e?.note ? e.note.split(',').filter(Boolean) : [];
  const toggleReason = (r: string) => setErrorNote(s.qid, (reasons.includes(r) ? reasons.filter((x) => x !== r) : [...reasons, r]).join(','));
  return (
    <li>
      <Card as="button" onClick={onToggle} className="!p-3">
        <div className="flex items-start gap-2">
          <span className={cx('mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full', !e ? 'bg-warn' : e.status === 'mastered' ? 'bg-ok' : e.srs.due <= Date.now() ? 'bg-bad' : 'bg-primary')} aria-hidden />
          <div className="min-w-0 flex-1 text-sm">
            <p className="m-0 text-xs font-semibold text-muted">Part {q.part} · {catLabel(q.category)}{s.favorite ? ' · ★' : ''}</p>
            <p className="m-0 truncate">{q.prompt ?? set?.title ?? 'Photo'}</p>
            {e && <p className="m-0 text-xs text-muted">{s.wrong} échec(s) · {STATUS_FR[e.status]} · prochaine révision : {e.status === 'mastered' ? '—' : e.srs.due <= Date.now() ? "aujourd'hui" : formatDayFr(dayKey(e.srs.due), false)}</p>}
          </div>
        </div>
      </Card>
      {open && (
        <div className="mt-2 space-y-2">
          {e && (
            <Card className="!p-3 text-sm">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                <dt className="text-muted">Ma dernière réponse</dt><dd className="font-semibold text-bad">{e.lastChoice ? `${e.lastChoice}. ${q.options[LETTERS.indexOf(e.lastChoice)]}` : 'Sans réponse'}</dd>
                <dt className="text-muted">Bonne réponse</dt><dd className="font-semibold text-ok">{q.answer}. {q.options[LETTERS.indexOf(q.answer)]}</dd>
                <dt className="text-muted">Première erreur</dt><dd>{formatDayFr(dayKey(e.firstWrongAt), false)}</dd>
                <dt className="text-muted">Dernière erreur</dt><dd>{formatDayFr(dayKey(e.lastWrongAt), false)}</dd>
                <dt className="text-muted">Temps de réponse</dt><dd>{Math.round(e.lastTimeMs / 1000)} s</dd>
                <dt className="text-muted">Échecs / réussites</dt><dd>{s.wrong} / {s.correct}</dd>
                <dt className="text-muted">Révisions</dt><dd>{e.reviews} · intervalle {e.srs.interval} j</dd>
                <dt className="text-muted">Statut</dt><dd>{STATUS_FR[e.status]}</dd>
              </dl>
            </Card>
          )}
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
          <ul className="space-y-1 text-sm">{q.options.map((o, i) => <li key={i}>{LETTERS[i]}. {o}</li>)}</ul>
          {e && (
            <Card className="!p-3">
              <h4 className="m-0 mb-1 text-sm font-bold">Pourquoi je me suis trompée ?</h4>
              <p className="mb-2 mt-0 text-xs text-muted">Identifie la cause : c'est plus efficace que de mémoriser la réponse.</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(REASONS).map(([k, l]) => <Chip key={k} active={reasons.includes(k)} onClick={() => toggleReason(k)} className="!text-xs">{l}</Chip>)}
              </div>
              {q.traps && <p className="mb-0 mt-3 text-sm"><b>Le piège :</b> {q.traps}</p>}
            </Card>
          )}
          <Correction q={q} choice={e?.lastChoice ?? null} compact />
          <div className="flex flex-wrap gap-2">
            {e && <Button size="sm" variant={e.status === 'mastered' ? 'ghost' : 'ok'} onClick={() => markMastered(s.qid, e.status !== 'mastered')}><Icon name="check" size={16} /> {e.status === 'mastered' ? 'Remettre en révision' : 'Marquer comme maîtrisée'}</Button>}
            <Button size="sm" variant="ghost" onClick={() => setFavorite(s.qid, !s.favorite)}><Icon name="star" size={16} filled={s.favorite} /> {s.favorite ? 'Retirer des favoris' : 'Favori'}</Button>
          </div>
        </div>
      )}
    </li>
  );
}
