import type { BankFile, Part, Pool, QSet, Question, Unit } from './types';
import { DEFAULT_TARGET_SEC, EXAM_STRUCTURE } from './labels';

export interface Bank {
  questions: Map<string, Question>;
  sets: Map<string, QSet>;
  /** ordre stable des questions */
  order: string[];
}

export class BankError extends Error {}

/** Normalise une liste de fichiers JSON en banque indexée. */
export function buildBank(files: { name: string; data: BankFile }[], extra?: Bank): Bank {
  const questions = new Map<string, Question>(extra?.questions);
  const sets = new Map<string, QSet>(extra?.sets);
  const order: string[] = [...(extra?.order ?? [])];
  for (const { name, data } of files) {
    const fp = data.part;
    const fpool = data.pool;
    for (const s of data.sets ?? []) {
      const part = (s.part ?? fp) as Part;
      const pool = (s.pool ?? fpool) as Pool;
      if (!part || !pool) throw new BankError(`${name}: set ${s.id} sans part/pool`);
      const { questions: qs, ...rest } = s;
      const set: QSet = { ...rest, part, pool, questionIds: qs.map((q) => q.id) };
      if (sets.has(set.id)) throw new BankError(`${name}: identifiant de groupe dupliqué ${set.id}`);
      sets.set(set.id, set);
      for (const q of qs) {
        if (questions.has(q.id)) throw new BankError(`${name}: identifiant dupliqué ${q.id}`);
        questions.set(q.id, { ...q, part, pool, setId: set.id });
        order.push(q.id);
      }
    }
    for (const q of data.questions ?? []) {
      const part = (q.part ?? fp) as Part;
      const pool = (q.pool ?? fpool) as Pool;
      if (!part || !pool) throw new BankError(`${name}: question ${q.id} sans part/pool`);
      if (questions.has(q.id)) throw new BankError(`${name}: identifiant dupliqué ${q.id}`);
      questions.set(q.id, { ...q, part, pool });
      order.push(q.id);
    }
  }
  return { questions, sets, order };
}

export const letterIndex = (l: string) => 'ABCD'.indexOf(l);
export const LETTERS = ['A', 'B', 'C', 'D'] as const;

export function targetSec(q: Question): number {
  return q.targetSec ?? DEFAULT_TARGET_SEC[q.part];
}

/** Transforme une liste d'identifiants en unités d'affichage (regroupe par support partagé, ordre préservé). */
export function toUnits(bank: Bank, qids: string[]): Unit[] {
  const units: Unit[] = [];
  const bySet = new Map<string, Unit>();
  for (const id of qids) {
    const q = bank.questions.get(id);
    if (!q) continue;
    if (q.setId) {
      const u = bySet.get(q.setId);
      if (u) {
        if (!u.qids.includes(id)) u.qids.push(id);
        continue;
      }
      const nu: Unit = { setId: q.setId, qids: [id] };
      bySet.set(q.setId, nu);
      units.push(nu);
    } else units.push({ qids: [id] });
  }
  // garder l'ordre interne du set
  for (const u of units) {
    if (u.setId) {
      const set = bank.sets.get(u.setId)!;
      u.qids.sort((a, b) => set.questionIds.indexOf(a) - set.questionIds.indexOf(b));
    }
  }
  return units;
}

