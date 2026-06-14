import { useState, useEffect } from 'react'
import { submitFollowUp } from '../api.js'
import { T } from '../strings.js'

function ScoreRow({ label, score }) {
  const pct = ((score ?? 0) / 5) * 100
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-zinc-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-zinc-700 w-8 text-right">
        {score ?? '-'}<span className="text-zinc-400 font-normal">/5</span>
      </span>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className="pl-3 border-l-2 border-zinc-200">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-zinc-700 leading-relaxed">{children}</div>
    </div>
  )
}

export default function AnswerFeedback({ feedback, question, category, lang, onNext, isLast }) {
  const t = T[lang]
  const labels = (t.scoreLabels[category] ?? t.scoreLabels.technical)
  const [visible, setVisible] = useState(false)
  const [showRubric, setShowRubric] = useState(false)
  const [followUpAnswer, setFollowUpAnswer] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [followUpComment, setFollowUpComment] = useState('')
  const [followUpError, setFollowUpError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(timer)
  }, [])

  const scores = [feedback.score_clarity, feedback.score_specific, feedback.score_technical].filter(Boolean)
  const overall = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null

  const handleFollowUpSubmit = async () => {
    if (!followUpAnswer.trim()) return
    setFollowUpLoading(true)
    setFollowUpError('')
    try {
      const { comment } = await submitFollowUp({
        original_question: question,
        follow_up_question: feedback.follow_up,
        answer_text: followUpAnswer,
      })
      setFollowUpComment(comment)
    } catch (e) {
      setFollowUpError(e.message)
    } finally {
      setFollowUpLoading(false)
    }
  }

  return (
    <div
      className={`mt-6 pt-6 border-t border-zinc-100 space-y-5 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-zinc-700">{t.scoreTitle}</span>
          {overall && (
            <span className="text-xs text-zinc-500">
              {t.overallLabel} <span className="font-bold text-zinc-800">{overall}</span> / 5
            </span>
          )}
        </div>
        <div className="space-y-2.5">
          <ScoreRow label={labels[0]} score={feedback.score_clarity} />
          <ScoreRow label={labels[1]} score={feedback.score_specific} />
          <ScoreRow label={labels[2]} score={feedback.score_technical} />
        </div>
      </div>

      {feedback.strengths && <Section label={t.strengths}>{feedback.strengths}</Section>}
      {feedback.weaknesses && <Section label={t.weaknesses}>{feedback.weaknesses}</Section>}
      {feedback.improved_answer && (
        <Section label={t.modelAnswer}>
          <span className="whitespace-pre-wrap">{feedback.improved_answer}</span>
        </Section>
      )}

      {feedback.follow_up && (
        <div className="space-y-2">
          <div className="pl-3 border-l-2 border-indigo-300 bg-indigo-50 py-2 rounded-r-md">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">{t.followUpLabel}</p>
            <p className="text-sm text-indigo-800 leading-relaxed">{feedback.follow_up}</p>
          </div>

          {!followUpComment ? (
            <div className="pl-3">
              <div className="relative mb-2">
                <textarea
                  rows={3}
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  placeholder={t.followUpPlaceholder}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
                />
                <span className="absolute bottom-2 right-3 text-xs text-zinc-300 pointer-events-none">{t.charCount(followUpAnswer.length)}</span>
              </div>
              {followUpError && <p className="text-red-500 text-xs mb-2">{followUpError}</p>}
              <button
                onClick={handleFollowUpSubmit}
                disabled={followUpLoading || !followUpAnswer.trim()}
                className="px-4 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition-colors"
              >
                {followUpLoading ? t.followUpEvaluating : t.followUpSubmit}
              </button>
            </div>
          ) : (
            <div className="pl-3 border-l-2 border-zinc-200">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">{t.followUpFeedbackLabel}</p>
              <p className="text-sm text-zinc-700 leading-relaxed">{followUpComment}</p>
            </div>
          )}
        </div>
      )}

      {feedback.rubric_basis && (
        <div>
          <button onClick={() => setShowRubric(r => !r)} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            {showRubric ? t.hideRubric : t.showRubric}
          </button>
          {showRubric && (
            <div className="mt-2 text-xs text-zinc-500 leading-relaxed bg-zinc-50 rounded-md px-3 py-2.5 border border-zinc-200">
              {feedback.rubric_basis}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isLast ? t.viewResults : t.nextQuestion}
      </button>
    </div>
  )
}
