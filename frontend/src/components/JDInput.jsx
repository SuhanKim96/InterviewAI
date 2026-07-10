import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createSession, startSession } from '../api.js'
import { spring } from './ui/motion.jsx'
import Button from './ui/Button.jsx'
import { T, DIFFICULTIES } from '../strings.js'

const QUESTION_TYPES = ['technical', 'experience', 'culture']

const INPUT = "border border-zinc-200 dark:border-white/15 bg-white dark:bg-night-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
const LABEL = "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"

export default function JDInput({ lang, onDone, onBack }) {
  const t = T[lang]
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jdText, setJdText] = useState('')
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[1])
  const [types, setTypes] = useState([])
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
      setError(lang === 'en' ? t.errGeneric : e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/70 dark:bg-night-900/70 backdrop-blur-xl rounded-2xl border border-zinc-200/60 dark:border-white/10 shadow-lg shadow-zinc-950/5 dark:shadow-black/20 p-6 transition-colors">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 mb-4 transition-colors">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M15 8a.5.5 0 00-.5-.5H2.707l3.147-3.146a.5.5 0 10-.708-.708l-4 4a.5.5 0 000 .708l4 4a.5.5 0 00.708-.708L2.707 8.5H14.5A.5.5 0 0015 8z" clipRule="evenodd"/></svg>
          {t.back}
        </button>
      )}
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{t.jdTitle}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">{t.jdDesc}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className={LABEL}>{t.companyLabel}</label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder={t.companyPlaceholder}
            className={`w-full ${INPUT}`}
          />
        </div>
        <div>
          <label className={LABEL}>{t.roleLabel}</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={t.rolePlaceholder}
            className={`w-full ${INPUT}`}
          />
        </div>
      </div>

      <div className="mb-5">
        <label className={LABEL}>{t.jdLabel}</label>
        <textarea
          rows={8}
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder={t.jdPlaceholder}
          className={`w-full ${INPUT} resize-none`}
        />
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-5 mb-4">
        <div>
          <label className={LABEL}>{t.difficultyLabel}</label>
          <div className="inline-flex rounded-lg border border-zinc-200 dark:border-white/15 p-0.5 bg-zinc-50 dark:bg-night-800/50 mt-0.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`relative px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  difficulty === d
                    ? 'text-indigo-600 dark:text-indigo-300'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                {difficulty === d && (
                  <motion.span
                    layoutId="difficulty-active"
                    transition={spring}
                    className="absolute inset-0 bg-white dark:bg-white/10 rounded-md shadow-sm"
                  />
                )}
                <span className="relative">{t.difficultyMap[d]}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL}>{t.questionTypesLabel}</label>
          <div className="flex gap-2 mt-0.5">
            {QUESTION_TYPES.map((type) => {
              const selected = types.includes(type)
              return (
                <motion.button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  aria-pressed={selected}
                  whileTap={{ scale: 0.95 }}
                  transition={spring}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                    selected
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-night-900 border-zinc-200 dark:border-white/15 text-zinc-600 dark:text-zinc-300 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                  }`}
                >
                  {selected && (
                    <motion.svg
                      viewBox="0 0 10 10" fill="currentColor" className="w-2.5 h-2.5"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    >
                      <path fillRule="evenodd" d="M8.354 2.646a.5.5 0 010 .708l-4 4a.5.5 0 01-.708 0l-2-2a.5.5 0 01.708-.708L4 6.293l3.646-3.647a.5.5 0 01.708 0z" clipRule="evenodd" />
                    </motion.svg>
                  )}
                  {t.questionTypeLabels[type]}
                </motion.button>
              )
            })}
          </div>
        </div>

        <div>
          <label className={LABEL}>{t.countLabel}</label>
          <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-white/15 mt-0.5">
            <button
              type="button"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              disabled={count <= 1}
              aria-label="−"
              className="w-9 h-9 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 transition-colors text-lg leading-none"
            >
              −
            </button>
            <motion.span
              key={count}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-8 text-center text-sm font-semibold text-zinc-800 dark:text-zinc-200 font-mono select-none"
            >
              {count}
            </motion.span>
            <button
              type="button"
              onClick={() => setCount((c) => Math.min(5, c + 1))}
              disabled={count >= 5}
              aria-label="+"
              className="w-9 h-9 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 transition-colors text-lg leading-none"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {types.length > 0 && (
          <motion.p
            key="summary"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden text-xs text-indigo-500 dark:text-indigo-400 font-medium mb-4"
          >
            {types.map((type) => t.questionTypeLabels[type]).join(' · ')} × {count} — {t.totalQuestions(types.length * count)}
          </motion.p>
        )}
      </AnimatePresence>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <Button onClick={handleSubmit} loading={loading}>
        {loading ? t.generating : t.startBtn}
      </Button>
    </div>
  )
}