/** Texte complet d'un support (pour vérifier les citations) */
export function stimulusText(set: QSet): string {
  const parts: string[] = [];
  for (const l of set.audio ?? []) parts.push(l.t);
  const docs = [...(set.docs ?? []), ...(set.graphic ? [set.graphic] : [])];
  for (const d of docs) {
    switch (d.type) {
      case 'email':
        parts.push(d.from, d.to, d.subject, d.date ?? '', d.body);
        break;
      case 'text':
        parts.push(d.title ?? '', d.subtitle ?? '', d.body);
        break;
      case 'table':
        parts.push(d.title ?? '', d.columns.join(' '), ...d.rows.map((r) => r.join(' ')), d.note ?? '');
        break;
      case 'chat':
        for (const m of d.messages) parts.push(`${m.name} ${m.text}`);
        break;
      case 'form':
        parts.push(d.title ?? '', ...d.fields.map((f) => f.join(' ')), d.body ?? '');
        break;
    }
  }
  return parts.join('\n');
}

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\{\{\d\}\}|\[\d\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export interface ValidationReport {
  errors: string[];
  warnings: string[];
  stats: Record<string, number>;
}

/** Validation exhaustive de la banque : réponses, identifiants, groupes, explications, citations. */
export function validateBank(bank: Bank, opts: { requireExam?: boolean } = {}): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats: Record<string, number> = {};
  const inc = (k: string, n = 1) => (stats[k] = (stats[k] ?? 0) + n);
  const prompts = new Map<string, string>();

  for (const q of bank.questions.values()) {
    const where = `[${q.id}]`;
    inc(`pool:${q.pool}`);
    inc(`part:${q.part}`);
    inc(`pool:${q.pool}:part:${q.part}`);
    const nOpts = q.part === 2 ? 3 : 4;
    if (!/^[a-z0-9-]+$/.test(q.id)) errors.push(`${where} identifiant invalide`);
    if (q.options.length !== nOpts) errors.push(`${where} ${q.options.length} options (attendu ${nOpts})`);
    const ai = letterIndex(q.answer);
    if (ai < 0 || ai >= q.options.length) errors.push(`${where} réponse ${q.answer} hors limites`);
    if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) errors.push(`${where} options en double`);
    if (q.options.some((o) => !o.trim())) errors.push(`${where} option vide`);
    if (![1, 2, 3].includes(q.level)) errors.push(`${where} niveau invalide`);
    if (!q.category) errors.push(`${where} catégorie manquante`);
    if (!q.explanation || q.explanation.length < 40) errors.push(`${where} explication trop courte`);
    if (!q.takeaway || q.takeaway.length < 10) errors.push(`${where} notion à retenir manquante`);
    if (/lorem|placeholder|todo|xxx/i.test(q.explanation + (q.prompt ?? '') + q.options.join(' ')))
      errors.push(`${where} contenu placeholder`);
    const correct = q.options[ai] ?? '';

    if (q.part === 1 && !q.scene) errors.push(`${where} Part 1 sans illustration`);
    if (q.part === 2 && !q.prompt) errors.push(`${where} Part 2 sans question orale`);
    if (q.part === 5) {
      if (!q.prompt || !q.prompt.includes('____')) errors.push(`${where} Part 5 sans blanc ____`);
      if (!norm(q.explanation).includes(norm(correct)))
        errors.push(`${where} l'explication ne mentionne pas la bonne réponse « ${correct} »`);
    }
    if (q.part === 6 && correct.split(' ').length <= 4 && !norm(q.explanation).includes(norm(correct)))
      errors.push(`${where} l'explication ne mentionne pas la bonne réponse « ${correct} »`);
    if ([3, 4, 7].includes(q.part) && !q.prompt) errors.push(`${where} intitulé de question manquant`);
    if (q.prompt) {
      const key = norm(q.prompt) + '|' + (q.setId ?? '');
      if (prompts.has(key)) errors.push(`${where} intitulé identique à ${prompts.get(key)}`);
      prompts.set(key, q.id);
    }
    if ([3, 4, 6, 7].includes(q.part) && !q.setId) errors.push(`${where} Part ${q.part} hors groupe`);
    if (q.setId) {
      const set = bank.sets.get(q.setId);
      if (!set) errors.push(`${where} groupe ${q.setId} introuvable`);
      else {
        if (q.evidence && !norm(stimulusText(set)).includes(norm(q.evidence)))
          errors.push(`${where} citation introuvable dans le support : « ${q.evidence} »`);
        const needEvidence = [3, 4, 7].includes(q.part) && !['sentence-insertion', 'cross-reference', 'graphic', 'not-true'].includes(q.category);
        if (needEvidence && !q.evidence) errors.push(`${where} citation justificative (evidence) manquante`);
      }
    }
    inc(`level:${q.level}`);
  }

  for (const s of bank.sets.values()) {
    const where = `[set ${s.id}]`;
    const n = s.questionIds.length;
    if ((s.part === 3 || s.part === 4) && n !== 3) errors.push(`${where} ${n} questions (attendu 3)`);
    if ((s.part === 3 || s.part === 4) && !s.audio?.length) errors.push(`${where} sans audio`);
    if (s.part === 3 && new Set(s.audio?.map((l) => l.s)).size < 2) errors.push(`${where} conversation à un seul locuteur`);
    if (s.part === 6) {
      if (n !== 4) errors.push(`${where} ${n} questions (attendu 4)`);
      const body = (s.docs ?? []).map((d) => ('body' in d ? d.body : '')).join(' ');
      for (let i = 1; i <= n; i++) if (!body.includes(`{{${i}}}`)) errors.push(`${where} blanc {{${i}}} manquant`);
    }
    if (s.part === 7) {
      if (!s.docs?.length) errors.push(`${where} sans document`);
      const nd = s.docs?.length ?? 0;
      if (s.kind === 'double' && (nd !== 2 || n !== 5)) errors.push(`${where} double : ${nd} docs / ${n} q (attendu 2/5)`);
      if (s.kind === 'triple' && (nd !== 3 || n !== 5)) errors.push(`${where} triple : ${nd} docs / ${n} q (attendu 3/5)`);
      if (s.kind === 'single' && (n < 2 || n > 4)) errors.push(`${where} simple : ${n} questions (attendu 2 à 4)`);
      inc(`p7:${s.pool}:${s.kind}`, n);
      const qs = s.questionIds.map((id) => bank.questions.get(id)!);
      for (const q of qs.filter((q) => q?.category === 'sentence-insertion')) {
        const body = (s.docs ?? []).map((d) => ('body' in d ? d.body : '')).join(' ');
        for (let i = 1; i <= 4; i++) if (!body.includes(`[${i}]`)) errors.push(`[${q.id}] position [${i}] absente du texte`);
      }
    }
    for (const qid of s.questionIds) if (!bank.questions.has(qid)) errors.push(`${where} question ${qid} manquante`);
  }

  // Équilibre des lettres
  for (const part of [1, 2, 3, 4, 5, 6, 7] as Part[]) {
    const qs = [...bank.questions.values()].filter((q) => q.part === part);
    if (qs.length < 8) continue;
    const counts: Record<string, number> = {};
    for (const q of qs) counts[q.answer] = (counts[q.answer] ?? 0) + 1;
    for (const [l, c] of Object.entries(counts))
      if (c / qs.length > 0.4) warnings.push(`Part ${part} : la lettre ${l} est la bonne réponse dans ${Math.round((100 * c) / qs.length)} % des cas`);
  }

  if (opts.requireExam) {
    for (const p of [1, 2, 3, 4, 5, 6, 7] as Part[]) {
      const c = stats[`pool:exam1:part:${p}`] ?? 0;
      if (c !== EXAM_STRUCTURE[p]) errors.push(`Examen 1 : Part ${p} contient ${c} questions (attendu ${EXAM_STRUCTURE[p]})`);
    }
    if ((stats['p7:exam1:single'] ?? 0) !== 29) errors.push(`Examen 1 : Part 7 documents simples = ${stats['p7:exam1:single'] ?? 0} (attendu 29)`);
    const multi = (stats['p7:exam1:double'] ?? 0) + (stats['p7:exam1:triple'] ?? 0);
    if (multi !== 25) errors.push(`Examen 1 : Part 7 documents multiples = ${multi} (attendu 25)`);
  }
  return { errors, warnings, stats };
}

/** Questions d'un pool pour une partie donnée */
export function byPool(bank: Bank, pool: Pool | Pool[]): Question[] {
  const pools = Array.isArray(pool) ? pool : [pool];
  return bank.order.map((id) => bank.questions.get(id)!).filter((q) => pools.includes(q.pool));
}
