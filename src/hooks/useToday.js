import { useEffect, useState } from 'react'
import { todayYmd } from '../utils/date'

/**
 * 서울 기준 오늘 날짜.
 * 앱을 켜둔 채 자정을 넘기면 날짜가 자동으로 바뀐다.
 * (자정 직전/직후 체크가 엉뚱한 날짜로 저장되는 것을 막는다)
 */
export function useToday() {
  const [ymd, setYmd] = useState(todayYmd)

  useEffect(() => {
    const tick = () => {
      const next = todayYmd()
      setYmd((prev) => (prev === next ? prev : next))
    }
    const id = setInterval(tick, 30_000)
    const onFocus = () => tick()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  return ymd
}
