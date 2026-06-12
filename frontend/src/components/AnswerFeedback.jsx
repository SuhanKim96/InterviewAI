import { useState, useEffect } from 'react'
import { submitFollowUp } from '../api.js'

function ScoreRow({ label, score }) {
  const pct = ((score ?? 0) / 5) * 100
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">
        {score ?? '-'}<span className="text-gray-400 font-normal">/5</span>
      </span>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className="pl-3 border-l-2 border-gray-200">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  )
}

const SCORE_LABELS = {
  technical:  ['명확성', '기술 정확성', '깊이'],
  experience: ['명확성', '구체성', '결과'],
  culture:    ['명확성', '진정성', '가치관 적합성'],
}

export default function AnswerFeedback({ feedback, question, category, onNext, isLast }) {
  const labels = SCORE_LABELS[category] ?? ['명확성', '구체성', '기술 정확성']
  const [visible, setVisible] = useState(false)
  const [showRubric, setShowRubric] = useState(false)
  const [followUpAnswer, setFollowUpAnswer] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [followUpComment, setFollowUpComment] = useState('')
  const [followUpError, setFollowUpError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
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
      className={`mt-6 pt-6 border-t border-gray-100 space-y-5 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Scores */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">평가 점수</span>
          {overall && (
            <span className="text-xs text-gray-500">
              종합 <span className="font-bold text-gray-800">{overall}</span> / 5
            </span>
          )}
        </div>
        <div className="space-y-2.5">
          <ScoreRow label={labels[0]} score={feedback.score_clarity} />
          <ScoreRow label={labels[1]} score={feedback.score_specific} />
          <ScoreRow label={labels[2]} score={feedback.score_technical} />
        </div>
      </div>

      {feedback.strengths && <Section label="강점">{feedback.strengths}</Section>}
      {feedback.weaknesses && <Section label="개선점">{feedback.weaknesses}</Section>}
      {feedback.improved_answer && (
        <Section label="모범 답안 예시">
          <span className="whitespace-pre-wrap">{feedback.improved_answer}</span>
        </Section>
      )}

      {/* Follow-up */}
      {feedback.follow_up && (
        <div className="space-y-2">
          <div className="pl-3 border-l-2 border-indigo-300 bg-indigo-50 py-2 rounded-r-md">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">꼬리질문</p>
            <p className="text-sm text-indigo-800 leading-relaxed">{feedback.follow_up}</p>
          </div>

          {!followUpComment ? (
            <div className="pl-3">
              <div className="relative mb-2">
                <textarea
                  rows={3}
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  placeholder="꼬리질문에 답변하세요..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
                <span className="absolute bottom-2 right-3 text-xs text-gray-300 pointer-events-none">{followUpAnswer.length}자</span>
              </div>
              {followUpError && <p className="text-red-500 text-xs mb-2">{followUpError}</p>}
              <button
                onClick={handleFollowUpSubmit}
                disabled={followUpLoading || !followUpAnswer.trim()}
                className="px-4 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition-colors"
              >
                {followUpLoading ? '평가 중...' : '답변 제출'}
              </button>
            </div>
          ) : (
            <div className="pl-3 border-l-2 border-gray-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">꼬리질문 피드백</p>
              <p className="text-sm text-gray-700 leading-relaxed">{followUpComment}</p>
            </div>
          )}
        </div>
      )}

      {feedback.rubric_basis && (
        <div>
          <button onClick={() => setShowRubric(r => !r)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            {showRubric ? '채점 근거 숨기기 ↑' : '채점 근거 보기 ↓'}
          </button>
          {showRubric && (
            <div className="mt-2 text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-md px-3 py-2.5 border border-gray-200">
              {feedback.rubric_basis}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {isLast ? '결과 보기' : '다음 질문'}
      </button>
    </div>
  )
}
