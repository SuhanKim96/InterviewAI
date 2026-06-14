import { T } from '../strings.js'

const FEATURE_ICONS = [
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
  </svg>,
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
  </svg>,
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
  </svg>,
]

export default function LandingPage({ lang, onStart, onHistory, onDocuments }) {
  const t = T[lang]

  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-20 text-center">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-8">
          {t.badge}
        </p>
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight leading-tight mb-5">
          {t.heroTitle1}<br />{t.heroTitle2}
        </h1>
        <p className="text-base text-zinc-500 leading-relaxed mb-10">
          {t.heroDesc}
        </p>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors"
          >
            {t.startInterview}
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M1 8a.5.5 0 01.5-.5h11.793l-3.147-3.146a.5.5 0 01.708-.708l4 4a.5.5 0 010 .708l-4 4a.5.5 0 01-.708-.708L13.293 8.5H1.5A.5.5 0 011 8z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={onDocuments}
            className="text-sm text-zinc-500 font-medium hover:text-zinc-900 transition-colors"
          >
            {t.manageDocuments}
          </button>
          <button
            onClick={onHistory}
            className="text-sm text-zinc-500 font-medium hover:text-zinc-900 transition-colors"
          >
            {t.viewHistory}
          </button>
        </div>
      </div>

      <div className="border-t border-zinc-100" />

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-12">
          {t.featuresTitle}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {t.features.map((f, i) => (
            <div key={f.title}>
              <div className="text-zinc-400 mb-3">{FEATURE_ICONS[i]}</div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-100" />

      {/* How it works */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-12">
          {t.howTitle}
        </p>
        <div className="space-y-10">
          {t.howSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-6">
              <span className="text-xs font-semibold text-zinc-300 w-6 shrink-0 pt-0.5 tabular-nums">
                0{i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900 mb-1">{step.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-100" />

      {/* Footer */}
      <footer className="py-8">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs text-zinc-400">InterviewAI</span>
          <a
            href="https://github.com/SuhanKim96/InterviewAI"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-1"
          >
            GitHub
            <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
              <path d="M3.5 3a.5.5 0 000 1H7.29L2.15 9.15a.5.5 0 10.7.7L8 4.71V8.5a.5.5 0 001 0v-5a.5.5 0 00-.5-.5h-5z"/>
            </svg>
          </a>
        </div>
      </footer>
    </div>
  )
}
