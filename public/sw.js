/**
 * 최소한의 서비스 워커.
 *
 * 일부러 캐시를 하지 않는다 —
 * 캐시를 넣으면 새 버전을 배포해도 친구들 폰에 옛날 화면이 남아
 * "왜 안 바뀌지?" 하는 문제가 생기기 쉽다.
 *
 * 이 파일이 하는 일은 두 가지:
 *  1) 안드로이드에서 "앱 설치" 가 뜨게 하는 조건을 만족시킨다
 *  2) 알림(notification)을 띄울 수 있게 해준다 — iOS 는 홈화면 앱에서
 *     서비스 워커를 통해서만 알림을 보여줄 수 있다
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// fetch 핸들러가 있어야 설치 가능한 앱으로 인식된다. 그대로 통과시킨다.
self.addEventListener('fetch', () => {})

// 알림을 눌렀을 때 앱을 열거나, 이미 열려 있으면 그 창으로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/today')
    })
  )
})
