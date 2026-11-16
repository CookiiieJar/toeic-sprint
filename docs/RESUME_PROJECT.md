# Reprendre le projet dans plusieurs mois

## 1. Retrouver le projet

Le projet est dans le dossier `~/toeic-sprint` (sous Ubuntu/WSL : `/home/pengo/toeic-sprint`). Une copie existe sur GitHub : https://github.com/CookiiieJar/toeic-sprint

Si le dossier a disparu (nouvel ordinateur) :

```bash
git clone https://github.com/CookiiieJar/toeic-sprint.git
cd toeic-sprint
```

## 2. Lancer Claude Code dans le projet

```bash
cd ~/toeic-sprint
claude
```

(Ou, dans l'application Claude Desktop, onglet Code : choisir le dossier `toeic-sprint` comme dossier de travail.)

## 3. Fichiers que Claude doit lire

`CLAUDE.md` est lu automatiquement. Claude doit ensuite lire `docs/HANDOFF.md`, puis selon la tâche : `docs/QUESTION_BANK.md` (questions), `docs/ARCHITECTURE.md` (code), `docs/ROADMAP.md` (priorités).

## 4. Installer et démarrer l'application

Node.js est installé dans `~/.local/node`. S'il n'existe plus, installer Node 22 (https://nodejs.org) ou demander à Claude de le faire.

```bash
export PATH=~/.local/node/bin:$PATH
npm install
npm run dev
```

Ouvrir l'adresse affichée (sur le téléphone : l'adresse « Network », même Wi-Fi).

## 5. Vérifier que tout fonctionne

```bash
npm run check
```

Doit afficher « Banque valide », tous les tests verts et « built ». Sur le téléphone : ouvrir l'application installée, faire Réglages › Audio › Tester les voix.

## 6. Reprendre les tâches en cours

Voir `docs/HANDOFF.md` (« Tâches inachevées », « Prochaines actions ») et `docs/ROADMAP.md`.

## 7. Avant de terminer une session

Demander à Claude : « Mets à jour HANDOFF.md, ROADMAP.md et DEVELOPMENT_HISTORY.md, lance npm run check, puis fais un commit. » Ensuite, si tu veux publier : `git push`.

**Pense aussi à exporter ta progression** (Réglages › Sauvegarde › Exporter) : elle n'est pas dans Git.

## Prompt prêt à copier-coller

```text
Je reprends le projet TOEIC Sprint (PWA de préparation au TOEIC) dans ce dossier.
Commence par lire CLAUDE.md et docs/HANDOFF.md, puis les autres documents utiles dans docs/.
Vérifie l'état réel du code et de Git (git status, git log), lance `npm run check`
(Node est dans ~/.local/node/bin) et fais-moi un résumé : état du projet, ce qui fonctionne,
ce qui reste à faire, et tes recommandations. Ne modifie rien avant que je te dise quoi faire.
Aujourd'hui, je souhaite : [décris ta demande ici].
À la fin, mets à jour HANDOFF.md, ROADMAP.md et DEVELOPMENT_HISTORY.md et fais un commit.
```
