import { db, TABLES } from './db';

export const BACKUP_FORMAT = 'toeic-sprint-backup';

export async function exportData(): Promise<string> {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) data[t] = await db.table(t).toArray();
  return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), data }, null, 1);
}

export function downloadText(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Remplace toutes les données par celles de la sauvegarde (après validation du format). */
export async function importData(text: string): Promise<{ ok: boolean; message: string }> {
  let parsed: { format?: string; version?: number; data?: Record<string, unknown[]> };
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: 'Fichier illisible : ce n\'est pas un JSON valide.' };
  }
  if (parsed.format !== BACKUP_FORMAT || !parsed.data || typeof parsed.data !== 'object')
    return { ok: false, message: 'Ce fichier n\'est pas une sauvegarde TOEIC Sprint.' };
  for (const t of TABLES) {
    const rows = parsed.data[t];
    if (rows !== undefined && !Array.isArray(rows)) return { ok: false, message: `Table « ${t} » invalide.` };
  }
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = parsed.data![t];
      if (rows?.length) await db.table(t).bulkPut(rows);
    }
  });
  const n = (parsed.data.attempts ?? []).length;
  return { ok: true, message: `Sauvegarde restaurée (${n} réponses enregistrées).` };
}

export async function resetAll() {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear();
  });
}
