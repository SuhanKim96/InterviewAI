import { useState, useEffect } from 'react'
import { getDocuments, deleteDocuments } from '../api.js'
import DocumentUpload from './DocumentUpload.jsx'

const SOURCE_LABEL = {
  resume: '이력서',
  portfolio_pdf: '포트폴리오',
  portfolio: '포트폴리오 텍스트',
  github: 'GitHub',
}

function formatSource(s) {
  const label = SOURCE_LABEL[s.source] ?? s.source
  if (s.name && s.name !== s.source) return `${label} · ${s.name}`
  return label
}

export default function DocumentsPage({ onBack }) {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getDocuments()
      setSources(data.sources)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    if (!window.confirm('분석된 문서를 전부 삭제할까요? 다시 업로드해야 합니다.')) return
    setDeleting(true)
    await deleteDocuments()
    setSources([])
    setShowUpload(false)
    setDeleting(false)
  }

  const handleUploadDone = () => {
    setShowUpload(false)
    load()
  }

  return (
    <div>
      <div className="py-8 border-b border-gray-100 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M15 8a.5.5 0 00-.5-.5H2.707l3.147-3.146a.5.5 0 10-.708-.708l-4 4a.5.5 0 000 .708l4 4a.5.5 0 00.708-.708L2.707 8.5H14.5A.5.5 0 0015 8z" clipRule="evenodd" />
          </svg>
          홈으로
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-1">내 문서</h2>
        <p className="text-sm text-gray-500">한 번 업로드하면 유지됩니다. 언제든지 추가하거나 초기화할 수 있습니다.</p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">불러오는 중...</div>
      ) : sources.length === 0 && !showUpload ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 mx-auto mb-3 text-gray-300">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-500 mb-4">아직 분석된 문서가 없습니다.</p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            문서 추가
          </button>
        </div>
      ) : (
        <>
          {sources.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 mb-5">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">분석된 문서</p>
              </div>
              <div className="divide-y divide-gray-100">
                {sources.map((s, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-indigo-500 shrink-0">
                      <path fillRule="evenodd" d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700">{formatSource(s)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setShowUpload(v => !v)}
              className="px-4 py-2 border border-indigo-300 text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
            >
              {showUpload ? '취소' : '문서 추가'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 border border-red-200 text-red-500 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleting ? '삭제 중...' : '전체 삭제'}
            </button>
          </div>
        </>
      )}

      {showUpload && (
        <DocumentUpload onDone={handleUploadDone} />
      )}
    </div>
  )
}
