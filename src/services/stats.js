import { addDays, diffDays, weekStart, monthStart } from '../utils/date'

/**
 * 연속 기록 / 달성률 계산.
 * 화면에서 임의로 만들어내지 않고, DB 에서 가져온 daily_stats 배열만 근거로 계산한다.
 *
 * @param {Array} stats  [{ date, completed_count, total_rules, is_complete }] (날짜 오름차순)
 * @param {string} today 'YYYY-MM-DD' (Asia/Seoul 기준)
 */
export function computeStats(stats, today, ruleCount = 10) {
  const byDate = new Map(stats.map((s) => [s.date, s]))
  const completeDates = stats.filter((s) => s.is_complete).map((s) => s.date)

  // --- 연속 기록 ---
  let best = 0
  let run = 0
  let prev = null
  for (const d of completeDates) {
    if (prev && diffDays(d, prev) === 1) run += 1
    else run = 1
    if (run > best) best = run
    prev = d
  }

  // 현재 연속: 마지막 완주일이 오늘 또는 어제여야 살아있다
  let current = 0
  if (prev) {
    const gap = diffDays(today, prev)
    if (gap === 0 || gap === 1) current = run
  }

  // --- 오늘 ---
  const todayStat = byDate.get(today)
  const todayCount = todayStat?.completed_count ?? 0
  const todayTotal = todayStat?.total_rules ?? ruleCount
  const todayComplete = todayStat?.is_complete ?? false

  // --- 누적 ---
  const totalCompletions = stats.reduce((sum, s) => sum + (s.completed_count ?? 0), 0)
  const completeDays = completeDates.length

  // --- 이번 주 / 지난 주 ---
  const thisWeekStart = weekStart(today)
  const lastWeekStart = addDays(thisWeekStart, -7)
  const lastWeekEnd = addDays(thisWeekStart, -1)

  const elapsedThisWeek = diffDays(today, thisWeekStart) + 1
  const weekRate = rateBetween(stats, thisWeekStart, today, elapsedThisWeek, ruleCount)
  const prevWeekRate = rateBetween(stats, lastWeekStart, lastWeekEnd, 7, ruleCount)
  const growth = round1(weekRate - prevWeekRate)

  // --- 이번 달 ---
  const mStart = monthStart(today)
  const elapsedThisMonth = diffDays(today, mStart) + 1
  const monthRate = rateBetween(stats, mStart, today, elapsedThisMonth, ruleCount)

  // 한 번이라도 끊긴 적이 있는지 (다시 시작 메시지 판단용)
  const hadBreak = best > 0 && current === 0

  return {
    todayCount,
    todayTotal,
    todayComplete,
    currentStreak: current,
    bestStreak: best,
    completeDays,
    totalCompletions,
    weekRate,
    prevWeekRate,
    growth,
    monthRate,
    hadBreak,
    recordedDays: stats.length,
  }
}

function rateBetween(stats, fromYmd, toYmd, days, ruleCount) {
  let sum = 0
  let denomRules = ruleCount
  for (const s of stats) {
    if (s.date < fromYmd || s.date > toYmd) continue
    sum += s.completed_count ?? 0
    if (s.total_rules) denomRules = s.total_rules
  }
  const denom = Math.max(days * denomRules, 1)
  return round1((sum / denom) * 100)
}

function round1(n) {
  return Math.round(n * 10) / 10
}

/** 규칙별 달성률 정렬 (가장 잘 지키는 / 자주 놓치는) */
export function rankRules(ruleCounts, rules, dayCount) {
  const byId = new Map(ruleCounts.map((r) => [r.ruleId, r]))
  const rows = rules.map((rule) => {
    const hit = byId.get(rule.id)?.count ?? 0
    return {
      id: rule.id,
      title: rule.title,
      count: hit,
      rate: dayCount > 0 ? Math.round((hit / dayCount) * 100) : 0,
    }
  })
  rows.sort((a, b) => b.rate - a.rate || a.title.localeCompare(b.title))
  return rows
}
