import { useState } from 'react'
import { Flame, TrendingUp, TrendingDown, Minus, Check, MoreHorizontal } from 'lucide-react'
import { CHEERS } from '../services/friends'

export default function FriendCard({ member, busy, onCheer, onRemove }) {
  const [openCheer, setOpenCheer] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const isMe = member.isMe
  const pct = member.todayTotal > 0 ? Math.round((member.todayCount / member.todayTotal) * 100) : 0

  const GrowthIcon = member.growth > 0 ? TrendingUp : member.growth < 0 ? TrendingDown : Minus
  const growthTone = member.growth > 0 ? 'text-done' : 'text-muted'

  return (
    <div className={`card overflow-hidden transition ${isMe ? 'ring-2 ring-brand/25' : ''}`}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface2 text-xl">
            {member.avatar}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-bold text-ink">{member.nickname}</span>
              {isMe && (
                <span className="shrink-0 rounded-md bg-brandSoft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                  나
                </span>
              )}
              {member.todayComplete && (
                <span className="shrink-0 rounded-md bg-doneSoft px-1.5 py-0.5 text-[10px] font-bold text-done">
                  완주
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
              <span className="tabular-nums">
                오늘 <b className="text-ink">{member.todayCount}</b> / {member.todayTotal}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Flame size={12} className="text-brand" aria-hidden="true" />
                {member.currentStreak}일
              </span>
            </div>
          </div>

          {!isMe && (
            <button
              type="button"
              onClick={() => setConfirmRemove((v) => !v)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface2"
              aria-label="친구 관리"
            >
              <MoreHorizontal size={16} />
            </button>
          )}
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface2">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              member.todayComplete ? 'bg-done' : 'bg-brand'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-muted">
            <span className="tabular-nums">이번 주 {member.weekRate}%</span>
            <span className={`inline-flex items-center gap-0.5 tabular-nums ${growthTone}`}>
              <GrowthIcon size={12} aria-hidden="true" />
              {member.growth > 0 ? '+' : ''}
              {member.growth}%
            </span>
          </div>

          {!isMe &&
            (member.cheeredToday ? (
              <span className="inline-flex items-center gap-1 font-semibold text-done">
                <Check size={13} aria-hidden="true" /> 응원함
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setOpenCheer((v) => !v)}
                disabled={busy}
                className="rounded-lg px-2 py-1 font-semibold text-brand transition hover:bg-brandSoft disabled:opacity-50"
              >
                👏 응원하기
              </button>
            ))}
        </div>
      </div>

      {openCheer && !member.cheeredToday && !isMe && (
        <div className="flex flex-wrap gap-1.5 border-t border-line bg-surface2/60 px-4 py-3 animate-fadeIn">
          {CHEERS.map((c) => (
            <button
              key={c.type}
              type="button"
              disabled={busy}
              onClick={() => {
                setOpenCheer(false)
                onCheer(member, c.type)
              }}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand/50 active:scale-95 disabled:opacity-50"
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      )}

      {confirmRemove && !isMe && (
        <div className="border-t border-line bg-surface2/60 px-4 py-3 animate-fadeIn">
          <p className="break-keep text-xs leading-relaxed text-ink">
            {member.nickname}님과 친구를 끊을까요? 내 기록은 그대로 남습니다.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirmRemove(false)
                onRemove(member)
              }}
              className="flex-1 rounded-lg bg-surface px-3 py-2 text-xs font-bold text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              친구 끊기
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-muted transition hover:bg-surface"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
