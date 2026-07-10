import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from './Button.jsx'
import { softSpring } from './motion.jsx'

export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel }) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-[2px]"
          onClick={onCancel}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: softSpring }}
            exit={{ opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.12 } }}
            className="w-full max-w-sm bg-white dark:bg-night-900 rounded-2xl border border-zinc-200 dark:border-white/15 shadow-xl p-6"
          >
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">{message}</p>
            <div className="flex justify-end gap-2.5">
              <Button variant="secondary" onClick={onCancel} className="px-4 py-2">
                {cancelLabel}
              </Button>
              <Button
                variant={danger ? 'danger' : 'primary'}
                onClick={onConfirm}
                className={`px-4 py-2 ${danger ? 'bg-red-500 hover:bg-red-600 text-white border-red-500 dark:border-red-500 dark:text-white dark:hover:bg-red-600' : ''}`}
                ref={confirmRef}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
