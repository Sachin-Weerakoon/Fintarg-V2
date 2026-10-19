'use client';

/**
 * Lightweight, dependency-free SVG chart kit for Fintarg.
 * All colours come from CSS variables so charts follow the active theme
 * (light, dark and custom brand colours) automatically.
 */
import React, { useId, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';

export const CHART_COLORS = {
  income: 'var(--color-success-solid)',
  outflow: 'var(--color-primary-500)',
  danger: 'var(--color-danger-solid)',
  warning: 'var(--color-warning-solid)',
  primary: 'var(--color-primary-500)',
  primaryDeep: 'var(--color-primary-600)',
  muted: 'var(--color-muted)',
  grid: 'var(--color-border)',
  text: 'var(--color-text)',
};

export const CATEGORY_PALETTE = [
  'var(--color-primary-500)',
  '#6366F1',
  '#F59E0B',
  '#10B981',
  '#EC4899',
  '#38BDF8',
  '#A78BFA',
  '#F97316',
  '#14B8A6',
  '#94A3B8',
];

const compact = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M` : a >= 1000 ? `${(a / 1000).toFixed(a >= 10_000 ? 0 : 1)}k` : `${Math.round(a)}`;
  return n < 0 ? `−${s}` : s;
};

export { compact as compactNumber };

/* ───────────────────────────── Sparkline ───────────────────────────── */

export function Sparkline({
  values,
  color = CHART_COLORS.primary,
  height = 34,
  width = 110,
  fill = true,
  className = '',
}: {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
  fill?: boolean;
  className?: string;
}) {
  const id = useId();
  if (values.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id}-g)`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.8" fill={color} />
    </svg>
  );
}

/* ─────────────────────────── Health gauge ring ─────────────────────────── */

