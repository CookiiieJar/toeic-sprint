import type { Line, Speaker } from './types';

/**
 * Moteur audio gratuit :
 * 1. fichier audio local (si fourni dans la banque) ;
 * 2. sinon synthèse vocale du navigateur (Web Speech API), avec des voix anglaises différentes
 *    par interlocuteur quand l'appareil en propose plusieurs.
 * Gère : déverrouillage sur mobile, voix absentes, coupures (watchdog), annulation.
 */

export type PlayResult = 'done' | 'cancelled' | 'error';

export interface VoiceInfo {
  name: string;
  lang: string;
  local: boolean;
  gender: 'm' | 'f' | '?';
}

const FEMALE = /female|woman|samantha|victoria|karen|moira|tessa|fiona|serena|susan|zira|hazel|libby|sonia|jenny|aria|emma|amy|joanna|kendra|kimberly|salli|olivia|natasha|catherine|allison|ava|nicky|kate|martha|google us english|google uk english female/i;
const MALE = /male|man\b|daniel|alex|fred|david|mark|george|ryan|guy|thomas|oliver|arthur|james|rishi|aaron|tom|gordon|lee|brian|matthew|joey|justin|russell|google uk english male/i;

function genderOf(v: SpeechSynthesisVoice): 'm' | 'f' | '?' {
  if (/female/i.test(v.name)) return 'f';
  if (MALE.test(v.name) && !FEMALE.test(v.name.replace(/male/i, ''))) return 'm';
  if (FEMALE.test(v.name)) return 'f';
  return '?';
}

class SpeechEngine {
  voices: SpeechSynthesisVoice[] = [];
  ready = false;
  private token = 0;
  private audioEl: HTMLAudioElement | null = null;
  prefs: Partial<Record<Speaker, string>> = {};
  /** une seule voix pour tous les personnages (timbre modulé) : plus fiable sur certains appareils */
  singleVoice = false;
  /** voix qui n'ont pas réussi à démarrer */
  bad = new Set<string>();
  /** au moins un échec de voix pendant la session */
  failedOnce = false;

