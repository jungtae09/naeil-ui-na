export default function EmptyState({ emoji = '🌱', title, description, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="text-4xl" aria-hidden="true">
        {emoji}
      </div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && <p className="max-w-xs text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
