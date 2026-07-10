import { motion } from 'framer-motion'
import { T } from '../strings.js'
import { fadeInUp, staggerContainer, softSpring, Reveal, StaggerList, StaggerItem } from './ui/motion.jsx'

const GLASS = 'bg-white/70 dark:bg-night-900/70 backdrop-blur-xl border border-zinc-200/60 dark:border-white/10 shadow-lg shadow-zinc-950/5 dark:shadow-black/20'

const FEATURE_ICONS = [
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
  </svg>,
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
  </svg>,
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
  </svg>,
]

// Floating product fragments around the hero (md+ only, decorative)
function FloatingCard({ className = '', rotate = 0, delay = 0, children }) {
  return (
    <motion.div
      aria-hidden="true"
      className={`hidden md:block absolute pointer-events-none ${className}`}
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...softSpring, delay }}
    >
      <div className="animate-float-card" style={{ '--float-rotate': `${rotate}deg`, transform: `rotate(${rotate}deg)` }}>
        {children}
      </div>
    </motion.div>
  )
}

export default function LandingPage({ lang, onStart, onHistory, onDocuments }) {
  const t = T[lang]

  return (
    <div className="overflow-x-clip">
      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6">
        <div aria-hidden="true" className="absolute inset-0 bg-dot-grid pointer-events-none" />
        <FloatingCard className="left-0 lg:left-6 top-36" rotate={-5} delay={0.5}>
          <div className={`${GLASS} rounded-2xl px-4 py-3.5 w-44`}>
            <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">{t.floatScoreLabel}</p>
            <div className="h-1.5 bg-zinc-100 dark:bg-night-800 rounded-full mb-2.5 overflow-hidden">
              <motion.div
                className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: '90%' }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 1 }}
              />
            </div>
            <p className="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100">4.5 <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">/ 5</span></p>
          </div>
        </FloatingCard>

        <FloatingCard className="right-0 lg:right-4 top-32" rotate={4} delay={0.65}>
          <div className={`${GLASS} rounded-2xl rounded-br-sm px-4 py-3 max-w-[230px]`}>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">“{t.floatQuestion}”</p>
          </div>
        </FloatingCard>

        <FloatingCard className="left-8 lg:left-24 bottom-24" rotate={3} delay={0.8}>
          <div className={`${GLASS} rounded-full px-4 py-2 flex items-center gap-1.5`}>
            <svg viewBox="0 0 10 10" fill="currentColor" className="w-2.5 h-2.5 text-emerald-500">
              <path fillRule="evenodd" d="M8.354 2.646a.5.5 0 010 .708l-4 4a.5.5 0 01-.708 0l-2-2a.5.5 0 01.708-.708L4 6.293l3.646-3.647a.5.5 0 01.708 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{t.floatStar}</span>
          </div>
        </FloatingCard>

        <FloatingCard className="right-10 lg:right-28 bottom-28" rotate={-3} delay={0.95}>
          <div className={`${GLASS} rounded-full px-4 py-2 flex items-center gap-1.5`}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-indigo-500">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{t.floatFollowUp}</span>
          </div>
        </FloatingCard>

        <motion.div
          className="relative max-w-2xl mx-auto pt-28 pb-36 text-center"
          variants={staggerContainer(0.09)}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeInUp} className={`${GLASS} inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-8`}>
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-indigo-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-indigo-500" />
            </span>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide">{t.badge}</span>
          </motion.div>
          <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-[1.15] mb-6">
            {t.heroTitle1}<br />
            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">{t.heroAccent}</span>
            {t.heroTitle2Rest}
          </motion.h1>
          <motion.p variants={fadeInUp} className="text-base md:text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed mb-10 whitespace-pre-line">
            {t.heroDesc}
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-3">
            <motion.button
              onClick={onStart}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={softSpring}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-indigo-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {t.startInterview}
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5">
                <path fillRule="evenodd" d="M1 8a.5.5 0 01.5-.5h11.793l-3.147-3.146a.5.5 0 01.708-.708l4 4a.5.5 0 010 .708l-4 4a.5.5 0 01-.708-.708L13.293 8.5H1.5A.5.5 0 011 8z" clipRule="evenodd" />
              </svg>
            </motion.button>
            <motion.button
              onClick={onDocuments}
              whileTap={{ scale: 0.97 }}
              className={`${GLASS} rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors`}
            >
              {t.manageDocuments}
            </motion.button>
            <motion.button
              onClick={onHistory}
              whileTap={{ scale: 0.97 }}
              className={`${GLASS} rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors`}
            >
              {t.viewHistory}
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      <div className="h-px max-w-5xl mx-auto bg-gradient-to-r from-transparent via-zinc-200 dark:via-white/10 to-transparent" />

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <Reveal>
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight text-center mb-12">
            {t.featuresTitle}
          </h2>
        </Reveal>
        <StaggerList inView stagger={0.08} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {t.features.map((f, i) => (
            <StaggerItem
              key={f.title}
              whileHover={{ y: -4, transition: softSpring }}
              className={`${GLASS} rounded-2xl p-6 hover:shadow-xl hover:shadow-indigo-500/10 transition-shadow duration-200`}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
                {FEATURE_ICONS[i]}
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
            </StaggerItem>
          ))}
        </StaggerList>
      </section>

      <div className="h-px max-w-5xl mx-auto bg-gradient-to-r from-transparent via-zinc-200 dark:via-white/10 to-transparent" />

      {/* How it works — vertical timeline */}
      <section className="max-w-2xl mx-auto px-6 py-24">
        <Reveal>
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight text-center mb-14">
            {t.howTitle}
          </h2>
        </Reveal>
        <div className="relative">
          <motion.div
            className="absolute left-4 top-3 bottom-3 w-px bg-gradient-to-b from-indigo-500/60 via-violet-500/40 to-transparent origin-top"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
          <div className="space-y-8">
            {t.howSteps.map((step, i) => (
              <Reveal key={i} delay={i * 0.12} className="relative flex items-start gap-5">
                <span className="relative z-10 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30 tabular-nums">
                  {i + 1}
                </span>
                <div className={`${GLASS} rounded-2xl px-5 py-4 flex-1`}>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{step.title}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-white/10 to-transparent" />
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-md flex items-center justify-center">
                <svg viewBox="0 0 16 16" fill="white" className="w-3 h-3">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM6.5 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8 12a4 4 0 01-3.464-2h6.928A4 4 0 018 12z"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">InterviewAI</span>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.footerTagline}</p>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2">
            <a
              href="https://github.com/SuhanKim96/InterviewAI"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
            <p className="text-xs text-zinc-400 dark:text-zinc-600">FastAPI · React · GPT-4o mini</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
