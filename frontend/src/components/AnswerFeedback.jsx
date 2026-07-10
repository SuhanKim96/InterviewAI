import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { submitFollowUp } from '../api.js'
import Button from './ui/Button.jsx'
import { fadeInUp, staggerContainer, AnimatedNumber } from './ui/motion.jsx'
import { T } from '../strings.js'

function ScoreRow({ label, score, index = 0 }) {
  const pct = ((score ?? 0) / 5) * 100
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-500 dark:text-zinc-400 w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-zinc-100 dark:bg-night-800 rounded-full h-1.5">
        <motion.div
          className="h-1.5 rounded-full bg-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: index * 0.1 }}
        />
      </div>
      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 w-8 text-right font-mono">
        {score ?? '-'}<span className="text-zinc-400 dark:text-zinc-500 font-normal">/5</span>
      </span>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <motion.div variants={fadeInUp} className="pl-3 border-l-2 border-zinc-200 dark:border-white/15">
      <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{children}</div>
    </motion.div>
  )
}

export default function AnswerFeedback({ feedback, question, category, lang, onNext, isLast }) {
  const t = T[lang]
  const labels = (t.scoreLabels[category] ?? t.scoreLabels.technical)
  const [showRubric, setShowRubric] = useState(false)
  const [followUpAnswer, setFollowUpAnswer] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [followUpComment, setFollowUpComment] = useState('')
  const [followUpError, setFollowUpError] = useState('')

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
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
      className="mt-6 pt-6 border-t border-zinc-100 dark:border-white/10 space-y-5"
    >
      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{t.scoreTitle}</span>
          {overall && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.15 }}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 px-2.5 py-1 rounded-full font-mono"
            >
              {t.overallLabel} <AnimatedNumber value={overall} /> / 5
            </motion.span>
          )}
        </div>
        <div className="space-y-2.5">
          <ScoreRow label={labels[0]} score={feedback.score_clarity} index={0} />
          <ScoreRow label={labels[1]} score={feedback.score_specific} index={1} />
          <ScoreRow label={labels[2]} score={feedback.score_technical} index={2} />
        </div>
      </motion.div>

      {feedback.strengths && <Section label={t.strengths}>{feedback.strengths}</Section>}
      {feedback.weaknesses && <Section label={t.weaknesses}>{feedback.weaknesses}</Section>}
      {feedback.improved_answer && (
        <Section label={t.modelAnswer}>
          <span className="whitespace-pre-wrap">{feedback.improved_answer}</span>
        </Section>
      )}

      {feedback.follow_up && (
        <motion.div variants={fadeInUp} className="space-y-2">
          <div className="pl-3 border-l-2 border-indigo-300 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10 py-2 rounded-r-md">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 uppercase tracking-wide mb-1">{t.followUpLabel}</p>
            <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">{feedback.follow_up}</p>
          </div>

          {!followUpComment ? (
            <div className="pl-3">
              <div className="relative mb-2">
                <textarea
                  rows={3}
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  placeholder={t.followUpPlaceholder}
                  className="w-full border border-zinc-200 dark:border-white/15 bg-white dark:bg-night-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y transition-colors"
                />
                <span className="absolute bottom-2 right-3 text-xs text-zinc-300 dark:text-zinc-600 pointer-events-none tabular-nums">{t.charCount(followUpAnswer.length)}</span>
              </div>
              {followUpError && <p className="text-red-500 text-xs mb-2">{followUpError}</p>}
              <Button
                variant="outline"
                onClick={handleFollowUpSubmit}
                loading={followUpLoading}
                disabled={!followUpAnswer.trim()}
                className="px-4 py-1.5 text-xs bg-indigo-100 dark:bg-indigo-500/15 border-transparent dark:border-transparent hover:bg-indigo-200 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300"
              >
                {followUpLoading ? t.followUpEvaluating : t.followUpSubmit}
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pl-3 border-l-2 border-zinc-200 dark:border-white/15"
            >
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1">{t.followUpFeedbackLabel}</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{followUpComment}</p>
            </motion.div>
          )}
        </motion.div>
      )}

      {feedback.rubric_basis && (
        <motion.div variants={fadeInUp}>
          <button onClick={() => setShowRubric(r => !r)} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            {showRubric ? t.hideRubric : t.showRubric}
          </button>
          <AnimatePresence initial={false}>
            {showRubric && (
              <motion.div
                key="rubric"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-night-800/50 rounded-md px-3 py-2.5 border border-zinc-200 dark:border-white/15">
                  {feedback.rubric_basis}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <motion.div variants={fadeInUp}>
        <Button onClick={onNext} className="w-full">
          {isLast ? t.viewResults : t.nextQuestion}
        </Button>
      </motion.div>
    </motion.div>
  )
}
