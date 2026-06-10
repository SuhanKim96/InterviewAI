import { useEffect, useState } from 'react'
import { getSessions, getHistory } from '../api.js'
import GrowthChart from './GrowthChart.jsx'

const WEAK_LABEL = {
  clarity: '명확성',
  specific: '구체성',
  technical: '기술 정확성',
}

export default function HistoryPage({ onBack }) {
  const [sessions, setSessions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    getSessions().then(setSessions).catch(console.error)
  }, [])

  const handleSelect = async (id) => {
    if (selectedId === id) return
    setSelectedId(id)
    setExpandedId(null)
    setLoading(true)
    setHistory(null)
    try {
      const data = await getHistory(id)
      setHistory(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
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
        <h2 className="text-xl font-bold text-gray-900 mb-1">성장 기록</h2>
        <p className="text-sm text-gray-500">세션을 선택해 점수 추이와 약점 영역을 확인하세요.</p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Session list */}
        <div className="col-span-1 space-y-2">
          {sessions.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">세션이 없습니다.</p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selectedId === s.id
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {s.company || '회사명 없음'}
                  {s.role && <span className="text-gray-400 font-normal"> · {s.role}</span>}
                </p>
                {s.status === 'completed' && (
                  <span className="text-xs text-indigo-400 font-medium shrink-0">완료</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(s.created_at).toLocaleDateString('ko-KR')}
              </p>
            </button>
          ))}
        </div>

        {/* Chart panel */}
        <div className="col-span-2">
          {!selectedId && (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400 bg-white rounded-xl border border-gray-200">
              좌측에서 세션을 선택하세요.
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400 bg-white rounded-xl border border-gray-200">
              불러오는 중...
            </div>
          )}

          {history && !loading && (
            <div className="space-y-4">
              {history.weak_area && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-amber-700">
                    <span className="font-semibold">{WEAK_LABEL[history.weak_area]}</span> 점수가 가장 낮습니다. 이 영역 질문을 더 연습해보세요.
                  </p>
                </div>
              )}

              {history.summary && (
                <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">종합 피드백</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{history.summary}</p>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">점수 추이</p>
                <GrowthChart data={history.score_trend} />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                <div className="px-4 py-2 grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span className="col-span-1">#</span>
                  <span className="col-span-1">유형</span>
                  <span className="col-span-7">질문</span>
                  <span className="col-span-3 text-right">명·구·기</span>
                </div>
                {history.answers.map((a, i) => (
                  <div key={a.id}>
                    <button
                      onClick={() => setExpandedId(prev => prev === a.id ? null : a.id)}
                      className="w-full px-4 py-3 grid grid-cols-12 items-center gap-2 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="col-span-1 text-xs text-gray-400">{i + 1}</span>
                      <span className={`col-span-1 text-xs px-1.5 py-0.5 rounded font-medium ${a.category === 'technical' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                        {a.category === 'technical' ? '기술' : '경험'}
                      </span>
                      <p className="col-span-7 text-sm text-gray-700 truncate">{a.question}</p>
                      <span className="col-span-3 text-xs text-gray-400 text-right tabular-nums">
                        {a.score_clarity ?? '-'} · {a.score_specific ?? '-'} · {a.score_technical ?? '-'}
                      </span>
                    </button>
                    {expandedId === a.id && a.answer_text && (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2.5 whitespace-pre-wrap border border-gray-100">
                          {a.answer_text}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
