import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export default function GrowthChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-44 text-sm text-gray-400">
        답변이 2개 이상이어야 그래프를 표시합니다.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          formatter={(value) => (value != null ? Number(value).toFixed(1) : '-')}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line type="monotone" dataKey="clarity" name="명확성" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="specific" name="구체성" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="technical" name="기술 정확성" stroke="#9ca3af" strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
