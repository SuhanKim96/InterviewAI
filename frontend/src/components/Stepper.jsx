import { motion } from 'framer-motion'
import { T } from '../strings.js'

const STEP_KEYS = ['upload', 'jd', 'interview', 'done']

export default function Stepper({ step, lang }) {
  const t = T[lang]
  const STEPS = [
    { key: 'upload',    label: t.stepUpload },
    { key: 'jd',        label: t.stepJD },
    { key: 'interview', label: t.stepInterview },
    { key: 'done',      label: t.stepDone },
  ]
  const current = STEP_KEYS.indexOf(step)

  return (
    <div className="flex items-center gap-0.5">
      {STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors
                ${done ? 'bg-indigo-600 text-white'
                  : active ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-400'
                  : 'bg-zinc-100 dark:bg-night-800 text-zinc-400 dark:text-zinc-500'}`}>
                {done ? (
                  <motion.svg
                    viewBox="0 0 10 10" fill="currentColor" className="w-2.5 h-2.5"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  >
                    <path fillRule="evenodd" d="M8.354 2.646a.5.5 0 010 .708l-4 4a.5.5 0 01-.708 0l-2-2a.5.5 0 01.708-.708L4 6.293l3.646-3.647a.5.5 0 01.708 0z" clipRule="evenodd" />
                  </motion.svg>
                ) : i + 1}
              </div>
              <span className={`text-xs hidden sm:block transition-colors ${
                active ? 'text-zinc-800 dark:text-zinc-200 font-medium'
                  : done ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-400 dark:text-zinc-500'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-5 h-px bg-zinc-200 dark:bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-400 dark:bg-indigo-500/70"
                  style={{ originX: 0 }}
                  initial={false}
                  animate={{ scaleX: i < current ? 1 : 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
