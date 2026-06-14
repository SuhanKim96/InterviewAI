import { useState, useRef, useEffect } from 'react'
import { submitTurn, askInterviewer } from '../api.js'
import AnswerFeedback from './AnswerFeedback.jsx'
import { T } from '../strings.js'

const BADGE = {
  technical:  'bg-indigo-100 text-indigo-700',
  experience: 'bg-zinc-100 text-zinc-600',
  culture:    'bg-emerald-100 text-emerald-700',
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

  const handleSubmit = async () => {
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
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
          <span>{t.questionOf(index + 1, total)}</span>
          <span className={`font-medium px-2 py-0.5 rounded-full ${BADGE[question.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
            {t.categoryLabels[question.category] ?? question.category}
          </span>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <p className="text-zinc-900 font-medium text-base leading-relaxed mb-4">{question.question}</p>

      {(question.intent || question.related_to) && (
        <div className="mb-4">
          <button onClick={() => setShowHint(h => !h)} className="text-xs text-zinc-400 hover:text-zinc-600">
            {showHint ? t.hideHint : t.showHint}
          </button>
          {showHint && (
            <div className="mt-2 bg-zinc-50 rounded-lg px-3 py-2 text-xs text-zinc-500 space-y-1">
              {question.intent && <p><span className="font-medium text-zinc-600">{t.intentLabel}</span> {question.intent}</p>}
              {question.related_to && <p><span className="font-medium text-zinc-600">{t.basisLabel}</span> {question.related_to}</p>}
            </div>
          )}
        </div>
      )}

      {!localFeedback ? (
        <>
          <div className="relative mb-3">
            <textarea
              ref={textareaRef}
              rows={5}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder={t.answerPlaceholder}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
            />
            <span className="absolute bottom-2 right-3 text-xs text-zinc-300 pointer-events-none">
              {t.charCount(answerText.length)}
            </span>
          </div>
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t.evaluating : t.submit}
          </button>
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
        <div className="mt-6 pt-5 border-t border-zinc-100">
          <button
            onClick={() => setShowAsk(v => !v)}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {showAsk ? t.closeAsk : t.openAsk}
          </button>

          {showAsk && (
            <div className="mt-3 space-y-3">
              {chat.map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-end">
                    <p className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-xl rounded-br-sm max-w-xs">{item.q}</p>
                  </div>
                  <div className="flex justify-start">
                    <p className="text-xs bg-zinc-100 text-zinc-700 px-3 py-2 rounded-xl rounded-bl-sm max-w-xs leading-relaxed">{item.a}</p>
                  </div>
                </div>
              ))}
              {askLoading && (
                <div className="flex justify-start">
                  <p className="text-xs bg-zinc-100 text-zinc-400 px-3 py-2 rounded-xl rounded-bl-sm">{t.askAnswering}</p>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAsk()}
                  placeholder={t.askPlaceholder}
                  className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  onClick={handleAsk}
                  disabled={askLoading || !askInput.trim()}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {t.send}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
