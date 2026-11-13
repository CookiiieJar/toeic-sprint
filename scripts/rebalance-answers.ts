/**
 * Outil d'auteur : rééquilibre la position des bonnes réponses dans un fichier de la banque
 * en échangeant deux options, et remappe les références « (A) » … « (D) » dans les explications.
 * Les options ordonnées (nombres, heures, jours, positions [1]-[4]) ne sont jamais modifiées.
 * Usage : npx tsx scripts/rebalance-answers.ts src/data/bank/exam1/p3p4.json
 */
import { readFileSync, writeFileSync } from 'node:fs';

const L = ['A', 'B', 'C', 'D'];
const ORDERED = /\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday|^\[\d\]$/i;

function swapRefs(text: string | undefined, a: string, b: string) {
  if (!text) return text;
  return text.replace(/\(([ABCD])\)/g, (m, l) => (l === a ? `(${b})` : l === b ? `(${a})` : m));
}

for (const path of process.argv.slice(2)) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const all: any[] = [...(data.questions ?? []), ...(data.sets ?? []).flatMap((s: any) => s.questions)];
  const counters: Record<string, number> = {};
  let changed = 0;
  for (const q of all) {
    const part = q.part ?? data.part ?? (data.sets ?? []).find((s: any) => s.questions.includes(q))?.part ?? 0;
    const n = q.options.length;
    if (q.options.some((o: string) => ORDERED.test(o))) continue;
    const key = String(part);
    const k = (counters[key] = (counters[key] ?? 0) + 1);
    const target = L[(k * 7 + n) % n]; // séquence déterministe et variée
    const from = q.answer;
    if (target === from) continue;
    const i = L.indexOf(from), j = L.indexOf(target);
    [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
    q.answer = target;
    q.explanation = swapRefs(q.explanation, from, target);
    q.traps = swapRefs(q.traps, from, target);
    changed++;
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${path} : ${changed} question(s) réordonnée(s)`);
}
