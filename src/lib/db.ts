import Dexie, { type EntityTable } from 'dexie';
import type { Attempt, BankFile, Card, ConceptState, DayLog, Profile, QState, Session } from './types';

export interface Pack {
  id: string;
  name: string;
  data: BankFile;
  importedAt: number;
  count: number;
}
export interface Meta {
  key: string;
  value: unknown;
}

export class AppDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;
  qstate!: EntityTable<QState, 'qid'>;
  cards!: EntityTable<Card, 'id'>;
  daylog!: EntityTable<DayLog, 'day'>;
  concepts!: EntityTable<ConceptState, 'key'>;
  packs!: EntityTable<Pack, 'id'>;
  meta!: EntityTable<Meta, 'key'>;

  constructor(name = 'toeic-sprint') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      sessions: 'id, status, type, createdAt, finishedAt',
      attempts: '++id, qid, day, sessionId, at, part',
      qstate: 'qid',
      cards: 'id, deck',
      daylog: 'day',
      concepts: 'key',
      packs: 'id',
      meta: 'key',
    });
  }
}

export let db = new AppDB();

/** Utilisé par les tests pour isoler une base */
export function useTestDb(name: string) {
  db = new AppDB(name);
  return db;
}

export const TABLES = ['profile', 'sessions', 'attempts', 'qstate', 'cards', 'daylog', 'concepts', 'packs', 'meta'] as const;
