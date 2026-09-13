import { supabase } from '../lib/supabase'

/** 내가 속한 그룹 (없으면 null) */
export async function getMyGroup(userId) {
  const { data: membership, error } = await supabase
    .from('group_members')
    .select('group_id, joined_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!membership) return null

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, invite_code, created_by, created_at')
    .eq('id', membership.group_id)
    .maybeSingle()

  if (groupError) throw groupError
  return group
}

export async function createGroup(name) {
  const { data, error } = await supabase.rpc('create_group', { p_name: name })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return { id: row.group_id, name: row.group_name, invite_code: row.code }
}

export async function joinGroup(code) {
  const { data, error } = await supabase.rpc('join_group_by_code', {
    p_code: (code ?? '').trim().toUpperCase(),
  })
  if (error) throw error
  return data // group id
}

export async function leaveGroup(userId) {
  const { error } = await supabase.from('group_members').delete().eq('user_id', userId)
  if (error) throw error
}

export async function renameGroup(groupId, name) {
  const { error } = await supabase.from('groups').update({ name: name.trim() }).eq('id', groupId)
  if (error) throw error
}

/**
 * 그룹원 공개 통계.
 * 서버(RPC)에서 공개 가능한 값만 계산해서 내려준다.
 * 규칙 내용 · 회고 · 날짜별 상세 기록은 절대 포함되지 않는다.
 */
export async function getGroupStats(groupId, todayYmd) {
  const { data, error } = await supabase.rpc('group_member_stats', {
    p_group_id: groupId,
    p_today: todayYmd,
  })
  if (error) throw error

  return (data ?? []).map((r) => ({
    userId: r.user_id,
    nickname: r.nickname || '이름 없음',
    avatar: r.avatar || '🌱',
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

export const CHEERS = [
  { type: 'good', emoji: '👏', label: '잘하고 있어!' },
  { type: 'fire', emoji: '🔥', label: '계속 가자!' },
  { type: 'power', emoji: '💪', label: '오늘도 파이팅!' },
  { type: 'steady', emoji: '🌱', label: '꾸준하다!' },
  { type: 'congrats', emoji: '🎉', label: '오늘 완주 축하!' },
]

export async function sendCheer({ senderId, receiverId, groupId, type, ymd }) {
  const { error } = await supabase.from('encouragements').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    group_id: groupId,
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
