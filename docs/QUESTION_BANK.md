# Banque de questions TOEIC — documentation de référence

Décrit le code réel (`src/lib/types.ts`, `src/lib/bankCore.ts`, `src/lib/bank.ts`, `scripts/`). Vérifier ces fichiers si un doute existe.

## 1. Où sont les questions

```
src/data/bank/
  exam1/ … exam5/   p1p2.json, p3.json, p4.json (ou p3p4.json), p5p6.json (ou p5.json + p6.json), p7.json
  diag/diag.json    diagnostic (50 questions)
  practice/*.json   réserve d'entraînement (plusieurs fichiers : p5.json, p5b.json, p2b.json, p3p4b.json…)
```

Tous les `.json` sous `src/data/bank/` (sous-dossiers compris) sont chargés automatiquement au build par `import.meta.glob('../data/bank/**/*.json', { eager: true })` dans `src/lib/bank.ts` (triés par chemin). **Aucune déclaration à ajouter** : créer un fichier suffit.

Packs importés depuis l'interface (Réglages › Banque de questions) : stockés dans IndexedDB (table `packs`), pool forcé à `custom`, validés avant import.

## 2. Nombre réel de questions (au dernier `npm run validate`)

| Pool | Total | P1 | P2 | P3 | P4 | P5 | P6 | P7 |
|---|---|---|---|---|---|---|---|---|
| exam1 … exam5 (chacun) | 200 | 6 | 25 | 39 | 30 | 30 | 16 | 54 |
| diag | 50 | 3 | 8 | 9 | 6 | 10 | 4 | 10 |
| practice | 398 | 12 | 84 | 42 | 39 | 141 | 32 | 48 |
| **Total** | **1 448** | 45 | 217 | 246 | 195 | 301 | 116 | 328 |

267 groupes (supports partagés). Niveaux : 1 = 385, 2 = 718, 3 = 345. Pour les chiffres à jour : `npm run validate`.

## 3. Format JSON

Type de référence : `BankFile` dans `src/lib/types.ts`. Un fichier peut fixer `part` et `pool` par défaut, puis contenir `questions` (questions isolées : P1, P2, P5) et/ou `sets` (groupes partageant un support : P3, P4, P6, P7).

```json
{
  "part": 5,
  "pool": "practice",
  "questions": [
    {
      "id": "p-p5-141",
      "level": 2,
      "category": "preposition",
      "prompt": "The documents must be submitted ____ Friday.",
      "options": ["until", "by", "during", "since"],
      "answer": "B",
      "explanation": "« By » indique une date limite : au plus tard vendredi.",
      "traps": "« Until » exprime une action qui dure jusqu'à un moment.",
      "takeaway": "By + date = au plus tard.",
      "targetSec": 20,
      "vocab": [{ "en": "submit", "fr": "remettre" }]
    }
  ],
  "sets": [
    {
      "id": "p-p3-c15",
      "part": 3,
      "kind": "conversation",
      "title": "Titre court en français",
      "audio": [ { "s": "W", "t": "…" }, { "s": "M", "t": "…" } ],
      "graphic": { "type": "table", "title": "…", "columns": ["…"], "rows": [["…"]] },
      "questions": [
        { "id": "p-p3-43", "level": 2, "category": "detail", "prompt": "What does the woman ask about?",
          "options": ["…", "…", "…", "…"], "answer": "C",
          "evidence": "citation EXACTE de l'audio ou du document",
          "explanation": "…", "takeaway": "…" }
      ]
    }
  ]
}
```

Champs d'une question :

