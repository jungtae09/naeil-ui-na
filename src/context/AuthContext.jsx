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

    // 1) 저장된 세션 복구 (새로고침해도 로그인 유지)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted.current) return
        setSession(data.session ?? null)
        if (!data.session) setLoading(false)
      })
      .catch(() => mounted.current && setLoading(false))

    // 2) 이후 변화 구독
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted.current) return
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
