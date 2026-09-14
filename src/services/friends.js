import { supabase } from '../lib/supabase'

export const MAX_FRIENDS = 20

/**
 * 친구 요청 보내기 (친구 코드로).
 * 상대가 이미 나에게 요청을 보내둔 상태였다면 바로 친구가 된다.
 * @returns {{ status: 'pending'|'accepted', nickname: string, userId: string }}
 */
export async function sendFriendRequest(code) {
  const { data, error } = await supabase.rpc('send_friend_request', {
    p_code: (code ?? '').trim().toUpperCase(),
  })
  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  return {
    status: row?.result_status ?? 'pending',
    userId: row?.other_id,
    nickname: row?.other_nickname ?? '친구',
  }
}

/** 받은 요청 + 보낸 요청 */
export async function listFriendRequests() {
  const { data, error } = await supabase.rpc('my_friend_requests')
  if (error) throw error

  return (data ?? []).map((r) => ({
    id: r.id,
    direction: r.direction, // 'incoming' | 'outgoing'
    userId: r.other_id,
    nickname: r.nickname || '이름 없음',
    avatar: r.avatar || '🌱',
    createdAt: r.created_at,
  }))
}

/** 받은 요청 수락 */
export async function acceptFriendRequest(requestId) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
}

/** 요청 거절 / 보낸 요청 취소 — 둘 다 줄을 지우면 된다 */
export async function deleteFriendRequest(requestId) {
  const { error } = await supabase.from('friendships').delete().eq('id', requestId)
  if (error) throw error
}

/** 친구 끊기 */
export async function removeFriend(myId, friendId) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${myId},addressee_id.eq.${friendId}),` +
        `and(requester_id.eq.${friendId},addressee_id.eq.${myId})`
    )
  if (error) throw error
}

/**
 * 나 + 내 친구들의 공개 통계.
 * 서버에서 공개 가능한 값만 계산해서 내려준다.
 * 규칙 내용 · 회고 · 날짜별 상세 기록은 절대 포함되지 않는다.
 */
export async function getFriendStats(todayYmd) {
  const { data, error } = await supabase.rpc('friend_stats', { p_today: todayYmd })
  if (error) throw error

  return (data ?? []).map((r) => ({
    userId: r.user_id,
    nickname: r.nickname || '이름 없음',
    avatar: r.avatar || '🌱',
    isMe: Boolean(r.is_me),
    todayCount: r.today_count ?? 0,
    todayTotal: r.today_total ?? 10,
    todayComplete: Boolean(r.today_complete),
    currentStreak: r.current_streak ?? 0,
    bestStreak: r.best_streak ?? 0,
    completeDays: r.complete_days ?? 0,
    totalCompletions: r.total_completions ?? 0,
    weekRate: Number(r.week_rate ?? 0),
    prevWeekRate: Number(r.prev_week_rate ?? 0),
    growth: Number(r.growth ?? 0),
    cheeredToday: Boolean(r.cheered_today),
  }))
}

/* ---------------- 응원 ---------------- */

export const CHEERS = [
  { type: 'good', emoji: '👏', label: '잘하고 있어!' },
  { type: 'fire', emoji: '🔥', label: '계속 가자!' },
  { type: 'power', emoji: '💪', label: '오늘도 파이팅!' },
  { type: 'steady', emoji: '🌱', label: '꾸준하다!' },
  { type: 'congrats', emoji: '🎉', label: '오늘 완주 축하!' },
]

export async function sendCheer({ senderId, receiverId, type, ymd }) {
  const { error } = await supabase.from('encouragements').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    message_type: type,
    date: ymd,
  })
  if (error) throw error
}

/** 오늘 내가 받은 응원 */
export async function myCheers(ymd) {
  const { data, error } = await supabase.rpc('my_encouragements', { p_today: ymd })
  if (error) throw error
  return (data ?? []).map((r) => ({
    nickname: r.sender_nickname,
    avatar: r.sender_avatar,
    type: r.message_type,
    createdAt: r.created_at,
  }))
}

/** 내가 보낸 응원 총 횟수 (배지용) */
export async function myCheerCount(userId) {
  const { count, error } = await supabase
    .from('encouragements')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', userId)

  if (error) throw error
  return count ?? 0
}

export function cheerLabel(type) {
  return CHEERS.find((c) => c.type === type) ?? CHEERS[0]
}
