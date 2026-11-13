import { useState } from 'react';
import { formatDayFr, parseDay } from '../lib/dates';

export interface LinePoint {
  label: string;
  l: number | null;
  r: number | null;
}

/** Courbe Listening / Reading (précision 0–100 %), avec infobulle au survol/toucher */
export function LineChart({ data, height = 170, target }: { data: LinePoint[]; height?: number; target?: { l: number; r: number } }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 340, H = height, pl = 34, pr = 10, pt = 10, pb = 22;
  const n = data.length;
  const xOf = (i: number) => pl + (n <= 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (n - 1));
  const yOf = (v: number) => pt + (1 - v) * (H - pt - pb);
  const path = (key: 'l' | 'r') => {
    let d = '';
    let pen = false;
    data.forEach((p, i) => {
      const v = p[key];
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0, bd = Infinity;
    data.forEach((_, i) => {
      const d = Math.abs(xOf(i) - x);
      if (d < bd) { bd = d; best = i; }
    });
    setHover(best);
  };
  const h = hover !== null ? data[hover] : null;
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-sl" />Listening</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-sr" />Reading</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Évolution de la précision Listening et Reading">
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={pl} x2={W - pr} y1={yOf(v)} y2={yOf(v)} stroke="var(--grid)" strokeWidth="1" />
              <text x={pl - 6} y={yOf(v) + 3.5} textAnchor="end" fontSize="9.5" fill="var(--muted)">{v * 100}%</text>
            </g>
          ))}
          {target && (
            <>
              <line x1={pl} x2={W - pr} y1={yOf(target.l)} y2={yOf(target.l)} stroke="var(--series-l)" strokeDasharray="3 4" strokeWidth="1" opacity=".55" />
              <line x1={pl} x2={W - pr} y1={yOf(target.r)} y2={yOf(target.r)} stroke="var(--series-r)" strokeDasharray="3 4" strokeWidth="1" opacity=".55" />
            </>
          )}
          <path d={path('l')} fill="none" stroke="var(--series-l)" strokeWidth="2" strokeLinejoin="round" />
          <path d={path('r')} fill="none" stroke="var(--series-r)" strokeWidth="2" strokeLinejoin="round" />
          {data.map((p, i) => (
            <g key={i}>
              {p.l !== null && <circle cx={xOf(i)} cy={yOf(p.l)} r="4" fill="var(--series-l)" stroke="var(--surface)" strokeWidth="2" />}
              {p.r !== null && <circle cx={xOf(i)} cy={yOf(p.r)} r="4" fill="var(--series-r)" stroke="var(--surface)" strokeWidth="2" />}
            </g>
          ))}
          {data.length > 0 && (
            <>
              <text x={xOf(0)} y={H - 6} fontSize="9.5" fill="var(--muted)" textAnchor={n > 1 ? 'start' : 'middle'}>{data[0].label}</text>
              {n > 1 && <text x={xOf(n - 1)} y={H - 6} fontSize="9.5" fill="var(--muted)" textAnchor="end">{data[n - 1].label}</text>}
            </>
          )}
          {hover !== null && <line x1={xOf(hover)} x2={xOf(hover)} y1={pt} y2={H - pb} stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 3" />}
        </svg>
        {h && (
          <div className="pointer-events-none absolute top-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg" style={{ left: `${Math.min(70, Math.max(0, (xOf(hover!) / W) * 100 - 10))}%` }}>
            <div className="font-semibold">{h.label}</div>
            <div>Listening : {h.l === null ? '—' : `${Math.round(h.l * 100)} %`}</div>
            <div>Reading : {h.r === null ? '—' : `${Math.round(h.r * 100)} %`}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Barres horizontales (une seule série → pas de légende, le titre la nomme) */
export function BarRows({ rows, target }: { rows: { label: string; value: number | null; detail?: string }[]; target?: number }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} title={r.detail}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 tabular-nums font-semibold">{r.value === null ? '—' : `${Math.round(r.value * 100)} %`}{r.detail && <span className="ml-1 font-normal text-muted">{r.detail}</span>}</span>
          </div>
          <div className="relative h-2.5 rounded-full bg-surface-2">
            {r.value !== null && <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(2, r.value * 100)}%` }} />}
            {target !== undefined && <div className="absolute -top-0.5 h-3.5 w-0.5 bg-ink/60" style={{ left: `${target * 100}%` }} aria-hidden />}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Calendrier des jours travaillés (intensité = minutes de révision, une seule teinte) */
export function StudyCalendar({ days, minutes, today }: { days: string[]; minutes: Map<string, number>; today: string }) {
  const level = (m: number) => (m <= 0 ? 0 : m < 15 ? 1 : m < 40 ? 2 : m < 90 ? 3 : 4);
  const op = [0, 0.25, 0.5, 0.75, 1];
  const first = parseDay(days[0]).getDay();
  const pad = (first + 6) % 7; // semaine commençant lundi
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i}>{d}</div>)}
        {Array.from({ length: pad }, (_, i) => <div key={'p' + i} />)}
        {days.map((d) => {
          const m = minutes.get(d) ?? 0;
          const lv = level(m);
          return (
            <div key={d} title={`${formatDayFr(d)} : ${Math.round(m)} min`} className={'relative grid aspect-square place-items-center rounded-md text-[11px] ' + (d === today ? 'ring-2 ring-primary' : '')} style={{ background: lv ? `color-mix(in srgb, var(--primary) ${op[lv] * 100}%, var(--surface-2))` : 'var(--surface-2)', color: lv >= 3 ? 'var(--primary-ink)' : 'var(--text)' }}>
              {Number(d.slice(8))}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted">
        Moins
        {op.map((o, i) => <span key={i} className="h-3 w-3 rounded-sm" style={{ background: i ? `color-mix(in srgb, var(--primary) ${o * 100}%, var(--surface-2))` : 'var(--surface-2)' }} />)}
        Plus
      </div>
    </div>
  );
}
