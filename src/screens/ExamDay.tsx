import { useState } from 'react';
import { navigate } from '../lib/router';
import { Card, Header, Notice, Page, SectionTitle } from '../components/ui';

const CHECK = [
  "Pièce d'identité officielle valide (la même que lors de l'inscription)",
  'Convocation imprimée ou accessible',
  'Itinéraire vérifié, arrivée 30 minutes avant',
  'Montre non connectée si autorisée (sinon, repère l\'horloge de la salle)',
  'Bouteille d\'eau et en-cas pour avant l\'épreuve',
  'Téléphone éteint et rangé avant l\'entrée en salle',
  'Nuit de sommeil normale : pas de révision tardive la veille',
];

const TIMING = [
  ['Part 1–2', 'Lis les options de la Part 1 pendant les consignes ; en Part 2, élimine les réponses qui répètent un mot de la question.'],
  ['Part 3–4', "Pendant chaque audio, lis déjà les 3 questions suivantes. Réponds dès que tu entends l'information, puis passe à la lecture du groupe suivant."],
  ['Part 5', '≈ 20 s par question, ~10 min au total. Identifie d\'abord la nature du mot attendu.'],
  ['Part 6', '≈ 2 min par texte, ~8 min. Les questions d\'insertion se jouent sur le lien avec la phrase précédente.'],
  ['Part 7', '≈ 55 min pour 54 questions. Lis la question avant le texte. Ne reste jamais bloquée : coche une réponse et avance.'],
  ['Fin', "Aucune pénalité : ne laisse aucune case vide. Garde 1 min pour remplir les questions restantes."],
];

export function ExamDay() {
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('examday') ?? '{}'); } catch { return {}; }
  });
  const toggle = (i: number) => {
    const n = { ...checked, [i]: !checked[i] };
    setChecked(n);
    try { localStorage.setItem('examday', JSON.stringify(n)); } catch { /* stockage indisponible */ }
  };
  return (
    <>
      <Header title="Jour J" onBack={() => navigate('/')} />
      <Page>
        <Notice tone="ok">Le travail est fait. Aujourd'hui, l'objectif est d'arriver reposée, concentrée et sereine. Pas d'entraînement épuisant : au maximum 10 minutes de flashcards pour te mettre en route.</Notice>
        <SectionTitle>Checklist</SectionTitle>
        <Card className="space-y-1">
          {CHECK.map((c, i) => (
            <label key={i} className="flex cursor-pointer items-start gap-3 py-1.5 text-[15px]">
              <input type="checkbox" checked={!!checked[i]} onChange={() => toggle(i)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
              <span className={checked[i] ? 'text-muted line-through' : ''}>{c}</span>
            </label>
          ))}
        </Card>
        <SectionTitle>Gestion du temps</SectionTitle>
        <Card className="space-y-2">
          {TIMING.map(([t, d]) => <p key={t} className="m-0 text-sm"><b>{t} :</b> {d}</p>)}
        </Card>
        <SectionTitle>Rappels express</SectionTitle>
        <Card className="space-y-1 text-sm">
          <p className="m-0">• Part 1 sans personne → méfie-toi de « is being + participe ».</p>
          <p className="m-0">• Part 2 : « Why don't we… » = suggestion ; une question en Wh- n'accepte pas Yes/No.</p>
          <p className="m-0">• Since/for → present perfect ; by = au plus tard ; despite + nom.</p>
          <p className="m-0">• Part 7 : la bonne réponse est presque toujours une paraphrase du texte.</p>
        </Card>
      </Page>
    </>
  );
}
