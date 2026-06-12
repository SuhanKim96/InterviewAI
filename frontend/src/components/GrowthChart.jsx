import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const CAT_COLOR = {
  technical:  '#4f46e5',
  experience: '#64748b',
  culture:    '#10b981',
}
const CAT_LABEL = { technical: '기술', experience: '경험', culture: '컬처핏' }

function CustomDot({ cx, cy, payload }) {
  const color = CAT_COLOR[payload.category] ?? '#4f46e5'
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', background: '#fff', padding: '8px 12px' }}>
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {d.category && (
        <p style={{ color: CAT_COLOR[d.category] ?? '#4f46e5' }}>
          {CAT_LABEL[d.category] ?? d.category}
        </p>
      )}
      <p className="text-gray-600">종합: <span className="font-bold">{d.overall != null ? Number(d.overall).toFixed(1) : '-'}</span></p>
    </div>
  )
}

export default function GrowthChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-44 text-sm text-gray-400">
        답변이 2개 이상이어야 그래프를 표시합니다.
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="overall"
            name="종합 점수"
            stroke="#4f46e5"
            strokeWidth={2}
            dot={<CustomDot />}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 justify-center mt-2 text-xs text-gray-500">
        {Object.entries(CAT_LABEL).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLOR[key] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
