import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * 친구 실시간 채널.
 *
 * 그룹이 없어졌으므로, 친구 한 명당 하나씩 "둘만의 채널" 을 연다.
 * 채널 이름은 두 사람의 id 를 정렬해서 만들기 때문에 양쪽이 같은 이름을 얻는다.
 *
 * 중요한 설계는 그대로다: 이 채널로는 **아무 내용도 보내지 않는다.**
 * "뭔가 바뀌었다" 는 신호만 던지고, 받은 쪽은 서버에서 자기가 볼 권한이 있는
 * 공개 통계만 다시 불러온다. 그래서 실시간 때문에 개인 기록이 새어 나갈 일이 없다.
 *
 * @param {string|null} myId
 * @param {string[]} friendIds
 * @param {() => void} onUpdate
 * @returns {() => void} 내가 뭔가 바꿨을 때 호출할 함수
 */
export function useFriendChannels(myId, friendIds, onUpdate) {
  const channelsRef = useRef([])
  const handlerRef = useRef(onUpdate)
  const timerRef = useRef(null)

  useEffect(() => {
    handlerRef.current = onUpdate
  }, [onUpdate])

  // 배열은 매번 새 참조라서, 내용이 같으면 다시 연결하지 않도록 문자열로 비교한다
  const key = friendIds.slice().sort().join(',')

  useEffect(() => {
    if (!myId || !key) {
      channelsRef.current = []
      return undefined
    }

    const ids = key.split(',').filter(Boolean)

    const channels = ids.map((friendId) => {
      const topic = `f-${[myId, friendId].sort().join('-')}`
      const channel = supabase.channel(topic, { config: { broadcast: { self: false } } })

      channel.on('broadcast', { event: 'update' }, () => {
        // 여러 친구가 연달아 체크하면 신호가 몰아치므로 잠깐 모았다가 한 번만 새로고침
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => handlerRef.current?.(), 400)
      })

      channel.subscribe()
      return channel
    })

    channelsRef.current = channels

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      channelsRef.current = []
      channels.forEach((c) => supabase.removeChannel(c))
    }
  }, [myId, key])

  return useCallback(() => {
    channelsRef.current.forEach((channel) => {
      // payload 는 비워둔다 — 신호만 보내면 충분하다
      channel.send({ type: 'broadcast', event: 'update', payload: {} }).catch(() => {
        /* 실시간이 안 되더라도 앱 동작에는 지장 없다 */
      })
    })
  }, [])
}
