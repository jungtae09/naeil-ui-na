/**
 * 오늘의 도장판.
 * 10칸을 채워가는 시각적 기록.
 */
export default function StampGrid({ total = 10, done = 0 }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-muted">오늘의 도장</h2>
        <span className="text-sm font-bold tabular-nums text-ink">
          {done} <span className="text-muted">/ {total}</span>
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2.5">
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < done
          return (
            <div
              key={i}
              className={`grid aspect-square place-items-center rounded-xl border-2 text-lg font-black transition
                ${
                  filled
                    ? 'border-done/45 bg-doneSoft text-done animate-stampIn'
                    : 'border-dashed border-line bg-surface2/60 text-transparent'
                }`}
              style={filled ? { animationDelay: `${Math.min(i, 9) * 28}ms` } : undefined}
              aria-hidden="true"
            >
              ✓
            </div>
          )
        })}
      </div>
    </div>
  )
}
