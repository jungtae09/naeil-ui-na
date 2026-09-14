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
      if (nowHHmm() !== reminderTime) return
      if (alreadySentToday(today)) return

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

    // 30초마다 확인 — 설정한 분을 놓치지 않을 정도로만
    const id = setInterval(tick, 30_000)
    tick()

    return () => clearInterval(id)
  }, [userId, reminderEnabled, reminderTime, today])
}
