import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useTheme } from '../theme.js'
import { T } from '../strings.js'

const CAT_COLOR = {
  technical:  '#4f46e5',
  experience: '#64748b',
  culture:    '#10b981',
}

const CAT_COLOR_DARK = {
  technical:  '#818cf8',
  experience: '#94a3b8',
  culture:    '#34d399',
}

function CustomDot({ cx, cy, payload, dark }) {
  const palette = dark ? CAT_COLOR_DARK : CAT_COLOR
  const color = palette[payload.category] ?? palette.technical
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke={dark ? '#11141f' : '#fff'} strokeWidth={1.5} />
}

function CustomTooltip({ active, payload, label, lang, dark }) {
  if (!active || !payload?.length) return null
  const t = T[lang]
  const d = payload[0].payload
  const palette = dark ? CAT_COLOR_DARK : CAT_COLOR
  return (
    <div style={{
      fontSize: 12, borderRadius: 8,
      border: `1px solid ${dark ? '#262b3d' : '#e5e7eb'}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      background: dark ? '#11141f' : '#fff',
      color: dark ? '#d4d4d8' : '#374151',
      padding: '8px 12px',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {d.category && (
        <p style={{ color: palette[d.category] ?? palette.technical }}>
          {t.catLabels[d.category] ?? d.category}
        </p>
      )}
      <p>{t.chartOverallLabel} <span style={{ fontWeight: 700 }}>{d.overall != null ? Number(d.overall).toFixed(1) : '-'}</span></p>
    </div>
  )
}

export default function GrowthChart({ data, lang }) {
  const t = T[lang]
  const { dark } = useTheme()

  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-44 text-sm text-zinc-400 dark:text-zinc-500">
        {t.chartEmpty}
      </div>
    )
  }

  const gridColor = dark ? '#1b1f2e' : '#f3f4f6'
  const tickColor = dark ? '#71717a' : '#9ca3af'
  const lineColor = dark ? '#818cf8' : '#4f46e5'
  const palette = dark ? CAT_COLOR_DARK : CAT_COLOR

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip content={<CustomTooltip lang={lang} dark={dark} />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8, color: tickColor }} />
          <Line
            type="monotone"
            dataKey="overall"
            name={t.chartLineName}
            stroke={lineColor}
            strokeWidth={2}
            dot={<CustomDot dark={dark} />}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 justify-center mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {Object.entries(t.catLabels).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: palette[key] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
