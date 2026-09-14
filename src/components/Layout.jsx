import { NavLink, Outlet } from 'react-router-dom'
import { Home, BarChart3, Users, CalendarDays, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useReminder } from '../hooks/useReminder'

const TABS = [
  { to: '/today', label: '홈', Icon: Home },
  { to: '/history', label: '기록', Icon: BarChart3 },
  { to: '/friends', label: '친구', Icon: Users },
  { to: '/weekly', label: '주간', Icon: CalendarDays },
  { to: '/settings', label: '설정', Icon: Settings },
]

export default function Layout() {
  const { user } = useAuth()

  // 설정한 시각에 남은 약속을 알려준다 (기본 꺼짐)
  useReminder(user?.id ?? null)

  return (
    <div className="min-h-dvh lg:flex">
      {/* PC: 사이드바 */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-7 lg:flex">
        <div className="px-3">
          <div className="text-lg font-extrabold tracking-tight text-ink">내일의 나</div>
          <p className="mt-1 text-xs text-muted">오늘의 열 가지</p>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl2 px-3.5 py-3 text-sm font-semibold transition ${
                  isActive ? 'bg-brandSoft text-brand' : 'text-muted hover:bg-surface2 hover:text-ink'
                }`
              }
            >
              <Icon size={19} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 본문 */}
      <main className="pb-nav mx-auto w-full max-w-2xl flex-1 px-4 pt-6 sm:px-6 lg:pt-10">
        <Outlet />
      </main>

      {/* 모바일: 하단 네비게이션 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="주요 메뉴"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                  isActive ? 'text-brand' : 'text-muted'
                }`
              }
            >
              <Icon size={21} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
