import { useEffect, type ReactNode, type ButtonHTMLAttributes } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

export function Card({ children, className, onClick, as = 'div' }: { children: ReactNode; className?: string; onClick?: () => void; as?: 'div' | 'button' | 'section' }) {
  const Tag = as as 'div';
  return (
    <Tag onClick={onClick} className={cx('rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(16,20,50,0.04)]', onClick && 'text-left w-full active:scale-[0.99] transition', className)}>
      {children}
    </Tag>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'ok'; size?: 'sm' | 'md' | 'lg'; block?: boolean };
export function Button({ variant = 'primary', size = 'md', block, className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-45',
        size === 'sm' && 'px-3 py-1.5 text-sm min-h-9',
        size === 'md' && 'px-4 py-2.5 text-[15px] min-h-11',
        size === 'lg' && 'px-5 py-3.5 text-base min-h-13',
        variant === 'primary' && 'bg-primary text-primary-ink shadow-sm',
        variant === 'soft' && 'bg-primary-soft text-primary',
        variant === 'ghost' && 'bg-transparent text-ink border border-line',
        variant === 'danger' && 'bg-bad-soft text-bad',
        variant === 'ok' && 'bg-ok text-white',
        block && 'w-full',
        className,
      )}
    />
  );
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx('rounded-full border px-3 py-1.5 text-sm font-medium transition min-h-9', active ? 'border-primary bg-primary text-primary-ink' : 'border-line bg-surface text-ink', className)}
    >
      {children}
    </button>
  );
}

export function Progress({ value, className, color = 'bg-primary', label }: { value: number; className?: string; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <div className={cx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, children, color = 'var(--primary)' }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-xl bg-surface-2 p-3', className)}>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between">
      <h2 className="text-base font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function Header({ title, onBack, right, subtitle }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="safe-top sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
        {onBack && (
          <button onClick={onBack} aria-label="Retour" className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2">
            <Icon name="back" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cx('mx-auto w-full max-w-2xl px-4 pb-28 pt-3 anim-in', className)}>{children}</main>;
}

export function Notice({ tone = 'info', children, className }: { tone?: 'info' | 'warn' | 'ok' | 'bad'; children: ReactNode; className?: string }) {
  const map = { info: 'bg-primary-soft text-ink', warn: 'bg-warn-soft text-ink', ok: 'bg-ok-soft text-ink', bad: 'bg-bad-soft text-ink' };
  const icon = { info: 'ℹ️', warn: '⚠️', ok: '✅', bad: '⛔' }[tone];
  return (
    <div className={cx('flex gap-2 rounded-xl p-3 text-sm', map[tone], className)} role={tone === 'bad' || tone === 'warn' ? 'alert' : undefined}>
      <span aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="safe-bottom relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 anim-in sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full bg-surface-2">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {desc && <span className="block text-xs text-muted">{desc}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'bg-surface-2 border border-line')}>
        <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  );
}

export function Pct({ v, digits = 0 }: { v: number | null | undefined; digits?: number }) {
  if (v === null || v === undefined || Number.isNaN(v)) return <>—</>;
  return <>{(v * 100).toFixed(digits)} %</>;
}

const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  book: 'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5zM4 21.5A2.5 2.5 0 0 1 6.5 19H20',
  exam: 'M9 3h6l1 2h3v16H5V5h3zM9 12l2 2 4-4',
  errors: 'M12 3 2 20h20zM12 9v5M12 17.5v.5',
  stats: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  back: 'M15 18l-6-6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  play: 'M7 4v16l13-8z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  replay: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.1 19.8l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.2 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.2 7.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z',
  flag: 'M5 21V4h11l-1.5 4L16 12H5',
  check: 'M5 12l5 5 9-10',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  calendar: 'M4 6h16v15H4zM4 10h16M9 3v4M15 3v4',
  sound: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  cards: 'M7 4h12v14H7zM4 7v13h12',
  plus: 'M12 5v14M5 12h14',
  text: 'M4 6h16M4 12h16M4 18h10',
};

export function Icon({ name, size = 22, className, filled }: { name: keyof typeof PATHS | string; size?: number; className?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
