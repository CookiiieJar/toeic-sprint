import { describe, expect, it } from 'vitest';
import { buildPlan } from '../src/lib/plan';
import { DEFAULT_PROFILE } from '../src/lib/sessions';
import type { Session } from '../src/lib/types';

const profile = { ...DEFAULT_PROFILE, onboarded: true };
const sess = (p: Partial<Session>): Session => ({ id: Math.random().toString(), type: 'daily', title: '', mode: 'practice', units: [], answers: {}, cursor: 0, createdAt: 0, updatedAt: 0, status: 'done', elapsedSec: 0, immediateFeedback: true, showTimer: true, ...p });

describe('planning adaptatif', () => {
  it('couvre du 11 au 28 novembre avec les bonnes phases', () => {
    const plan = buildPlan({ profile, sessions: [], logs: [], weakParts: [], examCount: 5, today: '2026-11-11' });
    expect(plan[0].day).toBe('2026-11-11');
    expect(plan.at(-1)!.day).toBe('2026-11-28');
    expect(plan[0].tasks[0].kind).toBe('diagnostic');
    expect(plan.find((d) => d.day === '2026-11-27')!.tasks.every((t) => t.minutes <= 15)).toBe(true);
    expect(plan.at(-1)!.tasks[0].kind).toBe('checklist');
    expect(plan.find((d) => d.day === '2026-11-21')!.tasks.some((t) => t.kind === 'exam-full')).toBe(true);
  });
  it("répartit les examens blancs disponibles puis bascule sur des mini-examens", () => {
    const five = buildPlan({ profile, sessions: [], logs: [], weakParts: [], examCount: 5, today: '2026-11-11' });
    expect(five.filter((d) => d.tasks.some((t) => t.kind === 'exam-full')).map((d) => d.j)).toEqual([13, 10, 7, 5, 3]);
    const one = buildPlan({ profile, sessions: [], logs: [], weakParts: [], examCount: 1, today: '2026-11-11' });
    expect(one.filter((d) => d.tasks.some((t) => t.kind === 'exam-full')).length).toBe(1);
    expect(one.filter((d) => d.tasks.some((t) => t.kind === 'mini-exam')).length).toBeGreaterThanOrEqual(3);
  });
  it("ajoute le diagnostic s'il n'a pas été fait", () => {
    const plan = buildPlan({ profile, sessions: [], logs: [], weakParts: [], today: '2026-11-14' });
    expect(plan.find((d) => d.isToday)!.tasks[0].kind).toBe('diagnostic');
  });
  it("reporte l'examen blanc complet s'il n'a pas été passé", () => {
    const p = { ...profile, diagnosticSessionId: 'x' };
    const plan = buildPlan({ profile: p, sessions: [], logs: [], weakParts: [], today: '2026-11-24' });
    expect(plan.find((d) => d.isToday)!.tasks.some((t) => t.kind === 'exam-full')).toBe(true);
  });
  it('cible les parties faibles et coche les tâches réalisées', () => {
    const p = { ...profile, diagnosticSessionId: 'x' };
    const done = sess({ type: 'intensive', elapsedSec: 3600, finishedAt: new Date(2026, 10, 13, 18).getTime() });
    const plan = buildPlan({ profile: p, sessions: [done], logs: [], weakParts: [3, 7], today: '2026-11-13' });
    const day = plan.find((d) => d.day === '2026-11-13')!;
    const t = day.tasks.find((x) => x.kind === 'intensive')!;
    expect(t.parts).toEqual([3, 7]);
    expect(t.done).toBe(true);
  });
  it('adapte les durées à la disponibilité', () => {
    const small = buildPlan({ profile: { ...profile, dailyMinutes: 30 }, sessions: [], logs: [], weakParts: [], today: '2026-11-01' });
    const big = buildPlan({ profile: { ...profile, dailyMinutes: 120 }, sessions: [], logs: [], weakParts: [], today: '2026-11-01' });
    const sum = (pl: typeof small) => pl.find((d) => d.day === '2026-11-17')!.tasks.reduce((s, t) => s + t.minutes, 0);
    expect(sum(small)).toBeLessThan(sum(big));
  });
});
