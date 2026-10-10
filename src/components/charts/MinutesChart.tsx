import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatMinutes } from '../../lib/format';

export interface MinutesPoint {
  key: string;
  label: string;
  /** Etiqueta larga para el tooltip. */
  title: string;
  minutes: number;
}

interface Props {
  data: MinutesPoint[];
  kind?: 'bar' | 'area';
  goal?: number;
  height?: number;
  highlightKey?: string;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const point = payload?.[0]?.payload as MinutesPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-muted">{point.title}</p>
      <p className="mt-0.5 text-sm font-semibold text-fg">{formatMinutes(point.minutes)}</p>
    </div>
  );
}

/** Minutos estudiados por intervalo (una sola serie). */
export function MinutesChart({ data, kind = 'bar', goal, height = 220, highlightKey }: Props) {
  const c = useThemeColors();
  const rounded = data.map((d) => ({ ...d, minutes: Math.round(d.minutes) }));
  const max = Math.max(goal ?? 0, ...rounded.map((d) => d.minutes));
  const yMax = max <= 0 ? 60 : Math.ceil((max * 1.15) / 15) * 15;
  const axis = { stroke: c.subtle, fontSize: 11, tickLine: false, axisLine: false } as const;
  const interval = data.length > 12 ? Math.ceil(data.length / 8) - 1 : 0;

  const goalLine =
    goal && goal > 0 ? (
      <ReferenceLine
        y={goal}
        stroke={c.accent}
        strokeDasharray="4 4"
        strokeWidth={1.5}
        ifOverflow="extendDomain"
        label={{ value: `Objetivo ${goal} min`, position: 'insideTopRight', fill: c.muted, fontSize: 11 }}
      />
    ) : null;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'bar' ? (
          <BarChart data={rounded} margin={{ top: 16, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
            <defs>
              <linearGradient id="bar-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={c.primary} />
                <stop offset="1" stopColor={c.accent} stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={c.line} strokeOpacity={0.6} />
            <XAxis dataKey="label" {...axis} interval={interval} />
            <YAxis {...axis} domain={[0, yMax]} allowDecimals={false} width={44} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: c['surface-2'], opacity: 0.6 }} />
            {goalLine}
            <Bar dataKey="minutes" name="Minutos" radius={[4, 4, 0, 0]} maxBarSize={36} fill="url(#bar-fill)" animationDuration={500}>
              {/* El día resaltado (hoy) a plena opacidad; el resto, atenuado. */}
              {rounded.map((d) => (
                <Cell key={d.key} fillOpacity={!highlightKey || d.key === highlightKey ? 1 : 0.6} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <AreaChart data={rounded} margin={{ top: 16, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={c.primary} stopOpacity={0.35} />
                <stop offset="1" stopColor={c.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={c.line} strokeOpacity={0.6} />
            <XAxis dataKey="label" {...axis} interval={interval} />
            <YAxis {...axis} domain={[0, yMax]} allowDecimals={false} width={44} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: c.subtle, strokeDasharray: '3 3' }} />
            {goalLine}
            <Area
              type="monotone"
              dataKey="minutes"
              name="Minutos"
              stroke={c.primary}
              strokeWidth={2}
              fill="url(#area-fill)"
              activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2, fill: c.primary }}
              animationDuration={500}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
