import { useEffect, useState } from 'react'
import { Quote, Check } from 'lucide-react'
import { Spinner } from './Skeleton'

/**
 * 오늘의 한마디 + 오늘의 질문.
 * 질문에는 한 줄로 답을 남길 수 있고, 그 답은 본인만 볼 수 있다.
 */
export default function QuoteCard({ text, question, answer, onSaveAnswer }) {
  const [value, setValue] = useState(answer ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 서버에서 기존 답을 늦게 받아오면 반영한다 (사용자가 이미 쓰고 있으면 건드리지 않는다)
  useEffect(() => {
    setValue((v) => (v ? v : (answer ?? '')))
  }, [answer])

  const dirty = value.trim() !== (answer ?? '').trim()

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    try {
      await onSaveAnswer(value)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="px-5 py-5">
        <div className="mb-2.5 flex items-center gap-2 text-brand">
          <Quote size={15} aria-hidden="true" />
          <h2 className="text-xs font-bold tracking-wider">오늘의 한마디</h2>
        </div>
        <p className="break-keep text-[15px] font-medium leading-relaxed text-ink">{text}</p>
      </div>

      {question && (
        <div className="border-t border-line bg-surface2/60 px-5 py-4">
          <h3 className="mb-1.5 text-xs font-bold tracking-wider text-muted">오늘의 질문</h3>
          <p className="break-keep text-sm leading-relaxed text-ink/85">{question}</p>

          {onSaveAnswer && (
            <div className="mt-3 flex gap-2">
              <input
                className="field bg-surface py-2.5 text-sm"
                maxLength={120}
                value={value}
                placeholder="한 줄로 남겨보세요 (나만 볼 수 있어요)"
                aria-label="오늘의 질문에 대한 답"
                onChange={(e) => setValue(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.currentTarget.blur()
                  }
                }}
              />
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving}
                className="btn-ghost shrink-0 px-4 py-2.5 text-sm"
              >
                {saving ? <Spinner size={15} /> : saved ? <Check size={15} /> : null}
                {saved ? '저장됨' : '저장'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
