import { Quote } from 'lucide-react'

export default function QuoteCard({ text, question }) {
  return (
    <section className="card overflow-hidden">
      <div className="px-5 py-5">
        <div className="mb-2.5 flex items-center gap-2 text-brand">
          <Quote size={15} aria-hidden="true" />
          <h2 className="text-xs font-bold tracking-wider">오늘의 한마디</h2>
        </div>
        <p className="break-keep text-[15px] font-medium leading-relaxed text-ink">{text}</p>
      </div>

      {question && (
        <div className="border-t border-line bg-surface2/60 px-5 py-4">
          <h3 className="mb-1.5 text-xs font-bold tracking-wider text-muted">오늘의 질문</h3>
          <p className="break-keep text-sm leading-relaxed text-ink/85">{question}</p>
        </div>
      )}
    </section>
  )
}
