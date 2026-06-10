import { useState, useRef, useEffect } from 'react'
import { submitTurn, askInterviewer } from '../api.js'
import AnswerFeedback from './AnswerFeedback.jsx'

const BADGE = {
  technical: 'bg-indigo-100 text-indigo-700',
  experience: 'bg-gray-100 text-gray-600',
}
const BADGE_LABEL = { technical: '기술', experience: '경험' }

export default function QuestionCard({ question, sessionId, index, total, onTurnComplete }) {
  const [answerText, setAnswerText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [showAsk, setShowAsk] = useState(false)
  const [askInput, setAskInput] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [chat, setChat] = useState([]) // [{q, a}]
  const [localFeedback, setLocalFeedback] = useState(null)
  const [pendingTurn, setPendingTurn] = useState(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    if (!answerText.trim()) { setError('답변을 입력해주세요.'); return }
    setLoading(true)
    setError('')
    try {
      const turnResponse = await submitTurn(sessionId, { answer_text: answerText })
      setLocalFeedback(turnResponse.evaluation)
      setPendingTurn(turnResponse)
    } catch (e) {
      setError(e.message)
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
      const { answer } = await askInterviewer({ session_id: sessionId, question: q })
      setChat(prev => [...prev, { q, a: answer }])
    } catch (e) {
      setChat(prev => [...prev, { q, a: '오류가 발생했습니다.' }])
    } finally {
      setAskLoading(false)
    }
  }

  const pct = Math.round(((index) / total) * 100)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
          <span>질문 {index + 1} / {total}</span>
          <span className={`font-medium px-2 py-0.5 rounded-full ${BADGE[question.category] ?? 'bg-gray-100 text-gray-600'}`}>
            {BADGE_LABEL[question.category] ?? question.category}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1">
          <div
            className="h-1 rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <p className="text-gray-900 font-medium text-base leading-relaxed mb-4">{question.question}</p>

      {(question.intent || question.related_to) && (
        <div className="mb-4">
          <button onClick={() => setShowHint(h => !h)} className="text-xs text-gray-400 hover:text-gray-600">
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

      {!localFeedback ? (
        <>
          <div className="relative mb-3">
            <textarea
              ref={textareaRef}
              rows={5}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="답변을 입력하세요..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
            <span className="absolute bottom-2 right-3 text-xs text-gray-300 pointer-events-none">
              {answerText.length}자
            </span>
          </div>
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '평가 중...' : '제출'}
          </button>
        </>
      ) : (
        <AnswerFeedback
          feedback={localFeedback}
          question={question.question}
          onNext={() => onTurnComplete(pendingTurn)}
          isLast={pendingTurn?.session_complete ?? false}
        />
      )}

      {/* 면접관에게 질문하기 */}
      {sessionId && (
        <div className="mt-6 pt-5 border-t border-gray-100">
          <button
            onClick={() => setShowAsk(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showAsk ? '▲ 닫기' : '▼ 면접관에게 질문하기'}
          </button>

          {showAsk && (
            <div className="mt-3 space-y-3">
              {chat.map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-end">
                    <p className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-xl rounded-br-sm max-w-xs">{item.q}</p>
                  </div>
                  <div className="flex justify-start">
                    <p className="text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-xl rounded-bl-sm max-w-xs leading-relaxed">{item.a}</p>
                  </div>
                </div>
              ))}
              {askLoading && (
                <div className="flex justify-start">
                  <p className="text-xs bg-gray-100 text-gray-400 px-3 py-2 rounded-xl rounded-bl-sm">답변 중...</p>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAsk()}
                  placeholder="면접관에게 궁금한 점을 질문하세요..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleAsk}
                  disabled={askLoading || !askInput.trim()}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  전송
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
