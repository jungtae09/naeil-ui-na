import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Check, Users, UserPlus, RefreshCw, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useToday } from '../hooks/useToday'
import {
  createGroup,
  getGroupStats,
  getMyGroup,
  joinGroup,
  sendCheer,
} from '../services/groups'
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
  const { user } = useAuth()
  const toast = useToast()
  const today = useToday()

  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [board, setBoard] = useState('week')
  const [cheerBusy, setCheerBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      if (!user) return
      if (!silent) setLoading(true)
      try {
        const g = await getMyGroup(user.id)
        setGroup(g)
        setMembers(g ? await getGroupStats(g.id, today) : [])
      } catch (e) {
        toast.error(humanError(e, '그룹 정보를 불러오지 못했습니다.'))
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

  async function cheer(member, type) {
    setCheerBusy(true)
    // 낙관적 표시
    setMembers((list) =>
      list.map((m) => (m.userId === member.userId ? { ...m, cheeredToday: true } : m))
    )
    try {
      await sendCheer({
        senderId: user.id,
        receiverId: member.userId,
        groupId: group.id,
        type,
        ymd: today,
      })
      toast.success(`${member.nickname}님에게 응원을 보냈습니다 👏`)
    } catch (e) {
      setMembers((list) =>
        list.map((m) => (m.userId === member.userId ? { ...m, cheeredToday: false } : m))
      )
      toast.error(humanError(e, '응원을 보내지 못했습니다.'))
    } finally {
      setCheerBusy(false)
    }
  }

  const rankings = useMemo(() => {
    const cfg = BOARDS.find((b) => b.id === board) ?? BOARDS[0]
    const rows = [...members].sort((a, b) => cfg.get(b) - cfg.get(a))
    return { cfg, rows }
  }, [members, board])

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  if (!group) return <NoGroup userId={user.id} onDone={() => load()} />

  return (
    <div className="space-y-6 animate-fadeUp">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-ink">{group.name}</h1>
          <p className="mt-1 text-sm text-muted">
            현재 인원 <b className="text-ink">{members.length}</b> / 4
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

      <InviteCard code={group.invite_code} full={members.length >= 4} />

      {/* 그룹원 카드 */}
      <section className="space-y-2.5">
        {members.map((m) => (
          <FriendCard
            key={m.userId}
            member={m}
            isMe={m.userId === user.id}
            cheerBusy={cheerBusy}
            onCheer={cheer}
          />
        ))}
      </section>

      {/* 순위 — 기준을 여러 개 둬서 한 사람만 인정받지 않도록 */}
      {members.length >= 2 && (
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
                    {m.userId === user.id && <span className="ml-1.5 text-xs text-muted">(나)</span>}
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
            순위는 기준에 따라 달라집니다. 가장 많이 한 사람만 잘하고 있는 것이 아니라,
            꾸준한 사람과 나아지고 있는 사람도 함께 보여줍니다.
          </p>
        </section>
      )}

      {/* 프라이버시 안내 */}
      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
        <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="break-keep">
          그룹원에게는 닉네임, 오늘 완료 개수, 연속 기록, 주간 달성률만 공개됩니다. 각자의 규칙
          내용과 회고, 날짜별 상세 기록은 본인만 볼 수 있습니다.
        </span>
      </p>
    </div>
  )
}

/* ------------------------------------------------------------ */

function InviteCard({ code, full }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => toast.info(`초대 코드: ${code}`))
  }

  return (
    <section className="card flex items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wider text-muted">초대 코드</p>
        <p className="mt-0.5 text-xl font-black tracking-[0.22em] text-brand">{code}</p>
        {full && <p className="mt-1 text-xs text-muted">정원이 모두 찼습니다.</p>}
      </div>
      <button type="button" onClick={copy} className="btn-ghost shrink-0 px-4 py-2.5 text-sm">
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copied ? '복사됨' : '복사'}
      </button>
    </section>
  )
}

function NoGroup({ userId, onDone }) {
  const toast = useToast()
  const [mode, setMode] = useState(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function doCreate() {
    if (!name.trim()) return toast.error('그룹 이름을 입력해주세요.')
    setBusy(true)
    try {
      await createGroup(name)
      toast.success('그룹을 만들었습니다.')
      onDone()
    } catch (e) {
      toast.error(humanError(e, '그룹을 만들지 못했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  async function doJoin() {
    if (code.trim().length < 4) return toast.error('초대 코드를 입력해주세요.')
    setBusy(true)
    try {
      await joinGroup(code)
      toast.success('그룹에 참여했습니다.')
      onDone()
    } catch (e) {
      toast.error(humanError(e, '참여하지 못했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeUp">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">친구</h1>
        <p className="mt-1 text-sm text-muted">최대 4명이 함께할 수 있어요.</p>
      </header>

      {!mode && (
        <>
          <EmptyState
            emoji="🤝"
            title="아직 그룹이 없습니다"
            description="그룹을 만들어 친구를 초대하거나, 받은 초대 코드로 참여해보세요."
          />
          <div className="space-y-2.5">
            <button type="button" onClick={() => setMode('create')} className="btn-line w-full py-4">
              <Users size={18} aria-hidden="true" /> 새로운 그룹 만들기
            </button>
            <button type="button" onClick={() => setMode('join')} className="btn-line w-full py-4">
              <UserPlus size={18} aria-hidden="true" /> 초대 코드로 참여하기
            </button>
          </div>
        </>
      )}

      {mode === 'create' && (
        <section className="card px-5 py-5">
          <label className="label" htmlFor="gname">
            그룹 이름
          </label>
          <input
            id="gname"
            className="field"
            maxLength={20}
            value={name}
            placeholder="우리들의 약속"
            onChange={(e) => setName(e.target.value)}
          />
          <button type="button" onClick={doCreate} className="btn-primary mt-4 w-full" disabled={busy}>
            {busy ? <Spinner /> : null}
            그룹 만들기
          </button>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="mt-2 w-full py-2 text-sm font-semibold text-muted hover:text-ink"
          >
            뒤로
          </button>
        </section>
      )}

      {mode === 'join' && (
        <section className="card px-5 py-5">
          <label className="label" htmlFor="gcode">
            친구에게 받은 초대 코드
          </label>
          <input
            id="gcode"
            className="field text-center text-xl font-black uppercase tracking-[0.3em]"
            maxLength={6}
            value={code}
            placeholder="7K4P2A"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="button" onClick={doJoin} className="btn-primary mt-4 w-full" disabled={busy}>
            {busy ? <Spinner /> : null}
            참여하기
          </button>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="mt-2 w-full py-2 text-sm font-semibold text-muted hover:text-ink"
          >
            뒤로
          </button>
        </section>
      )}
    </div>
  )
}
