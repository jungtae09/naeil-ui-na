import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Sun, Moon, Monitor, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { AVATARS, updateProfile } from '../services/profiles'
import { getMyGroup, leaveGroup, renameGroup } from '../services/groups'
import { humanError } from '../utils/errors'
import { Skeleton, Spinner } from '../components/Skeleton'

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
  const [group, setGroup] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [groupLoading, setGroupLoading] = useState(true)
  const [leaving, setLeaving] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '')
      setAvatar(profile.avatar || '🌱')
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    getMyGroup(user.id)
      .then((g) => {
        setGroup(g)
        setGroupName(g?.name ?? '')
      })
      .catch(() => {})
      .finally(() => setGroupLoading(false))
  }, [user])

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

  async function saveGroupName() {
    if (!groupName.trim()) return toast.error('그룹 이름을 입력해주세요.')
    try {
      await renameGroup(group.id, groupName)
      setGroup({ ...group, name: groupName.trim() })
      toast.success('그룹 이름을 바꿨습니다.')
    } catch (e) {
      toast.error(humanError(e, '그룹 이름을 바꾸지 못했습니다.'))
    }
  }

  async function doLeave() {
    setLeaving(true)
    try {
      await leaveGroup(user.id)
      setGroup(null)
      setConfirmLeave(false)
      toast.success('그룹에서 나왔습니다.')
    } catch (e) {
      toast.error(humanError(e, '그룹을 나가지 못했습니다.'))
    } finally {
      setLeaving(false)
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

      {/* 그룹 */}
      <Section title="그룹">
        {groupLoading ? (
          <div className="px-5 py-5">
            <Skeleton className="h-16 w-full" />
          </div>
        ) : group ? (
          <div className="px-5 py-5">
            <label className="label" htmlFor="gname">
              그룹 이름
            </label>
            <div className="flex gap-2">
              <input
                id="gname"
                className="field"
                maxLength={20}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              {groupName.trim() !== group.name && (
                <button type="button" onClick={saveGroupName} className="btn-ghost shrink-0 px-4">
                  저장
                </button>
              )}
            </div>
            {group.created_by !== user.id && (
              <p className="mt-2 text-xs text-muted">
                그룹 이름은 그룹을 만든 사람만 바꿀 수 있습니다.
              </p>
            )}

            <div className="mt-5">
              <p className="label">초대 코드</p>
              <p className="text-xl font-black tracking-[0.22em] text-brand">{group.invite_code}</p>
            </div>

            <div className="mt-6 border-t border-line pt-5">
              {!confirmLeave ? (
                <button
                  type="button"
                  onClick={() => setConfirmLeave(true)}
                  className="text-sm font-semibold text-muted hover:text-ink"
                >
                  그룹 나가기
                </button>
              ) : (
                <div>
                  <p className="break-keep text-sm text-ink">
                    그룹을 나가시겠어요? 나의 기록은 그대로 남습니다.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={doLeave}
                      className="btn-ghost flex-1 py-2.5 text-sm"
                      disabled={leaving}
                    >
                      {leaving ? <Spinner /> : null}
                      나가기
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmLeave(false)}
                      className="btn-line flex-1 py-2.5 text-sm"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Link
            to="/friends"
            className="flex items-center justify-between px-5 py-4 transition hover:bg-surface2"
          >
            <span className="text-sm font-semibold text-ink">그룹 만들기 · 참여하기</span>
            <ChevronRight size={18} className="text-muted" aria-hidden="true" />
          </Link>
        )}
      </Section>

      {/* 알림 (추후) */}
      <Section title="알림">
        <div className="px-5 py-4">
          <p className="text-sm text-muted">
            저녁 알림 기능은 다음 단계에서 추가됩니다. 원하지 않으면 켜지 않아도 됩니다.
          </p>
        </div>
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
