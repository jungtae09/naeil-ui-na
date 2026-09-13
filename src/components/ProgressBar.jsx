export default function ProgressBar({ value, total, showLabel = true, tone = 'auto' }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  const complete = total > 0 && value >= total
  const color = tone === 'brand' ? 'bg-brand' : complete ? 'bg-done' : 'bg-brand'

  return (
    <div>
      {showLabel && (
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-muted">오늘</span>
          <span className="text-sm font-bold tabular-nums text-ink">
            <span className={complete ? 'text-done' : 'text-brand'}>{value}</span>
            <span className="text-muted"> / {total}</span>
            <span className="ml-2 text-muted">{pct}%</span>
          </span>
        </div>
      )}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface2"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`오늘 ${total}개 중 ${value}개 완료`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
