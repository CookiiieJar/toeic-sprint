import { useState } from 'react';
import { saveProfile } from '../lib/sessions';
import { speech } from '../lib/audio';
import { startDiagnostic } from '../lib/start';
import { run } from '../lib/hooks';
import { Button, Chip, Notice } from '../components/ui';

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [base, setBase] = useState(680);
  const [l, setL] = useState('');
  const [r, setR] = useState('');
  const [daily, setDaily] = useState(60);
  const [weekend, setWeekend] = useState(120);
  const [heard, setHeard] = useState(false);
  const input = 'w-full rounded-xl border border-line bg-surface px-3 py-3 text-base';
  const finish = async (diag: boolean) => {
    await saveProfile({ baseScore: base, listeningPrev: l ? Number(l) : undefined, readingPrev: r ? Number(r) : undefined, dailyMinutes: daily, weekendMinutes: weekend, onboarded: true });
    if (diag) await run(startDiagnostic);
  };
  return (
    <div className="safe-top mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-6 anim-in" key={step}>
      <div className="flex gap-1.5 pt-2" aria-hidden>{[0, 1, 2, 3].map((i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-surface-2'}`} />)}</div>
      {step === 0 && (
        <>
          <h1 className="text-3xl font-extrabold">Objectif 800+ au TOEIC du 28 novembre</h1>
          <p className="text-muted">17 jours de préparation intensive : diagnostic, révisions adaptatives, examens blancs, cahier d'erreurs à répétition espacée et planning jour par jour.</p>
          <ul className="space-y-2 text-[15px]">
            <li>✅ 100 % gratuit, sans compte, fonctionne hors ligne</li>
            <li>✅ Questions originales couvrant les 7 parties</li>
            <li>✅ Corrections détaillées en français</li>
            <li>✅ Statistiques calculées uniquement sur tes réponses</li>
          </ul>
          <Notice>Les scores affichés à l'entraînement ne sont jamais des scores officiels : ce sont des indicateurs de progression.</Notice>
          <Button size="lg" block className="mt-auto" onClick={() => setStep(1)}>Commencer</Button>
        </>
      )}
      {step === 1 && (
        <>
          <h1 className="text-2xl font-bold">Ton point de départ</h1>
          <label className="font-medium">Dernier score TOEIC officiel<input type="number" className={input} value={base} onChange={(e) => setBase(Number(e.target.value))} /></label>
          <p className="-mt-2 text-sm text-muted">Scores par section (facultatif, si tu les connais) :</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="font-medium">Listening<input type="number" placeholder="ex. 360" className={input} value={l} onChange={(e) => setL(e.target.value)} /></label>
            <label className="font-medium">Reading<input type="number" placeholder="ex. 320" className={input} value={r} onChange={(e) => setR(e.target.value)} /></label>
          </div>
          <div className="mt-auto grid gap-2"><Button size="lg" block onClick={() => setStep(2)}>Continuer</Button><button className="text-sm text-muted underline" onClick={() => { setL(''); setR(''); setStep(2); }}>Je ne connais pas mes scores par section</button></div>
        </>
      )}
      {step === 2 && (
        <>
          <h1 className="text-2xl font-bold">Ta disponibilité</h1>
          <p className="m-0 font-medium">En semaine, par jour</p>
          <div className="flex flex-wrap gap-2">{[30, 45, 60, 90, 120].map((m) => <Chip key={m} active={daily === m} onClick={() => setDaily(m)}>{m} min</Chip>)}</div>
          <p className="m-0 font-medium">Le week-end, par jour</p>
          <div className="flex flex-wrap gap-2">{[60, 90, 120, 180, 240].map((m) => <Chip key={m} active={weekend === m} onClick={() => setWeekend(m)}>{m / 60} h</Chip>)}</div>
          <p className="text-sm text-muted">Le planning s'adapte à ces durées, et tu pourras les modifier à tout moment.</p>
          <Button size="lg" block className="mt-auto" onClick={() => setStep(3)}>Continuer</Button>
        </>
      )}
      {step === 3 && (
        <>
          <h1 className="text-2xl font-bold">Activer le son</h1>
          <p className="text-muted">Le Listening utilise la synthèse vocale de ton téléphone (gratuite, hors ligne si une voix anglaise est installée). Sur mobile, le son doit être activé par un appui.</p>
          {speech.supported ? (
            <Button size="lg" variant="soft" onClick={async () => { await speech.init(); speech.unlock('Hello! Audio is working. Good luck with your preparation.'); setHeard(true); }}>🔊 Activer et tester le son</Button>
          ) : <Notice tone="bad">Synthèse vocale indisponible dans ce navigateur. Essaie Chrome (Android) ou Safari (iPhone).</Notice>}
          {heard && <p className="text-sm text-muted">Tu n'entends rien ? Vérifie le volume et le mode silencieux, puis les voix dans Réglages › Audio.</p>}
          <div className="mt-auto grid gap-2">
            <Button size="lg" block onClick={() => finish(true)}>Passer le diagnostic (50 q., ~40 min)</Button>
            <Button size="lg" block variant="ghost" onClick={() => finish(false)}>Plus tard</Button>
          </div>
        </>
      )}
    </div>
  );
}
