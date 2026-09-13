import { useEffect } from 'react'
import { Flame, X } from 'lucide-react'

/**
 * 10개 모두 완료했을 때 한 번 보여주는 완주 화면.
 * 요란하지 않게, 그리고 언제든 닫을 수 있게.
 */
export default function CompleteOverlay({ open, onClose, streak, message, celebration }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-5 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="오늘의 약속 완료"
      onClick={onClose}
    >
      <div
        className="card relative w-full max-w-sm px-6 py-9 text-center animate-popIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface2"
        >
          <X size={18} />
        </button>

        <div className="text-5xl" aria-hidden="true">
          🎉
        </div>

        <h2 className="mt-4 text-lg font-extrabold tracking-tight text-ink">오늘의 약속 완료</h2>

        <div className="mt-4 text-4xl font-black tabular-nums text-done">10 / 10</div>

        <p className="mx-auto mt-4 max-w-[17rem] break-keep text-sm leading-relaxed text-muted">
          {message}
        </p>

        {streak > 0 && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-brandSoft px-4 py-2 text-sm font-bold text-brand">
            <Flame size={16} aria-hidden="true" />
            {streak}일 연속 달성
          </div>
        )}

        {celebration && (
          <p className="mt-4 break-keep text-sm font-semibold text-brand">{celebration}</p>
        )}

        <button type="button" onClick={onClose} className="btn-ghost mt-7 w-full">
          닫기
        </button>
      </div>
    </div>
  )
}
