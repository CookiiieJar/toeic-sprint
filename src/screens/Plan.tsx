import { useMemo } from 'react';
import { useAttempts, useLogs, useProfile, useSessions } from '../lib/hooks';
import { buildPlan, PHASES } from '../lib/plan';
import { dayKey, formatDayFr } from '../lib/dates';
import { navigate } from '../lib/router';
import { saveProfile } from '../lib/sessions';
import { Card, Chip, Header, Notice, Page, SectionTitle, cx } from '../components/ui';
import { TaskRow, weakPartsOf } from './Home';

export function Plan() {
  const profile = useProfile();
  const sessions = useSessions();
  const logs = useLogs();
  const attempts = useAttempts();
  const today = dayKey();
  const plan = useMemo(() => (profile ? buildPlan({ profile, sessions, logs, weakParts: weakPartsOf(attempts) }) : []), [profile, sessions, logs, attempts]);
  if (!profile) return null;
  const wp = weakPartsOf(attempts);
  return (
    <>
      <Header title="Planning intensif" subtitle={`Jusqu'au ${formatDayFr(profile.examDate)}`} onBack={() => navigate('/')} />
      <Page>
        <Notice>Le planning s'adapte : parties faibles détectées ({wp.length ? `Parts ${wp.join(', ')}` : 'après le diagnostic'}), diagnostic ou examen blanc non faits, jours manqués et disponibilité. Les tâches se cochent automatiquement quand tu les réalises.</Notice>
        <SectionTitle>Ma disponibilité</SectionTitle>
        <Card className="space-y-3">
          <div>
            <p className="m-0 mb-1.5 text-sm font-medium">En semaine</p>
            <div className="flex flex-wrap gap-2">{[30, 45, 60, 90, 120].map((m) => <Chip key={m} active={profile.dailyMinutes === m} onClick={() => saveProfile({ dailyMinutes: m })}>{m} min</Chip>)}</div>
          </div>
          <div>
            <p className="m-0 mb-1.5 text-sm font-medium">Le week-end</p>
            <div className="flex flex-wrap gap-2">{[60, 90, 120, 180, 240].map((m) => <Chip key={m} active={profile.weekendMinutes === m} onClick={() => saveProfile({ weekendMinutes: m })}>{m >= 60 ? `${m / 60} h` : `${m} min`}</Chip>)}</div>
          </div>
        </Card>
        {PHASES.map((ph) => {
          const days = plan.filter((d) => d.j <= ph.from && d.j >= ph.to);
          if (!days.length) return null;
          return (
            <section key={ph.name}>
              <SectionTitle>{ph.name}</SectionTitle>
              <p className="-mt-1 mb-2 text-sm text-muted">{ph.focus}</p>
              <div className="space-y-2">
                {days.map((d) => (
                  <Card key={d.day} className={cx(d.isToday && '!border-primary ring-1 ring-primary', d.isPast && 'opacity-80')}>
                    <div className="mb-1 flex items-center justify-between">
                      <b className="capitalize">{formatDayFr(d.day)}{d.isToday ? " · aujourd'hui" : ''}</b>
                      <span className="text-xs text-muted">{d.j > 0 ? `J-${d.j}` : 'Jour J'}{d.isPast ? (d.studied ? ' · ✓ travaillé' : ' · manqué') : ''}</span>
                    </div>
                    {d.note && <Notice tone="warn" className="mb-1">{d.note}</Notice>}
                    {d.tasks.map((t) => <TaskRow key={t.id} t={t} disabled={!d.isToday && t.kind !== 'checklist'} />)}
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
        {today > profile.examDate && <Notice className="mt-4">La date d'examen est passée. Tu peux la modifier dans les réglages.</Notice>}
      </Page>
    </>
  );
}
