import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Sun, Moon, Monitor, Check, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { usePrefs } from '../context/PrefsContext'
import {
  isIOS,
  isStandalone,
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  showNotification,
} from '../services/notifications'
import { AVATARS, updateProfile } from '../services/profiles'
import { humanError } from '../utils/errors'
import { Spinner } from '../components/Skeleton'
import InstallGuide from '../components/InstallGuide'

const THEMES = [
  { id: 'light', label: '라이트', Icon: Sun },
  { id: 'dark', label: '다크', Icon: Moon },
  { id: 'system', label: '시스템 설정', Icon: Monitor },
]

export default function Settings() {
  const { user, profile, setProfile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()

  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('🌱')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '')
      setAvatar(profile.avatar || '🌱')
    }
  }, [profile])

  const dirty = profile && (nickname.trim() !== profile.nickname || avatar !== profile.avatar)

  async function saveProfile() {
    if (!nickname.trim()) return toast.error('닉네임을 입력해주세요.')
    setSaving(true)
    try {
      const updated = await updateProfile(user.id, { nickname: nickname.trim(), avatar })
      setProfile(updated)
      toast.success('저장했습니다.')
    } catch (e) {
      toast.error(humanError(e, '저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  async function doSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="space-y-6 animate-fadeUp">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">설정</h1>
      </header>

      {/* 계정 */}
      <Section title="계정">
        <div className="px-5 py-5">
          <label className="label" htmlFor="nick">
            닉네임
          </label>
          <input
            id="nick"
            className="field"
            maxLength={12}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          <span className="label mt-5 block">프로필 아이콘</span>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                aria-pressed={avatar === a}
                className={`grid h-11 w-11 place-items-center rounded-xl2 border-2 text-lg transition active:scale-95
                  ${avatar === a ? 'border-brand bg-brandSoft' : 'border-line bg-surface'}`}
              >
                {a}
              </button>
            ))}
          </div>

          {dirty && (
            <button
              type="button"
              onClick={saveProfile}
              className="btn-primary mt-5 w-full"
              disabled={saving}
            >
              {saving ? <Spinner /> : null}
              저장
            </button>
          )}

          <p className="mt-5 text-xs text-muted">{user?.email}</p>
        </div>
      </Section>

      {/* 약속 */}
      <Section title="나의 10가지 약속">
        <Link
          to="/settings/rules"
          className="flex items-center justify-between px-5 py-4 transition hover:bg-surface2"
        >
          <span className="text-sm font-semibold text-ink">약속 수정 · 순서 변경</span>
          <ChevronRight size={18} className="text-muted" aria-hidden="true" />
        </Link>
      </Section>

      {/* 테마 */}
      <Section title="테마">
        <div className="px-3 py-2">
          {THEMES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className="flex w-full items-center gap-3 rounded-xl2 px-2.5 py-3.5 transition hover:bg-surface2"
            >
              <Icon size={18} className="text-muted" aria-hidden="true" />
              <span className="flex-1 text-left text-sm font-semibold text-ink">{label}</span>
              {theme === id && <Check size={18} className="text-brand" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </Section>

      {/* 친구 */}
      <Section title="친구">
        <div className="px-5 py-5">
          <p className="label">내 친구 코드</p>
          <div className="flex items-center gap-3">
            <p className="flex-1 text-xl font-black tracking-[0.22em] text-brand">
              {profile?.friend_code ?? '······'}
            </p>
            <button
              type="button"
              disabled={!profile?.friend_code}
              onClick={() => {
                navigator.clipboard
                  ?.writeText(profile.friend_code)
                  .then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1800)
                  })
                  .catch(() => toast.info(`내 친구 코드: ${profile.friend_code}`))
              }}
              className="btn-ghost shrink-0 px-4 py-2.5 text-sm"
            >
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <p className="mt-3 break-keep text-xs leading-relaxed text-muted">
            친구에게 이 코드를 알려주면 친구가 나를 추가할 수 있습니다.
          </p>
        </div>

        <Link
          to="/friends"
          className="flex items-center justify-between border-t border-line px-5 py-4 transition hover:bg-surface2"
        >
          <span className="text-sm font-semibold text-ink">친구 추가 · 목록 관리</span>
          <ChevronRight size={18} className="text-muted" aria-hidden="true" />
        </Link>
      </Section>

      {/* 알림 */}
      <Section title="알림">
        <ReminderSettings />
      </Section>

      <button
        type="button"
        onClick={doSignOut}
        className="btn-line w-full text-muted hover:text-ink"
      >
        <LogOut size={17} aria-hidden="true" /> 로그아웃
      </button>

      <p className="pb-2 text-center text-xs text-muted">내일의 나 · v0.1</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-bold tracking-wider text-muted">{title}</h2>
      <div className="card overflow-hidden">{children}</div>
    </section>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        checked ? 'bg-brand' : 'bg-line'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  )
}

