import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Trophy, ChevronRight, PartyPopper } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useToday } from '../hooks/useToday'
import { listRules } from '../services/rules'
import { checkRule, listRecords, listAllDailyStats, uncheckRule } from '../services/records'
import { computeStats } from '../services/stats'
import { getMyGroup, getGroupStats, myCheers, cheerLabel } from '../services/groups'
import { formatKorean, greeting } from '../utils/date'
import {
  quoteOfTheDay,
  questionOfTheDay,
  randomCheckMessage,
  randomCompleteMessage,
  STREAK_CELEBRATIONS,
} from '../utils/messages'
import { humanError } from '../utils/errors'

import ProgressBar from '../components/ProgressBar'
import RuleCard from '../components/RuleCard'
import StampGrid from '../components/StampGrid'
import QuoteCard from '../components/QuoteCard'
import CompleteOverlay from '../components/CompleteOverlay'
import EmptyState from '../components/EmptyState'
import { RuleListSkeleton, Skeleton } from '../components/Skeleton'

export default function Today() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const today = useToday()

  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState([])
  const [doneIds, setDoneIds] = useState(new Set())
  const [dailyStats, setDailyStats] = useState([])
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [cheers, setCheers] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [overlay, setOverlay] = useState(null)

  const celebratedRef = useRef(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [ruleList, records, stats] = await Promise.all([
        listRules(user.id),
        listRecords(user.id, today),
        listAllDailyStats(user.id),
      ])
      setRules(ruleList)
      setDoneIds(new Set(records.filter((r) => r.completed).map((r) => r.rule_id)))
      setDailyStats(stats)

      // 오늘 이미 완주한 상태로 들어왔다면 축하 화면을 다시 띄우지 않는다
      const todayStat = stats.find((s) => s.date === today)
      if (todayStat?.is_complete) celebratedRef.current = true

      const g = await getMyGroup(user.id)
      setGroup(g)
      if (g) {
        const [memberStats, received] = await Promise.all([
          getGroupStats(g.id, today),
          myCheers(today),
        ])
        setMembers(memberStats)
        setCheers(received)
      } else {
        setMembers([])
        setCheers([])
      }
    } catch (e) {
      toast.error(humanError(e, '기록을 불러오지 못했습니다. 화면을 새로고침해주세요.'))
    } finally {
      setLoading(false)
    }
  }, [user, today, toast])

  useEffect(() => {
    setLoading(true)
    celebratedRef.current = false
    load()
  }, [load])

  const doneCount = doneIds.size
  const total = rules.length || 10

  const stats = useMemo(
    () => computeStats(dailyStats, today, total),
    [dailyStats, today, total]
  )

  // 화면에 보이는 값은 방금 누른 체크가 즉시 반영되도록 로컬 값을 우선한다
  const liveComplete = total > 0 && doneCount >= total
  const liveStreak = liveComplete && !stats.todayComplete ? stats.currentStreak + 1 : stats.currentStreak

  const quote = useMemo(
    () =>
      quoteOfTheDay({
        ymd: today,
        streak: liveStreak,
        isComplete: liveComplete,
        hadBreak: stats.hadBreak,
        totalDays: stats.recordedDays,
      }),
    [today, liveStreak, liveComplete, stats.hadBreak, stats.recordedDays]
  )

  async function toggle(rule) {
    if (busyId) return
    const wasDone = doneIds.has(rule.id)
    setBusyId(rule.id)

    // 낙관적 업데이트
    const next = new Set(doneIds)
    if (wasDone) next.delete(rule.id)
    else next.add(rule.id)
    setDoneIds(next)

    try {
      if (wasDone) {
        await uncheckRule(user.id, rule.id, today)
      } else {
        await checkRule(user.id, rule, today)
        const justCompleted = next.size >= total
        if (justCompleted && !celebratedRef.current) {
          celebratedRef.current = true
          setOverlay({
            message: randomCompleteMessage(),
            streak: stats.currentStreak + 1,
            celebration: STREAK_CELEBRATIONS[stats.currentStreak + 1] ?? null,
          })
        } else if (!justCompleted) {
          toast.success(randomCheckMessage())
        }
      }
      // 집계는 DB 트리거가 갱신하므로 다시 읽어온다
      const fresh = await listAllDailyStats(user.id)
      setDailyStats(fresh)
    } catch (e) {
      setDoneIds(doneIds) // 롤백
      toast.error(humanError(e, '저장하지 못했습니다. 잠시 후 다시 시도해주세요.'))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <RuleListSkeleton count={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeUp">
      {/* 헤더 */}
      <header>
        <p className="text-sm font-semibold text-muted">
          {greeting()}, {profile?.nickname || '나'}님
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">오늘의 약속</h1>
        <p className="mt-1 text-sm text-muted">{formatKorean(today)}</p>
      </header>

      {/* 연속 기록 */}
      <StreakBanner stats={stats} liveStreak={liveStreak} liveComplete={liveComplete} />

      {/* 받은 응원 */}
      {cheers.length > 0 && (
        <section className="card px-5 py-4">
          <h2 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold tracking-wider text-brand">
            <PartyPopper size={14} aria-hidden="true" /> 오늘 받은 응원
          </h2>
          <ul className="space-y-1.5">
            {cheers.map((c, i) => {
              const label = cheerLabel(c.type)
              return (
                <li key={i} className="text-sm text-ink">
                  <b>{c.nickname}</b>님이 응원을 보냈습니다 {label.emoji}{' '}
                  <span className="text-muted">{label.label}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* 진행률 */}
      {rules.length > 0 && (
        <section className="card px-5 py-5">
          <ProgressBar value={doneCount} total={total} />
        </section>
      )}

      {/* 규칙 목록 */}
      {rules.length === 0 ? (
        <EmptyState
          emoji="📝"
          title="아직 약속이 없습니다"
          description="매일 지키고 싶은 10가지를 정하면 오늘부터 기록할 수 있어요."
          action={
            <Link to="/settings/rules" className="btn-primary">
              나의 10가지 정하기
            </Link>
          }
        />
      ) : (
        <section className="space-y-2.5">
          {rules.map((rule, i) => (
            <RuleCard
              key={rule.id}
              index={i}
              rule={rule}
              done={doneIds.has(rule.id)}
              busy={busyId === rule.id}
              onToggle={() => toggle(rule)}
            />
          ))}
        </section>
      )}

      {/* 도장판 */}
      {rules.length > 0 && (
        <section className="card px-5 py-5">
          <StampGrid total={total} done={doneCount} />

          {liveComplete ? (
            <div className="mt-5 rounded-xl2 bg-doneSoft px-4 py-4 text-center">
              <p className="text-sm font-extrabold text-done">🎉 오늘의 약속 완료</p>
              <p className="mt-1.5 break-keep text-xs leading-relaxed text-done/80">
                오늘도 스스로 세운 기준을 지켰습니다.
              </p>
            </div>
          ) : (
            <p className="mt-5 break-keep text-center text-xs leading-relaxed text-muted">
              {doneCount === 0
                ? '첫 번째 약속부터 시작해볼까요?'
                : `완벽하지 않아도 괜찮습니다. 지금까지 ${doneCount}개를 해냈어요.`}
            </p>
          )}
        </section>
      )}

      {/* 오늘의 한마디 */}
      <QuoteCard text={quote.text} question={questionOfTheDay(today)} />

      {/* 친구들의 오늘 */}
      <FriendsPreview group={group} members={members} meId={user.id} />

      <CompleteOverlay
        open={Boolean(overlay)}
        onClose={() => setOverlay(null)}
        streak={overlay?.streak ?? 0}
        message={overlay?.message ?? ''}
        celebration={overlay?.celebration}
      />
    </div>
  )
}

/* ------------------------------------------------------------ */

function StreakBanner({ stats, liveStreak, liveComplete }) {
  // 기록이 끊긴 경우 — 비난하지 않고, 남아 있는 기록을 강조한다
  if (stats.bestStreak > 0 && liveStreak === 0 && !liveComplete) {
    return (
      <section className="card px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-muted">최장 연속 기록</p>
            <p className="mt-0.5 text-2xl font-black tabular-nums text-ink">
              {stats.bestStreak}일
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold tracking-wider text-muted">현재 연속</p>
            <p className="mt-0.5 text-2xl font-black tabular-nums text-muted">0일</p>
          </div>
        </div>
        <p className="mt-4 break-keep text-sm leading-relaxed text-ink/80">
          {stats.bestStreak}일 동안 이어온 기록은 사라지지 않았습니다.
          <br />
          오늘 다시 시작하면 됩니다.
        </p>
      </section>
    )
  }

  return (
    <section className="card flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brandSoft">
          <Flame size={19} className="text-brand" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold tracking-wider text-muted">현재 연속</p>
          <p className="text-lg font-black tabular-nums text-ink">{liveStreak}일</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="text-right">
          <p className="text-xs font-bold tracking-wider text-muted">최고 기록</p>
          <p className="text-lg font-black tabular-nums text-ink">
            {Math.max(stats.bestStreak, liveStreak)}일
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-surface2">
          <Trophy size={18} className="text-muted" aria-hidden="true" />
        </span>
      </div>
    </section>
  )
}

function FriendsPreview({ group, members, meId }) {
  if (!group) {
    return (
      <EmptyState
        emoji="🤝"
        title="아직 그룹이 없습니다"
        description="친구와 함께하면 서로의 꾸준함을 볼 수 있어요. 최대 4명까지 가능합니다."
        action={
          <Link to="/friends" className="btn-line">
            그룹 만들거나 참여하기
          </Link>
        }
      />
    )
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted">친구들의 오늘</h2>
        <Link
          to="/friends"
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand hover:underline"
        >
          {group.name} <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {members.length <= 1 ? (
        <EmptyState
          emoji="✉️"
          title="아직 그룹원이 없습니다"
          description={`친구에게 초대 코드 ${group.invite_code} 를 보내보세요.`}
        />
      ) : (
        <div className="card divide-y divide-line">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface2 text-base">
                {m.avatar}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                {m.nickname}
                {m.userId === meId && <span className="ml-1.5 text-xs text-muted">(나)</span>}
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                {m.todayCount}
                <span className="text-muted"> / {m.todayTotal}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums text-brand">
                <Flame size={12} aria-hidden="true" />
                {m.currentStreak}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
