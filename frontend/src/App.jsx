import { useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import Navbar from './components/Navbar.jsx'
import LandingPage from './components/LandingPage.jsx'
import DocumentUpload from './components/DocumentUpload.jsx'
import DocumentsPage from './components/DocumentsPage.jsx'
import JDInput from './components/JDInput.jsx'
import QuestionCard from './components/QuestionCard.jsx'
import HistoryPage from './components/HistoryPage.jsx'
import Button from './components/ui/Button.jsx'
import ConfirmDialog from './components/ui/ConfirmDialog.jsx'
import { ToastProvider, useToast } from './components/ui/Toast.jsx'
import { PageTransition, StaggerList, StaggerItem, AnimatedNumber } from './components/ui/motion.jsx'
import AmbientBackground from './components/ui/AmbientBackground.jsx'
import { ThemeContext, useThemeState } from './theme.js'
import { getDocuments, finishSession } from './api.js'
import { T } from './strings.js'

export default function App() {
  const theme = useThemeState()
  return (
    <ThemeContext.Provider value={theme}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </MotionConfig>
    </ThemeContext.Provider>
  )
}

function AppShell() {
  const [step, setStep] = useState('landing')
  const [sessionId, setSessionId] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [totalPlanned, setTotalPlanned] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [reportData, setReportData] = useState(null)
  const [finishing, setFinishing] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [lang, setLang] = useState('ko')
  const toast = useToast()

  const restart = () => {
    setStep('landing')
    setCurrentQuestion(null)
    setTotalPlanned(0)
    setAnsweredCount(0)
    setReportData(null)
    setFinishing(false)
  }

  const toggleLang = () => setLang(l => l === 'ko' ? 'en' : 'ko')

  useEffect(() => { window.scrollTo(0, 0) }, [step])

  const goHome = () => {
    if (step === 'interview') {
      setLeaveDialogOpen(true)
      return
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
        toast(lang === 'en' ? T[lang].reportError : T[lang].reportError + e.message)
      } finally {
        setFinishing(false)
      }
    } else {
      setCurrentQuestion(turnResponse.next_question)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-night-950 transition-colors">
      <AmbientBackground />
      <Navbar step={step} onHome={goHome} lang={lang} onLangToggle={toggleLang} />

      <ConfirmDialog
        open={leaveDialogOpen}
        title={T[lang].leaveTitle}
        message={T[lang].interviewInProgress}
        confirmLabel={T[lang].leave}
        cancelLabel={T[lang].cancel}
        danger
        onConfirm={() => { setLeaveDialogOpen(false); restart() }}
        onCancel={() => setLeaveDialogOpen(false)}
      />

      <AnimatePresence mode="wait" initial={false}>
        {step === 'landing' && (
          <PageTransition key="landing">
            <LandingPage lang={lang} onStart={handleStart} onHistory={() => setStep('history')} onDocuments={() => setStep('documents')} />
          </PageTransition>
        )}

        {step === 'history' && (
          <PageTransition key="history" className="max-w-4xl mx-auto px-4 py-2">
            <HistoryPage lang={lang} onBack={() => setStep('landing')} />
          </PageTransition>
        )}

        {step === 'documents' && (
          <PageTransition key="documents" className="max-w-3xl mx-auto px-4 py-2">
            <DocumentsPage lang={lang} onBack={() => setStep('landing')} />
          </PageTransition>
        )}

        {step !== 'landing' && step !== 'history' && step !== 'documents' && (
          <PageTransition key={step} className="max-w-3xl mx-auto px-4 py-8">
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
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{T[lang].generatingReport}</p>
                </div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
                    exit={{ opacity: 0, x: -24, transition: { duration: 0.15, ease: 'easeIn' } }}
                  >
                    <QuestionCard
                      question={currentQuestion}
                      sessionId={sessionId}
                      index={answeredCount}
                      total={totalPlanned}
                      lang={lang}
                      onTurnComplete={handleTurnComplete}
                    />
                  </motion.div>
                </AnimatePresence>
              )
            )}

            {step === 'done' && reportData && (
              <ReportPage report={reportData} lang={lang} onRestart={restart} />
            )}
          </PageTransition>
        )}
      </AnimatePresence>
    </div>
  )
}

function ScoreRing({ value }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const r = 42
  const c = 2 * Math.PI * r
  const pct = value === '-' ? 0 : value / 5
  const offset = mounted ? c * (1 - pct) : c

  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="score-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="7" className="stroke-zinc-100 dark:stroke-night-800" />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
          stroke="url(#score-ring-grad)"
          strokeDasharray={c} strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {value === '-' ? value : <AnimatedNumber value={value} />}
        </span>
        <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">/ 5</span>
      </div>
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
  const lowestId = [...answers]
    .filter(a => a.overall != null)
    .sort((a, b) => a.overall - b.overall)[0]?.id

  return (
    <div>
      <div className="py-10 border-b border-zinc-100 dark:border-white/10 mb-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{t.sessionComplete}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {report.company && `${report.company} · `}{report.role && `${report.role} · `}{t.questionsAnswered(answers.length)}
        </p>
      </div>

      <div className="bg-white/70 dark:bg-night-900/70 backdrop-blur-xl rounded-2xl border border-zinc-200/60 dark:border-white/10 shadow-lg shadow-zinc-950/5 dark:shadow-black/20 p-6 mb-5 flex items-center gap-6">
        <ScoreRing value={overallAvg} />
        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1">{t.avgScore}</h3>
          {report.summary && (
            <>
              <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide mt-3 mb-1">{t.overallFeedback}</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{report.summary}</p>
            </>
          )}
        </div>
      </div>

      <StaggerList stagger={0.06} className="bg-white/70 dark:bg-night-900/70 backdrop-blur-xl rounded-2xl border border-zinc-200/60 dark:border-white/10 shadow-lg shadow-zinc-950/5 dark:shadow-black/20 divide-y divide-zinc-100 dark:divide-white/10 mb-8 overflow-hidden">
        {answers.map((a, i) => (
          <StaggerItem
            key={a.id}
            className={`px-4 py-3 flex items-center gap-3 ${a.id === lowestId ? 'bg-amber-50 dark:bg-amber-500/10' : ''}`}
          >
            <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 w-5 shrink-0">{i + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
              a.category === 'technical' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400' :
              a.category === 'culture'   ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' :
                                           'bg-zinc-100 text-zinc-600 dark:bg-night-800 dark:text-zinc-400'
            }`}>
              {t.categoryLabels[a.category] ?? a.category}
            </span>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 truncate">{a.question}</p>
            <span className={`font-mono text-xs shrink-0 font-semibold ${a.id === lowestId ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
              {a.overall != null ? a.overall.toFixed(1) : '-'}
              {a.id === lowestId && ' 🔴'}
            </span>
          </StaggerItem>
        ))}
      </StaggerList>

      <div className="flex justify-center">
        <Button onClick={onRestart} className="px-6">
          {t.newSession}
        </Button>
      </div>
    </div>
  )
}