function ReminderSettings() {
  const { reminderEnabled, reminderTime, setPref } = usePrefs()
  const toast = useToast()
  const [permission, setPermission] = useState(notificationPermission())

  const supported = notificationsSupported()
  const iosNeedsInstall = isIOS() && !isStandalone()

  async function toggleReminder(next) {
    if (!next) {
      setPref('reminderEnabled', false)
      return
    }

    if (!supported) {
      toast.error('이 브라우저는 알림을 지원하지 않습니다.')
      return
    }
    if (iosNeedsInstall) {
      toast.error('아이폰에서는 홈 화면에 추가한 앱에서만 알림을 켤 수 있습니다.')
      return
    }

    const result = await requestNotificationPermission()
    setPermission(result)

    if (result === 'granted') {
      setPref('reminderEnabled', true)
      toast.success('알림을 켰습니다.')
    } else if (result === 'denied') {
      toast.error('알림이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.')
    }
  }

  return (
    <div className="px-5 py-5">
      <div className="flex items-start gap-3">
        <Bell size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">저녁에 알려주기</p>
          <p className="mt-1 break-keep text-xs leading-relaxed text-muted">
            정한 시각에 오늘 남은 약속 개수를 알려줍니다. 다 했으면 알리지 않아요.
          </p>
        </div>
        <Toggle checked={reminderEnabled} onChange={toggleReminder} label="저녁 알림" />
      </div>

      {reminderEnabled && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-5">
          <label className="text-sm font-semibold text-ink" htmlFor="rtime">
            알림 시각
          </label>
          <input
            id="rtime"
            type="time"
            value={reminderTime}
            onChange={(e) => setPref('reminderTime', e.target.value)}
            className="rounded-xl2 border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
          />
        </div>
      )}

      {reminderEnabled && permission === 'granted' && (
        <button
          type="button"
          onClick={() =>
            showNotification('내일의 나', '알림은 이렇게 표시됩니다.').then((ok) => {
              if (!ok) toast.error('알림을 띄우지 못했습니다.')
            })
          }
          className="mt-4 text-sm font-semibold text-brand hover:underline"
        >
          테스트 알림 보내기
        </button>
      )}

      <p className="mt-5 break-keep rounded-xl2 bg-surface2 px-4 py-3 text-xs leading-relaxed text-muted">
        {iosNeedsInstall ? (
          <>
            아이폰은 <b className="text-ink">홈 화면에 추가한 앱</b>에서만 알림을 받을 수 있습니다.
            사파리에서 공유 버튼 → "홈 화면에 추가" 를 먼저 해주세요.
          </>
        ) : (
          <>
            지금은 <b className="text-ink">앱이 열려 있는 동안</b>에만 알림이 옵니다. 앱을 완전히
            종료하면 오지 않아요. 앱을 꺼도 오는 진짜 푸시 알림은 다음 단계에서 추가할 수 있습니다.
          </>
        )}
      </p>
    </div>
  )
}

