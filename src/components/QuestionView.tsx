import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Letter, Question } from '../lib/types';
import { LETTERS } from '../lib/bankCore';
import { catLabel, LEVEL_FR } from '../lib/labels';
import { Button, Icon, cx } from './ui';
import { addRuleCard, addVocabCard } from '../lib/cards';
import { db } from '../lib/db';
import { setFavorite } from '../lib/sessions';

export function OptionButton({ letter, text, state, onClick, disabled, hideText }: { letter: string; text: string; state: 'idle' | 'selected' | 'correct' | 'wrong' | 'missed'; onClick?: () => void; disabled?: boolean; hideText?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === 'selected'}
      className={cx(
        'flex w-full items-start gap-3 rounded-xl border-2 px-3 py-3 text-left text-[15px] transition min-h-12',
        state === 'idle' && 'border-line bg-surface active:bg-surface-2',
        state === 'selected' && 'border-primary bg-primary-soft',
        state === 'correct' && 'border-ok bg-ok-soft anim-pop',
        state === 'wrong' && 'border-bad bg-bad-soft',
        state === 'missed' && 'border-ok border-dashed bg-surface',
        disabled && state === 'idle' && 'opacity-70',
      )}
    >
      <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold', state === 'correct' ? 'bg-ok text-white' : state === 'wrong' ? 'bg-bad text-white' : state === 'selected' ? 'bg-primary text-primary-ink' : 'bg-surface-2')}>
        {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : letter}
      </span>
      <span className="pt-0.5">{hideText ? <span className="text-muted">Option {letter}</span> : text}</span>
    </button>
  );
}

/** Bloc de correction détaillée en français */
export function Correction({ q, choice, compact }: { q: Question; choice: Letter | null; compact?: boolean }) {
  const [msg, setMsg] = useState('');
  const st = useLiveQuery(() => db.qstate.get(q.id), [q.id]);
  const ruleSaved = useLiveQuery(() => db.cards.get(`r-${q.id}`), [q.id]);
  const correct = choice === q.answer;
  const ci = LETTERS.indexOf(q.answer);
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2500);
  };
  return (
    <div className={cx('mt-3 space-y-3 rounded-2xl p-4 text-[15px] anim-in', correct ? 'bg-ok-soft' : 'bg-bad-soft')} aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 font-bold">
          {correct ? '✅ Bonne réponse' : choice ? `❌ Ta réponse : ${choice}` : '⏭️ Sans réponse'}
          <span className="block font-semibold">Bonne réponse : {q.answer}. {q.options[ci]}</span>
        </p>
        <button onClick={() => setFavorite(q.id, !st?.favorite)} aria-label={st?.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface', st?.favorite ? 'text-warn' : 'text-muted')}>
          <Icon name="star" size={18} filled={!!st?.favorite} />
        </button>
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-muted">Explication</h4>
        <p className="m-0">{q.explanation}</p>
      </div>
      {q.evidence && (
        <blockquote className="m-0 border-l-4 border-ok pl-3 text-sm italic">« {q.evidence} »</blockquote>
      )}
      {q.traps && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted">{correct ? 'Les pièges évités' : 'Pourquoi pas les autres ?'}</h4>
          <p className="m-0">{q.traps}</p>
        </div>
      )}
      <div className="rounded-xl bg-surface p-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-primary">Règle à retenir</h4>
        <p className="m-0 font-medium">{q.takeaway}</p>
      </div>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-surface px-2 py-1">{catLabel(q.category)}</span>
          <span className="rounded-full bg-surface px-2 py-1">Niveau {LEVEL_FR[q.level]}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="soft" disabled={!!ruleSaved} onClick={async () => flash((await addRuleCard(q)) ? 'Règle ajoutée à tes flashcards' : 'Déjà dans tes flashcards')}>
          <Icon name="cards" size={16} /> {ruleSaved ? 'Règle dans mes flashcards' : 'Ajouter la règle aux flashcards'}
        </Button>
      </div>
      {msg && <p className="m-0 text-sm font-semibold text-primary" role="status">{msg}</p>}
    </div>
  );
}

export function VocabBox({ items, source }: { items: { en: string; fr: string }[]; source: string }) {
  const [added, setAdded] = useState<Set<string>>(new Set());
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Vocabulaire du document</h4>
      <ul className="space-y-1.5">
        {items.map((v) => (
          <li key={v.en} className="flex items-center justify-between gap-2 text-sm">
            <span><b>{v.en}</b> — {v.fr}</span>
            <button
              className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary disabled:opacity-50"
              disabled={added.has(v.en)}
              onClick={async () => {
                await addVocabCard(v, source);
                setAdded(new Set([...added, v.en]));
              }}
            >
              {added.has(v.en) ? 'Ajouté ✓' : '+ Flashcard'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
