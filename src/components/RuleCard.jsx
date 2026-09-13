import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'

/**
 * 오늘의 규칙 카드.
 * 완료를 누르면 1초 이내의 짧은 피드백(도장 + 작은 반짝임)을 준다.
 */
export default function RuleCard({ index, rule, done, busy, onToggle }) {
  const [burst, setBurst] = useState(false)
  const prevDone = useRef(done)

  useEffect(() => {
    if (done && !prevDone.current) {
      setBurst(true)
      const t = setTimeout(() => setBurst(false), 700)
      prevDone.current = done
      return () => clearTimeout(t)
    }
    prevDone.current = done
  }, [done])

  const sparks = [
    { dx: '-16px', dy: '-18px' },
    { dx: '16px', dy: '-14px' },
    { dx: '-12px', dy: '14px' },
    { dx: '18px', dy: '10px' },
  ]

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={done}
      className={`relative w-full overflow-hidden rounded-xl2 border px-4 py-4 text-left transition
        active:scale-[0.99] disabled:opacity-60
        ${
          done
            ? 'border-done/35 bg-doneSoft'
            : 'border-line bg-surface shadow-card hover:border-brand/40'
        }`}
    >
      <div className="flex items-center gap-3.5">
        {/* 체크 원 */}
        <span
          className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition
            ${done ? 'border-done bg-done text-white' : 'border-line bg-surface2 text-transparent'}`}
        >
          <Check
            size={22}
            strokeWidth={3}
            className={done ? 'animate-popIn' : ''}
            aria-hidden="true"
          />
          {burst &&
            sparks.map((s, i) => (
              <span
                key={i}
                className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-done animate-sparkle"
                style={{ '--dx': s.dx, '--dy': s.dy }}
                aria-hidden="true"
              />
            ))}
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold tracking-wider text-muted tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </div>
          <div
            className={`break-keep text-[15px] font-semibold leading-snug transition
              ${done ? 'text-done' : 'text-ink'}`}
          >
            {rule.title}
          </div>
        </div>

        {/* 도장 */}
        {done && (
          <span
            className="shrink-0 rounded-lg border-2 border-done/45 px-2 py-1 text-[11px] font-black tracking-widest text-done animate-stampIn"
            aria-hidden="true"
          >
            완료
          </span>
        )}
      </div>
    </button>
  )
}
