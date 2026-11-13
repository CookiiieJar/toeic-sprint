import { useMemo, useRef, useState } from 'react';
import { useCards } from '../lib/hooks';
import { addCustomCard, buildQueue, isNewCard, reviewCard } from '../lib/cards';
import { navigate } from '../lib/router';
import type { Card as CardT } from '../lib/types';
import { Button, Card, Chip, Header, Notice, Page, Sheet, Stat } from '../components/ui';

const DECKS: { k: CardT['deck']; l: string }[] = [
  { k: 'rule', l: 'Mes règles' },
  { k: 'mine', l: 'Mes mots' },
  { k: 'vocab', l: 'Vocabulaire pro' },
  { k: 'falsefriend', l: 'Faux amis' },
  { k: 'collocation', l: 'Collocations' },
];

export function Flashcards() {
  const cards = useCards();
  const [decks, setDecks] = useState<CardT['deck'][]>([]);
  const [queue, setQueue] = useState<CardT[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [done, setDone] = useState(0);
  const shownAt = useRef(Date.now());

  const preview = useMemo(() => buildQueue(cards, { decks, newLimit: 15 }), [cards, decks]);
  const dueCount = preview.filter((c) => !isNewCard(c)).length;
  const learned = cards.filter((c) => c.srs.reps >= 2).length;

  const start = () => {
    setQueue(preview);
    setIdx(0);
    setFlipped(false);
    setDone(0);
    shownAt.current = Date.now();
  };

  const grade = async (q: number) => {
    if (!queue) return;
    const c = queue[idx];
    await reviewCard(c, q, (Date.now() - shownAt.current) / 1000);
    const next = [...queue];
    if (q < 3) next.push(c); // à revoir dans la même session
    setQueue(next);
    setDone((d) => d + 1);
    setIdx((i) => i + 1);
    setFlipped(false);
    shownAt.current = Date.now();
  };

  if (queue) {
    const c = queue[idx];
    if (!c) {
      return (
        <>
          <Header title="Flashcards" onBack={() => setQueue(null)} />
          <Page>
            <Notice tone="ok">Session terminée : {done} révision(s). Les cartes reviendront au bon moment grâce à la répétition espacée.</Notice>
            <Button block className="mt-3" onClick={() => setQueue(null)}>Retour</Button>
          </Page>
        </>
      );
    }
    const front = reverse ? c.back : c.front;
    const back = reverse ? c.front : c.back;
    return (
      <>
        <Header title="Flashcards" subtitle={`${idx + 1} / ${queue.length}`} onBack={() => setQueue(null)} />
        <Page>
          <button onClick={() => setFlipped(true)} className="flex min-h-[46dvh] w-full flex-col items-center justify-center rounded-3xl border border-line bg-surface p-6 text-center shadow-sm" aria-label="Retourner la carte">
            <span className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{DECKS.find((d) => d.k === c.deck)?.l}{isNewCard(c) ? ' · nouvelle' : ''}</span>
            <span className="text-2xl font-bold">{front}</span>
            {flipped ? (
              <span className="mt-5 anim-in">
                <span className="block text-xl text-primary">{back}</span>
                {c.example && <span className="mt-3 block text-sm italic text-muted">{c.example}</span>}
              </span>
            ) : <span className="mt-6 text-sm text-muted">Touchez pour voir la réponse</span>}
          </button>
          {flipped ? (
            <div className="mt-4 grid grid-cols-4 gap-2">
              <Button variant="danger" onClick={() => grade(1)}>À revoir</Button>
              <Button variant="ghost" onClick={() => grade(3)}>Difficile</Button>
              <Button variant="soft" onClick={() => grade(4)}>Bien</Button>
              <Button variant="ok" onClick={() => grade(5)}>Facile</Button>
            </div>
          ) : <Button block size="lg" className="mt-4" onClick={() => setFlipped(true)}>Voir la réponse</Button>}
        </Page>
      </>
    );
  }

  return (
    <>
      <Header title="Flashcards" onBack={() => navigate('/practice')} />
      <Page>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="À revoir" value={dueCount} />
          <Stat label="Nouvelles (max)" value={preview.length - dueCount} />
          <Stat label="Bien connues" value={learned} />
        </div>
        <p className="mb-2 mt-4 text-sm text-muted">Paquets (aucun = tous) :</p>
        <div className="flex flex-wrap gap-2">
          {DECKS.map((d) => <Chip key={d.k} active={decks.includes(d.k)} onClick={() => setDecks((ds) => (ds.includes(d.k) ? ds.filter((x) => x !== d.k) : [...ds, d.k]))}>{d.l} ({cards.filter((c) => c.deck === d.k).length})</Chip>)}
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} className="h-5 w-5" /> Sens français → anglais</label>
        <Button block size="lg" className="mt-4" disabled={!preview.length} onClick={start}>{preview.length ? `Réviser ${preview.length} carte(s)` : 'Rien à réviser pour le moment'}</Button>
        <Button block variant="ghost" className="mt-2" onClick={() => setAddOpen(true)}>+ Créer une carte</Button>
        <Card className="mt-4 text-sm text-muted">
          Répétition espacée (SM-2 adaptée) : « À revoir » remet la carte dans la session ; « Bien » la repousse à 1 jour, puis 3 jours, puis davantage. 15 nouvelles cartes maximum par session pour éviter la surcharge. Les règles ajoutées depuis tes corrections passent en priorité.
        </Card>
        <AddCard open={addOpen} onClose={() => setAddOpen(false)} />
      </Page>
    </>
  );
}

function AddCard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [ex, setEx] = useState('');
  const input = 'w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px]';
  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle carte">
      <div className="space-y-3">
        <label className="block text-sm font-medium">Anglais<input className={input} value={front} onChange={(e) => setFront(e.target.value)} /></label>
        <label className="block text-sm font-medium">Français / règle<input className={input} value={back} onChange={(e) => setBack(e.target.value)} /></label>
        <label className="block text-sm font-medium">Exemple (facultatif)<input className={input} value={ex} onChange={(e) => setEx(e.target.value)} /></label>
        <Button block disabled={!front.trim() || !back.trim()} onClick={async () => { await addCustomCard(front.trim(), back.trim(), ex.trim() || undefined); setFront(''); setBack(''); setEx(''); onClose(); }}>Ajouter</Button>
      </div>
    </Sheet>
  );
}
