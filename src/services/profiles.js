import { supabase } from '../lib/supabase'

/** 프로필 조회. 트리거가 실패했을 경우를 대비해 없으면 만들어 준다. */
export async function getOrCreateProfile(user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  if (data) return data

  const nickname = user.user_metadata?.nickname || ''
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id, nickname })
    .select()
    .single()

  if (insertError) throw insertError
  return created
}

export async function updateProfile(userId, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const AVATARS = ['🌱', '🌿', '🌳', '🔥', '⭐', '🌙', '☀️', '🐢', '🐤', '🦊', '🐳', '🍀']
