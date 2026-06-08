import { useState } from 'react'
import Navbar from './components/Navbar.jsx'
import LandingPage from './components/LandingPage.jsx'
import DocumentUpload from './components/DocumentUpload.jsx'
import JDInput from './components/JDInput.jsx'
import QuestionCard from './components/QuestionCard.jsx'

export default function App() {
  const [step, setStep] = useState('landing')
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [feedbacks, setFeedbacks] = useState({})

  const handleFeedback = (questionId, feedback) =>
    setFeedbacks((prev) => ({ ...prev, [questionId]: feedback }))

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1)
    } else {
      setStep('done')
    }
  }

  const restart = () => {
    setStep('landing')
    setQuestions([])
    setFeedbacks({})
    setCurrentIdx(0)
  }

  const goHome = () => {
    if (step === 'interview') {
      if (!window.confirm('면접이 진행 중입니다. 홈으로 돌아가면 진행 내용이 사라집니다.')) return
    }
    restart()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar step={step} onHome={goHome} />

      {step === 'landing' && <LandingPage onStart={() => setStep('upload')} />}

      {step !== 'landing' && (
        <main className="max-w-3xl mx-auto px-4 py-8">
          {step === 'upload' && (
            <DocumentUpload onDone={() => setStep('jd')} onBack={() => setStep('landing')} />
          )}

          {step === 'jd' && (
            <JDInput
              onBack={() => setStep('upload')}
              onDone={(qs) => {
                setQuestions(qs)
                setCurrentIdx(0)
                setFeedbacks({})
                setStep('interview')
              }}
            />
          )}

          {step === 'interview' && questions.length > 0 && (
            <QuestionCard
              question={questions[currentIdx]}
              index={currentIdx}
              total={questions.length}
              feedback={feedbacks[questions[currentIdx].id]}
              onFeedback={(fb) => handleFeedback(questions[currentIdx].id, fb)}
              onNext={handleNext}
            />
          )}

          {step === 'done' && (
            <DonePage questions={questions} feedbacks={feedbacks} onRestart={restart} />
          )}
        </main>
      )}
    </div>
  )
}

function DonePage({ questions, feedbacks, onRestart }) {
  const answered = questions.filter((q) => feedbacks[q.id])
  const avg = (key) => {
    const vals = answered.map((q) => feedbacks[q.id]?.[key]).filter(Boolean)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-'
  }

  return (
    <div>
      <div className="py-10 border-b border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">세션 완료</h2>
        <p className="text-sm text-gray-500">{questions.length}개 질문 중 {answered.length}개 답변</p>
      </div>

      {/* Average scores */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">평균 점수</h3>
        <div className="space-y-3">
          {[['명확성', 'score_clarity'], ['구체성', 'score_specific'], ['기술 정확성', 'score_technical']].map(([label, key]) => {
            const val = avg(key)
            const pct = val !== '-' ? (val / 5) * 100 : 0
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-20 shrink-0">{label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-8 text-right">{val}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-question summary */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-8">
        {questions.map((q, i) => {
          const fb = feedbacks[q.id]
          return (
            <div key={q.id} className="px-4 py-3 flex items-center gap-3">
              <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${q.category === 'technical' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                {q.category === 'technical' ? '기술' : '경험'}
              </span>
              <p className="text-sm text-gray-700 flex-1 truncate">{q.question}</p>
              {fb ? (
                <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                  {fb.score_clarity} · {fb.score_specific} · {fb.score_technical}
                </span>
              ) : (
                <span className="text-xs text-gray-300 shrink-0">미답변</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onRestart}
          className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 text-sm transition-colors"
        >
          새 세션 시작
        </button>
      </div>
    </div>
  )
}
