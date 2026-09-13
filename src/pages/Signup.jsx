import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { humanError } from '../utils/errors'
import { Spinner } from '../components/Skeleton'

export default function Signup() {
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setNotice('')

    if (nickname.trim().length < 1) {
      setError('닉네임을 입력해주세요.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setBusy(true)
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nickname: nickname.trim() } },
    })

    if (authError) {
      setError(humanError(authError, '가입하지 못했습니다. 잠시 후 다시 시도해주세요.'))
      setBusy(false)
      return
    }

    // 이메일 확인이 켜져 있으면 세션이 바로 생기지 않는다.
    if (!data.session) {
      setNotice(
        '가입 확인 메일을 보냈습니다. 메일함에서 링크를 눌러 인증한 뒤 로그인해주세요.'
      )
      setBusy(false)
      return
    }

    navigate('/onboarding', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <Link
        to="/"
        className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" /> 돌아가기
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight text-ink">시작해볼까요</h1>
      <p className="mt-2 text-sm text-muted">계정을 만들고 첫 번째 약속을 정해봐요.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="nickname">
            닉네임
          </label>
          <input
            id="nickname"
            type="text"
            maxLength={12}
            required
            className="field"
            placeholder="친구들에게 보여질 이름"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className="field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="field"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="whitespace-pre-line rounded-xl2 bg-brandSoft px-4 py-3 text-sm font-medium text-brand"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl2 bg-doneSoft px-4 py-3 text-sm font-medium text-done"
          >
            {notice}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : null}
          {busy ? '가입 중…' : '회원가입'}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-muted">
        이미 계정이 있나요?{' '}
        <Link to="/login" className="font-bold text-brand hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}
