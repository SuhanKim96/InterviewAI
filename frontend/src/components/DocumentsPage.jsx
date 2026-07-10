import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getDocuments, deleteDocuments } from '../api.js'
import { StaggerList, StaggerItem } from './ui/motion.jsx'
import DocumentUpload from './DocumentUpload.jsx'
import Button from './ui/Button.jsx'
import ConfirmDialog from './ui/ConfirmDialog.jsx'
import Skeleton from './ui/Skeleton.jsx'
import { useToast } from './ui/Toast.jsx'
import { T } from '../strings.js'

function formatSource(s, sourceLabels) {
  const label = sourceLabels[s.source] ?? s.source
  if (s.name && s.name !== s.source) return `${label} · ${s.name}`
  return label
}

export default function DocumentsPage({ lang, onBack }) {
  const t = T[lang]
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const toast = useToast()

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
    setDeleteDialogOpen(false)
    setDeleting(true)
    try {
      await deleteDocuments()
      setSources([])
      setShowUpload(false)
      toast(t.docsDeleted, 'success')
    } catch {
      toast(t.errGeneric)
    } finally {
      setDeleting(false)
    }
  }

  const handleUploadDone = () => {
    setShowUpload(false)
    load()
  }

  return (
    <div>
      <ConfirmDialog
        open={deleteDialogOpen}
        title={t.deleteDocsTitle}
        message={t.confirmDeleteDocs}
        confirmLabel={t.deleteAll}
        cancelLabel={t.cancel}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      <div className="py-8 border-b border-zinc-100 dark:border-white/10 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 mb-4 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M15 8a.5.5 0 00-.5-.5H2.707l3.147-3.146a.5.5 0 10-.708-.708l-4 4a.5.5 0 000 .708l4 4a.5.5 0 00.708-.708L2.707 8.5H14.5A.5.5 0 0015 8z" clipRule="evenodd" />
          </svg>
          {t.homeBack}
        </button>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{t.docsTitle}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.docsDesc}</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : sources.length === 0 && !showUpload ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/70 dark:bg-night-900/70 backdrop-blur-xl rounded-2xl border border-zinc-200/60 dark:border-white/10 shadow-lg shadow-zinc-950/5 dark:shadow-black/20 p-8 text-center"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{t.noDocsYet}</p>
          <Button onClick={() => setShowUpload(true)}>
            {t.addDoc}
          </Button>
        </motion.div>
      ) : (
        <>
          {sources.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/70 dark:bg-night-900/70 backdrop-blur-xl rounded-2xl border border-zinc-200/60 dark:border-white/10 shadow-lg shadow-zinc-950/5 dark:shadow-black/20 mb-5"
            >
              <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/10">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{t.analyzedDocs}</p>
              </div>
              <StaggerList stagger={0.05} delayChildren={0.1} className="divide-y divide-zinc-100 dark:divide-white/10">
                {sources.map((s, i) => (
                  <StaggerItem key={i} className="px-5 py-3 flex items-center gap-3">
                    <motion.svg
                      viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.15 + i * 0.05 }}
                    >
                      <path fillRule="evenodd" d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z" clipRule="evenodd" />
                    </motion.svg>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{formatSource(s, t.sourceLabels)}</span>
                  </StaggerItem>
                ))}
              </StaggerList>
            </motion.div>
          )}

          <div className="flex gap-3 mb-6">
            <Button variant="outline" onClick={() => setShowUpload(v => !v)} className="px-4">
              {showUpload ? t.cancel : t.addDoc}
            </Button>
            <Button variant="danger" onClick={() => setDeleteDialogOpen(true)} loading={deleting} className="px-4">
              {deleting ? t.deleting : t.deleteAll}
            </Button>
          </div>
        </>
      )}

      <AnimatePresence initial={false}>
        {showUpload && (
          <motion.div
            key="upload"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <DocumentUpload lang={lang} onDone={handleUploadDone} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
