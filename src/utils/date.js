/**
 * 날짜 유틸 — 모든 "하루"의 기준은 Asia/Seoul 이다.
 *
 * 브라우저 로컬 시간대를 그대로 쓰면 해외에서 접속했을 때,
 * 또는 자정 전후에 기록이 다른 날짜로 저장될 수 있다.
 * 그래서 DB 에 저장하는 date 는 항상 아래 함수로 만든 'YYYY-MM-DD' 문자열을 쓴다.
 */

export const APP_TZ = 'Asia/Seoul'

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Date 객체 → 서울 기준 'YYYY-MM-DD' */
export function toYmd(date = new Date()) {
  // en-CA 로케일은 YYYY-MM-DD 형식을 준다.
  return ymdFormatter.format(date)
}

/** 지금 서울 기준 오늘 날짜 문자열 */
export function todayYmd() {
  return toYmd(new Date())
}

/** 'YYYY-MM-DD' → 시간대 영향 없는 Date (정오로 고정해 DST/오프셋 오차 방지) */
export function parseYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

/** 날짜 문자열에 일 수 더하기 */
export function addDays(ymd, days) {
  const d = parseYmd(ymd)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

/** 두 날짜 사이의 일 수 (a - b) */
export function diffDays(a, b) {
  return Math.round((parseYmd(a) - parseYmd(b)) / 86400000)
}

/** 그 주의 월요일 (ISO 기준) */
export function weekStart(ymd) {
  const d = parseYmd(ymd)
  const iso = d.getDay() === 0 ? 7 : d.getDay() // 일=7
  return addDays(ymd, -(iso - 1))
}

export function weekEnd(ymd) {
  return addDays(weekStart(ymd), 6)
}

/** 월의 첫날 / 마지막날 */
export function monthStart(ymd) {
  return ymd.slice(0, 8) + '01'
}

export function monthEnd(ymd) {
  const d = parseYmd(ymd)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12)
  const mm = String(last.getMonth() + 1).padStart(2, '0')
  const dd = String(last.getDate()).padStart(2, '0')
  return `${last.getFullYear()}-${mm}-${dd}`
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** '2026년 9월 14일 (월)' */
export function formatKorean(ymd, { weekday = true } = {}) {
  const d = parseYmd(ymd)
  const base = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
  return weekday ? `${base} (${WEEKDAYS[d.getDay()]})` : base
}

/** '9월 14일' */
export function formatShort(ymd) {
  const d = parseYmd(ymd)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** 서울 기준 현재 시각의 시(0-23) — 인사말에 사용 */
export function seoulHour() {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TZ,
    hour: '2-digit',
    hour12: false,
  }).format(new Date())
  return Number(h)
}

export function greeting() {
  const h = seoulHour()
  if (h < 5) return '늦은 밤이네요'
  if (h < 11) return '좋은 아침'
  if (h < 17) return '좋은 오후'
  if (h < 22) return '좋은 저녁'
  return '오늘 하루 고생하셨어요'
}

/** 해당 연/월의 달력 그리드 (월요일 시작, 6주 고정 아님 — 필요한 만큼만) */
export function monthGrid(ymd) {
  const first = parseYmd(monthStart(ymd))
  const lastYmd = monthEnd(ymd)
  const last = parseYmd(lastYmd)

  const leading = (first.getDay() === 0 ? 7 : first.getDay()) - 1 // 월요일 시작
  const cells = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) {
    const mm = String(first.getMonth() + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    cells.push(`${first.getFullYear()}-${mm}-${dd}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** 이전/다음 달 (YYYY-MM-01) */
export function shiftMonth(ymd, delta) {
  const d = parseYmd(ymd)
  const n = new Date(d.getFullYear(), d.getMonth() + delta, 1, 12)
  const mm = String(n.getMonth() + 1).padStart(2, '0')
  return `${n.getFullYear()}-${mm}-01`
}
