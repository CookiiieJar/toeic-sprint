import type { ReactNode } from 'react';
import type { Scene as SceneT, SceneEl } from '../lib/types';

/**
 * Illustrations originales générées à partir d'une description JSON (Part 1).
 * Repère : viewBox 400×260, sol à y = 215.
 */
const FLOOR = 215;
const SKIN = ['#f1c7a5', '#c68e65', '#8d5a3b', '#e8b48f'];
const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);

function Background({ bg }: { bg: string }) {
  switch (bg) {
    case 'outdoor':
      return (
        <>
          <rect width="400" height="260" fill="#cfe7fb" />
          <circle cx="60" cy="45" r="20" fill="#ffe08a" />
          <ellipse cx="300" cy="50" rx="40" ry="12" fill="#fff" opacity=".8" />
          <rect y="195" width="400" height="65" fill="#9fd08a" />
          <rect y="215" width="400" height="45" fill="#d9cdb4" />
        </>
      );
    case 'street':
      return (
        <>
          <rect width="400" height="260" fill="#d6e9f8" />
          <rect x="10" y="60" width="120" height="155" fill="#c9b8a6" />
          <rect x="140" y="30" width="110" height="185" fill="#b9c3cf" />
          <rect x="260" y="80" width="130" height="135" fill="#d8c7b0" />
          {[20, 55, 90].map((x) => [80, 120, 160].map((y) => <rect key={`${x}${y}`} x={x} y={y} width="22" height="26" fill="#8fb3d1" />))}
          {[155, 195].map((x) => [50, 95, 140].map((y) => <rect key={`${x}${y}`} x={x} y={y} width="28" height="30" fill="#93b6d4" />))}
          <rect y="215" width="400" height="45" fill="#6b7280" />
          <rect y="236" width="400" height="3" fill="#f5f5f5" strokeDasharray="20 14" />
        </>
      );
    case 'warehouse':
      return (
        <>
          <rect width="400" height="260" fill="#dfe3e8" />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={i * 90} y="0" width="6" height="215" fill="#c8cdd4" />)}
          <rect y="215" width="400" height="45" fill="#b4b9c1" />
          <rect x="0" y="230" width="400" height="4" fill="#e5c74a" />
        </>
      );
    case 'cafe':
      return (
        <>
          <rect width="400" height="260" fill="#f5e7d3" />
          <rect y="215" width="400" height="45" fill="#c9a77f" />
        </>
      );
    case 'meeting':
    case 'office':
    default:
      return (
        <>
          <rect width="400" height="260" fill={bg === 'meeting' ? '#edf0f6' : '#e8edf5'} />
          <rect y="205" width="400" height="10" fill="#d7dce6" />
          <rect y="215" width="400" height="45" fill="#cbb69d" />
        </>
      );
  }
}