| Champ | Obligatoire | Règle |
|---|---|---|
| `id` | oui | unique dans toute la banque, `[a-z0-9-]` uniquement. **Ne jamais modifier un id existant.** |
| `part`, `pool` | via le fichier, le set ou la question | `pool` : `exam1`…`exam6`, `diag`, `practice`, `custom` |
| `level` | oui | 1 (B1+), 2 (B2), 3 (B2+/C1, cible 800–850+) |
| `category` | oui | clé de `CATEGORY_FR` dans `src/lib/labels.ts` (ajouter le libellé si nouvelle catégorie) |
| `prompt` | P2, P3, P4, P5, P7 | P5 : contient `____` ; P2 : la phrase entendue |
| `options` | oui | 3 pour P2, 4 sinon, toutes différentes |
| `answer` | oui | lettre `A`–`D` |
| `explanation` | oui | français, ≥ 40 caractères. P5 : doit contenir le texte exact de la bonne option ; P6 : idem si l'option fait ≤ 4 mots |
| `traps` | conseillé | pourquoi les autres options sont fausses. Peut citer `(A)`…`(D)` |
| `takeaway` | oui | règle à retenir, ≥ 10 caractères |
| `evidence` | P3, P4, P7 | citation **exacte** du support (vérifiée). Facultatif pour les catégories `graphic`, `cross-reference`, `sentence-insertion`, `not-true` |
| `targetSec` | non | temps cible ; sinon `DEFAULT_TARGET_SEC` de `labels.ts` |
| `scene` | P1 | illustration (voir § 7) |
| `vocab` | non | mots proposés en flashcards après correction |
| `audioFile` | non | fichier audio local dans `public/` (prioritaire sur la synthèse vocale) |

Champs d'un set : `id`, `part`, `pool`, `kind` (`conversation`, `talk`, `text`, `single`, `double`, `triple`), `title`, `audio` (P3/P4 : `[{ s, t }]` avec `s` ∈ `M`, `W`, `M2`, `W2`, `N`), `docs` (P6/P7), `graphic` (P3/P4), `vocab`, `audioFile`.

