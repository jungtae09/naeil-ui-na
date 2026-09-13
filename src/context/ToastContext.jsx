import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

const ToastContext = createContext(null)

let seq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const t = timers.current.get(id)
    if (t) {
      clearTimeout(t)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback(
    (message, tone = 'info', ms = 2600) => {
      const id = ++seq
      setToasts((list) => [...list.slice(-2), { id, message, tone }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ms)
      )
      return id
    },
    [dismiss]
  )

  const value = useMemo(
    () => ({
      show,
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error', 3600),
      info: (m) => show(m, 'info'),
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-8">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl2 px-4 py-3 text-sm font-medium shadow-lift animate-fadeUp ${
              t.tone === 'error'
                ? 'bg-[#3b1f1f] text-[#ffd9d4] dark:bg-[#4a2222]'
                : t.tone === 'success'
                  ? 'bg-done text-white'
                  : 'bg-ink text-bg'
            }`}
          >
            {t.tone === 'error' ? (
              <AlertCircle size={18} className="mt-px shrink-0" />
            ) : t.tone === 'success' ? (
              <CheckCircle2 size={18} className="mt-px shrink-0" />
            ) : (
              <Info size={18} className="mt-px shrink-0" />
            )}
            <span className="whitespace-pre-line">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 는 ToastProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
