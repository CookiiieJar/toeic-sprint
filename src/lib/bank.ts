import { buildBank, validateBank, type Bank } from './bankCore';
import type { BankFile, Question } from './types';
import { db, type Pack } from './db';

const modules = import.meta.glob('../data/bank/**/*.json', { eager: true, import: 'default' }) as Record<string, BankFile>;
const baseFiles = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, data]) => ({ name, data }));

let bank: Bank = buildBank(baseFiles);
let version = 0;
const listeners = new Set<() => void>();

export const getBank = () => bank;
export const bankVersion = () => version;
export function subscribeBank(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const q = (id: string): Question | undefined => bank.questions.get(id);

/** Force le pool « custom » sur un pack importé */
function asCustom(data: BankFile): BankFile {
  return {
    ...data,
    pool: 'custom',
    sets: data.sets?.map((s) => ({ ...s, pool: 'custom' as const })),
    questions: data.questions?.map((x) => ({ ...x, pool: 'custom' as const })),
  };
}

export async function loadPacks() {
  const packs = await db.packs.toArray();
  if (!packs.length) return;
  try {
    bank = buildBank([...baseFiles, ...packs.map((p) => ({ name: p.name, data: asCustom(p.data) }))]);
    version++;
    listeners.forEach((l) => l());
  } catch (e) {
    console.error('Pack de questions invalide ignoré', e);
  }
}

/** Valide puis enregistre un pack JSON de questions. Retourne les erreurs éventuelles. */
export async function importPack(name: string, raw: unknown): Promise<{ ok: boolean; errors: string[]; count: number }> {
  if (!raw || typeof raw !== 'object' || (!('sets' in raw) && !('questions' in raw)))
    return { ok: false, errors: ['Format inattendu : le fichier doit contenir « sets » et/ou « questions ».'], count: 0 };
  const data = asCustom(raw as BankFile);
  try {
    const existing = await db.packs.toArray();
    const test = buildBank([...baseFiles, ...existing.map((p) => ({ name: p.name, data: asCustom(p.data) })), { name, data }]);
    const report = validateBank(test);
    if (report.errors.length) return { ok: false, errors: report.errors.slice(0, 20), count: 0 };
    const count = test.questions.size - bank.questions.size;
    const pack: Pack = { id: `${Date.now()}`, name, data, importedAt: Date.now(), count };
    await db.packs.put(pack);
    bank = test;
    version++;
    listeners.forEach((l) => l());
    return { ok: true, errors: [], count };
  } catch (e) {
    return { ok: false, errors: [(e as Error).message], count: 0 };
  }
}

export async function removePack(id: string) {
  await db.packs.delete(id);
  bank = buildBank(baseFiles);
  version++;
  await loadPacks();
  listeners.forEach((l) => l());
}
