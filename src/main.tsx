import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import { seedCards } from './lib/cards';
import { loadPacks } from './lib/bank';
import { speech } from './lib/audio';
import { getProfile } from './lib/sessions';
import { scheduleReminder } from './lib/notify';

registerSW({ immediate: true });

async function boot() {
  // Demande un stockage persistant (évite l'effacement automatique par le navigateur)
  try { await navigator.storage?.persist?.(); } catch { /* non supporté */ }
  await Promise.allSettled([seedCards(), loadPacks(), speech.init()]);
  const p = await getProfile();
  speech.prefs = p.voicePrefs ?? {};
  speech.singleVoice = !!p.singleVoice;
  scheduleReminder(p.reminderTime);
}
boot();

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
  try { if (!localStorage.getItem('theme')) document.documentElement.classList.toggle('dark', e.matches); } catch { /* */ }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
