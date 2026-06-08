import { useState, useRef } from 'react'
import { uploadDocuments } from '../api.js'

function formatBytes(bytes) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function DocumentUpload({ onDone, onBack }) {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [portfolioText, setPortfolioText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const setFileIfPdf = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f)
      setError('')
    } else if (f) {
      setError('PDF 파일만 업로드 가능합니다.')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    setFileIfPdf(e.dataTransfer.files[0])
  }

  const handleSubmit = async () => {
    if (!file && !portfolioText.trim()) {
      setError('이력서 PDF 또는 포트폴리오 텍스트 중 하나는 필요합니다.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      if (file) fd.append('resume_pdf', file)
      if (portfolioText.trim()) fd.append('portfolio_text', portfolioText)
      const data = await uploadDocuments(fd)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-7">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M15 8a.5.5 0 00-.5-.5H2.707l3.147-3.146a.5.5 0 10-.708-.708l-4 4a.5.5 0 000 .708l4 4a.5.5 0 00.708-.708L2.707 8.5H14.5A.5.5 0 0015 8z" clipRule="evenodd"/></svg>
          이전
        </button>
      )}
      <h2 className="text-base font-semibold text-gray-900 mb-1">문서 업로드</h2>
      <p className="text-sm text-gray-500 mb-6">이력서와 포트폴리오를 인덱싱해 맞춤 질문 생성에 활용합니다.</p>

      {/* Drag & Drop Zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-4
          ${dragging ? 'border-indigo-400 bg-indigo-50' : file ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => setFileIfPdf(e.target.files[0])}
        />
        {file ? (
          <div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8 mx-auto mb-2 text-indigo-500">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-800">{file.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatBytes(file.size)}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="mt-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              제거
            </button>
          </div>
        ) : (
          <div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8 mx-auto mb-2 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-sm font-medium text-gray-600">PDF를 여기에 끌어놓거나 클릭하세요</p>
            <p className="text-xs text-gray-400 mt-1">이력서 PDF (.pdf)</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          포트폴리오 텍스트 <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <textarea
          rows={4}
          value={portfolioText}
          onChange={(e) => setPortfolioText(e.target.value)}
          placeholder="GitHub 링크, 프로젝트 설명 등을 붙여넣으세요..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {result && (
        <div className="border border-gray-200 rounded-lg p-4 mb-5 flex items-start gap-3">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-800">인덱싱 완료</p>
            <p className="text-xs text-gray-500 mt-0.5">청크 {result.indexed_chunks}개 저장됨
              {result.github_repos.length > 0 && ` · GitHub: ${result.github_repos.join(', ')}`}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '인덱싱 중...' : '인덱싱 시작'}
        </button>
        {result && (
          <button
            onClick={onDone}
            className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            다음 단계
          </button>
        )}
      </div>
    </div>
  )
}
