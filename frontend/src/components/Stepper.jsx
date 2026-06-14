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
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                ${done ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400' : 'bg-zinc-100 text-zinc-400'}`}>
                {done ? (
                  <svg viewBox="0 0 10 10" fill="currentColor" className="w-2.5 h-2.5">
                    <path fillRule="evenodd" d="M8.354 2.646a.5.5 0 010 .708l-4 4a.5.5 0 01-.708 0l-2-2a.5.5 0 01.708-.708L4 6.293l3.646-3.647a.5.5 0 01.708 0z" clipRule="evenodd" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${active ? 'text-zinc-800 font-medium' : done ? 'text-indigo-600' : 'text-zinc-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-5 h-px ${i < current ? 'bg-indigo-300' : 'bg-zinc-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
