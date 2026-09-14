import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * 기기별 설정.
 *
 * 이건 "내 기록" 이 아니라 "이 기기에서 앱이 어떻게 동작할지" 라서
 * 서버가 아니라 이 브라우저에만 저장한다.
 * (알림은 기기마다 다르게 두고 싶을 수 있고, 과거 수정 허용도 마찬가지)
 */

const KEY = 'nn-prefs'

const DEFAULTS = {
  reminderEnabled: false,
  reminderTime: '21:00', // 저녁 9시
  allowPastEdit: false,
}

const PrefsContext = createContext(null)

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      /* 시크릿 모드 등에서 저장이 안 돼도 이번 세션 동안은 동작한다 */
    }
  }, [prefs])

  const setPref = useCallback((key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }, [])

  const value = useMemo(() => ({ ...prefs, setPref }), [prefs, setPref])

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs 는 PrefsProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
