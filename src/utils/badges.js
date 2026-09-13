/**
 * 배지 — 압박이 아니라 "여기까지 왔구나" 를 보여주기 위한 것.
 */

export const BADGES = [
  { id: 'first',    emoji: '🌱', name: '첫걸음',    desc: '처음으로 하루를 완주',     test: (s) => s.completeDays >= 1 },
  { id: 'week',     emoji: '🌿', name: '일주일',    desc: '7일 연속 완주',            test: (s) => s.bestStreak >= 7 },
  { id: 'month',    emoji: '🌳', name: '한 달',     desc: '30일 연속 완주',           test: (s) => s.bestStreak >= 30 },
  { id: 'hundred',  emoji: '🏆', name: '100일',     desc: '100일 연속 완주',          test: (s) => s.bestStreak >= 100 },
  { id: 'perfect',  emoji: '💯', name: '오늘 완주', desc: '오늘 10개를 모두 완료',    test: (s) => s.todayComplete },
  { id: 'grow',     emoji: '📈', name: '성장',      desc: '지난주보다 달성률 상승',   test: (s) => s.growth > 0 },
  { id: 'cheer',    emoji: '🤝', name: '응원가',    desc: '친구에게 응원 10회',       test: (s) => s.cheersSent >= 10 },
  { id: 'fifty',    emoji: '⭐', name: '50일',      desc: '누적 50일 완주',           test: (s) => s.completeDays >= 50 },
]

/**
 * @param {object} stats { completeDays, bestStreak, todayComplete, growth, cheersSent }
 */
export function earnedBadges(stats) {
  const s = {
    completeDays: 0,
    bestStreak: 0,
    todayComplete: false,
    growth: 0,
    cheersSent: 0,
    ...stats,
  }
  return BADGES.map((b) => ({ ...b, earned: Boolean(b.test(s)) }))
}
