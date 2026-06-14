import { useState } from 'react'
import Navbar from './components/Navbar.jsx'
import LandingPage from './components/LandingPage.jsx'
import DocumentUpload from './components/DocumentUpload.jsx'
import DocumentsPage from './components/DocumentsPage.jsx'
import JDInput from './components/JDInput.jsx'
import QuestionCard from './components/QuestionCard.jsx'
import HistoryPage from './components/HistoryPage.jsx'
import { getDocuments, finishSession } from './api.js'
import { T } from './strings.js'

export default function App() {
  const [step, setStep] = useState('landing')
  const [sessionId, setSessionId] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [totalPlanned, setTotalPlanned] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [reportData, setReportData] = useState(null)
  const [finishing, setFinishing] = useState(false)
  const [lang, setLang] = useState('ko')

  const restart = () => {
    setStep('landing')
    setCurrentQuestion(null)
    setTotalPlanned(0)
    setAnsweredCount(0)
    setReportData(null)
    setFinishing(false)
  }

  const toggleLang = () => setLang(l => l === 'ko' ? 'en' : 'ko')

  const goHome = () => {
    if (step === 'interview') {
      if (!window.confirm(T[lang].interviewInProgress)) return
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
        alert(lang === 'en' ? T[lang].reportError : T[lang].reportError + e.message)
      } finally {
        setFinishing(false)
      }
    } else {
      setCurrentQuestion(turnResponse.next_question)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar step={step} onHome={goHome} lang={lang} onLangToggle={toggleLang} />

      {step === 'landing' && <LandingPage lang={lang} onStart={handleStart} onHistory={() => setStep('history')} onDocuments={() => setStep('documents')} />}

      {step === 'history' && (
        <main className="max-w-4xl mx-auto px-4 py-2">
          <HistoryPage lang={lang} onBack={() => setStep('landing')} />
        </main>
      )}

      {step === 'documents' && (
        <main className="max-w-3xl mx-auto px-4 py-2">
          <DocumentsPage lang={lang} onBack={() => setStep('landing')} />
        </main>
      )}

      {step !== 'landing' && step !== 'history' && step !== 'documents' && (
        <main className="max-w-3xl mx-auto px-4 py-8">
          {step === 'upload' && (
            <DocumentUpload lang={lang} onDone={() => setStep('jd')} onBack={() => setStep('landing')} />
          )}

          {step === 'jd' && (
            <JDInput
              lang={lang}
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
                <p className="text-sm text-gray-500">{T[lang].generatingReport}</p>
              </div>
            ) : (
              <QuestionCard
                key={currentQuestion.id}
                question={currentQuestion}
                sessionId={sessionId}
                index={answeredCount}
                total={totalPlanned}
                lang={lang}
                onTurnComplete={handleTurnComplete}
              />
            )
          )}

          {step === 'done' && reportData && (
            <ReportPage report={reportData} lang={lang} onRestart={restart} />
          )}
        </main>
      )}
    </div>
  )
}

function ReportPage({ report, lang, onRestart }) {
  const t = T[lang]
  const answers = report.answers || []

  const validOveralls = answers.map(a => a.overall).filter(v => v != null)
  const overallAvg = validOveralls.length
    ? (validOveralls.reduce((s, v) => s + v, 0) / validOveralls.length).toFixed(1)
    : '-'
  const overallPct = overallAvg !== '-' ? (overallAvg / 5) * 100 : 0
  const lowestId = [...answers]
    .filter(a => a.overall != null)
    .sort((a, b) => a.overall - b.overall)[0]?.id

  return (
    <div>
      <div className="py-10 border-b border-zinc-100 mb-6">
        <h2 className="text-xl font-bold text-zinc-900 mb-1">{t.sessionComplete}</h2>
        <p className="text-sm text-zinc-500">
          {report.company && `${report.company} · `}{report.role && `${report.role} · `}{t.questionsAnswered(answers.length)}
        </p>
      </div>

      {report.summary && (
        <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-5 mb-5">
          <h3 className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">{t.overallFeedback}</h3>
          <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{report.summary}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-zinc-200 p-6 mb-5">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-4">{t.avgScore}</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500 w-20 shrink-0">{t.overallScore}</span>
          <div className="flex-1 bg-zinc-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${overallPct}%` }} />
          </div>
          <span className="text-sm font-semibold text-zinc-700 w-8 text-right">{overallAvg}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100 mb-8">
        {answers.map((a, i) => (
          <div key={a.id} className={`px-4 py-3 flex items-center gap-3 ${a.id === lowestId ? 'bg-amber-50' : ''}`}>
            <span className="text-xs text-zinc-400 w-5 shrink-0">{i + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
              a.category === 'technical' ? 'bg-indigo-50 text-indigo-600' :
              a.category === 'culture'   ? 'bg-emerald-50 text-emerald-600' :
                                           'bg-zinc-100 text-zinc-600'
            }`}>
              {t.categoryLabels[a.category] ?? a.category}
            </span>
            <p className="text-sm text-zinc-700 flex-1 truncate">{a.question}</p>
            <span className={`text-xs shrink-0 tabular-nums font-semibold ${a.id === lowestId ? 'text-amber-600' : 'text-zinc-400'}`}>
              {a.overall != null ? a.overall.toFixed(1) : '-'}
              {a.id === lowestId && ' 🔴'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onRestart}
          className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 text-sm transition-colors"
        >
          {t.newSession}
        </button>
      </div>
    </div>
  )
}
