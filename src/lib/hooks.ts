import { useLiveQuery } from 'dexie-react-hooks';
import { useSyncExternalStore } from 'react';
import { db } from './db';
import { getProfile } from './sessions';
import { bankVersion, subscribeBank } from './bank';

export const useProfile = () => useLiveQuery(() => getProfile(), []);
export const useAttempts = () => useLiveQuery(() => db.attempts.toArray(), []) ?? [];
export const useStates = () => useLiveQuery(() => db.qstate.toArray(), []) ?? [];
export const useSessions = () => useLiveQuery(() => db.sessions.orderBy('createdAt').toArray(), []) ?? [];
export const useLogs = () => useLiveQuery(() => db.daylog.toArray(), []) ?? [];
export const useCards = () => useLiveQuery(() => db.cards.toArray(), []) ?? [];
export const useBankVersion = () => useSyncExternalStore(subscribeBank, bankVersion);

/** Exécute une action asynchrone en affichant une éventuelle erreur à l'utilisateur */
export async function run(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    alert((e as Error).message);
  }
}
