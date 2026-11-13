/**
 * Validation de la banque de questions.
 * Usage : npm run validate            (banque intégrée)
 *         npm run validate -- pack.json  (vérifier un pack externe avant import)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildBank, validateBank, BankError } from '../src/lib/bankCore';
import type { BankFile } from '../src/lib/types';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
}

const root = join(import.meta.dirname, '..', 'src', 'data', 'bank');
const extra = process.argv.slice(2);
const paths = extra.length ? extra : walk(root);
const files = paths.map((p) => ({ name: relative(process.cwd(), p), data: JSON.parse(readFileSync(p, 'utf8')) as BankFile }));

try {
  const bank = buildBank(files);
  const report = validateBank(bank, { requireExam: !extra.length });
  console.log(`Questions : ${bank.questions.size} — groupes : ${bank.sets.size}`);
  const s = report.stats;
  for (const pool of [...Object.keys(s).filter((k) => /^pool:exam\d$/.test(k)).map((k) => k.slice(5)).sort(), 'diag', 'practice', 'custom']) {
    if (!s[`pool:${pool}`]) continue;
    const parts = [1, 2, 3, 4, 5, 6, 7].map((p) => `P${p}:${s[`pool:${pool}:part:${p}`] ?? 0}`).join(' ');
    console.log(`  ${pool.padEnd(9)} ${String(s[`pool:${pool}`]).padStart(4)}  ${parts}`);
  }
  console.log(`  Niveaux : 1=${s['level:1'] ?? 0}  2=${s['level:2'] ?? 0}  3=${s['level:3'] ?? 0}`);
  for (const w of report.warnings) console.warn('⚠️  ' + w);
  if (report.errors.length) {
    for (const e of report.errors) console.error('❌ ' + e);
    console.error(`\n${report.errors.length} erreur(s).`);
    process.exit(1);
  }
  console.log('✅ Banque valide.');
} catch (e) {
  if (e instanceof BankError) {
    console.error('❌ ' + e.message);
    process.exit(1);
  }
  throw e;
}
