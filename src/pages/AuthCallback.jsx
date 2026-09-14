import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/Skeleton'

/**
 * 메일의 인증 링크를 누르면 돌아오는 자리.
 *
 * Supabase 가 메일 주소를 확인한 뒤 이 주소로 되돌려 보내면서
 * 주소 끝에 로그인 정보를 붙여준다. supabase-js 가 그걸 읽어 세션을 만들고,
 * 여기서는 세션이 생기는 걸 기다렸다가 오늘 화면으로 보낸다.
 */
export default function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [slow, setSlow] = useState(false)

  // 링크에 오류가 담겨 온 경우 (만료된 링크 등)
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(window.location.search)
    const raw =
      hash.get('error_description') ||
      query.get('error_description') ||
      hash.get('error') ||
      query.get('error')

    if (raw) {
      const text = decodeURIComponent(raw.replace(/\+/g, ' '))
      setError(
        /expired|invalid/i.test(text)
          ? '인증 링크가 만료되었거나 이미 사용되었습니다.'
          : text
      )
    }

    // 너무 오래 걸리면 다른 길을 안내한다
    const t = setTimeout(() => setSlow(true), 4000)
    return () => clearTimeout(t)
  }, [])

  // 세션이 잡히면 앱으로 들여보낸다
  useEffect(() => {
    if (!error && !loading && user) {
      navigate('/today', { replace: true })
    }
  }, [error, loading, user, navigate])

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6">
      <div className="w-full max-w-sm text-center">
        {error ? (
          <>
            <div className="text-4xl" aria-hidden="true">
              ⏳
            </div>
            <h1 className="mt-5 text-xl font-extrabold tracking-tight text-ink">{error}</h1>
            <p className="mt-3 break-keep text-sm leading-relaxed text-muted">
              메일 인증은 이미 끝났을 수도 있어요. 가입할 때 쓴 이메일과 비밀번호로 바로
              로그인해보세요.
            </p>
            <Link to="/login" className="btn-primary mt-7 w-full">
              로그인하러 가기
            </Link>
          </>
        ) : (
          <>
            <Spinner size={26} className="text-brand" />
            <p className="mt-4 text-sm text-muted">인증을 확인하는 중…</p>

            {slow && (
              <div className="mt-8 animate-fadeUp">
                <p className="break-keep text-sm leading-relaxed text-muted">
                  생각보다 오래 걸리네요. 인증 자체는 끝났을 가능성이 큽니다. 아래에서 바로
                  로그인해보세요.
                </p>
                <Link to="/login" className="btn-line mt-5 w-full">
                  로그인하러 가기
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
