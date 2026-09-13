import { supabase } from '../lib/supabase'

/** 특정 날짜의 완료 기록 */
export async function listRecords(userId, ymd) {
  const { data, error } = await supabase
    .from('daily_records')
    .select('id, rule_id, rule_title, date, completed, completed_at')
    .eq('user_id', userId)
    .eq('date', ymd)

  if (error) throw error
  return data ?? []
}

/** 규칙 하나를 완료로 표시 (중복 방지: upsert) */
export async function checkRule(userId, rule, ymd) {
  const { data, error } = await supabase
    .from('daily_records')
    .upsert(
      {
        user_id: userId,
        rule_id: rule.id,
        rule_title: rule.title,
        date: ymd,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,rule_id,date' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

/** 완료 취소 */
export async function uncheckRule(userId, ruleId, ymd) {
  const { error } = await supabase
    .from('daily_records')
    .delete()
    .eq('user_id', userId)
    .eq('rule_id', ruleId)
    .eq('date', ymd)

  if (error) throw error
}

/** 기간 내 하루 요약 (달력 / 통계용) */
export async function listDailyStats(userId, fromYmd, toYmd) {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('date, completed_count, total_rules, is_complete')
    .eq('user_id', userId)
    .gte('date', fromYmd)
    .lte('date', toYmd)
    .order('date', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** 전체 하루 요약 (연속 기록 / 누적 통계용) */
export async function listAllDailyStats(userId) {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('date, completed_count, total_rules, is_complete')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** 규칙별 달성 횟수 (최근 N일) */
export async function ruleCompletionCounts(userId, fromYmd, toYmd) {
  const { data, error } = await supabase
    .from('daily_records')
    .select('rule_id, rule_title, date')
    .eq('user_id', userId)
    .gte('date', fromYmd)
    .lte('date', toYmd)
    .eq('completed', true)

  if (error) throw error

  const counts = new Map()
  for (const row of data ?? []) {
    const prev = counts.get(row.rule_id) ?? { ruleId: row.rule_id, title: row.rule_title, count: 0 }
    prev.count += 1
    prev.title = row.rule_title || prev.title
    counts.set(row.rule_id, prev)
  }
  return [...counts.values()]
}
