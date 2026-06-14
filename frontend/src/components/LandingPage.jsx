import { T } from '../strings.js'

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

export default function LandingPage({ lang, onStart, onHistory, onDocuments }) {
  const t = T[lang]

  return (
    <div className="bg-white">
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-8 tracking-wide">
          {t.badge}
        </div>
        <h1 className="text-5xl font-bold text-gray-900 tracking-tight leading-tight mb-5">
          {t.heroTitle1}<br />{t.heroTitle2}
        </h1>
        <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto mb-10 whitespace-pre-line">
          {t.heroDesc}
        </p>
        <div className="flex items-center gap-4 justify-center">
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {t.startInterview}
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M1 8a.5.5 0 01.5-.5h11.793l-3.147-3.146a.5.5 0 01.708-.708l4 4a.5.5 0 010 .708l-4 4a.5.5 0 01-.708-.708L13.293 8.5H1.5A.5.5 0 011 8z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={onDocuments}
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.manageDocuments}
          </button>
          <button
            onClick={onHistory}
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.viewHistory}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      <div className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-10">{t.featuresTitle}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {t.features.map((f, i) => (
            <div key={f.title}>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                {FEATURE_ICONS[i]}
              </div>
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
