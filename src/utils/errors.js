/**
 * Supabase / 네트워크 오류를 사용자에게 보여줄 한국어 문장으로 바꾼다.
 * 개발자용 원문은 콘솔에만 남긴다.
 */

const MAP = [
  // 설정 문제 (가장 흔한 첫 실행 오류)
  ['Invalid API key', 'Supabase 키가 올바르지 않습니다. .env 의 VITE_SUPABASE_ANON_KEY 를 확인해주세요.'],
  ['No API key found', 'Supabase 키가 비어 있습니다. .env 를 확인하고 개발 서버를 다시 시작해주세요.'],
  ['JWSError', 'Supabase 키가 올바르지 않습니다. anon / public 키를 다시 복사해주세요.'],
  ['Signups not allowed', '이 프로젝트는 회원가입이 꺼져 있습니다. Supabase → Authentication 설정을 확인해주세요.'],
  [
    'Database error saving new user',
    '가입은 됐지만 프로필을 만들지 못했습니다. Supabase SQL Editor 에서 schema.sql 을 다시 실행해주세요.',
  ],
  ['relation "public.', '데이터베이스 테이블이 없습니다. Supabase SQL Editor 에서 schema.sql 을 실행해주세요.'],
  ['Could not find the function', 'RPC 함수가 없습니다. Supabase SQL Editor 에서 schema.sql 을 다시 실행해주세요.'],

  // 인증
  ['Invalid login credentials', '이메일 또는 비밀번호가 올바르지 않습니다.'],
  ['Email not confirmed', '이메일 인증이 아직 완료되지 않았습니다. 메일함을 확인해주세요.'],
  ['User already registered', '이미 가입된 이메일입니다. 로그인해주세요.'],
  ['already been registered', '이미 가입된 이메일입니다. 로그인해주세요.'],
  ['Password should be at least', '비밀번호는 6자 이상이어야 합니다.'],
  ['Unable to validate email address', '이메일 형식이 올바르지 않습니다.'],
  ['invalid format', '이메일 형식이 올바르지 않습니다.'],
  ['For security purposes', '잠시 후 다시 시도해주세요. (너무 자주 요청했습니다)'],
  ['Email rate limit', '요청이 많습니다. 잠시 후 다시 시도해주세요.'],
  ['JWT expired', '로그인이 만료되었습니다. 다시 로그인해주세요.'],
  ['session_not_found', '로그인이 만료되었습니다. 다시 로그인해주세요.'],

  // 친구
  ['INVALID_CODE', '존재하지 않는 친구 코드입니다. 코드를 다시 확인해주세요.'],
  ['CANNOT_ADD_SELF', '내 코드는 추가할 수 없어요. 친구에게 받은 코드를 입력해주세요.'],
  ['ALREADY_FRIENDS', '이미 친구입니다.'],
  ['REQUEST_ALREADY_SENT', '이미 요청을 보냈습니다. 상대의 수락을 기다려주세요.'],
  ['TOO_MANY_FRIENDS', '친구는 최대 20명까지 추가할 수 있습니다.'],
  ['friendships_pair_unique', '이미 요청을 보냈거나 친구인 상대입니다.'],
  ['friendships_no_self', '자기 자신은 친구로 추가할 수 없습니다.'],
  ['NOT_AUTHENTICATED', '로그인이 필요합니다.'],

  // 그룹 (옛 기능)
  ['GROUP_FULL', '이 그룹은 이미 4명이 모두 찼습니다.'],
  ['ALREADY_IN_GROUP', '이미 다른 그룹에 참여 중입니다.'],
  ['NOT_A_MEMBER', '이 그룹의 멤버가 아닙니다.'],

  // DB
  ['duplicate key value', '이미 기록되어 있습니다.'],
  ['encouragements_once_a_day', '오늘은 이미 응원을 보냈어요. 내일 다시 보낼 수 있습니다.'],
  ['violates row-level security', '권한이 없습니다. 다시 로그인해주세요.'],
  ['permission denied', '권한이 없습니다. Supabase 설정(schema.sql)을 확인해주세요.'],

  // 네트워크
  ['Failed to fetch', '인터넷 연결을 확인해주세요.'],
  ['NetworkError', '인터넷 연결을 확인해주세요.'],
  ['fetch failed', '서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'],
]

export function humanError(error, fallback = '문제가 발생했습니다. 잠시 후 다시 시도해주세요.') {
  if (!error) return fallback

  const raw =
    typeof error === 'string'
      ? error
      : error.message || error.error_description || error.details || ''

  if (import.meta.env.DEV) console.error('[내일의 나]', error)

  for (const [needle, message] of MAP) {
    if (raw.includes(needle)) return message
  }

  // 아직 정리되지 않은 오류는 개발 중에만 원문을 함께 보여준다.
  // (원인을 찾느라 콘솔을 뒤지지 않아도 되도록)
  if (raw) return `${fallback}\n(오류 원문: ${raw})`

  return fallback
}
