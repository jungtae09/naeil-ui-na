import { supabase } from '../lib/supabase'
import { weekStart, weekEnd } from '../utils/date'

/* ---------------- 오늘의 질문에 대한 한 줄 답 ---------------- */

export async function getNote(userId, ymd) {
  const { data, error } = await supabase
    .from('daily_notes')
    .select('date, question, answer')
    .eq('user_id', userId)
    .eq('date', ymd)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function saveNote(userId, ymd, question, answer) {
  const { data, error } = await supabase
    .from('daily_notes')
    .upsert(
      {
        user_id: userId,
        date: ymd,
        question,
        answer: answer.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

/* ---------------- 이번 주 목표 ---------------- */

/**
 * 주간 회고를 길게 쓰게 하지 않는다.
 * "이번 주에 뭘 해볼까" 한 줄이면 충분하다.
 * (예: 하루에 1km 걷기)
 */
export async function getWeeklyGoal(userId, ymd) {
  const start = weekStart(ymd)
  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('week_start, week_end, next_goal')
    .eq('user_id', userId)
    .eq('week_start', start)
    .maybeSingle()

  if (error) throw error
  return data?.next_goal ?? ''
}

export async function saveWeeklyGoal(userId, ymd, goal) {
  const start = weekStart(ymd)
  const end = weekEnd(ymd)

  const { error } = await supabase.from('weekly_reviews').upsert(
    {
      user_id: userId,
      week_start: start,
      week_end: end,
      next_goal: goal.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' }
  )

  if (error) throw error
  return goal.trim()
}
