import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Check, UserPlus, RefreshCw, Lock, X, Inbox, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useToday } from '../hooks/useToday'
import { useFriendChannels } from '../hooks/useFriendChannels'
import {
  MAX_FRIENDS,
  acceptFriendRequest,
  deleteFriendRequest,
  getFriendStats,
  listFriendRequests,
  removeFriend,
  sendCheer,
  sendFriendRequest,
} from '../services/friends'
import { humanError } from '../utils/errors'

import FriendCard from '../components/FriendCard'
import EmptyState from '../components/EmptyState'
import { Skeleton, Spinner } from '../components/Skeleton'

const BOARDS = [
  { id: 'week', label: '이번 주 달성률', get: (m) => m.weekRate, unit: '%' },
  { id: 'streak', label: '최장 연속 기록', get: (m) => m.bestStreak, unit: '일' },
  { id: 'growth', label: '이번 주 성장률', get: (m) => m.growth, unit: '%', signed: true },
]

export default function Friends() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const today = useToday()

  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState([]) // 나 + 친구들
  const [requests, setRequests] = useState([])
  const [board, setBoard] = useState('week')
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      if (!user) return
      if (!silent) setLoading(true)
      try {
        const [stats, reqs] = await Promise.all([getFriendStats(today), listFriendRequests()])
        setPeople(stats)
        setRequests(reqs)
      } catch (e) {
        toast.error(humanError(e, '친구 정보를 불러오지 못했습니다.'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [user, today, toast]
  )

  useEffect(() => {
    load()
  }, [load])

  const friends = useMemo(() => people.filter((p) => !p.isMe), [people])
  const friendIds = useMemo(() => friends.map((f) => f.userId), [friends])

  const onRealtimeUpdate = useCallback(() => load(true), [load])
  const pingFriends = useFriendChannels(user?.id ?? null, friendIds, onRealtimeUpdate)

  async function cheer(member, type) {
    setBusy(true)
    setPeople((list) =>
      list.map((m) => (m.userId === member.userId ? { ...m, cheeredToday: true } : m))
    )
    try {
      await sendCheer({ senderId: user.id, receiverId: member.userId, type, ymd: today })
      toast.success(`${member.nickname}님에게 응원을 보냈습니다 👏`)
      pingFriends()
    } catch (e) {
      setPeople((list) =>
        list.map((m) => (m.userId === member.userId ? { ...m, cheeredToday: false } : m))
      )
      toast.error(humanError(e, '응원을 보내지 못했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  async function unfriend(member) {
    setBusy(true)
    try {
      await removeFriend(user.id, member.userId)
      toast.success(`${member.nickname}님과 친구를 끊었습니다.`)
      await load(true)
      pingFriends()
    } catch (e) {
      toast.error(humanError(e, '친구를 끊지 못했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  const rankings = useMemo(() => {
    const cfg = BOARDS.find((b) => b.id === board) ?? BOARDS[0]
    return { cfg, rows: [...people].sort((a, b) => cfg.get(b) - cfg.get(a)) }
  }, [people, board])

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  const incoming = requests.filter((r) => r.direction === 'incoming')
  const outgoing = requests.filter((r) => r.direction === 'outgoing')

  return (
    <div className="space-y-6 animate-fadeUp">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">친구</h1>
          <p className="mt-1 text-sm text-muted">
            친구 <b className="text-ink">{friends.length}</b>명
            {friends.length >= MAX_FRIENDS && ' · 가득 찼어요'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRefreshing(true)
            load(true)
          }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface2"
          aria-label="새로고침"
        >
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </header>

      <MyCode code={profile?.friend_code} />

      <AddFriend
        disabled={friends.length >= MAX_FRIENDS}
        onDone={async (result) => {
          await load(true)
          if (result.status === 'accepted') pingFriends()
        }}
      />

      {/* 받은 요청 */}
      {incoming.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold tracking-wider text-brand">
            <Inbox size={13} aria-hidden="true" /> 받은 요청 {incoming.length}
          </h2>
          <div className="card divide-y divide-line">
            {incoming.map((r) => (
              <RequestRow
                key={r.id}
                request={r}
                busy={busy}
                onAccept={async () => {
                  setBusy(true)
                  try {
                    await acceptFriendRequest(r.id)
                    toast.success(`${r.nickname}님과 친구가 되었습니다.`)
                    await load(true)
                    pingFriends()
                  } catch (e) {
                    toast.error(humanError(e, '수락하지 못했습니다.'))
                  } finally {
                    setBusy(false)
                  }
                }}
                onReject={async () => {
                  setBusy(true)
                  try {
                    await deleteFriendRequest(r.id)
                    await load(true)
                  } catch (e) {
                    toast.error(humanError(e, '처리하지 못했습니다.'))
                  } finally {
                    setBusy(false)
                  }
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* 보낸 요청 */}
      {outgoing.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold tracking-wider text-muted">
            <Send size={13} aria-hidden="true" /> 보낸 요청 {outgoing.length}
          </h2>
          <div className="card divide-y divide-line">
            {outgoing.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface2 text-base">
                  {r.avatar}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {r.nickname}
                </span>
                <span className="shrink-0 text-xs text-muted">수락 대기 중</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await deleteFriendRequest(r.id)
                      await load(true)
                    } catch (e) {
                      toast.error(humanError(e, '취소하지 못했습니다.'))
                    } finally {
                      setBusy(false)
                    }
                  }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface2 disabled:opacity-50"
                  aria-label="요청 취소"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 친구 목록 */}
      {friends.length === 0 ? (
        <EmptyState
          emoji="🤝"
          title="아직 친구가 없습니다"
          description="위의 내 코드를 친구에게 알려주거나, 친구에게 받은 코드를 입력해보세요."
        />
      ) : (
        <section className="space-y-2.5">
          {people.map((m) => (
            <FriendCard
              key={m.userId}
              member={m}
              busy={busy}
              onCheer={cheer}
              onRemove={unfriend}
            />
          ))}
        </section>
      )}

      {/* 순위 */}
      {people.length >= 2 && (
        <section className="card px-5 py-5">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {BOARDS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBoard(b.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  board === b.id ? 'bg-brand text-white' : 'bg-surface2 text-muted hover:text-ink'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <ol className="space-y-2">
            {rankings.rows.map((m, i) => {
              const v = rankings.cfg.get(m)
              return (
                <li key={m.userId} className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black tabular-nums ${
                      i === 0 ? 'bg-brand text-white' : 'bg-surface2 text-muted'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {m.nickname}
                    {m.isMe && <span className="ml-1.5 text-xs text-muted">(나)</span>}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                    {rankings.cfg.signed && v > 0 ? '+' : ''}
                    {v}
                    {rankings.cfg.unit}
                  </span>
                </li>
              )
            })}
          </ol>

          <p className="mt-5 break-keep border-t border-line pt-4 text-xs leading-relaxed text-muted">
            순위는 기준에 따라 달라집니다. 가장 많이 한 사람만 잘하고 있는 것이 아니라, 꾸준한
            사람과 나아지고 있는 사람도 함께 보여줍니다.
          </p>
        </section>
      )}

      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
        <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="break-keep">
          친구에게는 닉네임, 오늘 완료 개수, 연속 기록, 주간 달성률만 공개됩니다. 각자의 규칙 내용과
          회고, 날짜별 상세 기록은 본인만 볼 수 있습니다.
        </span>
      </p>
    </div>
  )
}

/* ------------------------------------------------------------ */

function MyCode({ code }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!code) return
    navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => toast.info(`내 친구 코드: ${code}`))
  }

  return (
    <section className="card flex items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wider text-muted">내 친구 코드</p>
        <p className="mt-0.5 text-xl font-black tracking-[0.22em] text-brand">{code ?? '······'}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        disabled={!code}
        className="btn-ghost shrink-0 px-4 py-2.5 text-sm"
      >
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copied ? '복사됨' : '복사'}
      </button>
    </section>
  )
}

function AddFriend({ onDone, disabled }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    if (code.trim().length < 4) return toast.error('친구 코드를 입력해주세요.')
    if (disabled) return toast.error(`친구는 최대 ${MAX_FRIENDS}명까지 추가할 수 있습니다.`)

    setBusy(true)
    try {
      const result = await sendFriendRequest(code)
      setCode('')
      if (result.status === 'accepted') {
        toast.success(`${result.nickname}님과 친구가 되었습니다.`)
      } else {
        toast.success(`${result.nickname}님에게 친구 요청을 보냈습니다.`)
      }
      await onDone(result)
    } catch (e) {
      toast.error(humanError(e, '친구를 추가하지 못했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card px-5 py-5">
      <label className="label" htmlFor="friendcode">
        친구 코드로 추가하기
      </label>
      <div className="flex gap-2">
        <input
          id="friendcode"
          className="field text-center text-lg font-black uppercase tracking-[0.25em]"
          maxLength={6}
          value={code}
          placeholder="7K4P2A"
          autoComplete="off"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button type="submit" className="btn-primary shrink-0 px-5" disabled={busy}>
          {busy ? <Spinner /> : <UserPlus size={17} aria-hidden="true" />}
          <span className="sr-only">추가</span>
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        상대가 수락하면 친구가 됩니다. 서로 요청을 보냈다면 바로 친구가 돼요.
      </p>
    </form>
  )
}

function RequestRow({ request, busy, onAccept, onReject }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface2 text-base">
        {request.avatar}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
        {request.nickname}
      </span>
      <button
        type="button"
        onClick={onAccept}
        disabled={busy}
        className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
      >
        수락
      </button>
      <button
        type="button"
        onClick={onReject}
        disabled={busy}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface2 disabled:opacity-50"
        aria-label="거절"
      >
        <X size={15} />
      </button>
    </div>
  )
}
