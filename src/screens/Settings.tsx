import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useProfile } from '../lib/hooks';
import { saveProfile } from '../lib/sessions';
import { speech, type VoiceInfo } from '../lib/audio';
import { exportData, importData, downloadText, resetAll } from '../lib/backup';
import { buildReminderIcs } from '../lib/ics';
import { notificationsSupported, requestNotifications, scheduleReminder } from '../lib/notify';
import { importPack, removePack, getBank } from '../lib/bank';
import { db } from '../lib/db';
import { addDays, dayKey } from '../lib/dates';
import { navigate } from '../lib/router';
import type { Speaker } from '../lib/types';
import { Button, Card, Chip, Header, Notice, Page, SectionTitle, Toggle } from '../components/ui';

export function applyTheme(t: 'system' | 'light' | 'dark') {
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  try {
    if (t === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', t);
  } catch { /* stockage indisponible */ }
}

const SPEAKERS: [Speaker, string][] = [['W', 'Femme'], ['M', 'Homme'], ['W2', 'Femme 2'], ['M2', 'Homme 2'], ['N', 'Narrateur']];

export function Settings() {
  const profile = useProfile();
  const packs = useLiveQuery(() => db.packs.toArray(), []) ?? [];
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => { try { return (localStorage.getItem('theme') as 'light' | 'dark') ?? 'system'; } catch { return 'system'; } });
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad' | 'info'; text: string } | null>(null);
  const [packErrors, setPackErrors] = useState<string[]>([]);
  const backupRef = useRef<HTMLInputElement>(null);
  const packRef = useRef<HTMLInputElement>(null);

  useEffect(() => { speech.init().then(() => setVoices(speech.info())); }, []);
  if (!profile) return null;
  const input = 'w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px]';
  const offline = voices.some((v) => v.local);

  const readFile = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(f); });

  return (
    <>
      <Header title="Réglages" onBack={() => navigate('/')} />
      <Page>
        {msg && <Notice tone={msg.tone} className="mb-3">{msg.text}</Notice>}
        <SectionTitle>Apparence</SectionTitle>
        <div className="flex gap-2">{(['system', 'light', 'dark'] as const).map((t) => <Chip key={t} active={theme === t} onClick={() => { setTheme(t); applyTheme(t); }}>{{ system: 'Automatique', light: 'Clair', dark: 'Sombre' }[t]}</Chip>)}</div>

        <SectionTitle>Mon profil TOEIC</SectionTitle>
        <Card className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">Score de référence<input type="number" min={10} max={990} className={input} value={profile.baseScore} onChange={(e) => saveProfile({ baseScore: Number(e.target.value) || 0 })} /></label>
          <label className="text-sm font-medium">Date de l'examen<input type="date" className={input} value={profile.examDate} onChange={(e) => e.target.value && saveProfile({ examDate: e.target.value })} /></label>
          <label className="text-sm font-medium">Listening précédent<input type="number" min={5} max={495} className={input} value={profile.listeningPrev ?? ''} placeholder="inconnu" onChange={(e) => saveProfile({ listeningPrev: e.target.value ? Number(e.target.value) : undefined })} /></label>
          <label className="text-sm font-medium">Reading précédent<input type="number" min={5} max={495} className={input} value={profile.readingPrev ?? ''} placeholder="inconnu" onChange={(e) => saveProfile({ readingPrev: e.target.value ? Number(e.target.value) : undefined })} /></label>
          <label className="text-sm font-medium">Objectif minimum<input type="number" className={input} value={profile.targetMin} onChange={(e) => saveProfile({ targetMin: Number(e.target.value) || 800 })} /></label>
          <label className="text-sm font-medium">Objectif idéal<input type="number" className={input} value={profile.targetIdeal} onChange={(e) => saveProfile({ targetIdeal: Number(e.target.value) || 850 })} /></label>
          <label className="col-span-2 text-sm font-medium">Objectif de questions par jour<input type="number" min={5} max={300} className={input} value={profile.dailyGoalQuestions} onChange={(e) => saveProfile({ dailyGoalQuestions: Number(e.target.value) || 40 })} /></label>
        </Card>

        <SectionTitle>Audio</SectionTitle>
        <Card className="space-y-3">
          {!speech.supported && <Notice tone="bad">Ce navigateur ne propose pas la synthèse vocale. Utilise Chrome (Android) ou Safari (iPhone).</Notice>}
          {speech.supported && (
            <>
              <p className="m-0 text-sm">{voices.length} voix anglaise(s) détectée(s){voices.length ? ` · ${voices.filter((v) => v.local).length} utilisable(s) hors ligne` : ''}.</p>
              {!voices.length && <Notice tone="warn">Aucune voix anglaise trouvée. Sur Android : Paramètres › Synthèse vocale › installer les données « English ». Sur iPhone : Réglages › Accessibilité › Contenu énoncé › Voix › English.</Notice>}
              {voices.length > 0 && !offline && <Notice tone="warn">Tes voix anglaises semblent nécessiter Internet : le Listening ne fonctionnera pas hors ligne. Installe une voix anglaise hors ligne dans les réglages de synthèse vocale du téléphone.</Notice>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="soft" onClick={() => speech.speakLines([{ s: 'W', t: 'Hello! This is the first voice.' }, { s: 'M', t: 'And this is the second voice.' }, { s: 'W2', t: 'This is a third speaker.' }, { s: 'M2', t: 'And a fourth one. Good luck with your exam.' }]).then((r) => setMsg(r === 'done' ? { tone: 'ok', text: 'Test terminé : tu dois avoir entendu 4 phrases.' + (speech.bad.size ? ` ${speech.bad.size} voix défaillante(s) ont été remplacées automatiquement.` : '') } : r === 'error' ? { tone: 'bad', text: "La lecture a échoué. Active « Une seule voix » ci-dessous, ou installe une voix anglaise hors ligne." } : null))}>Tester les voix</Button>
                <Button size="sm" variant="ghost" onClick={() => speech.cancel()}>Stop</Button>
              </div>
              <Toggle checked={!!profile.singleVoice} onChange={(v) => { saveProfile({ singleVoice: v }); speech.singleVoice = v; speech.bad.clear(); }} label="Une seule voix pour tous les personnages" desc="À activer si tu n'entends que le premier personnage : plus fiable, les personnages sont distingués par la hauteur de voix." />
              <div>
                <p className="m-0 mb-1.5 text-sm font-medium">Vitesse par défaut à l'entraînement</p>
                <div className="flex gap-2">{[1, 0.8].map((r) => <Chip key={r} active={profile.rate === r} onClick={() => saveProfile({ rate: r })}>{r === 1 ? 'Normale (1×)' : 'Ralentie (0,8×)'}</Chip>)}</div>
                <p className="mb-0 mt-1 text-xs text-muted">En mode examen, la vitesse est toujours normale.</p>
              </div>
              {voices.length > 1 && (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold">Choisir les voix par interlocuteur</summary>
                  <div className="mt-2 space-y-2">
                    {SPEAKERS.map(([s, l]) => (
                      <label key={s} className="flex items-center justify-between gap-2 text-sm">
                        {l}
                        <select className="max-w-[65%] rounded-lg border border-line bg-surface-2 px-2 py-1.5" value={profile.voicePrefs?.[s] ?? ''} onChange={(e) => { const vp = { ...(profile.voicePrefs ?? {}), [s]: e.target.value || undefined }; saveProfile({ voicePrefs: vp }); speech.prefs = vp; }}>
                          <option value="">Automatique</option>
                          {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang}{v.local ? ', hors ligne' : ''})</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </details>
              )}
              <p className="m-0 text-xs text-muted">Aucun enregistrement audio n'est fourni : l'audio est généré par la synthèse vocale de ton appareil. Des fichiers audio locaux peuvent être ajoutés (champ « audioFile » des questions, voir README).</p>
            </>
          )}
        </Card>

        <SectionTitle>Rappel quotidien</SectionTitle>
        <Card className="space-y-3">
          <label className="block text-sm font-medium">Heure du rappel<input type="time" className={input} value={profile.reminderTime ?? '19:00'} onChange={(e) => { saveProfile({ reminderTime: e.target.value }); scheduleReminder(e.target.value); }} /></label>
          <Button block variant="soft" onClick={() => downloadText('toeic-sprint-rappels.ics', buildReminderIcs({ startDay: dayKey(), endDay: addDays(profile.examDate, -1), time: profile.reminderTime ?? '19:00', examDay: profile.examDate }), 'text/calendar')}>Ajouter les rappels à mon agenda (.ics)</Button>
          <p className="m-0 text-xs text-muted">Méthode la plus fiable : ouvre le fichier téléchargé, ton agenda crée un rappel chaque jour jusqu'à la veille de l'examen.</p>
          {notificationsSupported() ? (
            <Button block variant="ghost" onClick={async () => { const p = await requestNotifications(); if (p === 'granted') { scheduleReminder(profile.reminderTime ?? '19:00'); setMsg({ tone: 'ok', text: 'Notifications activées.' }); } else setMsg({ tone: 'bad', text: 'Notifications refusées par le navigateur.' }); }}>Activer aussi les notifications</Button>
          ) : <p className="m-0 text-xs text-muted">Notifications non disponibles ici (sur iPhone, il faut d'abord installer l'app sur l'écran d'accueil).</p>}
          <p className="m-0 text-xs text-muted">Sans serveur, une notification ne peut partir que si l'application est ouverte ou en arrière-plan récent : utilise le fichier .ics pour un rappel garanti.</p>
        </Card>

        <SectionTitle>Sauvegarde</SectionTitle>
        <Card className="space-y-2">
          <p className="m-0 text-sm text-muted">Ta progression est enregistrée automatiquement sur cet appareil. Exporte-la régulièrement (ou pour changer de téléphone).</p>
          <Button block onClick={async () => downloadText(`toeic-sprint-sauvegarde-${dayKey()}.json`, await exportData())}>Exporter mes données (JSON)</Button>
          <Button block variant="soft" onClick={() => backupRef.current?.click()}>Importer une sauvegarde</Button>
          <input ref={backupRef} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (!f) return;
            if (!confirm('Importer remplacera toutes les données actuelles de cet appareil. Continuer ?')) return;
            const r = await importData(await readFile(f));
            setMsg({ tone: r.ok ? 'ok' : 'bad', text: r.message });
          }} />
        </Card>

        <SectionTitle>Banque de questions</SectionTitle>
        <Card className="space-y-2">
          <p className="m-0 text-sm">{getBank().questions.size} questions chargées.</p>
          <Button block variant="soft" onClick={() => packRef.current?.click()}>Importer un pack de questions (JSON)</Button>
          <input ref={packRef} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (!f) return;
            let raw: unknown;
            try { raw = JSON.parse(await readFile(f)); } catch { setPackErrors(['JSON invalide.']); return; }
            const r = await importPack(f.name, raw);
            setPackErrors(r.errors);
            if (r.ok) setMsg({ tone: 'ok', text: `${r.count} question(s) ajoutée(s) à la réserve d'entraînement.` });
          }} />
          {packErrors.length > 0 && <Notice tone="bad"><p className="m-0 font-semibold">Pack refusé :</p><ul className="m-0 list-disc pl-4">{packErrors.map((e) => <li key={e}>{e}</li>)}</ul></Notice>}
          {packs.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{p.name} ({p.count} q.)</span>
              <Button size="sm" variant="danger" onClick={() => confirm(`Retirer le pack « ${p.name} » ?`) && removePack(p.id)}>Retirer</Button>
            </div>
          ))}
          <p className="m-0 text-xs text-muted">Format décrit dans le README. Chaque pack est validé (réponses, identifiants, groupes, explications) avant import.</p>
        </Card>

        <SectionTitle>Zone sensible</SectionTitle>
        <Button block variant="danger" onClick={async () => { if (confirm('Effacer définitivement toute ta progression sur cet appareil ?') && confirm('Vraiment ? Pense à exporter une sauvegarde avant.')) { await resetAll(); location.hash = '/'; location.reload(); } }}>Réinitialiser toutes les données</Button>

        <SectionTitle>À propos</SectionTitle>
        <Card className="space-y-2 text-sm text-muted">
          <p className="m-0">TOEIC Sprint — application gratuite, sans compte, fonctionnant hors ligne. Questions, dialogues et documents originaux (aucun contenu ETS).</p>
          <p className="m-0">TOEIC est une marque d'ETS. Cette application n'est ni affiliée ni approuvée par ETS ; ses estimations de score sont indicatives.</p>
        </Card>
      </Page>
    </>
  );
}
