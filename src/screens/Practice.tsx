import { useMemo, useState } from 'react';
import { useAttempts, useCards, useStates, run } from '../lib/hooks';
import { byPart } from '../lib/stats';
import { ALL_PARTS, PART_FR, PART_NAMES } from '../lib/labels';
import { startDaily, startIntensive, startPart, startErrors } from '../lib/start';
import { buildQueue } from '../lib/cards';
import { navigate } from '../lib/router';
import type { Part } from '../lib/types';
import { Button, Card, Chip, Header, Icon, Notice, Page, Pct, SectionTitle, Toggle, cx } from '../components/ui';
import { DURATIONS } from './Home';

export function Practice() {
  const attempts = useAttempts();
  const cards = useCards();
  const states = useStates();
  const [min, setMin] = useState(20);
  const parts = useMemo(() => byPart(attempts), [attempts]);
  const dueCards = useMemo(() => buildQueue(cards, { newLimit: 0 }).length, [cards]);
  const favs = states.filter((s) => s.favorite).length;
  return (
    <>
      <Header title="Réviser" />
      <Page>
        <Card>
          <h2 className="m-0 text-base font-bold">Révision du jour</h2>
          <p className="mb-3 mt-1 text-sm text-muted">Questions choisies selon tes erreurs, tes parties faibles, la difficulté et la date de dernière révision.</p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => <Chip key={d.m} active={min === d.m} onClick={() => setMin(d.m)}>{d.m} min</Chip>)}
          </div>
          <p className="mt-2 text-xs text-muted">{DURATIONS.find((d) => d.m === min)?.label}</p>
          <Button block className="mt-3" onClick={() => run(() => startDaily(min))}>Lancer {min} min</Button>
        </Card>

        <Card className="mt-3" onClick={() => navigate('/intensive')} as="button">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><Icon name="bolt" /></span>
            <span className="flex-1"><b>Session intensive</b><span className="block text-sm text-muted">30 à 180 min, parties au choix, pauses, reprise possible</span></span>
            <Icon name="back" className="rotate-180 text-muted" size={18} />
          </div>
        </Card>

        <SectionTitle>Par partie</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {ALL_PARTS.map((p) => (
            <Card key={p} as="button" onClick={() => run(() => startPart(p as Part, 15))} className="!p-3">
              <div className="text-xs font-semibold text-muted">{p <= 4 ? 'Listening' : 'Reading'} · Part {p}</div>
              <div className="font-bold leading-tight">{PART_FR[p]}</div>
              <div className="text-[11px] text-muted">{PART_NAMES[p]}</div>
              <div className="mt-1 text-sm">{parts[p].total ? <><Pct v={parts[p].rate} /> <span className="text-xs text-muted">({parts[p].total} q.)</span></> : <span className="text-xs text-muted">Pas encore travaillée</span>}</div>
            </Card>
          ))}
        </div>

        <SectionTitle>Outils</SectionTitle>
        <div className="grid gap-2">
          <ToolRow icon="book" title="Grammaire & vocabulaire" desc="13 fiches, exemples, pièges, mini-quiz" onClick={() => navigate('/grammar')} />
          <ToolRow icon="cards" title="Flashcards" desc={`${dueCards} carte(s) à revoir · répétition espacée`} onClick={() => navigate('/flashcards')} />
          <ToolRow icon="calendar" title="Mon planning jusqu'au 28 novembre" desc="Programme adaptatif jour par jour" onClick={() => navigate('/plan')} />
          {favs > 0 && <ToolRow icon="star" title="Mes favoris" desc={`${favs} question(s)`} onClick={() => run(() => startErrors('favorites'))} />}
        </div>
      </Page>
    </>
  );
}

function ToolRow({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <Card as="button" onClick={onClick} className="!p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2"><Icon name={icon} size={20} /></span>
        <span className="flex-1"><b>{title}</b><span className="block text-sm text-muted">{desc}</span></span>
        <Icon name="back" className="rotate-180 text-muted" size={18} />
      </div>
    </Card>
  );
}

export function IntensiveSetup() {
  const [minutes, setMinutes] = useState(60);
  const [scope, setScope] = useState<'listening' | 'reading' | 'mixed'>('mixed');
  const [parts, setParts] = useState<Part[]>([]);
  const [hard, setHard] = useState(false);
  const [feedback, setFeedback] = useState(true);
  const [timer, setTimer] = useState(true);
  const [breaks, setBreaks] = useState(true);
  const toggle = (p: Part) => setParts((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p].sort()));
  const visible = ALL_PARTS.filter((p) => scope === 'mixed' || (scope === 'listening' ? p <= 4 : p >= 5));
  return (
    <>
      <Header title="Session intensive" onBack={() => navigate('/practice')} />
      <Page>
        <SectionTitle>Durée</SectionTitle>
        <div className="flex flex-wrap gap-2">{[30, 60, 90, 120, 180].map((m) => <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>{m >= 60 ? `${m / 60} h${m % 60 ? ' 30' : ''}` : `${m} min`}</Chip>)}</div>

        <SectionTitle>Contenu</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {(['mixed', 'listening', 'reading'] as const).map((s) => <Chip key={s} active={scope === s} onClick={() => { setScope(s); setParts([]); }}>{{ mixed: 'Mixte', listening: 'Listening uniquement', reading: 'Reading uniquement' }[s]}</Chip>)}
        </div>
        <p className="mb-2 mt-3 text-sm text-muted">Parties spécifiques (facultatif) :</p>
        <div className="flex flex-wrap gap-2">
          {visible.map((p) => <Chip key={p} active={parts.includes(p)} onClick={() => toggle(p)}>Part {p}</Chip>)}
        </div>

        <SectionTitle>Options</SectionTitle>
        <Card className="divide-y divide-line !py-1">
          <Toggle checked={hard} onChange={setHard} label="Difficulté élevée" desc="Priorité aux questions de niveau 800–900+" />
          <Toggle checked={feedback} onChange={setFeedback} label="Correction immédiate" desc="Sinon, correction complète à la fin" />
          <Toggle checked={timer} onChange={setTimer} label="Chronomètre" desc={`Limite de ${minutes} min, la session se termine automatiquement`} />
          <Toggle checked={breaks} onChange={setBreaks} label="Pauses facultatives" desc="Une pause proposée toutes les ~25 min" />
        </Card>
        <Notice className="mt-3">La session est sauvegardée en continu : tu peux la quitter et la reprendre depuis l'accueil.</Notice>
        <Notice tone="warn" className="mt-2">Pour les longues sessions sur une seule partie, la banque peut être épuisée : des questions déjà vues seront alors reproposées (en priorité celles que tu as ratées).</Notice>
        <Button size="lg" block className={cx('mt-4')} onClick={() => run(() => startIntensive({ minutes, scope, parts, hard, feedback, timer, breaks }))}>Démarrer</Button>
      </Page>
    </>
  );
}
