import { supabase } from '../lib/supabase'

export const DEFAULT_RULES = [
  '아침에 양치하고 물 마시기',
  '30분 이상 움직이기',
  '오늘 해야 할 공부하기',
  '다른 사람에게 먼저 도움 주기',
  '주변 정리하기',
  '햇빛 받기',
  '스트레칭하기',
  '5분 동안 하루 돌아보기',
  '불필요한 말 한 번 참기',
  '오늘 한 가지 좋은 행동 하기',
]

export const RULE_COUNT = 10

export async function listRules(userId) {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('position', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** 온보딩: 10개를 한 번에 생성 */
export async function createRules(userId, titles) {
  const rows = titles.map((title, i) => ({
    user_id: userId,
    title: title.trim(),
    position: i,
    is_active: true,
  }))

  const { data, error } = await supabase.from('rules').insert(rows).select()
  if (error) throw error
  return data
}

/**
 * 규칙 목록 저장.
 * 기존 규칙은 title/position 만 수정한다 (id 를 유지해야 과거 기록이 연결된 채로 남는다).
 * 삭제된 규칙은 is_active=false 로만 바꿔 과거 기록을 보존한다.
 */
export async function saveRules(userId, items) {
  const keepIds = items.filter((it) => it.id).map((it) => it.id)

  // 1) 기존 항목 업데이트
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it.id) continue
    const { error } = await supabase
      .from('rules')
      .update({ title: it.title.trim(), position: i, updated_at: new Date().toISOString() })
      .eq('id', it.id)
      .eq('user_id', userId)
    if (error) throw error
  }

  // 2) 목록에서 빠진 규칙은 비활성화 (기록은 그대로 보존)
  //    ※ 새 규칙을 넣기 "전에" 해야 방금 추가한 규칙까지 꺼지지 않는다.
  let query = supabase
    .from('rules')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (keepIds.length > 0) {
    query = query.not('id', 'in', `(${keepIds.join(',')})`)
  }
  const { error: deactivateError } = await query
  if (deactivateError) throw deactivateError

  // 3) 새로 추가된 항목
  const fresh = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => !it.id)
    .map(({ it, i }) => ({
      user_id: userId,
      title: it.title.trim(),
      position: i,
      is_active: true,
    }))

  if (fresh.length > 0) {
    const { error } = await supabase.from('rules').insert(fresh)
    if (error) throw error
  }

  return listRules(userId)
}
