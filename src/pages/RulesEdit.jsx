import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronUp, ChevronDown, Plus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { RULE_COUNT, listRules, saveRules, DEFAULT_RULES } from '../services/rules'
import { humanError } from '../utils/errors'
import { Skeleton, Spinner } from '../components/Skeleton'

export default function RulesEdit() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    listRules(user.id)
      .then((list) => {
        setItems(
          list.length > 0
            ? list.map((r) => ({ id: r.id, title: r.title }))
            : DEFAULT_RULES.map((t) => ({ title: t }))
        )
      })
      .catch((e) => toast.error(humanError(e, '약속을 불러오지 못했습니다.')))
      .finally(() => setLoading(false))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  function update(i, value) {
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, title: value } : it)))
  }

  function move(i, dir) {
    setItems((list) => {
      const next = [...list]
      const j = i + dir
      if (j < 0 || j >= next.length) return list
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function remove(i) {
    setItems((list) => list.filter((_, idx) => idx !== i))
  }

  function add() {
    setItems((list) => [...list, { title: '' }])
  }

  async function save() {
    const filled = items.filter((it) => it.title.trim())
    if (filled.length !== RULE_COUNT) {
      toast.error(`${RULE_COUNT}개를 모두 채워주세요. (현재 ${filled.length}개)`)
      return
    }
    setSaving(true)
    try {
      await saveRules(user.id, filled)
      toast.success('저장했습니다.')
      navigate('/today')
    } catch (e) {
      toast.error(humanError(e, '저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  const filledCount = items.filter((it) => it.title.trim()).length

  return (
    <div className="space-y-6 animate-fadeUp">
      <header>
        <Link
          to="/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" /> 설정
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">나의 10가지 약속</h1>
        <p className="mt-2 break-keep text-sm leading-relaxed text-muted">
          내용을 바꾸거나 순서를 조정할 수 있어요. 이미 기록된 과거 데이터는 그대로 보존되니
          안심하고 수정하세요.
        </p>
      </header>

      <section className="space-y-2">
        {items.map((it, i) => (
          <div key={it.id ?? `new-${i}`} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-muted">
              {String(i + 1).padStart(2, '0')}
            </span>

            <input
              className="field py-3"
              maxLength={40}
              value={it.title}
              placeholder="지키고 싶은 약속"
              onChange={(e) => update(i, e.target.value)}
              aria-label={`${i + 1}번째 약속`}
            />

            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="grid h-6 w-8 place-items-center rounded text-muted transition hover:bg-surface2 disabled:opacity-25"
                aria-label="위로"
              >
                <ChevronUp size={15} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                className="grid h-6 w-8 place-items-center rounded text-muted transition hover:bg-surface2 disabled:opacity-25"
                aria-label="아래로"
              >
                <ChevronDown size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => remove(i)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface2"
              aria-label="삭제"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </section>

      {items.length < RULE_COUNT && (
        <button type="button" onClick={add} className="btn-line w-full">
          <Plus size={17} aria-hidden="true" /> 약속 추가
        </button>
      )}

      <p className="text-center text-sm font-semibold tabular-nums text-muted">
        {filledCount} / {RULE_COUNT}
      </p>

      <button type="button" onClick={save} className="btn-primary w-full" disabled={saving}>
        {saving ? <Spinner /> : null}
        저장하기
      </button>
    </div>
  )
}
