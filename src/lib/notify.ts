import { db } from './db';
import { dayKey } from './dates';
import { studied } from './stats';

/**
 * Rappel par notification : sans serveur de push, une notification ne peut être déclenchée
 * que lorsque l'application est ouverte (ou en arrière-plan récent). On vérifie à l'heure choisie
 * si la journée a été travaillée. Pour un rappel fiable, l'export .ics est proposé.
 */
export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function requestNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

let timer: number | undefined;
export function scheduleReminder(time?: string) {
  if (timer) window.clearTimeout(timer);
  if (!time || !notificationsSupported() || Notification.permission !== 'granted') return;
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const at = new Date();
  at.setHours(h, m, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 1);
  timer = window.setTimeout(async () => {
    const log = await db.daylog.get(dayKey());
    if (!studied(log)) {
      const reg = await navigator.serviceWorker?.getRegistration();
      const body = "Tu n'as pas encore révisé aujourd'hui. 10 minutes suffisent pour garder ta série !";
      if (reg) reg.showNotification('TOEIC Sprint', { body, icon: 'icon-192.png', tag: 'daily' });
      else new Notification('TOEIC Sprint', { body });
    }
    scheduleReminder(time);
  }, Math.min(at.getTime() - now.getTime(), 2_147_000_000));
}
