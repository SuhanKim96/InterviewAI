import { AnimatePresence, motion } from 'framer-motion'
import Stepper from './Stepper.jsx'
import { useTheme } from '../theme.js'
import { T } from '../strings.js'

export default function Navbar({ step, onHome, lang, onLangToggle }) {
  const { dark, toggleTheme } = useTheme()
  const showStepper = step !== 'landing'
  const t = T[lang]

  return (
    <div className="sticky top-3 z-50 px-4">
    <nav className="mx-auto max-w-5xl h-14 flex items-center px-5 rounded-2xl bg-white/70 dark:bg-night-900/70 backdrop-blur-xl border border-zinc-200/60 dark:border-white/10 shadow-lg shadow-zinc-950/5 dark:shadow-black/20 transition-colors">
      <div
        onClick={onHome}
        className="flex items-center gap-2 select-none cursor-pointer hover:opacity-75 transition-opacity"
      >
        <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
          <svg viewBox="0 0 16 16" fill="white" className="w-3.5 h-3.5">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM6.5 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8 12a4 4 0 01-3.464-2h6.928A4 4 0 018 12z"/>
          </svg>
        </div>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">InterviewAI</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <AnimatePresence>
          {showStepper && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
            >
              <Stepper step={step} lang={lang} />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          onClick={toggleTheme}
          whileTap={{ scale: 0.9 }}
          aria-label={dark ? t.themeToLight : t.themeToDark}
          className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-zinc-200 dark:border-white/15 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={dark ? 'sun' : 'moon'}
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
              className="flex items-center justify-center"
            >
              {dark ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <motion.button
          onClick={onLangToggle}
          whileTap={{ scale: 0.9 }}
          className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-zinc-200 dark:border-white/15 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-md px-2.5 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          {t.langToggle}
        </motion.button>
      </div>
    </nav>
    </div>
  )
}
