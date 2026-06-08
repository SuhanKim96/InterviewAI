import { useState } from 'react'
import { submitAnswer } from '../api.js'
import AnswerFeedback from './AnswerFeedback.jsx'

const BADGE = {
  technical: 'bg-blue-100 text-blue-700',
  experience: 'bg-green-100 text-green-700',
}
const BADGE_LABEL = { technical: '기술', experience: '경험' }

export default function QuestionCard({ question, index, total, feedback, onFeedback, onNext }) {
  const [answerText, setAnswerText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showHint, setShowHint] = useState(false)

  const handleSubmit = async () => {
    if (!answerText.trim()) { setError('답변을 입력해주세요.'); return }
    setLoading(true)
    setError('')
    try {
      const result = await submitAnswer({ question_id: question.id, answer_text: answerText })
      onFeedback(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">질문 {index + 1} / {total}</span>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${BADGE[question.category] ?? 'bg-gray-100 text-gray-600'}`}>
          {BADGE_LABEL[question.category] ?? question.category}
        </span>
      </div>

      <p className="text-gray-900 font-medium text-base leading-relaxed mb-4">{question.question}</p>

      {(question.intent || question.related_to) && (
        <div className="mb-4">
          <button
            onClick={() => setShowHint((h) => !h)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {showHint ? '▲ 힌트 숨기기' : '▼ 면접관 의도 보기'}
          </button>
          {showHint && (
            <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 space-y-1">
              {question.intent && <p><span className="font-medium text-gray-600">의도:</span> {question.intent}</p>}
              {question.related_to && <p><span className="font-medium text-gray-600">근거:</span> {question.related_to}</p>}
            </div>
          )}
        </div>
      )}

      {!feedback ? (
        <>
          <textarea
            rows={5}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="답변을 입력하세요..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-3"
          />
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '평가 중...' : '제출'}
          </button>
        </>
      ) : (
        <AnswerFeedback
          feedback={feedback}
          onNext={onNext}
          isLast={index === total - 1}
        />
      )}
    </div>
  )
}