export function ScoreRing({
  value,
  size = 168,
  stroke = 12,
  label,
  sublabel,
  color = 'var(--color-primary-400)',
  track = 'rgba(255,255,255,0.10)',
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  color?: string;
  track?: string;
}) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value)) / 100;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={`Score ${Math.round(value)} out of 100`}>
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="var(--color-primary-600)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id}-ring)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-4xl font-black tracking-tight text-white num leading-none">{label ?? Math.round(value)}</div>
        {sublabel && <div className="mt-1.5 text-[11px] uppercase tracking-wider font-semibold text-chrome-text">{sublabel}</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────── Donut chart ─────────────────────────── */

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

export function DonutChart({
  data: inputData,
  size = 190,
  stroke = 26,
  centerLabel,
  centerValue,
  onHover,
}: {
  data: DonutSlice[];
  size?: number;
  stroke?: number;
  centerLabel?: string;
  centerValue?: string;
  onHover?: (index: number | null) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const data = inputData.filter(slice => Number.isFinite(slice.value) && slice.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length || total <= 0) {
    return <EmptyState title="No chart data" helper="Record financial activity to see this breakdown." />;
  }
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const set = (i: number | null) => {
    setActive(i);
    onHover?.(i);
  };
  const shown = active !== null && data[active] ? data[active] : null;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label="Spending distribution">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} opacity="0.5" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color || CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
                strokeWidth={active === i ? stroke + 5 : stroke}
                strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                strokeDashoffset={-offset}
                style={{ transition: 'stroke-width 0.2s ease, opacity 0.2s ease', opacity: active === null || active === i ? 1 : 0.35, cursor: 'pointer' }}
                onMouseEnter={() => set(i)}
                onMouseLeave={() => set(null)}
              >
                <title>{`${d.label}: ${compact(d.value)}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-muted truncate max-w-full">{shown ? shown.label : centerLabel}</div>
        <div className="text-lg font-extrabold text-text num leading-tight">{shown ? compact(shown.value) : centerValue}</div>
        {shown && total > 0 && <div className="text-[11px] text-muted num">{Math.round((shown.value / total) * 100)}%</div>}
      </div>
    </div>
  );
}

/* ───────────────── Trend chart with forecast + band ───────────────── */

export interface TrendPoint {
  label: string;
  income: number;
  outflow: number;
  net: number;
  isForecast?: boolean;
  outflowLow?: number;
  outflowHigh?: number;
}

export function TrendChart({
  data: inputData,
  height = 260,
  formatValue = (n: number) => compact(n),
}: {
  data: TrendPoint[];
  height?: number;
  formatValue?: (n: number) => string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const data = inputData.filter(point =>
    Number.isFinite(point.income) &&
    Number.isFinite(point.outflow) &&
    Number.isFinite(point.net) &&
    Number.isFinite(point.outflowLow ?? 0) &&
    Number.isFinite(point.outflowHigh ?? 0)
  );
  if (!data.length || !data.some(point => point.income !== 0 || point.outflow !== 0)) {
    return <EmptyState title="No trend data" helper="Record activity in this period to populate the trend chart." />;
  }
  const W = 720;
  const H = height;
  const m = { t: 18, r: 18, b: 34, l: 46 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const maxV = Math.max(1, ...data.flatMap(d => [d.income, d.outflow, d.outflowHigh ?? 0])) * 1.1;
  const x = (i: number) => m.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => m.t + (1 - v / maxV) * ih;
  const path = (key: 'income' | 'outflow', from = 0, to = data.length - 1) =>
    data
      .slice(from, to + 1)
      .map((d, i) => `${i ? 'L' : 'M'}${x(from + i).toFixed(1)},${y(d[key]).toFixed(1)}`)
      .join(' ');

  const firstFc = data.findIndex(d => d.isForecast);
  const lastActual = firstFc === -1 ? data.length - 1 : Math.max(0, firstFc - 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => t * maxV);

  const hasBand = data.some(d => d.isForecast && d.outflowLow !== undefined);
  const band = hasBand
    ? (() => {
        const fc = data.map((d, i) => ({ d, i })).filter(({ d }) => d.isForecast);
        const start = Math.max(0, (fc[0]?.i ?? 1) - 1);
        const pts = [{ i: start, lo: data[start].outflow, hi: data[start].outflow }, ...fc.map(({ d, i }) => ({ i, lo: d.outflowLow ?? d.outflow, hi: d.outflowHigh ?? d.outflow }))];
        const top = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i)},${y(p.hi)}`).join(' ');
        const bottom = [...pts].reverse().map(p => `L${x(p.i)},${y(p.lo)}`).join(' ');
        return `${top} ${bottom} Z`;
      })()
    : '';

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label="Income and outflow trend with forecast" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`${id}-inc`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.income} stopOpacity="0.28" />
            <stop offset="100%" stopColor={CHART_COLORS.income} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-out`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.outflow} stopOpacity="0.25" />
            <stop offset="100%" stopColor={CHART_COLORS.outflow} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map(t => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={CHART_COLORS.grid} strokeDasharray="3 5" />
            <text x={m.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill={CHART_COLORS.muted}>
              {compact(t)}
            </text>
          </g>
        ))}

        {firstFc !== -1 && (
          <g>
            <rect x={x(lastActual)} y={m.t} width={Math.max(0, W - m.r - x(lastActual))} height={ih} fill="var(--color-primary-500)" opacity="0.05" />
            <text x={x(lastActual) + 8} y={m.t + 12} fontSize="10" fontWeight="700" fill={CHART_COLORS.primary} letterSpacing="0.06em">
              FORECAST
            </text>
          </g>
        )}

        {band && <path d={band} fill={CHART_COLORS.outflow} opacity="0.14" />}

        {/* income */}
        <path d={`${path('income', 0, lastActual)} L${x(lastActual)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${id}-inc)`} />
        <path d={path('income', 0, lastActual)} fill="none" stroke={CHART_COLORS.income} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {firstFc !== -1 && <path d={path('income', lastActual)} fill="none" stroke={CHART_COLORS.income} strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" opacity="0.8" />}

        {/* outflow */}
        <path d={`${path('outflow', 0, lastActual)} L${x(lastActual)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${id}-out)`} />
        <path d={path('outflow', 0, lastActual)} fill="none" stroke={CHART_COLORS.outflow} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {firstFc !== -1 && <path d={path('outflow', lastActual)} fill="none" stroke={CHART_COLORS.outflow} strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" opacity="0.8" />}

        {data.map((d, i) => (
          <g key={d.label}>
            <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="10.5" fontWeight={d.isForecast ? 700 : 500} fill={d.isForecast ? CHART_COLORS.primary : CHART_COLORS.muted}>
              {d.label}
            </text>
            <circle cx={x(i)} cy={y(d.income)} r={hover === i ? 5 : 3.2} fill="var(--color-surface)" stroke={CHART_COLORS.income} strokeWidth="2" />
            <circle cx={x(i)} cy={y(d.outflow)} r={hover === i ? 5 : 3.2} fill="var(--color-surface)" stroke={d.outflow > d.income ? CHART_COLORS.danger : CHART_COLORS.outflow} strokeWidth="2" />
            <rect x={x(i) - iw / data.length / 2} y={m.t} width={iw / data.length} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} stroke={CHART_COLORS.muted} strokeDasharray="2 4" opacity="0.6" />
        )}
      </svg>

      {hover !== null && data[hover] && (
        <div
          className="pointer-events-none absolute z-10 min-w-[150px] rounded-xl px-3 py-2.5 text-xs shadow-xl border border-white/10 bg-[#0E1726]/95 text-white backdrop-blur-md"
          style={{ left: `${(x(hover) / W) * 100}%`, top: 6, transform: `translateX(${hover > data.length / 2 ? '-105%' : '5%'})` }}
        >
          <div className="font-bold mb-1.5 flex items-center gap-2">
            {data[hover].label}
            {data[hover].isForecast && <span className="text-[9px] uppercase tracking-wider text-primary-400">forecast</span>}
          </div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">Income</span><span className="num font-semibold">{formatValue(data[hover].income)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">Outflow</span><span className="num font-semibold">{formatValue(data[hover].outflow)}</span></div>
          <div className="flex justify-between gap-4 pt-1 mt-1 border-t border-white/10">
            <span className="text-slate-400">Net</span>
            <span className={`num font-bold ${data[hover].net < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatValue(data[hover].net)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Waterfall (income → net) ───────────────────── */

export interface WaterfallStep {
  label: string;
  value: number; // positive adds, negative subtracts
  kind: 'start' | 'delta' | 'end';
}

export function WaterfallChart({ steps: inputSteps, height = 240, formatValue = compact }: { steps: WaterfallStep[]; height?: number; formatValue?: (n: number) => string }) {
  const steps = inputSteps.filter(step => Number.isFinite(step.value));
  if (!steps.length || !steps.some(step => step.value !== 0)) {
    return <EmptyState title="No cash-flow data" helper="Record income and expenses to build the cash-flow waterfall." />;
  }
  const W = 720;
  const H = height;
  const m = { t: 22, r: 14, b: 44, l: 14 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  let running = 0;
  const bars = steps.map(s => {
    if (s.kind === 'start') {
      running = s.value;
      return { ...s, from: 0, to: s.value };
    }
    if (s.kind === 'end') {
      return { ...s, from: 0, to: running };
    }
    const from = running;
    running += s.value;
    return { ...s, from, to: running };
  });
  const maxV = Math.max(1, ...bars.flatMap(b => [b.from, b.to])) * 1.08;
  const minV = Math.min(0, ...bars.flatMap(b => [b.from, b.to])) * 1.15;
  const y = (v: number) => m.t + (1 - (v - minV) / (maxV - minV)) * ih;
  const bw = (iw / bars.length) * 0.58;
  const step = iw / bars.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Monthly cash flow waterfall">
      <line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} stroke={CHART_COLORS.grid} />
      {bars.map((b, i) => {
        const cx = m.l + step * i + step / 2;
        const top = Math.min(y(b.from), y(b.to));
        const h = Math.max(2, Math.abs(y(b.from) - y(b.to)));
        const color = b.kind === 'start' ? CHART_COLORS.income : b.kind === 'end' ? (b.to >= 0 ? CHART_COLORS.primary : CHART_COLORS.danger) : b.value < 0 ? CHART_COLORS.warning : CHART_COLORS.income;
        const next = bars[i + 1];
        return (
          <g key={b.label}>
            <rect x={cx - bw / 2} y={top} width={bw} height={h} rx="6" fill={color} opacity={b.kind === 'delta' ? 0.9 : 1}>
              <title>{`${b.label}: ${formatValue(b.value)}`}</title>
            </rect>
            {next && <line x1={cx + bw / 2} x2={cx + step - bw / 2} y1={y(b.to)} y2={y(b.to)} stroke={CHART_COLORS.muted} strokeDasharray="3 4" opacity="0.6" />}
            <text x={cx} y={top - 6} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={CHART_COLORS.text} className="num">
              {b.kind === 'delta' && b.value < 0 ? '' : ''}
              {formatValue(b.kind === 'end' ? b.to : b.value)}
            </text>
            <text x={cx} y={H - 22} textAnchor="middle" fontSize="10.5" fill={CHART_COLORS.muted}>
              {b.label.length > 12 ? `${b.label.slice(0, 11)}…` : b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ───────────────────── Spending heat calendar ───────────────────── */

export interface HeatCell {
  date: string;
  day: number;
  weekday: number;
  amount: number;
}

export function HeatCalendar({ cells, formatValue = compact }: { cells: HeatCell[]; formatValue?: (n: number) => string }) {
  const max = Math.max(1, ...cells.map(c => c.amount));
  const lead = cells.length ? cells[0].weekday : 0;
  const blanks = Array.from({ length: lead });
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {days.map((d, i) => (
          <div key={i} className="text-[10px] font-semibold text-muted text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {blanks.map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {cells.map(c => {
          const intensity = c.amount === 0 ? 0 : 0.18 + (c.amount / max) * 0.82;
          return (
            <div
              key={c.date}
              title={`${c.date}: ${c.amount ? formatValue(c.amount) : 'No spending'}`}
              className="aspect-square rounded-md flex items-center justify-center text-[10px] font-semibold transition-transform hover:scale-110 cursor-default"
              style={{
                background: c.amount === 0 ? 'var(--color-surface-hover)' : `color-mix(in srgb, var(--color-primary-500) ${Math.round(intensity * 100)}%, transparent)`,
                color: intensity > 0.55 ? '#fff' : 'var(--color-muted)',
                border: '1px solid var(--color-border)',
              }}
            >
              {c.day}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-muted">
        <span>Less</span>
        {[0.15, 0.35, 0.6, 0.85, 1].map(v => (
          <span key={v} className="w-3.5 h-3.5 rounded" style={{ background: `color-mix(in srgb, var(--color-primary-500) ${Math.round(v * 100)}%, transparent)`, border: '1px solid var(--color-border)' }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/* ───────────────────── Horizontal bars ───────────────────── */

export function WeekdayBars({ values, formatValue = compact }: { values: number[]; formatValue?: (n: number) => string }) {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartValues = values.map(value => Number.isFinite(value) ? value : 0);
  if (!chartValues.some(value => value > 0)) {
    return <EmptyState title="No weekday data" helper="Record sales to see activity by day of the week." />;
  }
  const max = Math.max(1, ...chartValues);
  const peak = chartValues.indexOf(Math.max(...chartValues));
  return (
    <div className="flex items-end gap-2 h-[120px]">
      {chartValues.map((v, i) => (
        <div key={labels[i]} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
          <div className="text-[10px] font-semibold text-muted opacity-0 group-hover:opacity-100 transition-opacity num">{formatValue(v)}</div>
          <div
            className="w-full rounded-t-lg transition-all duration-500"
            style={{
              height: `${Math.max(4, (v / max) * 84)}px`,
              background: i === peak && v > 0 ? 'linear-gradient(180deg, var(--color-primary-400), var(--color-primary-600))' : 'var(--color-primary-tint)',
              border: '1px solid var(--color-border)',
            }}
            title={`${labels[i]}: ${formatValue(v)}`}
          />
          <div className={`text-[10px] ${i === peak && v > 0 ? 'font-bold text-primary-text' : 'text-muted'}`}>{labels[i]}</div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────── Radar (health factors) ───────────────────── */

export function RadarChart({ axes, size = 260 }: { axes: { label: string; value: number }[]; size?: number }) {
  const id = useId();
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 38;
  const n = axes.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, v: number) => [cx + Math.cos(angle(i)) * R * (v / 100), cy + Math.sin(angle(i)) * R * (v / 100)] as const;
  const poly = (v: (i: number) => number) => axes.map((_, i) => point(i, v(i)).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[300px] mx-auto" role="img" aria-label="Financial health radar">
      <defs>
        <radialGradient id={`${id}-fill`}>
          <stop offset="0%" stopColor="var(--color-primary-400)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--color-primary-600)" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      {[25, 50, 75, 100].map(ring => (
        <polygon key={ring} points={poly(() => ring)} fill="none" stroke="var(--color-border)" strokeDasharray={ring === 100 ? undefined : '2 4'} />
      ))}
      {axes.map((a, i) => {
        const [x, y] = point(i, 100);
        const [lx, ly] = point(i, 122);
        return (
          <g key={a.label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-border)" />
            <text x={lx} y={ly} fontSize="10" fontWeight="600" fill="var(--color-muted)" textAnchor={Math.abs(lx - cx) < 6 ? 'middle' : lx > cx ? 'start' : 'end'} dominantBaseline="middle">
              {a.label}
            </text>
          </g>
        );
      })}
      <polygon points={poly(i => axes[i].value)} fill={`url(#${id}-fill)`} stroke="var(--color-primary-500)" strokeWidth="2" strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = point(i, a.value);
        return <circle key={a.label} cx={x} cy={y} r="3.5" fill="var(--color-surface)" stroke="var(--color-primary-500)" strokeWidth="2" />;
      })}
    </svg>
  );
}

/* ───────────────────── Goal projection line ───────────────────── */

export function ProgressTrack({
  progress,
  marker,
  tone = 'primary',
}: {
  progress: number; // 0..1
  marker?: number; // 0..1 (where you "should" be)
  tone?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const color = tone === 'success' ? 'var(--color-success-solid)' : tone === 'warning' ? 'var(--color-warning-solid)' : tone === 'danger' ? 'var(--color-danger-solid)' : 'var(--color-primary-500)';
  return (
    <div className="relative h-2.5 rounded-full overflow-visible" style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, background: `linear-gradient(90deg, ${color}, ${color})` }} />
      {marker !== undefined && (
        <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-text/60" style={{ left: `${Math.min(100, Math.max(0, marker * 100))}%` }} title="Expected progress" />
      )}
    </div>
  );
}
