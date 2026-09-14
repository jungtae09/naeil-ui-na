import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { usePrefs } from '../context/PrefsContext'
import { useToday } from './useToday'
import { notificationPermission, showNotification } from '../services/notifications'
import { seoulHour, APP_TZ } from '../utils/date'

const SENT_KEY = 'nn-reminder-sent' // 하루에 한 번만 알리기 위한 표시

function nowHHmm() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

/** 'HH:MM' 두 개의 분 차이 */
function minutesBetween(from, to) {
  const [fh, fm] = from.split(':').map(Number)
  const [th, tm] = to.split(':').map(Number)
  return th * 60 + tm - (fh * 60 + fm)
}

function alreadySentToday(ymd) {
  try {
    return localStorage.getItem(SENT_KEY) === ymd
  } catch {
    return false
  }
}

function markSent(ymd) {
  try {
    localStorage.setItem(SENT_KEY, ymd)
  } catch {
    /* 저장 못 해도 알림 자체는 떴으므로 넘어간다 */
  }
}

/**
 * 저녁 알림.
 * 설정한 시각이 되면 오늘 남은 개수를 알려준다. 이미 다 했으면 알리지 않는다.
 * 앱이 열려 있는 동안에만 동작한다 (services/notifications.js 설명 참고).
 */
export function useReminder(userId) {
  const { reminderEnabled, reminderTime } = usePrefs()
  const today = useToday()
  const busy = useRef(false)

  useEffect(() => {
    if (!userId || !reminderEnabled) return undefined
    if (notificationPermission() !== 'granted') return undefined

    async function tick() {
      if (busy.current) return
      if (alreadySentToday(today)) return

      // 정확히 그 '분' 에만 맞추면, 폰이 잠들었거나 앱이 뒤에 있어서
      // 그 순간을 놓치면 알림이 영영 안 왔다.
      // 그래서 "정한 시각이 지났는가" 로 판단한다.
      const now = nowHHmm()
      if (now < reminderTime) return

      // 너무 늦게 앱을 열었다면(3시간 넘게 지남) 굳이 알리지 않고 오늘 건 넘긴다
      if (minutesBetween(reminderTime, now) > 180) {
        markSent(today)
        return
      }

      busy.current = true
      try {
        const { data, error } = await supabase
          .from('daily_stats')
          .select('completed_count, total_rules, is_complete')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle()

        if (error) return

        const done = data?.completed_count ?? 0
        const total = data?.total_rules ?? 10
        const left = Math.max(total - done, 0)

        // 다 했으면 굳이 방해하지 않는다
        if (left === 0 && data?.is_complete) {
          markSent(today)
          return
        }

        const hour = seoulHour()
        const greetingWord = hour >= 21 ? '오늘 하루 마무리 전에' : '오늘'

        await showNotification(
          '내일의 나',
          left === total
            ? `${greetingWord} 아직 시작 전이에요. 하나만 해볼까요?`
            : `${greetingWord} 아직 ${left}개의 약속이 남아 있어요.`
        )
        markSent(today)
      } finally {
        busy.current = false
      }
    }

    // 1분마다 확인하되, 앱을 다시 열었을 때도 즉시 한 번 확인한다.
    // (백그라운드에서는 타이머가 느려지거나 멈추기 때문)
    const id = setInterval(tick, 60_000)

    function onResume() {
      if (document.visibilityState === 'visible') tick()
    }

    tick()
    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('focus', onResume)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('focus', onResume)
    }
  }, [userId, reminderEnabled, reminderTime, today])
}