  get supported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  async init(): Promise<void> {
    if (!this.supported) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang));
    };
    load();
    if (!this.voices.length) {
      await new Promise<void>((resolve) => {
        const done = () => {
          load();
          resolve();
        };
        speechSynthesis.addEventListener?.('voiceschanged', done, { once: true });
        setTimeout(done, 2500);
      });
    }
    this.ready = true;
  }

  info(): VoiceInfo[] {
    return this.voices.map((v) => ({ name: v.name, lang: v.lang, local: v.localService, gender: genderOf(v) }));
  }

  /** L'appareil a-t-il au moins une voix anglaise utilisable hors ligne ? */
  hasOfflineVoice() {
    return this.voices.some((v) => v.localService);
  }

  /** Attribution des voix : accents et timbres différents quand c'est possible */
  voiceFor(s: Speaker): { voice: SpeechSynthesisVoice | null; pitch: number } {
    const pref = this.prefs[s];
    if (pref && !this.singleVoice) {
      const v = this.voices.find((x) => x.name === pref && !this.bad.has(x.name));
      if (v) return { voice: v, pitch: 1 };
    }
    const usable = this.voices.filter((v) => !this.bad.has(v.name));
    // voix installées sur l'appareil en priorité (les voix « en ligne » sont souvent muettes ou se bloquent)
    const local = usable.filter((v) => v.localService);
    const pool = local.length ? local : usable;
    if (this.singleVoice) {
      const base = pool.find((v) => /US/i.test(v.lang)) ?? pool[0] ?? null;
      const pitch = { M: 0.8, M2: 0.65, W: 1.15, W2: 1.3, N: 1 }[s];
      return { voice: base, pitch };
    }
    if (!pool.length) return { voice: null, pitch: s === 'M' || s === 'M2' ? 0.85 : 1.1 };
    const wantGender = s === 'M' || s === 'M2' ? 'm' : s === 'N' ? '?' : 'f';
    const sameG = pool.filter((v) => genderOf(v) === wantGender);
    const list = sameG.length ? sameG : pool;
    // préférence d'accent : M/W américain, M2/W2 britannique ou autre, narrateur : autre voix
    const accent = (v: SpeechSynthesisVoice) => (s === 'M2' || s === 'W2' ? !/US/i.test(v.lang) : /US/i.test(v.lang));
    const sorted = [...list].sort((a, b) => Number(accent(b)) - Number(accent(a)) || Number(b.localService) - Number(a.localService));
    let voice = sorted[0];
    if ((s === 'M2' || s === 'W2') && sorted.length > 1) {
      const primary = this.voiceFor(s === 'M2' ? 'M' : 'W').voice;
      voice = sorted.find((v) => v !== primary) ?? voice;
    }
    // pas de voix du bon genre : on module la hauteur
    const pitch = sameG.length ? 1 : wantGender === 'm' ? 0.8 : wantGender === 'f' ? 1.2 : 1;
    return { voice, pitch: s === 'M2' && !sameG.length ? 0.7 : pitch };
  }

  /** À appeler lors d'un geste utilisateur (exigé par iOS/Android pour autoriser le son) */
  unlock(text = 'Audio is ready.') {
    if (!this.supported) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      const v = this.voiceFor('W').voice;
      if (v) u.voice = v;
      u.volume = text.trim() ? 1 : 0;
      speechSynthesis.speak(u);
    } catch {
      /* ignoré */
    }
  }

  cancel() {
    this.token++;
    if (this.supported) speechSynthesis.cancel();
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl = null;
    }
  }

  /** Lecture d'un fichier audio local */
  playFile(url: string, rate = 1): Promise<PlayResult> {
    this.cancel();
    const my = this.token;
    return new Promise((resolve) => {
      const a = new Audio(url);
      this.audioEl = a;
      a.playbackRate = rate;
      a.onended = () => resolve(my === this.token ? 'done' : 'cancelled');
      a.onerror = () => resolve('error');
      a.play().catch(() => resolve('error'));
    });
  }

  /**
   * Lit une suite de répliques. Les longues répliques sont découpées en phrases
   * (contournement de la coupure de Chrome après ~15 s), avec un watchdog par phrase.
   */
  async speakLines(lines: Line[], opts: { rate?: number; onLine?: (i: number) => void; gapMs?: number } = {}): Promise<PlayResult> {
    if (!this.supported) return 'error';
    if (!this.ready) await this.init();
    this.cancel();
    const my = this.token;
    const rate = opts.rate ?? 1;
    let failures = 0;
    for (let i = 0; i < lines.length; i++) {
      if (my !== this.token) return 'cancelled';
      opts.onLine?.(i);
      const { voice, pitch } = this.voiceFor(lines[i].s);
      const chunks = lines[i].t.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g) ?? [lines[i].t];
      for (const chunk of chunks) {
        if (my !== this.token) return 'cancelled';
        const r = await this.speakOne(chunk.trim(), this.bad.has(voice?.name ?? '') ? this.voiceFor(lines[i].s).voice : voice, pitch, rate, my);
        if (r === 'cancelled') return 'cancelled';
        if (r === 'error') failures++;
        if (failures >= 2) return 'error';
      }
      if (opts.gapMs ?? 450) await new Promise((r) => setTimeout(r, (opts.gapMs ?? 450) / rate));
    }
    return my === this.token ? 'done' : 'cancelled';
  }

  /** Utterances en cours : on garde une référence pour éviter le bug Chrome (onend jamais appelé après ramasse-miettes) */
  private live: SpeechSynthesisUtterance[] = [];

  /**
   * Prononce un fragment avec reprise automatique :
   * 1. voix prévue ; 2. si elle ne démarre pas ou échoue → autre voix de secours ; 3. voix par défaut du navigateur.
   * Une interruption qui ne vient pas de l'utilisateur n'arrête plus la lecture.
   */
  private async speakOne(text: string, voice: SpeechSynthesisVoice | null, pitch: number, rate: number, my: number): Promise<PlayResult> {
    if (!text) return 'done';
    const tries: (SpeechSynthesisVoice | null)[] = [voice];
    const alt = this.voices.find((v) => v !== voice && !this.bad.has(v.name) && v.localService) ?? this.voices.find((v) => v !== voice && !this.bad.has(v.name));
    if (alt) tries.push(alt);
    tries.push(null);
    for (const v of tries) {
      if (my !== this.token) return 'cancelled';
      const r = await this.utter(text, v, pitch, rate, my);
      if (r === 'done' || r === 'cancelled') return r;
      if (v) this.bad.add(v.name); // voix défaillante : écartée pour la suite
      this.failedOnce = true;
    }
    return 'error';
  }

  private utter(text: string, voice: SpeechSynthesisVoice | null, pitch: number, rate: number, my: number): Promise<PlayResult> {
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voice?.lang ?? 'en-US';
      if (voice) u.voice = voice;
      u.pitch = pitch;
      u.rate = rate;
      this.live.push(u);
      if (this.live.length > 30) this.live.shift();
      let settled = false;
      let started = false;
      const words = text.split(/\s+/).length;
      const finish = (r: PlayResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(startTimer);
        clearTimeout(watchdog);
        clearInterval(keepAlive);
        resolve(my !== this.token ? 'cancelled' : r);
      };
      // la voix ne démarre pas (voix en ligne hors connexion, moteur bloqué…) : on débloque et on réessaie
      const startTimer = setTimeout(() => {
        if (!started) {
          speechSynthesis.cancel();
          finish('error');
        }
      }, 4000);
      const watchdog = setTimeout(() => {
        speechSynthesis.cancel();
        finish('done');
      }, ((words / 2) * 1000) / rate + 7000);
      // Chrome desktop : un resume périodique évite les blocages
      const keepAlive = setInterval(() => {
        if (speechSynthesis.paused) speechSynthesis.resume();
      }, 4000);
      u.onstart = () => {
        started = true;
        clearTimeout(startTimer);
      };
      u.onend = () => finish('done');
      u.onerror = (e) => {
        if (my !== this.token) return finish('cancelled');
        // « interrupted » sans action de l'utilisateur : la phrase est considérée comme lue si elle avait démarré
        if ((e.error === 'interrupted' || e.error === 'canceled') && started) return finish('done');
        finish('error');
      };
      // file bloquée par une lecture précédente : on la vide avant de parler
      if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
      setTimeout(() => {
        if (my !== this.token) return finish('cancelled');
        speechSynthesis.speak(u);
      }, 60);
    });
  }
}

export const speech = new SpeechEngine();

/** Script audio d'une question de Part 1 ou 2 */
export function itemScript(part: 1 | 2, prompt: string | undefined, options: string[]): Line[] {
  const L = ['A', 'B', 'C', 'D'];
  if (part === 1) return [{ s: 'N', t: 'Look at the picture.' }, ...options.map((o, i) => ({ s: (i % 2 ? 'M' : 'W') as Speaker, t: `${L[i]}. ${o}` }))];
  return [{ s: 'W', t: prompt ?? '' }, ...options.map((o, i) => ({ s: 'M' as Speaker, t: `${L[i]}. ${o}` }))];
}
