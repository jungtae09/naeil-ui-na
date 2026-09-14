/**
 * 알림.
 *
 * 솔직한 한계:
 * 서버에서 푸시를 보내는 구조가 아니라, **앱이 열려 있는 동안에만** 알림이 뜬다.
 * (폰 배경에 떠 있으면 대부분 동작하지만, 완전히 종료하면 오지 않는다)
 * 진짜 푸시 알림은 서버 + Web Push 설정이 필요해서 다음 단계로 미뤄뒀다.
 *
 * 그래서 기본값은 '꺼짐' 이고, 켜도 하루 한 번만 조용히 알린다.
 */

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/**
 * 알림을 띄운다.
 * iOS 홈화면 앱은 서비스 워커를 통해서만 알림을 보여줄 수 있어서
 * 서비스 워커가 있으면 그쪽을 먼저 쓴다.
 */
export async function showNotification(title, body) {
  if (notificationPermission() !== 'granted') return false

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'nn-daily-reminder', // 같은 태그는 덮어써져서 알림이 쌓이지 않는다
    lang: 'ko',
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, options)
        return true
      }
    }
    new Notification(title, options)
    return true
  } catch (e) {
    console.warn('알림을 띄우지 못했습니다.', e)
    return false
  }
}

/** 홈화면에 추가해서 앱처럼 실행 중인지 */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/** 아이폰/아이패드인지 (알림 안내 문구를 다르게 보여주기 위해) */
export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}
