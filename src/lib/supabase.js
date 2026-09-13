import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/**
 * .env 값이 "있기만" 한 게 아니라 "쓸 수 있는 값"인지까지 확인한다.
 * 예시값을 그대로 두고 실행하면 로그인 시점에야 알 수 없는 오류가 나서
 * 원인을 찾기 어렵기 때문에, 앱을 켤 때 바로 알려준다.
 */
function diagnose() {
  if (!url) return { ok: false, field: 'VITE_SUPABASE_URL', reason: '값이 비어 있습니다.' }
  if (url.includes('your-project-ref') || url.includes('xxxxx'))
    return { ok: false, field: 'VITE_SUPABASE_URL', reason: '예시값이 그대로 들어 있습니다.' }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url))
    return {
      ok: false,
      field: 'VITE_SUPABASE_URL',
      reason: '주소 형식이 다릅니다. https://프로젝트ID.supabase.co 형태여야 합니다.',
    }

  if (!anonKey) return { ok: false, field: 'VITE_SUPABASE_ANON_KEY', reason: '값이 비어 있습니다.' }
  if (anonKey.startsWith('your-') || anonKey === 'missing-key')
    return {
      ok: false,
      field: 'VITE_SUPABASE_ANON_KEY',
      reason: '예시값이 그대로 들어 있습니다. Supabase 대시보드에서 실제 키를 복사해 넣어주세요.',
    }
  // 예전 방식은 JWT(eyJ...), 새 방식은 sb_publishable_... 로 시작한다
  if (!anonKey.startsWith('eyJ') && !anonKey.startsWith('sb_publishable_'))
    return {
      ok: false,
      field: 'VITE_SUPABASE_ANON_KEY',
      reason: '키 형태가 아닙니다. eyJ... 또는 sb_publishable_... 로 시작하는 값이어야 합니다.',
    }
  if (anonKey.startsWith('sb_secret_') || anonKey.includes('service_role'))
    return {
      ok: false,
      field: 'VITE_SUPABASE_ANON_KEY',
      reason: 'service_role(비밀) 키는 넣으면 안 됩니다. anon / public 키를 사용하세요.',
    }

  return { ok: true }
}

export const configIssue = diagnose()
export const isConfigured = configIssue.ok

if (!isConfigured) {
  console.warn(
    `[내일의 나] .env 설정 문제 — ${configIssue.field}: ${configIssue.reason}\n` +
      'supabase/SETUP.md 를 참고하세요. 값을 고친 뒤에는 개발 서버를 다시 시작해야 합니다.'
  )
}

export const supabase = createClient(
  isConfigured ? url : 'https://placeholder.supabase.co',
  isConfigured ? anonKey : 'placeholder',
  {
    auth: {
      persistSession: true, // 새로고침해도 로그인 유지
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'nn-auth',
    },
  }
)
