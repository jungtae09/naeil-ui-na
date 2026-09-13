import { ChevronLeft, ChevronRight } from 'lucide-react'
import { monthGrid, parseYmd, shiftMonth } from '../utils/date'

const HEAD = ['월', '화', '수', '목', '금', '토', '일']

/**
 * 월간 기록 달력.
 * 완주 / 일부 달성 / 미기록을 색으로 구분한다.
 */
export default function Calendar({ month, statsByDate, today, onChangeMonth, onSelect, selected }) {
  const cells = monthGrid(month)
  const d = parseYmd(month)

  return (
    <section className="card px-4 py-5">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChangeMonth(shiftMonth(month, -1))}
          className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-surface2"
          aria-label="이전 달"
        >
          <ChevronLeft size={19} />
        </button>
        <h2 className="text-base font-bold text-ink tabular-nums">
          {d.getFullYear()}년 {d.getMonth() + 1}월
        </h2>
        <button
          type="button"
          onClick={() => onChangeMonth(shiftMonth(month, 1))}
          disabled={month >= today.slice(0, 8) + '01'}
          className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-surface2 disabled:opacity-30"
          aria-label="다음 달"
        >
          <ChevronRight size={19} />
        </button>
      </header>

      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {HEAD.map((h) => (
          <div key={h} className="text-center text-[11px] font-bold text-muted">
            {h}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((ymd, i) => {
          if (!ymd) return <div key={`e${i}`} />

          const stat = statsByDate.get(ymd)
          const count = stat?.completed_count ?? 0
          const total = stat?.total_rules ?? 10
          const complete = stat?.is_complete ?? false
          const isFuture = ymd > today
          const isToday = ymd === today
          const isSelected = ymd === selected

          let tone = 'bg-surface2/60 text-muted/60'
          if (complete) tone = 'bg-done text-white'
          else if (count > 0) tone = 'bg-brandSoft text-brand'

          return (
            <button
              key={ymd}
              type="button"
              disabled={isFuture}
              onClick={() => onSelect(ymd)}
              className={`relative grid aspect-square place-items-center rounded-xl text-xs font-bold tabular-nums transition
                ${tone}
                ${isFuture ? 'opacity-25' : 'hover:brightness-95 active:scale-95'}
                ${isToday ? 'ring-2 ring-brand ring-offset-1 ring-offset-surface' : ''}
                ${isSelected && !isToday ? 'ring-2 ring-ink/25' : ''}`}
              aria-label={`${ymd} ${complete ? '완주' : count > 0 ? `${count}/${total} 달성` : '기록 없음'}`}
            >
              {parseYmd(ymd).getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-done" aria-hidden="true" /> 완주
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-brandSoft" aria-hidden="true" /> 일부 달성
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-surface2" aria-hidden="true" /> 미기록
        </span>
      </div>
    </section>
  )
}
