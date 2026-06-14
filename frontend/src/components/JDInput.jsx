import { useState } from 'react'
import { createSession, startSession } from '../api.js'
import { T, DIFFICULTIES } from '../strings.js'
const QUESTION_TYPES = ['technical', 'experience', 'culture']

export default function JDInput({ lang, onDone, onBack }) {
  const t = T[lang]
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jdText, setJdText] = useState('')
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[1])
  const [types, setTypes] = useState(['technical', 'experience'])
  const [count, setCount] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleType = (type) =>
    setTypes((prev) => prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type])

  const handleSubmit = async () => {
    if (!jdText.trim()) { setError(t.errNoJd); return }
    if (types.length === 0) { setError(t.errNoTypes); return }
    setLoading(true)
    setError('')
    try {
      const { session_id } = await createSession({ company, role, jd_text: jdText })
      const { question, total_planned } = await startSession(session_id, { difficulty, types, count, language: lang })
      if (!question) { setError(t.errNoQuestion); return }
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
          {t.back}
        </button>
      )}
      <h2 className="text-lg font-semibold text-gray-800 mb-1">{t.jdTitle}</h2>
      <p className="text-sm text-gray-500 mb-5">{t.jdDesc}</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.companyLabel}</label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder={t.companyPlaceholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.roleLabel}</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={t.rolePlaceholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">{t.jdLabel}</label>
        <textarea
          rows={8}
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder={t.jdPlaceholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div className="flex flex-wrap gap-6 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.difficultyLabel}</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{t.difficultyMap[d]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.questionTypesLabel}</label>
          <div className="flex gap-4 mt-1.5">
            {QUESTION_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={types.includes(type)}
                  onChange={() => toggleType(type)}
                  className="accent-indigo-600 w-4 h-4"
                />
                {t.questionTypeLabels[type]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.countLabel}</label>
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
        {loading ? t.generating : t.startBtn}
      </button>
    </div>
  )
}
