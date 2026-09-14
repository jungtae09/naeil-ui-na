import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { humanError } from '../utils/errors'
import { Spinner } from '../components/Skeleton'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // 앱을 쓰던 중에 로그인이 풀려서 넘어온 경우 — 왜 넘어왔는지 알려준다
  const from = location.state?.from
  const kickedOut = Boolean(from && from !== '/' && from !== '/login')

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(humanError(authError, '로그인하지 못했습니다. 잠시 후 다시 시도해주세요.'))
      setBusy(false)
      return
    }
    navigate('/today', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <Link
        to="/"
        className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" /> 돌아가기
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight text-ink">다시 오셨네요</h1>
      <p className="mt-2 text-sm text-muted">오늘의 약속이 기다리고 있어요.</p>

      {kickedOut && (
        <p className="mt-5 break-keep rounded-xl2 bg-surface2 px-4 py-3 text-sm leading-relaxed text-muted">
          로그인이 만료되어 다시 로그인이 필요합니다. 기록은 그대로 남아 있어요.
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
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
            autoComplete="current-password"
            required
            className="field"
            placeholder="••••••••"
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

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : null}
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-muted">
        아직 계정이 없나요?{' '}
        <Link to="/signup" className="font-bold text-brand hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  )
}
