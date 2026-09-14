import { useCallback, useEffect, useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Sparkles, Target } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useToday } from '../hooks/useToday'
import { listRules } from '../services/rules'
import { listAllDailyStats, ruleCompletionCounts } from '../services/records'
import { getWeeklyGoal, saveWeeklyGoal } from '../services/notes'
import { computeStats, rankRules } from '../services/stats'
import { addDays, diffDays, formatShort, weekEnd, weekStart } from '../utils/date'
import { humanError } from '../utils/errors'

import EmptyState from '../components/EmptyState'
import { Skeleton, Spinner } from '../components/Skeleton'

export default function Weekly() {
  const { user } = useAuth()
  const toast = useToast()
  const today = useToday()

  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const [weekCounts, setWeekCounts] = useState([])

  const wStart = weekStart(today)
  const wEnd = weekEnd(today)
  const elapsed = diffDays(today, wStart) + 1

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [ruleList, stats, counts] = await Promise.all([
        listRules(user.id),
        listAllDailyStats(user.id),
        ruleCompletionCounts(user.id, wStart, today),
      ])
      setRules(ruleList)
      setDailyStats(stats)
      setWeekCounts(counts)
    } catch (e) {
      toast.error(humanError(e, '주간 기록을 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }, [user, today, wStart, toast])

  useEffect(() => {
    load()
  }, [load])

  const total = rules.length || 10
  const stats = useMemo(() => computeStats(dailyStats, today, total), [dailyStats, today, total])
  const ranked = useMemo(() => rankRules(weekCounts, rules, elapsed), [weekCounts, rules, elapsed])

  const weekDays = useMemo(() => {
    const byDate = new Map(dailyStats.map((s) => [s.date, s]))
    return Array.from({ length: 7 }, (_, i) => {
      const ymd = addDays(wStart, i)
      return { ymd, stat: byDate.get(ymd), future: ymd > today }
    })
  }, [dailyStats, wStart, today])

  const completedThisWeek = weekDays.filter((d) => d.stat?.is_complete).length

  // 몇 번째 주인지 (기록 시작일 기준)
  const weekNo = useMemo(() => {
    const first = dailyStats[0]?.date
    if (!first) return 1
    return Math.floor(diffDays(wStart, weekStart(first)) / 7) + 1
  }, [dailyStats, wStart])

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (dailyStats.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">주간</h1>
        </header>
        <EmptyState
          emoji="📅"
          title="아직 이번 주 기록이 없습니다"
          description="하루씩 체크하면 주말에 이번 주를 돌아볼 수 있어요."
        />
      </div>
    )
  }

  const Growth = stats.growth > 0 ? TrendingUp : stats.growth < 0 ? TrendingDown : Minus

  return (
    <div className="space-y-6 animate-fadeUp">
      <header>
        <p className="text-xs font-black tracking-widest text-brand">WEEK {String(weekNo).padStart(2, '0')}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">이번 주</h1>
        <p className="mt-1 text-sm text-muted">
          {formatShort(wStart)} – {formatShort(wEnd)}
        </p>
      </header>

      {/* 달성률 */}
      <section className="card px-5 py-7 text-center">
        <p className="text-xs font-bold tracking-wider text-muted">이번 주 달성률</p>
        <p className="mt-2 text-5xl font-black tabular-nums text-ink">{stats.weekRate}%</p>

        <div className="mt-5 flex items-center justify-center gap-4 text-sm">
          <span className="text-muted tabular-nums">지난주 {stats.prevWeekRate}%</span>
          <span
            className={`inline-flex items-center gap-1 font-bold tabular-nums ${
              stats.growth > 0 ? 'text-done' : 'text-muted'
            }`}
          >
            <Growth size={15} aria-hidden="true" />
            {stats.growth > 0 ? '+' : ''}
            {stats.growth}%
          </span>
        </div>

        <p className="mt-5 break-keep text-xs leading-relaxed text-muted">
          {elapsed < 7
            ? `이번 주는 아직 ${7 - elapsed}일 남았습니다. 지금까지 ${elapsed}일 기준이에요.`
            : '이번 주가 마무리되었습니다.'}
        </p>
      </section>

      {/* 요일별 */}
      <section className="card px-5 py-5">
        <h2 className="mb-4 text-sm font-bold text-muted">요일별 기록</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((d, i) => {
            const count = d.stat?.completed_count ?? 0
            const t = d.stat?.total_rules ?? total
            const h = t > 0 ? Math.round((count / t) * 100) : 0
            return (
              <div key={d.ymd} className="flex flex-col items-center gap-1.5">
                <div className="flex h-20 w-full items-end overflow-hidden rounded-lg bg-surface2">
                  <div
                    className={`w-full rounded-lg transition-all duration-500 ${
                      d.stat?.is_complete ? 'bg-done' : 'bg-brand/70'
                    }`}
                    style={{ height: `${d.future ? 0 : Math.max(h, count > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    d.ymd === today ? 'text-brand' : 'text-muted'
                  }`}
                >
                  {['월', '화', '수', '목', '금', '토', '일'][i]}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
          <span className="text-muted">이번 주 완주 일수</span>
          <span className="font-bold tabular-nums text-ink">{completedThisWeek}일</span>
        </div>
      </section>

      {/* 강점 / 개선점 */}
      {ranked.length >= 2 && (
        <section className="grid gap-2.5 sm:grid-cols-2">
          <div className="card px-5 py-5">
            <p className="text-xs font-bold tracking-wider text-done">이번 주의 강점</p>
            <p className="mt-2 break-keep font-bold leading-snug text-ink">{ranked[0].title}</p>
            <p className="mt-1 text-sm tabular-nums text-muted">
              {ranked[0].count} / {elapsed}
            </p>
          </div>
          <div className="card px-5 py-5">
            <p className="text-xs font-bold tracking-wider text-brand">이번 주의 개선점</p>
            <p className="mt-2 break-keep font-bold leading-snug text-ink">
              {ranked[ranked.length - 1].title}
            </p>
            <p className="mt-1 text-sm tabular-nums text-muted">
              {ranked[ranked.length - 1].count} / {elapsed}
            </p>
          </div>
        </section>
      )}

      {/* 다음 주 제안 (앞으로 확장될 부분) */}
      {ranked.length >= 2 && (
        <section className="card px-5 py-5">
          <div className="mb-3 flex items-center gap-1.5 text-brand">
            <Sparkles size={15} aria-hidden="true" />
            <h2 className="text-xs font-bold tracking-wider">다음 주 제안</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-bold text-muted">유지하기 좋은 약속</p>
              <p className="mt-1 break-keep font-semibold text-ink">
                {ranked[0].title}{' '}
                <span className="font-normal tabular-nums text-muted">
                  {ranked[0].count}/{elapsed}
                </span>
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-muted">조금 더 도전해볼 약속</p>
              <p className="mt-1 break-keep font-semibold text-ink">
                {ranked[ranked.length - 1].title}{' '}
                <span className="font-normal tabular-nums text-muted">
                  {ranked[ranked.length - 1].count}/{elapsed} →{' '}
                  {suggestTarget(ranked[ranked.length - 1].count, elapsed)}/{7}
                </span>
              </p>
            </div>
          </div>

          <p className="mt-4 break-keep border-t border-line pt-4 text-xs leading-relaxed text-muted">
            갑자기 완벽을 요구하지 않습니다. 지금보다 조금 나은 목표를 제안해요.
          </p>
        </section>
      )}

      <WeeklyGoal userId={user.id} today={today} suggestion={ranked[ranked.length - 1]?.title} />
    </div>
  )
}

/**
 * 이번 주 목표 — 한 줄.
 *
 * 긴 회고를 쓰게 하면 아무도 안 쓴다.
 * "하루에 1km 걷기" 처럼 한 줄이면 충분하고, 그게 오늘 화면에도 뜬다.
 */
function WeeklyGoal({ userId, today, suggestion }) {
  const toast = useToast()
  const [goal, setGoal] = useState('')
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getWeeklyGoal(userId, today)
      .then((g) => {
        if (cancelled) return
        setGoal(g)
        setSaved(g)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [userId, today])

  const dirty = goal.trim() !== saved.trim()

  async function save() {
    if (!dirty || busy) return
    setBusy(true)
    try {
      const next = await saveWeeklyGoal(userId, today, goal)
      setSaved(next)
      setGoal(next)
      toast.success(next ? '이번 주 목표를 저장했어요.' : '목표를 지웠어요.')
    } catch (e) {
      toast.error(humanError(e, '목표를 저장하지 못했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  const examples = ['하루에 1km 걷기', '자기 전 휴대폰 30분 덜 보기', '물 8잔 마시기']

  return (
    <section className="card px-5 py-5">
      <div className="mb-1 flex items-center gap-1.5 text-brand">
        <Target size={15} aria-hidden="true" />
        <h2 className="text-xs font-bold tracking-wider">이번 주 목표</h2>
      </div>
      <p className="break-keep text-sm leading-relaxed text-muted">
        긴 회고 대신 한 줄이면 충분해요. 정해두면 오늘 화면 맨 위에 계속 보입니다.
      </p>

      {loading ? (
        <Skeleton className="mt-4 h-12 w-full" />
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <input
              className="field py-2.5 text-sm"
              maxLength={60}
              value={goal}
              placeholder="하루에 1km 걷기"
              aria-label="이번 주 목표"
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  save()
                }
              }}
            />
            <button
              type="button"
              onClick={save}
              disabled={!dirty || busy}
              className="btn-primary shrink-0 px-5 py-2.5 text-sm"
            >
              {busy ? <Spinner size={15} /> : null}
              저장
            </button>
          </div>

          {!saved && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(suggestion ? [`${suggestion} 하루도 빠짐없이`, ...examples] : examples)
                .slice(0, 3)
                .map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setGoal(ex)}
                    className="rounded-full border border-line bg-surface2 px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-ink"
                  >
                    {ex}
                  </button>
                ))}
            </div>
          )}

          {saved && (
            <p className="mt-3 text-xs text-muted">
              다음 주가 되면 새 목표를 정할 수 있어요. 지난 목표는 그대로 남습니다.
            </p>
          )}
        </>
      )}
    </section>
  )
}

/** 3/7 → 5/7 처럼 현실적인 다음 목표를 제안한다 */
function suggestTarget(count, elapsed) {
  const rate = elapsed > 0 ? count / elapsed : 0
  const projected = Math.round(rate * 7)
  if (rate >= 0.9) return 7
  if (rate <= 0.5) return Math.min(7, Math.max(projected + 2, 3))
  return Math.min(7, projected + 1)
}
