import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { PrefsProvider } from './context/PrefsContext'
import './index.css'

// 서비스 워커 등록 — 홈화면 설치와 알림에 필요하다.
// 개발 중에는 등록하지 않는다 (핫 리로드와 충돌할 수 있음).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => {
      console.warn('서비스 워커 등록 실패 (앱 동작에는 영향 없음)', e)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <PrefsProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </PrefsProvider>
    </ThemeProvider>
  </React.StrictMode>
)
