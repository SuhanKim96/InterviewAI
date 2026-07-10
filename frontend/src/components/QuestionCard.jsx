import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { submitTurn, askInterviewer } from '../api.js'
import AnswerFeedback from './AnswerFeedback.jsx'
import Button from './ui/Button.jsx'
import Skeleton from './ui/Skeleton.jsx'
import { T } from '../strings.js'

const BADGE = {
  technical:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  experience: 'bg-zinc-100 text-zinc-600 dark:bg-night-800 dark:text-zinc-400',
  culture:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}

function EvaluatingSkeleton({ label }) {
  return (
    <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-white/10 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
        <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        {label}
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-20 shrink-0" />
            <Skeleton className="h-1.5 flex-1 rounded-full" />
            <Skeleton className="h-3 w-8 shrink-0" />
          </div>
        ))}
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  )
}

export default function QuestionCard({ question, sessionId, index, total, lang, onTurnComplete }) {
  const t = T[lang]
  const [answerText, setAnswerText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [showAsk, setShowAsk] = useState(false)
  const [askInput, setAskInput] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [chat, setChat] = useState([])
  const [localFeedback, setLocalFeedback] = useState(null)
  const [pendingTurn, setPendingTurn] = useState(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleAnswerChange = (e) => {
    setAnswerText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 400)}px`
  }

  const handleSubmit = async () => {
    if (loading) return
    if (!answerText.trim()) { setError(t.errNoAnswer); return }
    setLoading(true)
    setError('')
    try {
      const turnResponse = await submitTurn(sessionId, { answer_text: answerText })
      setLocalFeedback(turnResponse.evaluation)
      setPendingTurn(turnResponse)
    } catch (e) {
      setError(lang === 'en' ? t.errGeneric : e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleAsk = async () => {
    if (!askInput.trim()) return
    const q = askInput.trim()
    setAskInput('')
    setAskLoading(true)
    try {
      const { answer } = await askInterviewer({ session_id: sessionId, question: q, current_interview_question: question.question })
      setChat(prev => [...prev, { q, a: answer }])
    } catch {
      setChat(prev => [...prev, { q, a: t.askError }])
    } finally {
      setAskLoading(false)
    }
  }

  const pct = Math.round(((index) / total) * 100)

  return (
    <div className="bg-white/70 dark:bg-night-900/70 backdrop-blur-xl rounded-2xl border border-zinc-200/60 dark:border-white/10 shadow-lg shadow-zinc-950/5 dark:shadow-black/20 p-6 transition-colors">
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 mb-1.5">
          <span className="font-mono">{t.questionOf(index + 1, total)}</span>
          <span className={`font-medium px-2 py-0.5 rounded-full ${BADGE[question.category] ?? 'bg-zinc-100 text-zinc-600 dark:bg-night-800 dark:text-zinc-400'}`}>
            {t.categoryLabels[question.category] ?? question.category}
          </span>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-night-800 rounded-full h-1.5">
          <motion.div
            className="h-1.5 rounded-full bg-indigo-500"
            initial={{ width: `${Math.round((Math.max(index - 1, 0) / total) * 100)}%` }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="text-zinc-900 dark:text-zinc-100 font-medium text-base leading-relaxed mb-4"
      >
        {question.question}
      </motion.p>

      {(question.intent || question.related_to) && (
        <div className="mb-4">
          <button onClick={() => setShowHint(h => !h)} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            {showHint ? t.hideHint : t.showHint}
          </button>
          <AnimatePresence initial={false}>
            {showHint && (
              <motion.div
                key="hint"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2 bg-zinc-50 dark:bg-night-800/50 rounded-lg px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                  {question.intent && <p><span className="font-medium text-zinc-600 dark:text-zinc-300">{t.intentLabel}</span> {question.intent}</p>}
                  {question.related_to && <p><span className="font-medium text-zinc-600 dark:text-zinc-300">{t.basisLabel}</span> {question.related_to}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!localFeedback ? (
        <>
          <div className="relative mb-1.5">
            <textarea
              ref={textareaRef}
              rows={5}
              value={answerText}
              onChange={handleAnswerChange}
              onKeyDown={handleAnswerKeyDown}
              placeholder={t.answerPlaceholder}
              disabled={loading}
              className="w-full border border-zinc-200 dark:border-white/15 bg-white dark:bg-night-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y disabled:opacity-60 transition-colors"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-300 dark:text-zinc-600 mb-3">
            <span className="flex items-center gap-1">
              <span className="kbd">⌘</span>
              <span className="kbd">↵</span>
              <span className="ml-0.5">{t.kbdSubmit}</span>
            </span>
            <span className="font-mono">{t.charCount(answerText.length)}</span>
          </div>
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          {!loading && (
            <Button onClick={handleSubmit}>
              {t.submit}
            </Button>
          )}
          {loading && <EvaluatingSkeleton label={t.evaluating} />}
        </>
      ) : (
        <AnswerFeedback
          feedback={localFeedback}
          question={question.question}
          category={question.category}
          lang={lang}
          onNext={() => onTurnComplete(pendingTurn)}
          isLast={pendingTurn?.session_complete ?? false}
        />
      )}

      {sessionId && (
        <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-white/10">
          <button
            onClick={() => setShowAsk(v => !v)}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            {showAsk ? t.closeAsk : t.openAsk}
          </button>

          <AnimatePresence initial={false}>
          {showAsk && (
            <motion.div
              key="ask"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
            <div className="mt-3 space-y-3">
              {chat.map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-end">
                    <motion.p
                      initial={{ opacity: 0, x: 12, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-xl rounded-br-sm max-w-xs"
                    >
                      {item.q}
                    </motion.p>
                  </div>
                  <div className="flex justify-start">
                    <motion.p
                      initial={{ opacity: 0, x: -12, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className="text-xs bg-zinc-100 dark:bg-night-800 text-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-xl rounded-bl-sm max-w-xs leading-relaxed"
                    >
                      {item.a}
                    </motion.p>
                  </div>
                </div>
              ))}
              {askLoading && (
                <div className="flex justify-start">
                  <span className="bg-zinc-100 dark:bg-night-800 rounded-xl rounded-bl-sm">
                    <TypingDots />
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAsk()}
                  placeholder={t.askPlaceholder}
                  className="flex-1 border border-zinc-200 dark:border-white/15 bg-white dark:bg-night-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
                <motion.button
                  onClick={handleAsk}
                  disabled={askLoading || !askInput.trim()}
                  whileTap={askLoading || !askInput.trim() ? undefined : { scale: 0.95 }}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {t.send}
                </motion.button>
              </div>
            </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