Documents (`docs` / `graphic`) : `email` (from, to, subject, date?, body), `text` (title?, subtitle?, body), `table` (title?, columns, rows, note?), `chat` (messages : name, time, text), `form` (title?, fields : `[["Clé","Valeur"]]`, body?). Dans `body` : `\n` sépare les paragraphes ; Part 6 : blancs `{{1}}`…`{{4}}` (dans l'ordre des questions) ; Part 7 insertion : repères `[1]`…`[4]` et options `"[1]"`…`"[4]"`.

Contraintes de structure (validateur) : P3 = 3 questions et au moins 2 locuteurs ; P4 = 3 questions ; P6 = 4 questions et 4 blancs ; P7 `single` = 2 à 4 questions, `double` = 2 docs / 5 questions, `triple` = 3 docs / 5 questions.

## 4. Ajouter des questions sans rien casser (procédure)

1. Créer un **nouveau fichier** (ex. `src/data/bank/practice/p5d.json`) plutôt que modifier un fichier existant.
2. Choisir des `id` nouveaux. Conventions : `e{N}-p{part}-{nn}` (examens), `d-…` (diag), `p-p{part}-{nn}` (entraînement), `…-s{nn}` / `…-c{nn}` / `…-t{nn}` / `…-d{nn}` (groupes). Vérifier l'unicité : le validateur échoue sur un doublon.
3. Lancer :
   ```bash
   export PATH=~/.local/node/bin:$PATH
   npx tsx scripts/rebalance-answers.ts src/data/bank/practice/p5d.json   # facultatif, équilibre A/B/C/D
   npm run validate && npm test
   ```
4. Corriger chaque erreur signalée (cas fréquents : explication < 40 caractères, P5 dont l'explication ne cite pas la bonne option, citation `evidence` inexacte, `takeaway` manquant).
5. Committer par lots (un commit par lot de 50 à 200 questions).

Vérifier un pack externe avant import : `npx tsx scripts/validate-bank.ts chemin/pack.json`.

`rebalance-answers.ts` échange la bonne réponse avec une autre option et **remappe les références `(A)`…`(D)`** dans `explanation` et `traps`. Il ne touche pas aux options ordonnées (chiffres, jours, `[1]`…). Toute référence à une lettre écrite autrement que `(X)` ne serait pas remappée.

## 5. Validation (`scripts/validate-bank.ts` → `validateBank()` dans `bankCore.ts`)

Vérifie : identifiants uniques et valides, nombre d'options, lettre de réponse, options distinctes, niveau, catégorie, explication et notion présentes, absence de texte placeholder, cohérence explication / bonne réponse (P5, P6 courtes), citations présentes dans le support, groupes complets, blancs et positions présents, intitulés identiques interdits, et pour **chaque** pool `examN` présent : structure officielle exacte (6/25/39/30/30/16/54 et P7 = 29 simples + 25 multiples). Avertit si une lettre dépasse 40 % des bonnes réponses d'une partie.

Limites du validateur : il ne peut pas détecter une question à double bonne réponse ni une question ambiguë. **Relire** chaque question (deux réponses grammaticalement possibles = défaut fréquent en Part 5).

## 6. Construction des examens et suivi des questions utilisées

- **Examens blancs** : un examen = tout le pool `examN`, dans l'ordre des fichiers (triés par chemin) puis de la liste. `startExam(kind, pool)` (`src/lib/start.ts`) crée une session `type: 'exam'`, `mode: 'exam'`, `examKind` (`full`, `listening`, `reading`) et `meta.bank = pool`. Reading limité à 75 min (`readingLimitSec`).
- **Ordre des examens** : `examPools()` liste les pools `exam\d` présents. `nextExamPool()` renvoie le premier jamais commencé. Le planning (`buildPlan`, paramètre `examCount`) programme des examens complets à J-13, J-10, J-7, J-5, J-3 et bascule sur des mini-examens quand il n'en reste plus.
- **Séparation examen / entraînement** : `practicePools()` (`sessions.ts`) = `practice` + `custom` + `diag` (si diagnostic fait) + chaque `examN` déjà passé (session `exam` terminée avec `meta.bank`). Les anciennes sessions sans `meta.bank` comptent pour `exam1`.
- **Mini-examens** : `buildMiniExam()` (`selection.ts`) pioche dans les pools d'entraînement selon les proportions officielles (taille approximative car les groupes ne se coupent pas).
- **Diagnostic** : pool `diag` entier, session `type: 'diagnostic'`, `mode: 'exam'`.
- **Suivi** : chaque réponse crée une ligne `attempts` (qid, partie, catégorie, niveau, justesse, temps, jour, session) et met à jour `qstate[qid]` (vue, réussites, échecs, dernière date, favori, carte d'erreur SM-2 `err`). La sélection adaptative (`selectQuestions`) utilise `qstate` pour favoriser l'inédit, les erreurs dues et les catégories faibles.

## 7. Audio et images

- **Audio** : aucun enregistrement fourni. Synthèse vocale du navigateur (`src/lib/audio.ts`) : une voix par locuteur (`M`, `W`, `M2`, `W2`, `N`), voix locales préférées, nouvel essai et voix de secours si une voix ne démarre pas, option « une seule voix » dans les réglages. Parts 1 et 2 : le script audio est généré par `itemScript()` à partir des options. Si `audioFile` est renseigné (fichier dans `public/`), il est lu en priorité. Sans voix anglaise : mode dégradé avec transcription.
- **Images (Part 1)** : pas de photos. `scene` décrit une illustration SVG rendue par `src/components/Scene.tsx` (viewBox 400×260, sol à y = 215) :
  `{ "bg": "office|meeting|warehouse|outdoor|street|cafe", "alt": "description FR", "els": [ { "t": "…", "x": … } ] }`.
  Éléments disponibles : `person` (pose `stand|sit|walk`, facing `left|right`, arms `down|forward|type|up|point|carry|phone`, hold `box|can|phone|cup|paper`, shirt, hair, skin 0–3, long), `window`, `desk`, `table`, `chair`, `laptop`, `monitor`, `cup`, `cups` (n), `papers`, `plant` (y, size), `counter`, `shelf` (w, h), `cart` (boxes), `boxes` (n), `whiteboard` (y, w, writing), `tree`, `fence` (w), `bicycle` (color), `door` (open), `ladder` (h, lean), `bench`, `car` (color), `sign` (text), `lamp`. Un type inconnu n'est pas dessiné. Les options de Part 1 doivent décrire sans ambiguïté ce que la scène montre ; pièges classiques : « is being » vs « has been », objet visible mais action fausse.

## 8. Limitations connues

- Difficulté estimée par l'auteur, non calibrée par ETS ; l'estimation sur 990 est indicative.
- 5 examens seulement : un examen repassé surestime le niveau (avertissement dans l'interface).
- Réserve d'entraînement limitée (398 + diagnostic + examens passés) : les longues sessions sur une seule partie reproposent des questions.
- Illustrations Part 1 schématiques ; audio dépendant des voix installées sur l'appareil.
- Le bundle embarque toute la banque (~1,4 Mo en cache PWA) ; au-delà de plusieurs milliers de questions, envisager un chargement différé par pool.
