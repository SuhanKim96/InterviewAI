import { useState } from 'react'
import { createSession, startSession } from '../api.js'

const DIFFICULTIES = ['신입', '주니어', '시니어']
const QUESTION_TYPES = [
  { value: 'technical', label: '기술' },
  { value: 'experience', label: '경험' },
  { value: 'culture', label: '컬처핏' },
]

export default function JDInput({ onDone, onBack }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jdText, setJdText] = useState('')
  const [difficulty, setDifficulty] = useState('주니어')
  const [types, setTypes] = useState(['technical', 'experience'])
  const [count, setCount] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleType = (t) =>
    setTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])

  const handleSubmit = async () => {
    if (!jdText.trim()) { setError('JD를 입력해주세요.'); return }
    if (types.length === 0) { setError('질문 유형을 하나 이상 선택해주세요.'); return }
    setLoading(true)
    setError('')
    try {
      const { session_id } = await createSession({ company, role, jd_text: jdText })
      const { question, total_planned } = await startSession(session_id, { difficulty, types, count })
      if (!question) { setError('질문이 생성되지 않았습니다. 다시 시도해주세요.'); return }
      onDone(session_id, question, total_planned)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M15 8a.5.5 0 00-.5-.5H2.707l3.147-3.146a.5.5 0 10-.708-.708l-4 4a.5.5 0 000 .708l4 4a.5.5 0 00.708-.708L2.707 8.5H14.5A.5.5 0 0015 8z" clipRule="evenodd"/></svg>
          이전
        </button>
      )}
      <h2 className="text-lg font-semibold text-gray-800 mb-1">JD 입력</h2>
      <p className="text-sm text-gray-500 mb-5">채용공고와 옵션을 입력하면 맞춤 면접 질문을 생성합니다.</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">회사명</label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="카카오"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">포지션</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="백엔드 엔지니어"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">채용공고 (JD) *</label>
        <textarea
          rows={8}
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="JD 내용을 붙여넣으세요..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div className="flex flex-wrap gap-6 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">질문 유형</label>
          <div className="flex gap-4 mt-1.5">
            {QUESTION_TYPES.map((t) => (
              <label key={t.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={types.includes(t.value)}
                  onChange={() => toggleType(t.value)}
                  className="accent-indigo-600 w-4 h-4"
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">유형별 개수</label>
          <input
            type="number"
            min={1}
            max={5}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '질문 생성 중...' : '면접 시작'}
      </button>
    </div>
  )
}
