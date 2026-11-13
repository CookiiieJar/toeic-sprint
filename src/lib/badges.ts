import type { Attempt, DayLog, QState, Session } from './types';
import { bestStreak } from './stats';

export interface Badge {
  id: string;
  icon: string;
  title: string;
  desc: string;
  earned: boolean;
  progress?: string;
}

export function computeBadges(d: { attempts: Attempt[]; sessions: Session[]; logs: DayLog[]; states: QState[] }): Badge[] {
  const done = d.sessions.filter((s) => s.status === 'done');
  const correct = d.attempts.filter((a) => a.correct).length;
  const best = bestStreak(d.logs);
  const mastered = d.states.filter((s) => s.err?.status === 'mastered').length;
  const parts = new Set(d.attempts.map((a) => a.part)).size;
  const perfect = done.some((s) => s.summary && s.summary.total >= 10 && s.summary.correct / s.summary.total >= 0.9);
  const intense = done.some((s) => s.type === 'intensive' && s.elapsedSec >= 3600);
  const b = (id: string, icon: string, title: string, desc: string, earned: boolean, progress?: string): Badge => ({ id, icon, title, desc, earned, progress });
  return [
    b('diag', '🧭', 'Point de départ', 'Terminer le test diagnostic', done.some((s) => s.type === 'diagnostic')),
    b('c100', '💯', '100 bonnes réponses', 'Réussir 100 questions', correct >= 100, `${Math.min(correct, 100)}/100`),
    b('c500', '🚀', '500 bonnes réponses', 'Réussir 500 questions', correct >= 500, `${Math.min(correct, 500)}/500`),
    b('s3', '🔥', 'Série de 3 jours', 'Réviser 3 jours d\'affilée', best >= 3, `${Math.min(best, 3)}/3`),
    b('s7', '⚡', 'Série de 7 jours', 'Réviser 7 jours d\'affilée', best >= 7, `${Math.min(best, 7)}/7`),
    b('s14', '🏔️', 'Série de 14 jours', 'Réviser 14 jours d\'affilée', best >= 14, `${Math.min(best, 14)}/14`),
    b('all7', '🧩', 'Les 7 parties', 'S\'entraîner sur les 7 parties du test', parts >= 7, `${parts}/7`),
    b('m10', '🛠️', '10 erreurs maîtrisées', 'Maîtriser durablement 10 erreurs', mastered >= 10, `${Math.min(mastered, 10)}/10`),
    b('p90', '🎯', 'Précision 90 %', 'Au moins 90 % sur une session de 10+ questions', perfect),
    b('int', '⏱️', 'Marathon', 'Une session intensive d\'au moins 1 h', intense),
    b('exam', '📝', 'Examen blanc', 'Terminer un examen blanc complet', done.some((s) => s.type === 'exam' && s.examKind === 'full')),
  ];
}

/** Message d'encouragement adapté (honnête, sans exagération) */
export function encouragement(rate: number | null, total: number): string {
  if (rate === null || total < 5) return 'Chaque question compte : commence par une session courte.';
  if (rate >= 0.88) return 'Excellent niveau de précision : tu es dans la zone visée pour 850+. Garde ce rythme en conditions chronométrées.';
  if (rate >= 0.8) return 'Très bon travail : tu es proche du niveau requis pour 800. Les erreurs restantes sont ta meilleure source de points.';
  if (rate >= 0.68) return 'Progression solide. Concentre-toi sur tes 3 faiblesses : c\'est là que se trouvent les points les plus faciles à gagner.';
  return 'Les débuts sont exigeants, c\'est normal. Relis bien les corrections et refais tes erreurs demain : c\'est ce qui fait progresser le plus vite.';
}
