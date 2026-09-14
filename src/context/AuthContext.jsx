import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getOrCreateProfile } from '../services/profiles'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    // 1) 저장된 세션 복구.
    //    이건 네트워크를 쓰지 않고 브라우저 저장소만 읽으므로,
    //    비행기 모드나 지하철에서 앱을 열어도 로그인이 풀리지 않는다.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted.current) return
        setSession(data.session ?? null)
        if (!data.session) setLoading(false)
      })
      .catch(() => mounted.current && setLoading(false))

    // 2) 이후 변화 구독
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted.current) return

      // 토큰 갱신은 로그인 상태 변화가 아니다. 화면을 다시 그리게 하지 않는다.
      if (event === 'TOKEN_REFRESHED' && next) {
        setSession(next)
        return
      }

      setSession(next ?? null)
      if (!next) {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted.current = false
      sub.subscription.unsubscribe()
    }
  }, [])

  /**
   * 앱이 화면에 보일 때만 토큰을 자동 갱신한다.
   *
   * 폰에서 앱을 background 로 내려둔 동안에도 갱신을 시도하면,
   * 네트워크가 끊긴 상태에서 실패가 쌓여 로그인이 풀리는 일이 생긴다.
   * 그래서 보일 때 켜고, 안 보이면 끄고, 다시 돌아왔을 때 한 번 확인한다.
   */
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        supabase.auth.startAutoRefresh()
        // 오래 꺼져 있었다면 여기서 토큰을 새로 받아온다
        supabase.auth.getSession().catch(() => {})
      } else {
        supabase.auth.stopAutoRefresh()
      }
    }

    onVisible()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  // 세션이 생기면 프로필을 불러온다
  useEffect(() => {
    let cancelled = false
    if (!session?.user) return

    setLoading(true)
    getOrCreateProfile(session.user)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch((e) => {
        // 프로필을 못 읽었다고 로그아웃시키지는 않는다 (잠깐 네트워크가 끊긴 경우 등)
        console.error('프로필을 불러오지 못했습니다.', e)
        if (!cancelled) setProfile(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      setProfile,
      loading,
      signOut: () => supabase.auth.signOut(),
    }),
    [session, profile, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
