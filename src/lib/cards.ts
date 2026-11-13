import { db } from './db';
import type { Card, Question, VocabItem } from './types';
import { newSrs, review } from './srs';
import { VOCAB, FALSE_FRIENDS, COLLOCATIONS } from '../data/vocab';
import { addStudySeconds } from './sessions';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export function builtInCards(now = 0): Card[] {
  const out: Card[] = [];
  for (const g of VOCAB)
    for (const [en, fr, ex] of g.items) out.push({ id: `v-${slug(en)}`, deck: 'vocab', front: en, back: fr, example: ex, source: g.theme, srs: newSrs(now), createdAt: now });
  for (const [en, fr, ex] of FALSE_FRIENDS) out.push({ id: `ff-${slug(en)}`, deck: 'falsefriend', front: en, back: fr, example: ex, srs: newSrs(now), createdAt: now });
  for (const [en, fr, ex] of COLLOCATIONS) out.push({ id: `co-${slug(en)}`, deck: 'collocation', front: en, back: fr, example: ex, srs: newSrs(now), createdAt: now });
  return out;
}

/** Ajoute les cartes intégrées manquantes (sans écraser la progression existante) */
export async function seedCards() {
  const all = builtInCards(0);
  const existing = new Set(await db.cards.toCollection().primaryKeys());
  const missing = all.filter((c) => !existing.has(c.id));
  if (missing.length) await db.cards.bulkAdd(missing);
}

/** Règle d'une question → flashcard (deck « rule ») */
export async function addRuleCard(q: Question): Promise<boolean> {
  const id = `r-${q.id}`;
  if (await db.cards.get(id)) return false;
  const now = Date.now();
  await db.cards.add({ id, deck: 'rule', front: q.prompt ? q.prompt.replace('____', '_____') : `Règle (${q.category})`, back: q.takeaway, example: q.explanation, source: q.id, srs: newSrs(now), createdAt: now });
  return true;
}

export async function addVocabCard(v: VocabItem, source?: string): Promise<boolean> {
  const id = `w-${slug(v.en)}`;
  if (await db.cards.get(id)) return false;
  const now = Date.now();
  await db.cards.add({ id, deck: 'mine', front: v.en, back: v.fr, source, srs: newSrs(now), createdAt: now });
  return true;
}

export async function addCustomCard(front: string, back: string, example?: string) {
  const now = Date.now();
  await db.cards.add({ id: `m-${now.toString(36)}`, deck: 'mine', front, back, example, srs: newSrs(now), createdAt: now });
}

export const isNewCard = (c: Card) => c.srs.reps === 0 && c.srs.lapses === 0 && c.srs.interval === 0 && c.srs.due <= c.createdAt + 1;

/**
 * File de révision : cartes dues d'abord, puis nouvelles cartes (les tiennes en priorité),
 * avec un maximum de nouvelles cartes par session.
 */
export function buildQueue(cards: Card[], opts: { decks?: Card['deck'][]; newLimit?: number; now?: number } = {}): Card[] {
  const now = opts.now ?? Date.now();
  const pool = cards.filter((c) => !c.suspended && (!opts.decks?.length || opts.decks.includes(c.deck)));
  const due = pool.filter((c) => !isNewCard(c) && c.srs.due <= now).sort((a, b) => a.srs.due - b.srs.due);
  const order: Record<Card['deck'], number> = { rule: 0, mine: 0, falsefriend: 1, collocation: 2, vocab: 3 };
  const fresh = pool.filter(isNewCard).sort((a, b) => order[a.deck] - order[b.deck] || a.createdAt - b.createdAt);
  return [...due, ...fresh.slice(0, opts.newLimit ?? 15)];
}

export async function reviewCard(c: Card, quality: number, seconds: number) {
  const srs = review(c.srs, quality);
  await db.cards.update(c.id, { srs });
  await addStudySeconds(Math.min(seconds, 60), 1);
}
