import { useEffect, useRef, useState } from 'react';
import type { Line } from '../lib/types';
import { speech } from '../lib/audio';
import { Icon, cx } from './ui';

export type AudioStatus = 'idle' | 'playing' | 'done' | 'error' | 'unsupported';

const SPEAKER_FR: Record<string, string> = { M: 'Homme', W: 'Femme', M2: 'Homme 2', W2: 'Femme 2', N: 'Narrateur' };

/**
 * Lecteur audio d'une unité Listening.
 * - entraînement : lecture/relecture libre, vitesse 1× ou 0,8×, transcription à la demande ;
 * - examen : lecture automatique unique, sans relecture ni ralentissement.
 */
export function AudioPanel({
  unitKey,
  lines,
  file,
  mode,
  autoPlay,
  alreadyPlayed,
  rate: initialRate = 1,
  onStatus,
  showTranscript,
}: {
  unitKey: string;
  lines: Line[];
  file?: string;
  mode: 'practice' | 'exam';
  autoPlay: boolean;
  alreadyPlayed?: boolean;
  rate?: number;
  onStatus?: (s: AudioStatus) => void;
  showTranscript?: boolean;
}) {
  const [status, setStatus] = useState<AudioStatus>(speech.supported || file ? (alreadyPlayed ? 'done' : 'idle') : 'unsupported');
  const [line, setLine] = useState(-1);
  const [rate, setRate] = useState(mode === 'exam' ? 1 : initialRate);
  const [plays, setPlays] = useState(0);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  const mounted = useRef(true);
  const cur = useRef<AudioStatus>(status);
  useEffect(() => () => { mounted.current = false; }, []);
  const set = (s: AudioStatus) => {
    cur.current = s;
    setStatus(s);
    statusRef.current?.(s);
  };

  const play = async (r = rate) => {
    set('playing');
    setPlays((p) => p + 1);
    let res = file ? await speech.playFile(file, r) : 'error';
    if (res === 'error' && speech.supported) res = await speech.speakLines(lines, { rate: r, onLine: setLine });
    setLine(-1);
    // arrêt non demandé alors que le lecteur est toujours affiché : on permet de relancer
    if (res === 'cancelled') {
      if (mounted.current && cur.current === 'playing') set(mode === 'exam' ? 'error' : 'done');
      return;
    }
    // aucune voix anglaise installée : mode dégradé explicite plutôt qu'une « erreur »
    if (res === 'error' && !file && speech.ready && speech.voices.length === 0) return set('unsupported');
    set(res === 'done' ? 'done' : 'error');
  };

  useEffect(() => {
    if (!speech.supported && !file) {
      statusRef.current?.('unsupported');
      return;
    }
    if (autoPlay && !alreadyPlayed) play(mode === 'exam' ? 1 : rate);
    else if (alreadyPlayed) statusRef.current?.('done');
    return () => speech.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitKey]);

  const canReplay = mode === 'practice' || status === 'error';
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (status === 'playing' ? (speech.cancel(), set('done')) : play())}
          disabled={status === 'unsupported' || (!canReplay && status !== 'idle' && status !== 'playing') || (mode === 'exam' && status === 'playing')}
          aria-label={status === 'playing' ? 'Arrêter' : plays ? 'Réécouter' : 'Écouter'}
          className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-full text-primary-ink transition', status === 'playing' ? 'bg-primary animate-pulse' : 'bg-primary', 'disabled:opacity-40')}
        >
          <Icon name={status === 'playing' ? (mode === 'exam' ? 'sound' : 'pause') : plays ? 'replay' : 'play'} filled={status !== 'playing' && !plays} />
        </button>
        <div className="min-w-0 flex-1 text-sm">
          {status === 'playing' && <p className="font-semibold">Lecture en cours{line >= 0 && lines[line] ? ` — ${SPEAKER_FR[lines[line].s]}` : ''}…</p>}
          {status === 'idle' && <p className="font-semibold">{mode === 'exam' ? 'Lecture unique (conditions d\'examen)' : 'Appuie pour écouter'}</p>}
          {status === 'done' && <p className="font-semibold">{mode === 'exam' ? 'Audio terminé — réponds aux questions' : 'Audio terminé'}</p>}
          {status === 'error' && <p className="font-semibold text-bad">La lecture a été interrompue. Réessaie (problème technique, pas de pénalité). Si ça se répète : Réglages › Audio › « Une seule voix ».</p>}
          {status === 'unsupported' && <p className="font-semibold text-bad">{speech.supported ? 'Aucune voix anglaise installée sur cet appareil.' : 'Synthèse vocale indisponible sur ce navigateur.'}</p>}
          <p className="text-xs text-muted">{file ? 'Fichier audio local' : 'Voix de synthèse de l\'appareil'}{mode === 'practice' ? ` · vitesse ${rate === 1 ? '1×' : '0,8×'}` : ''}</p>
        </div>
        {mode === 'practice' && status !== 'unsupported' && (
          <button
            type="button"
            onClick={() => setRate((r) => (r === 1 ? 0.8 : 1))}
            className={cx('rounded-full border px-3 py-1.5 text-sm font-semibold', rate !== 1 ? 'border-primary bg-primary-soft text-primary' : 'border-line')}
            aria-label="Changer la vitesse de lecture"
          >
            {rate === 1 ? '1×' : '0,8×'}
          </button>
        )}
      </div>
      {(showTranscript || status === 'unsupported') && (
        <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-[15px]">
          {status === 'unsupported' && <p className="text-xs text-muted">Mode dégradé : la transcription remplace l'écoute (cela ne t'entraîne pas à la compréhension orale). {speech.supported ? 'Installe une voix anglaise (voir Réglages › Audio).' : 'Essaie Chrome/Edge sur Android ou Safari sur iPhone.'}</p>}
          {lines.map((l, i) => (
            <p key={i} className={cx('m-0', i === line && 'rounded bg-primary-soft')}>
              <span className="mr-1.5 text-xs font-bold text-muted">{SPEAKER_FR[l.s]}</span>
              {l.t}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