function Person({ el }: { el: SceneEl }) {
  const x = el.x;
  const fy = num(el.y, FLOOR);
  const dir = el.facing === 'left' ? -1 : 1;
  const pose = str(el.pose, 'stand');
  const arms = str(el.arms, 'down');
  const shirt = str(el.shirt, '#3b82f6');
  const pants = str(el.pants, '#374151');
  const hair = str(el.hair, '#2d2a26');
  const skin = SKIN[num(el.skin, 0) % SKIN.length];
  const hipY = fy - 48;
  const shY = fy - 92;
  const headY = fy - 106;
  const parts: ReactNode[] = [];
  // jambes
  if (pose === 'sit') {
    parts.push(<path key="legs" d={`M${x - 6} ${hipY} h${dir * 28} v48 M${x + 6} ${hipY} h${dir * 26} v48`} stroke={pants} strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round" />);
  } else if (pose === 'walk') {
    parts.push(<path key="legs" d={`M${x} ${hipY} l${dir * 14} 46 M${x} ${hipY} l${-dir * 12} 46`} stroke={pants} strokeWidth="11" fill="none" strokeLinecap="round" />);
  } else {
    parts.push(<path key="legs" d={`M${x - 6} ${hipY} v46 M${x + 6} ${hipY} v46`} stroke={pants} strokeWidth="11" fill="none" strokeLinecap="round" />);
  }
  // torse
  parts.push(<rect key="torso" x={x - 14} y={shY} width="28" height={hipY - shY + 4} rx="10" fill={shirt} />);
  // bras
  const sx = x + dir * 10;
  const bx = x - dir * 10;
  const arm = (d: string, k: string) => <path key={k} d={d} stroke={shirt} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  let hand: [number, number] = [sx, hipY];
  switch (arms) {
    case 'forward':
      parts.push(arm(`M${sx} ${shY + 6} l${dir * 30} 10`, 'a1'), arm(`M${bx} ${shY + 6} l${dir * 4} 40`, 'a2'));
      hand = [sx + dir * 32, shY + 16];
      break;
    case 'type':
      parts.push(arm(`M${sx} ${shY + 6} l${dir * 18} 26 l${dir * 16} 0`, 'a1'), arm(`M${bx} ${shY + 6} l${dir * 22} 26 l${dir * 14} 0`, 'a2'));
      hand = [sx + dir * 34, shY + 32];
      break;
    case 'up':
      parts.push(arm(`M${sx} ${shY + 6} l${dir * 14} -40`, 'a1'), arm(`M${bx} ${shY + 6} l0 40`, 'a2'));
      hand = [sx + dir * 15, shY - 36];
      break;
    case 'point':
      parts.push(arm(`M${sx} ${shY + 6} l${dir * 34} -18`, 'a1'), arm(`M${bx} ${shY + 6} l0 40`, 'a2'));
      hand = [sx + dir * 36, shY - 12];
      break;
    case 'carry':
      parts.push(arm(`M${sx} ${shY + 6} l${dir * 18} 22`, 'a1'), arm(`M${bx} ${shY + 6} l${dir * 30} 22`, 'a2'));
      hand = [x + dir * 26, shY + 26];
      break;
    case 'phone':
      parts.push(arm(`M${sx} ${shY + 6} l${dir * 12} 24 l${-dir * 6} -32`, 'a1'), arm(`M${bx} ${shY + 6} l0 40`, 'a2'));
      hand = [sx + dir * 6, headY + 4];
      break;
    default:
      parts.push(arm(`M${sx} ${shY + 6} l${dir * 3} 40`, 'a1'), arm(`M${bx} ${shY + 6} l${-dir * 3} 40`, 'a2'));
  }
  // tête
  parts.push(<circle key="head" cx={x} cy={headY} r="12" fill={skin} />);
  parts.push(
    el.long ? (
      <path key="hair" d={`M${x - 13} ${headY + 14} q-2 -26 13 -27 q15 1 13 27 l-5 0 q1 -14 -8 -17 q-9 3 -8 17z`} fill={hair} />
    ) : (
      <path key="hair" d={`M${x - 12} ${headY - 2} q2 -13 12 -13 q10 0 12 13 q-12 -6 -24 0z`} fill={hair} />
    ),
  );
  // objet tenu
  const hold = str(el.hold, '');
  const [hx, hy] = hand;
  if (hold === 'box') parts.push(<g key="h"><rect x={hx - 18} y={hy - 20} width="36" height="28" fill="#c58b4e" stroke="#9a6a36" /><path d={`M${hx - 18} ${hy - 12} h36`} stroke="#9a6a36" /></g>);
  if (hold === 'can') parts.push(<g key="h"><rect x={hx - 6} y={hy - 6} width="22" height="16" rx="3" fill="#2f9e8f" /><path d={`M${hx + 16 * 1} ${hy - 2} l${dir * 18} -8`} stroke="#2f9e8f" strokeWidth="4" /><path d={`M${hx + 34} ${hy - 6} l${dir * 4} 14 M${hx + 36} ${hy - 6} l${dir * 8} 12`} stroke="#7cc4f0" strokeWidth="2" strokeDasharray="3 3" /></g>);
  if (hold === 'phone') parts.push(<rect key="h" x={hx - 3} y={hy - 9} width="7" height="14" rx="2" fill="#111827" />);
  if (hold === 'cup') parts.push(<rect key="h" x={hx - 5} y={hy - 10} width="10" height="12" rx="2" fill="#fff" stroke="#9ca3af" />);
  if (hold === 'paper') parts.push(<rect key="h" x={hx - 2} y={hy - 16} width="18" height="24" fill="#fff" stroke="#9ca3af" transform={`rotate(${dir * 10} ${hx} ${hy})`} />);
  return <g>{parts}</g>;
}

function El({ el }: { el: SceneEl }) {
  const x = el.x;
  const w = num(el.w, 100);
  switch (el.t) {
    case 'person':
      return <Person el={el} />;
    case 'window': {
      const y = num(el.y, 40), h = num(el.h, 80);
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill="#bfe0fb" stroke="#f8fafc" strokeWidth="6" />
          <path d={`M${x + w / 2} ${y} v${h} M${x} ${y + h / 2} h${w}`} stroke="#f8fafc" strokeWidth="4" />
        </g>
      );
    }
    case 'desk':
    case 'table': {
      const top = FLOOR - 62;
      return (
        <g>
          <rect x={x - w / 2} y={top} width={w} height="8" rx="2" fill={el.t === 'desk' ? '#9a6b44' : '#b0855c'} />
          <rect x={x - w / 2 + 8} y={top + 8} width="7" height="54" fill="#7a5235" />
          <rect x={x + w / 2 - 15} y={top + 8} width="7" height="54" fill="#7a5235" />
        </g>
      );
    }
    case 'chair': {
      const d = el.facing === 'left' ? 1 : -1; // dossier du côté opposé
      return (
        <g fill="#475569">
          <rect x={x - 16} y={FLOOR - 50} width="32" height="6" rx="2" />
          <rect x={x + d * 14 - 3} y={FLOOR - 95} width="6" height="50" rx="2" />
          <rect x={x - 13} y={FLOOR - 44} width="4" height="44" />
          <rect x={x + 9} y={FLOOR - 44} width="4" height="44" />
        </g>
      );
    }
    case 'laptop': {
      const top = FLOOR - 62;
      return (
        <g>
          <rect x={x - 20} y={top - 4} width="40" height="4" rx="1" fill="#6b7280" />
          <path d={`M${x + 18} ${top - 4} l-6 -26 h-30 l6 26z`} fill="#374151" />
          <path d={`M${x + 14} ${top - 7} l-5 -20 h-24 l5 20z`} fill="#93c5fd" />
        </g>
      );
    }
    case 'monitor': {
      const top = FLOOR - 62;
      return (
        <g>
          <rect x={x - 4} y={top - 14} width="8" height="14" fill="#4b5563" />
          <rect x={x - 26} y={top - 48} width="52" height="34" rx="3" fill="#1f2937" />
          <rect x={x - 22} y={top - 44} width="44" height="26" fill="#93c5fd" />
        </g>
      );
    }
    case 'cup': {
      const top = num(el.y, FLOOR - 62);
      return <g><rect x={x - 6} y={top - 14} width="12" height="14" rx="2" fill="#fff" stroke="#9ca3af" /><path d={`M${x + 6} ${top - 11} q6 3 0 7`} stroke="#9ca3af" fill="none" /></g>;
    }
    case 'cups': {
      const n = num(el.n, 5), top = num(el.y, FLOOR - 70);
      return <g>{Array.from({ length: n }, (_, i) => <g key={i}><rect x={x + i * 18 - 6} y={top - 14} width="12" height="14" rx="2" fill="#fff" stroke="#9ca3af" /><path d={`M${x + i * 18 + 6} ${top - 11} q5 3 0 7`} stroke="#9ca3af" fill="none" /></g>)}</g>;
    }
    case 'papers': {
      const top = num(el.y, FLOOR - 62);
      return <g>{[0, 1, 2, 3].map((i) => <rect key={i} x={x - 14 + i} y={top - 4 - i * 3} width="28" height="3" fill="#fff" stroke="#cbd5e1" />)}</g>;
    }
    case 'plant': {
      const base = num(el.y, FLOOR), s = num(el.size, 1);
      return (
        <g transform={`translate(${x} ${base}) scale(${s})`}>
          <path d="M-14 0 l-4 -26 h36 l-4 26z" fill="#c2703d" />
          <circle cx="-8" cy="-36" r="12" fill="#3f9a4e" />
          <circle cx="8" cy="-40" r="13" fill="#4caf5a" />
          <circle cx="0" cy="-52" r="11" fill="#3f9a4e" />
        </g>
      );
    }
    case 'counter': {
      const top = FLOOR - 70;
      return <g><rect x={x - w / 2} y={top} width={w} height="70" fill="#a8a29e" /><rect x={x - w / 2 - 4} y={top - 6} width={w + 8} height="8" rx="2" fill="#78716c" /></g>;
    }
    case 'shelf': {
      const h = num(el.h, 150);
      return (
        <g>
          <rect x={x} y={FLOOR - h} width="6" height={h} fill="#64748b" />
          <rect x={x + w - 6} y={FLOOR - h} width="6" height={h} fill="#64748b" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={x} y={FLOOR - 8 - i * (h / 3.4)} width={w} height="5" fill="#94a3b8" />)}
          {[0, 1, 2].map((i) => {
            const board = FLOOR - 8 - i * (h / 3.4);
            const bh = h / 3.4 - 16;
            return [0, 1, 2].map((j) => <rect key={`${i}${j}`} x={x + 10 + j * ((w - 20) / 3)} y={board - bh} width={(w - 30) / 3} height={bh} fill={['#d6a46a', '#c58b4e', '#e0b47c'][(i + j) % 3]} />);
          })}
        </g>
      );
    }
    case 'cart': {
      const n = num(el.boxes, 0);
      return (
        <g>
          <rect x={x - 45} y={FLOOR - 22} width="90" height="8" rx="2" fill="#1e3a8a" />
          <path d={`M${x + 45} ${FLOOR - 18} v-56 h8`} stroke="#1e3a8a" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx={x - 32} cy={FLOOR - 7} r="7" fill="#111827" />
          <circle cx={x + 32} cy={FLOOR - 7} r="7" fill="#111827" />
          {Array.from({ length: n }, (_, i) => (
            <g key={i}>
              <rect x={x - 36 + (i % 2) * 4} y={FLOOR - 22 - (i + 1) * 30} width="68" height="30" fill={['#c58b4e', '#d6a46a', '#b97a3e'][i % 3]} stroke="#8a5a2b" />
              <path d={`M${x - 36 + (i % 2) * 4} ${FLOOR - 22 - (i + 1) * 30 + 9} h68`} stroke="#8a5a2b" opacity=".5" />
            </g>
          ))}
        </g>
      );
    }
    case 'boxes': {
      const n = num(el.n, 3);
      return <g>{Array.from({ length: n }, (_, i) => <rect key={i} x={x - 30 + (i % 2) * 6} y={FLOOR - (i + 1) * 32} width="60" height="32" fill={['#c58b4e', '#d6a46a'][i % 2]} stroke="#8a5a2b" />)}</g>;
    }
    case 'whiteboard': {
      const y = num(el.y, 40);
      return (
        <g>
          <rect x={x - w / 2} y={y} width={w} height="72" rx="3" fill="#fff" stroke="#9ca3af" strokeWidth="4" />
          {el.writing ? <path d={`M${x - w / 2 + 14} ${y + 20} h${w * 0.5} M${x - w / 2 + 14} ${y + 36} h${w * 0.35} M${x - w / 2 + 14} ${y + 52} h${w * 0.6}`} stroke="#2563eb" strokeWidth="3" /> : null}
        </g>
      );
    }
    case 'tree':
      return (
        <g>
          <rect x={x - 7} y={FLOOR - 120} width="14" height="120" fill="#8b5a2b" />
          <circle cx={x} cy={FLOOR - 140} r="42" fill="#3f9a4e" />
          <circle cx={x - 30} cy={FLOOR - 115} r="26" fill="#4caf5a" />
          <circle cx={x + 30} cy={FLOOR - 118} r="28" fill="#4caf5a" />
        </g>
      );
    case 'fence': {
      const posts = Math.floor(w / 22);
      return (
        <g fill="#e7d3b0" stroke="#b49b70">
          <rect x={x} y={FLOOR - 40} width={w} height="5" />
          <rect x={x} y={FLOOR - 20} width={w} height="5" />
          {Array.from({ length: posts + 1 }, (_, i) => <rect key={i} x={x + i * 22} y={FLOOR - 52} width="7" height="52" />)}
        </g>
      );
    }
    case 'bicycle': {
      const y = FLOOR - 17;
      const c = str(el.color, '#dc2626');
      return (
        <g fill="none" strokeLinecap="round">
          <circle cx={x - 24} cy={y} r="16" stroke="#1f2937" strokeWidth="3" />
          <circle cx={x + 24} cy={y} r="16" stroke="#1f2937" strokeWidth="3" />
          <path d={`M${x - 24} ${y} l14 -24 h22 l12 24 M${x - 10} ${y - 24} l10 24 l22 -24 M${x - 13} ${y - 30} h10 M${x + 24} ${y} l-8 -30 h8`} stroke={c} strokeWidth="3.5" />
        </g>
      );
    }
    case 'door': {
      const top = FLOOR - 140;
      return el.open ? (
        <g>
          <rect x={x - 32} y={top} width="64" height="140" fill="#374151" />
          <path d={`M${x - 32} ${top} l-22 12 v134 l22 -6z`} fill="#a16207" />
        </g>
      ) : (
        <g>
          <rect x={x - 32} y={top} width="64" height="140" fill="#a16207" />
          <circle cx={x + 22} cy={top + 74} r="3.5" fill="#fde68a" />
        </g>
      );
    }
    case 'ladder': {
      const h = num(el.h, 150);
      const lean = num(el.lean, 26);
      return (
        <g stroke="#9ca3af" strokeWidth="5" strokeLinecap="round">
          <path d={`M${x} ${FLOOR} l${lean} ${-h} M${x + 30} ${FLOOR} l${lean} ${-h}`} />
          {Array.from({ length: 7 }, (_, i) => {
            const t = (i + 1) / 8;
            return <path key={i} d={`M${x + lean * t} ${FLOOR - h * t} h30`} strokeWidth="4" />;
          })}
        </g>
      );
    }
    case 'bench':
      return (
        <g fill="#8b5a2b">
          <rect x={x - 50} y={FLOOR - 40} width="100" height="8" rx="2" />
          <rect x={x - 50} y={FLOOR - 66} width="100" height="7" rx="2" />
          <rect x={x - 44} y={FLOOR - 32} width="6" height="32" fill="#374151" />
          <rect x={x + 38} y={FLOOR - 32} width="6" height="32" fill="#374151" />
          <rect x={x - 44} y={FLOOR - 66} width="5" height="30" fill="#374151" />
          <rect x={x + 39} y={FLOOR - 66} width="5" height="30" fill="#374151" />
        </g>
      );
    case 'car': {
      const c = str(el.color, '#2563eb');
      return (
        <g>
          <path d={`M${x - 70} ${FLOOR - 14} v-26 q0 -8 10 -10 l20 -4 l18 -24 h50 l22 24 l20 6 q10 3 10 12 v22z`} fill={c} />
          <path d={`M${x - 34} ${FLOOR - 42} l14 -18 h22 v18z M${x + 8} ${FLOOR - 42} v-18 h20 l16 18z`} fill="#cfe7fb" />
          <circle cx={x - 40} cy={FLOOR - 12} r="13" fill="#111827" />
          <circle cx={x + 42} cy={FLOOR - 12} r="13" fill="#111827" />
        </g>
      );
    }
    case 'sign': {
      return (
        <g>
          <rect x={x - 3} y={FLOOR - 110} width="6" height="110" fill="#6b7280" />
          <rect x={x - 40} y={FLOOR - 130} width="80" height="34" rx="4" fill="#1d4ed8" />
          <text x={x} y={FLOOR - 108} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">{str(el.text, 'BUS')}</text>
        </g>
      );
    }
    case 'lamp':
      return <g><rect x={x - 2} y={FLOOR - 62 - 40} width="4" height="40" fill="#6b7280" /><path d={`M${x - 14} ${FLOOR - 102} h28 l-6 -16 h-16z`} fill="#fbbf24" /></g>;
    default:
      return null;
  }
}

export function SceneView({ scene, className }: { scene: SceneT; className?: string }) {
  return (
    <figure className={className}>
      <svg viewBox="0 0 400 260" className="h-auto w-full overflow-hidden rounded-2xl border border-line" role="img" aria-label={scene.alt}>
        <Background bg={scene.bg} />
        {scene.els.map((el, i) => (
          <El key={i} el={el} />
        ))}
      </svg>
    </figure>
  );
}
