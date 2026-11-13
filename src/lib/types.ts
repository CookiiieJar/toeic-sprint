// ───────────── Banque de questions ─────────────
export type Part = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Letter = 'A' | 'B' | 'C' | 'D';
export type Pool = 'exam1' | 'diag' | 'practice' | 'custom';
export type Level = 1 | 2 | 3;
/** M/W = homme/femme, M2/W2 = second homme/femme, N = narrateur */
export type Speaker = 'M' | 'W' | 'M2' | 'W2' | 'N';

export interface Line {
  s: Speaker;
  t: string;
}

export type Doc =
  | { type: 'email'; from: string; to: string; subject: string; date?: string; body: string }
  | { type: 'text'; title?: string; subtitle?: string; body: string }
  | { type: 'table'; title?: string; columns: string[]; rows: string[][]; note?: string }
  | { type: 'chat'; messages: { name: string; time: string; text: string }[] }
  | { type: 'form'; title?: string; fields: [string, string][]; body?: string };

export interface SceneEl {
  t: string;
  x: number;
  y?: number;
  [k: string]: unknown;
}
export interface Scene {
  bg: string;
  els: SceneEl[];
  /** description textuelle (accessibilité / affichée après réponse) */
  alt: string;
}

export interface VocabItem {
  en: string;
  fr: string;
}

export interface Question {
  id: string;
  part: Part;
  pool: Pool;
  level: Level;
  category: string;
  setId?: string;
  /** P2 : question orale ; P3/4/7 : intitulé ; P5 : phrase à trous (____) */
  prompt?: string;
  options: string[];
  answer: Letter;
  /** Explication en français de la bonne réponse */
  explanation: string;
  /** Pourquoi les autres options sont fausses / pièges */
  traps?: string;
  /** Règle / notion à retenir */
  takeaway: string;
  /** Citation exacte du support qui justifie la réponse (vérifiée par le validateur) */
  evidence?: string;
  targetSec?: number;
  scene?: Scene;
  vocab?: VocabItem[];
  /** fichier audio local optionnel (Parts 1–2) */
  audioFile?: string;
}

export interface QSet {
  id: string;
  part: Part;
  pool: Pool;
  kind: 'conversation' | 'talk' | 'text' | 'single' | 'double' | 'triple';
  title?: string;
  audio?: Line[];
  /** documents (P6 : blancs {{1}}..{{4}} ; P7 : positions [1]..[4]) */
  docs?: Doc[];
  /** graphique associé (P3/P4) */
  graphic?: Doc;
  questionIds: string[];
  vocab?: VocabItem[];
  /** fichier audio local optionnel (public/audio/...) — prioritaire sur la synthèse vocale */
  audioFile?: string;
}

/** Format des fichiers JSON de la banque */
export interface BankFile {
  part?: Part;
  pool?: Pool;
  sets?: (Omit<QSet, 'questionIds' | 'part' | 'pool'> & {
    part?: Part;
    pool?: Pool;
    questions: Omit<Question, 'part' | 'pool' | 'setId'>[];
  })[];
  questions?: (Omit<Question, 'part' | 'pool'> & { part?: Part; pool?: Pool })[];
}

/** Unité affichée à l'écran : une question isolée ou un groupe partageant un support */
export interface Unit {
  setId?: string;
  qids: string[];
}

// ───────────── Données utilisateur ─────────────
export type SessionType =
  | 'daily'
  | 'intensive'
  | 'diagnostic'
  | 'exam'
  | 'mini'
  | 'errors'
  | 'grammar'
  | 'part';

export interface AnswerRec {
  choice: Letter | null;
  timeMs: number;
  at: number;
  flagged?: boolean;
  /** tentative déjà enregistrée dans l'historique */
  recorded?: boolean;
}

export interface SessionSummary {
  total: number;
  answered: number;
  correct: number;
  timeSec: number;
  byPart: Partial<Record<Part, { total: number; correct: number }>>;
  byCategory: Record<string, { total: number; correct: number }>;
  wrongIds: string[];
  listening?: { total: number; correct: number };
  reading?: { total: number; correct: number };
}

export interface Session {
  id: string;
  type: SessionType;
  title: string;
  /** practice = correction possible ; exam = conditions d'examen */
  mode: 'practice' | 'exam';
  units: Unit[];
  answers: Record<string, AnswerRec>;
  cursor: number;
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
  status: 'active' | 'paused' | 'done' | 'abandoned';
  elapsedSec: number;
  /** limite de temps globale (s) */
  timeLimitSec?: number;
  /** limite de temps de la section Reading (examen) */
  readingLimitSec?: number;
  readingElapsedSec?: number;
  immediateFeedback: boolean;
  showTimer: boolean;
  examKind?: 'full' | 'listening' | 'reading' | 'mini';
  summary?: SessionSummary;
  /** unités dont l'audio a été joué (mode examen : lecture unique) */
  played?: string[];
  /** indices d'unités après lesquels une pause est proposée */
  breaks?: number[];
  /** questions déjà validées (mode entraînement) */
  validated?: string[];
  meta?: Record<string, unknown>;
}

export interface Attempt {
  id?: number;
  qid: string;
  part: Part;
  category: string;
  level: Level;
  correct: boolean;
  choice: Letter | null;
  timeMs: number;
  at: number;
  day: string;
  sessionId: string;
  sessionType: SessionType;
  mode: 'practice' | 'exam';
}

export interface Srs {
  ease: number;
  interval: number; // jours
  reps: number;
  due: number; // timestamp
  lapses: number;
}

export interface QState {
  qid: string;
  seen: number;
  correct: number;
  wrong: number;
  lastSeen: number;
  lastResult?: boolean;
  /** carte d'erreur (créée au premier échec) */
  err?: {
    firstWrongAt: number;
    lastWrongAt: number;
    lastChoice: Letter | null;
    lastTimeMs: number;
    srs: Srs;
    reviews: number;
    status: 'new' | 'learning' | 'review' | 'mastered';
    note?: string;
  };
  favorite?: boolean;
}

export interface Card {
  id: string;
  deck: 'vocab' | 'rule' | 'falsefriend' | 'collocation' | 'mine';
  front: string;
  back: string;
  example?: string;
  source?: string;
  srs: Srs;
  createdAt: number;
  suspended?: boolean;
}

export interface DayLog {
  day: string;
  seconds: number;
  questions: number;
  correct: number;
  cards: number;
}

export interface Profile {
  id: 'me';
  baseScore: number;
  listeningPrev?: number;
  readingPrev?: number;
  targetMin: number;
  targetIdeal: number;
  examDate: string; // YYYY-MM-DD
  dailyMinutes: number;
  weekendMinutes: number;
  dailyGoalQuestions: number;
  onboarded: boolean;
  diagnosticSessionId?: string;
  rate: number; // vitesse audio entraînement
  reminderTime?: string; // HH:MM
  voicePrefs?: Partial<Record<Speaker, string>>;
  /** une seule voix pour tous les personnages (plus fiable) */
  singleVoice?: boolean;
  createdAt: number;
}

export interface ConceptState {
  key: string; // catégorie ou fiche
  manualMastered?: boolean;
  quizBest?: number;
}
