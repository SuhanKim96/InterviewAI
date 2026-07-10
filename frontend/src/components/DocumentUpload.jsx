import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { uploadDocuments } from '../api.js'
import { softSpring } from './ui/motion.jsx'
import Button from './ui/Button.jsx'
import { T } from '../strings.js'

function formatBytes(bytes) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function DocumentUpload({ lang, onDone, onBack }) {
  const t = T[lang]
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [portfolioText, setPortfolioText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const addFiles = (incoming) => {
    const pdfs = Array.from(incoming).filter(f => f.type === 'application/pdf')
    if (pdfs.length < incoming.length) setError(t.errPdfOnly)
    else setError('')
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...pdfs.filter(f => !names.has(f.name))]
    })
  }

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name))

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleSubmit = async () => {
    if (files.length === 0 && !portfolioText.trim()) {
      setError(t.errNeedDoc)
      return
    }
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('pdfs', f))
      if (portfolioText.trim()) fd.append('portfolio_text', portfolioText)
      const data = await uploadDocuments(fd)
      setResult(data)
    } catch (e) {
      setError(lang === 'en' ? t.errGeneric : e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/70 dark:bg-night-900/70 backdrop-blur-xl rounded-2xl border border-zinc-200/60 dark:border-white/10 shadow-lg shadow-zinc-950/5 dark:shadow-black/20 p-7 transition-colors">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 mb-4 transition-colors">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M15 8a.5.5 0 00-.5-.5H2.707l3.147-3.146a.5.5 0 10-.708-.708l-4 4a.5.5 0 000 .708l4 4a.5.5 0 00.708-.708L2.707 8.5H14.5A.5.5 0 0015 8z" clipRule="evenodd"/></svg>
          {t.back}
        </button>
      )}
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{t.uploadTitle}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t.uploadDesc}</p>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 mb-3
          ${dragging
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 scale-[1.01] ring-4 ring-indigo-500/10'
            : 'border-zinc-200 dark:border-white/15 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-night-800/50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`w-7 h-7 mx-auto mb-2 transition-all duration-200 ${dragging ? 'text-indigo-500 -translate-y-0.5' : 'text-zinc-400 dark:text-zinc-500'}`}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{t.dropZoneText}</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{t.dropZoneHint}</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5 mb-4">
          <AnimatePresence initial={false}>
          {files.map((f) => (
            <motion.div
              key={f.name}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: softSpring }}
              exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.2 } }}
              className="overflow-hidden flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{formatBytes(f.size)}</span>
              <button onClick={() => removeFile(f.name)} aria-label={`Remove ${f.name}`} className="text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition-colors ml-1">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
                </svg>
              </button>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t.portfolioLabel} <span className="text-zinc-400 dark:text-zinc-500 font-normal">{t.optional}</span>
        </label>
        <textarea
          rows={4}
          value={portfolioText}
          onChange={(e) => setPortfolioText(e.target.value)}
          placeholder={t.portfolioPlaceholder}
          className="w-full border border-zinc-200 dark:border-white/15 bg-white dark:bg-night-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-colors"
        />
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={softSpring}
          className="border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/10 rounded-lg p-4 mb-5 flex items-start gap-3"
        >
          <motion.svg
            viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.1 }}
          >
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </motion.svg>
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{t.analysisDone}</p>
            {result.indexed_files.length > 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{result.indexed_files.join(', ')}</p>
            )}
            {result.github_repos.length > 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">GitHub: {result.github_repos.join(', ')}</p>
            )}
          </div>
        </motion.div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} loading={loading}>
          {loading ? t.analyzing : t.startAnalysis}
        </Button>
        {result && (
          <Button variant="secondary" onClick={onDone}>
            {t.nextStep}
          </Button>
        )}
      </div>
    </div>
  )
}
