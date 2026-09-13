export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function RuleListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2.5" aria-label="불러오는 중">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] w-full" />
      ))}
    </div>
  )
}

export function CardSkeleton({ className = 'h-32' }) {
  return <Skeleton className={`w-full ${className}`} />
}

export function Spinner({ size = 18, className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}
