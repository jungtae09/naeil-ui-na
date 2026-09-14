import { useCallback, useEffect, useMemo, useState } from 'react'
import { Flame, Trophy, CalendarCheck, CheckCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useToday } from '../hooks/useToday'
import { listRules } from '../services/rules'
import { listAllDailyStats, listRecords, ruleCompletionCounts } from '../services/records'
import { computeStats, rankRules } from '../services/stats'
import { myCheerCount } from '../services/friends'
import { earnedBadges } from '../utils/badges'
import { addDays, diffDays, formatKorean, monthStart } from '../utils/date'
import { humanError } from '../utils/errors'

import Calendar from '../components/Calendar'
import EmptyState from '../components/EmptyState'
import { Skeleton } from '../components/Skeleton'

export default function History() {
  const { user } = useAuth()
  const toast = useToast()
  const today = useToday()

  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const [ruleCounts, setRuleCounts] = useState([])
  const [cheersSent, setCheersSent] = useState(0)
  const [month, setMonth] = useState(() => monthStart(today))
  const [selected, setSelected] = useState(null)
  const [dayDetail, setDayDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const from = addDays(today, -29)
      const [ruleList, stats, counts, cheers] = await Promise.all([
        listRules(user.id),
        listAllDailyStats(user.id),
        ruleCompletionCounts(user.id, from, today),
        myCheerCount(user.id).catch(() => 0),
      ])
      setRules(ruleList)
      setDailyStats(stats)
      setRuleCounts(counts)
      setCheersSent(cheers)
    } catch (e) {
      toast.error(humanError(e, '기록을 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }, [user, today, toast])

  useEffect(() => {
    load()
  }, [load])

  const total = rules.length || 10
  const stats = useMemo(() => computeStats(dailyStats, today, total), [dailyStats, today, total])
  const statsByDate = useMemo(() => new Map(dailyStats.map((s) => [s.date, s])), [dailyStats])

  // 최근 30일 중 실제로 기록이 시작된 날부터를 분모로 삼는다
  const windowDays = useMemo(() => {
    const first = dailyStats[0]?.date
    if (!first) return 0
    const start = first > addDays(today, -29) ? first : addDays(today, -29)
    return diffDays(today, start) + 1
  }, [dailyStats, today])

  const ranked = useMemo(
    () => rankRules(ruleCounts, rules, windowDays),
    [ruleCounts, rules, windowDays]
  )

  const badges = useMemo(
    () =>
      earnedBadges({
        completeDays: stats.completeDays,
        bestStreak: stats.bestStreak,
        todayComplete: stats.todayComplete,
        growth: stats.growth,
        cheersSent,
      }),
    [stats, cheersSent]
  )

  async function openDay(ymd) {
    setSelected(ymd)
    setDetailLoading(true)
    try {
      const records = await listRecords(user.id, ymd)
      setDayDetail({ ymd, records })
    } catch (e) {
      toast.error(humanError(e, '그날의 기록을 불러오지 못했습니다.'))
      setDayDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  const hasAny = dailyStats.length > 0

  return (
    <div className="space-y-6 animate-fadeUp">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">나의 기록</h1>
        <p className="mt-1 text-sm text-muted">지금까지 쌓아온 것들</p>
      </header>

      {!hasAny ? (
        <EmptyState
          emoji="📊"
          title="아직 기록이 없습니다"
          description="오늘 첫 번째 약속을 체크하면 여기에 기록이 쌓이기 시작합니다."
        />
      ) : (
        <>
          {/* 핵심 숫자 */}
          <section className="grid grid-cols-2 gap-2.5">
            <Stat icon={Flame} label="현재 연속" value={`${stats.currentStreak}일`} tone="brand" />
            <Stat icon={Trophy} label="최고 연속" value={`${stats.bestStreak}일`} />
            <Stat icon={CalendarCheck} label="이번 달" value={`${stats.monthRate}%`} />
            <Stat icon={CheckCheck} label="총 완료" value={`${stats.totalCompletions}회`} />
          </section>

          <section className="card px-5 py-5">
            <h2 className="mb-4 text-sm font-bold text-muted">달성률</h2>
            <div className="space-y-3">
              <RateRow label="오늘" value={pct(stats.todayCount, stats.todayTotal)} />
              <RateRow label="이번 주" value={stats.weekRate} />
              <RateRow label="이번 달" value={stats.monthRate} />
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
              <span className="text-muted">총 완주 일수</span>
              <span className="font-bold tabular-nums text-ink">{stats.completeDays}일</span>
            </div>
          </section>

          {/* 달력 */}
          <Calendar
            month={month}
            statsByDate={statsByDate}
            today={today}
            selected={selected}
            onChangeMonth={setMonth}
            onSelect={openDay}
          />

          {/* 선택한 날의 상세 — 본인만 볼 수 있는 정보 */}
          {selected && (
            <DayDetail
              ymd={selected}
              loading={detailLoading}
              detail={dayDetail}
              complete={statsByDate.get(selected)?.is_complete}
            />
          )}

          {/* 규칙별 통계 */}
          {ranked.length > 0 && windowDays > 0 && (
            <section className="card px-5 py-5">
              <h2 className="text-sm font-bold text-muted">규칙별 달성률</h2>
              <p className="mt-0.5 text-xs text-muted">최근 {windowDays}일 기준</p>

              <div className="mt-4 space-y-3">
                {ranked.map((r) => (
                  <div key={r.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.title}</span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-muted">
                        {r.rate}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                      <div
                        className={`h-full rounded-full ${r.rate >= 70 ? 'bg-done' : 'bg-brand'}`}
                        style={{ width: `${r.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {ranked.length >= 2 && (
                <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-line pt-4">
                  <div>
                    <p className="text-xs font-bold text-muted">가장 잘 지키는 약속</p>
                    <p className="mt-1 break-keep text-sm font-semibold text-done">
                      {ranked[0].title}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted">가장 자주 놓치는 약속</p>
                    <p className="mt-1 break-keep text-sm font-semibold text-brand">
                      {ranked[ranked.length - 1].title}
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 배지 */}
          <section className="card px-5 py-5">
            <h2 className="mb-4 text-sm font-bold text-muted">배지</h2>
            <div className="grid grid-cols-4 gap-2.5">
              {badges.map((b) => (
                <div
                  key={b.id}
                  title={b.desc}
                  className={`flex flex-col items-center gap-1.5 rounded-xl2 px-2 py-3 text-center transition ${
                    b.earned ? 'bg-brandSoft' : 'bg-surface2/50 opacity-40 grayscale'
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {b.emoji}
                  </span>
                  <span className="text-[11px] font-bold leading-tight text-ink">{b.name}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function DayDetail({ ymd, loading, detail, complete }) {
  const records = detail?.records ?? []

  return (
    <section className="card px-5 py-5 animate-fadeUp">
      <h2 className="text-sm font-bold text-ink">{formatKorean(ymd)}</h2>
      <p className="mt-1 text-xs text-muted">
        {records.length}개 완료
        {complete && ' · 완주'}
      </p>

      {loading ? (
        <Skeleton className="mt-4 h-24 w-full" />
      ) : records.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {records.map((r) => (
            <li key={r.id} className="flex items-start gap-2 text-sm text-ink">
              <span className="mt-0.5 text-done" aria-hidden="true">
                ✓
              </span>
              <span className="break-keep">{r.rule_title || '(삭제된 약속)'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">이날은 기록이 없습니다.</p>
      )}
    </section>
  )
}

function pct(a, b) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="card px-4 py-4">
      <div className="flex items-center gap-1.5">
        <Icon size={14} className={tone === 'brand' ? 'text-brand' : 'text-muted'} aria-hidden="true" />
        <span className="text-xs font-bold text-muted">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-black tabular-nums text-ink">{value}</p>
    </div>
  )
}

function RateRow({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-sm font-bold tabular-nums text-ink">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  )
}
