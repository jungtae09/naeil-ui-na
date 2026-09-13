import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { isConfigured } from './lib/supabase'

import Layout from './components/Layout'
import { Spinner } from './components/Skeleton'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Today from './pages/Today'
import History from './pages/History'
import Friends from './pages/Friends'
import Weekly from './pages/Weekly'
import Settings from './pages/Settings'
import RulesEdit from './pages/RulesEdit'
import NotConfigured from './pages/NotConfigured'

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg text-muted">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={26} />
        <p className="text-sm">불러오는 중…</p>
      </div>
    </div>
  )
}

/** 로그인하지 않았으면 로그인 화면으로 */
function Protected({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  // 프로필/규칙 설정을 마치지 않았으면 온보딩으로
  if (profile && !profile.onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

/** 이미 로그인했으면 오늘 화면으로 */
function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (user) return <Navigate to="/today" replace />
  return children
}

export default function App() {
  if (!isConfigured) return <NotConfigured />

  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicOnly>
            <Landing />
          </PublicOnly>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnly>
            <Signup />
          </PublicOnly>
        }
      />

      <Route
        path="/onboarding"
        element={
          <Protected>
            <Onboarding />
          </Protected>
        }
      />

      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/today" element={<Today />} />
        <Route path="/history" element={<History />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/weekly" element={<Weekly />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/rules" element={<RulesEdit />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
