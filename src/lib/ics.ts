/** Génère un calendrier .ics de rappels quotidiens (fonctionne sans serveur, dans l'agenda du téléphone). */
export function buildReminderIcs(opts: { startDay: string; endDay: string; time: string; examDay: string }): string {
  const [h, m] = opts.time.split(':').map(Number);
  const d = (k: string) => k.replace(/-/g, '');
  const hhmm = `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
  const endH = `${String((h + 1) % 24).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TOEIC Sprint//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:toeic-sprint-daily-${d(opts.startDay)}@local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${d(opts.startDay)}T${hhmm}`,
    `DTEND:${d(opts.startDay)}T${endH}`,
    `RRULE:FREQ=DAILY;UNTIL=${d(opts.endDay)}T235959`,
    'SUMMARY:TOEIC Sprint — révision du jour',
    'DESCRIPTION:Ouvre TOEIC Sprint : programme du jour\\, erreurs à revoir et flashcards.',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Révision TOEIC',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'BEGIN:VEVENT',
    `UID:toeic-sprint-exam-${d(opts.examDay)}@local`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d(opts.examDay)}`,
    'SUMMARY:Jour du TOEIC — pièce d\'identité\\, convocation\\, arriver en avance',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
