import { useState, useRef } from 'react'
import { uploadDocuments } from '../api.js'
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-7">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M15 8a.5.5 0 00-.5-.5H2.707l3.147-3.146a.5.5 0 10-.708-.708l-4 4a.5.5 0 000 .708l4 4a.5.5 0 00.708-.708L2.707 8.5H14.5A.5.5 0 0015 8z" clipRule="evenodd"/></svg>
          {t.back}
        </button>
      )}
      <h2 className="text-base font-semibold text-gray-900 mb-1">{t.uploadTitle}</h2>
      <p className="text-sm text-gray-500 mb-6">{t.uploadDesc}</p>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-3
          ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 mx-auto mb-2 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <p className="text-sm font-medium text-gray-600">{t.dropZoneText}</p>
        <p className="text-xs text-gray-400 mt-1">{t.dropZoneHint}</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {files.map((f) => (
            <div key={f.name} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-500 shrink-0">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-gray-400">{formatBytes(f.size)}</span>
              <button onClick={() => removeFile(f.name)} className="text-gray-300 hover:text-red-400 transition-colors ml-1">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.portfolioLabel} <span className="text-gray-400 font-normal">{t.optional}</span>
        </label>
        <textarea
          rows={4}
          value={portfolioText}
          onChange={(e) => setPortfolioText(e.target.value)}
          placeholder={t.portfolioPlaceholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {result && (
        <div className="border border-gray-200 rounded-lg p-4 mb-5 flex items-start gap-3">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-800">{t.analysisDone}</p>
            {result.indexed_files.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">{result.indexed_files.join(', ')}</p>
            )}
            {result.github_repos.length > 0 && (
              <p className="text-xs text-gray-500">GitHub: {result.github_repos.join(', ')}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t.analyzing : t.startAnalysis}
        </button>
        {result && (
          <button
            onClick={onDone}
            className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.nextStep}
          </button>
        )}
      </div>
    </div>
  )
}
