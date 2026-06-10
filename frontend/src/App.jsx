import { useState } from 'react'
import Navbar from './components/Navbar.jsx'
import LandingPage from './components/LandingPage.jsx'
import DocumentUpload from './components/DocumentUpload.jsx'
import DocumentsPage from './components/DocumentsPage.jsx'
import JDInput from './components/JDInput.jsx'
import QuestionCard from './components/QuestionCard.jsx'
import HistoryPage from './components/HistoryPage.jsx'
import { getDocuments, finishSession } from './api.js'

export default function App() {
  const [step, setStep] = useState('landing')
  const [sessionId, setSessionId] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [totalPlanned, setTotalPlanned] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [reportData, setReportData] = useState(null)
  const [finishing, setFinishing] = useState(false)

  const restart = () => {
    setStep('landing')
    setCurrentQuestion(null)
    setTotalPlanned(0)
    setAnsweredCount(0)
    setReportData(null)
    setFinishing(false)
  }

  const goHome = () => {
    if (step === 'interview') {
      if (!window.confirm('면접이 진행 중입니다. 홈으로 돌아가면 진행 내용이 사라집니다.')) return
    }
    restart()
  }

  const handleStart = async () => {
    try {
      const data = await getDocuments()
      if (data.sources.length > 0) {
        setStep('jd')
      } else {
        setStep('upload')
      }
    } catch {
      setStep('upload')
    }
  }

  const handleTurnComplete = async (turnResponse) => {
    const newCount = answeredCount + 1
    setAnsweredCount(newCount)

    if (turnResponse.session_complete) {
      setFinishing(true)
      try {
        const report = await finishSession(sessionId)
        setReportData(report)
        setStep('done')
      } catch (e) {
        alert('리포트 생성 중 오류가 발생했습니다: ' + e.message)
      } finally {
        setFinishing(false)
      }
    } else {
      setCurrentQuestion(turnResponse.next_question)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar step={step} onHome={goHome} />

      {step === 'landing' && <LandingPage onStart={handleStart} onHistory={() => setStep('history')} onDocuments={() => setStep('documents')} />}

      {step === 'history' && (
        <main className="max-w-4xl mx-auto px-4 py-2">
          <HistoryPage onBack={() => setStep('landing')} />
        </main>
      )}

      {step === 'documents' && (
        <main className="max-w-3xl mx-auto px-4 py-2">
          <DocumentsPage onBack={() => setStep('landing')} />
        </main>
      )}

      {step !== 'landing' && step !== 'history' && step !== 'documents' && (
        <main className="max-w-3xl mx-auto px-4 py-8">
          {step === 'upload' && (
            <DocumentUpload onDone={() => setStep('jd')} onBack={() => setStep('landing')} />
          )}

          {step === 'jd' && (
            <JDInput
              onBack={() => setStep('upload')}
              onDone={(sid, firstQuestion, total) => {
                setSessionId(sid)
                setCurrentQuestion(firstQuestion)
                setTotalPlanned(total)
                setAnsweredCount(0)
                setStep('interview')
              }}
            />
          )}

          {step === 'interview' && currentQuestion && (
            finishing ? (
              <div className="flex flex-col items-center py-20 gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">종합 리포트를 생성하고 있습니다...</p>
              </div>
            ) : (
              <QuestionCard
                key={currentQuestion.id}
                question={currentQuestion}
                sessionId={sessionId}
                index={answeredCount}
                total={totalPlanned}
                onTurnComplete={handleTurnComplete}
              />
            )
          )}

          {step === 'done' && reportData && (
            <ReportPage report={reportData} onRestart={restart} />
          )}
        </main>
      )}
    </div>
  )
}

function ReportPage({ report, onRestart }) {
  const answers = report.answers || []

  const avg = (key) => {
    const vals = answers.map((a) => a[key]).filter(Boolean)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-'
  }

  return (
    <div>
      <div className="py-10 border-b border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">세션 완료</h2>
        <p className="text-sm text-gray-500">
          {report.company && `${report.company} · `}{report.role && `${report.role} · `}{answers.length}개 질문 답변
        </p>
      </div>

      {/* LLM 종합 리포트 */}
      {report.summary && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5 mb-5">
          <h3 className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">종합 피드백</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{report.summary}</p>
        </div>
      )}

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
        {report.weak_area && (
          <p className="text-xs text-gray-400 mt-3">
            약점 영역: <span className="font-medium text-indigo-500">
              {report.weak_area === 'clarity' ? '명확성' : report.weak_area === 'specific' ? '구체성' : '기술 정확성'}
            </span>
          </p>
        )}
      </div>

      {/* Per-question summary */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-8">
        {answers.map((a, i) => (
          <div key={a.id} className="px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${a.category === 'technical' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
              {a.category === 'technical' ? '기술' : '경험'}
            </span>
            <p className="text-sm text-gray-700 flex-1 truncate">{a.question}</p>
            <span className="text-xs text-gray-400 shrink-0 tabular-nums">
              {a.score_clarity} · {a.score_specific} · {a.score_technical}
            </span>
          </div>
        ))}
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
