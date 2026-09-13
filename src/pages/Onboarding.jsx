import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Users, UserPlus, Copy, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AVATARS, updateProfile } from '../services/profiles'
import { DEFAULT_RULES, RULE_COUNT, createRules, listRules } from '../services/rules'
import { createGroup, joinGroup, getMyGroup } from '../services/groups'
import { humanError } from '../utils/errors'
import { Spinner } from '../components/Skeleton'

const STEPS = ['intro', 'profile', 'rules', 'group', 'done']

export default function Onboarding() {
  const { user, profile, setProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState('intro')
  const [busy, setBusy] = useState(false)

  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('🌱')
  const [rules, setRules] = useState(DEFAULT_RULES.map((t) => ({ title: t })))
  const [group, setGroup] = useState(null)

  useEffect(() => {
    if (profile) {
      setNickname((n) => n || profile.nickname || '')
      setAvatar(profile.avatar || '🌱')
    }
  }, [profile])

  // 이미 규칙을 만들어둔 상태로 다시 들어온 경우 반영
  useEffect(() => {
    if (!user) return
    listRules(user.id)
      .then((existing) => {
        if (existing.length > 0) setRules(existing.map((r) => ({ id: r.id, title: r.title })))
      })
      .catch(() => {})
    getMyGroup(user.id)
      .then((g) => g && setGroup(g))
      .catch(() => {})
  }, [user])

  const progress = (STEPS.indexOf(step) / (STEPS.length - 1)) * 100

  async function saveProfile() {
    if (nickname.trim().length < 1) {
      toast.error('닉네임을 입력해주세요.')
      return
    }
    setBusy(true)
    try {
      const updated = await updateProfile(user.id, { nickname: nickname.trim(), avatar })
      setProfile(updated)
      setStep('rules')
    } catch (e) {
      toast.error(humanError(e, '저장하지 못했습니다. 잠시 후 다시 시도해주세요.'))
    } finally {
      setBusy(false)
    }
  }

  async function saveRules() {
    const filled = rules.map((r) => r.title.trim()).filter(Boolean)
    if (filled.length !== RULE_COUNT) {
      toast.error(`${RULE_COUNT}개를 모두 채워주세요. (현재 ${filled.length}개)`)
      return
    }
    setBusy(true)
    try {
      const existing = await listRules(user.id)
      if (existing.length === 0) {
        await createRules(user.id, filled)
      }
      setStep('group')
    } catch (e) {
      toast.error(humanError(e, '약속을 저장하지 못했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    setBusy(true)
    try {
      const updated = await updateProfile(user.id, { onboarded: true })
      setProfile(updated)
      navigate('/today', { replace: true })
    } catch (e) {
      toast.error(humanError(e, '저장하지 못했습니다.'))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div className="h-1 w-full bg-surface2">
        <div
          className="h-full bg-brand transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto w-full max-w-md px-6 py-10">
        {step === 'intro' && <Intro onNext={() => setStep('profile')} />}

        {step === 'profile' && (
          <ProfileStep
            nickname={nickname}
            setNickname={setNickname}
            avatar={avatar}
            setAvatar={setAvatar}
            busy={busy}
            onNext={saveProfile}
          />
        )}

        {step === 'rules' && (
          <RulesStep
            rules={rules}
            setRules={setRules}
            busy={busy}
            onBack={() => setStep('profile')}
            onNext={saveRules}
          />
        )}

        {step === 'group' && (
          <GroupStep
            group={group}
            setGroup={setGroup}
            userId={user.id}
            busy={busy}
            setBusy={setBusy}
            onSkip={() => setStep('done')}
            onNext={() => setStep('done')}
          />
        )}

        {step === 'done' && <DoneStep busy={busy} onFinish={finish} group={group} />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ */

function Intro({ onNext }) {
  const items = [
    { n: 'STEP 1', t: '매일 지키고 싶은 10가지 약속을 정하세요.', e: '📝' },
    { n: 'STEP 2', t: '매일 실천하고 체크하세요.', e: '✓' },
    { n: 'STEP 3', t: '일주일마다 돌아보고 다음 주를 더 좋게 만들어보세요.', e: '📈' },
  ]

  return (
    <div className="animate-fadeUp">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">시작하기 전에</h1>
      <p className="mt-2 text-sm text-muted">3단계만 기억하면 됩니다.</p>

      <div className="mt-8 space-y-3">
        {items.map((it) => (
          <div key={it.n} className="card flex items-start gap-4 px-5 py-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brandSoft text-lg">
              {it.e}
            </span>
            <div>
              <div className="text-[11px] font-black tracking-widest text-brand">{it.n}</div>
              <p className="mt-1 break-keep text-[15px] font-semibold leading-snug text-ink">
                {it.t}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 break-keep text-center text-sm text-muted">
        친구들과 함께하면 서로의 꾸준함도 볼 수 있어요.
      </p>

      <button type="button" onClick={onNext} className="btn-primary mt-8 w-full">
        시작하기 <ArrowRight size={18} aria-hidden="true" />
      </button>
    </div>
  )
}

function ProfileStep({ nickname, setNickname, avatar, setAvatar, busy, onNext }) {
  return (
    <div className="animate-fadeUp">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">환영합니다!</h1>
      <p className="mt-2 text-sm text-muted">어떻게 불러드릴까요?</p>

      <div className="mt-8">
        <label className="label" htmlFor="nick">
          닉네임
        </label>
        <input
          id="nick"
          className="field"
          maxLength={12}
          value={nickname}
          placeholder="정태"
          onChange={(e) => setNickname(e.target.value)}
        />
        <p className="mt-2 text-xs text-muted">그룹원에게 이 이름이 보입니다.</p>
      </div>

      <div className="mt-7">
        <span className="label">프로필 아이콘</span>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAvatar(a)}
              aria-pressed={avatar === a}
              className={`grid h-12 w-12 place-items-center rounded-xl2 border-2 text-xl transition active:scale-95
                ${avatar === a ? 'border-brand bg-brandSoft' : 'border-line bg-surface hover:border-brand/40'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={onNext} className="btn-primary mt-9 w-full" disabled={busy}>
        {busy ? <Spinner /> : null}
        다음
      </button>
    </div>
  )
}

function RulesStep({ rules, setRules, busy, onBack, onNext }) {
  const filled = rules.filter((r) => r.title.trim()).length

  function update(i, value) {
    setRules((list) => list.map((r, idx) => (idx === i ? { ...r, title: value } : r)))
  }

  return (
    <div className="animate-fadeUp">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">나의 10가지 약속</h1>
      <p className="mt-2 break-keep text-sm leading-relaxed text-muted">
        매일 지키고 싶은 것들을 적어보세요. 예시가 채워져 있으니 마음에 드는 건 그대로 두고,
        나머지는 바꾸면 됩니다. 나중에 언제든 수정할 수 있어요.
      </p>

      <div className="mt-7 space-y-2">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-muted">
              {String(i + 1).padStart(2, '0')}
            </span>
            <input
              className="field py-3"
              maxLength={40}
              value={rule.title}
              onChange={(e) => update(i, e.target.value)}
              placeholder="지키고 싶은 약속"
              aria-label={`${i + 1}번째 약속`}
            />
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-sm font-semibold tabular-nums text-muted">
        {filled} / {RULE_COUNT}
      </p>

      <div className="mt-6 flex gap-2.5">
        <button type="button" onClick={onBack} className="btn-line shrink-0 px-4">
          <ArrowLeft size={18} aria-hidden="true" />
          <span className="sr-only">이전</span>
        </button>
        <button type="button" onClick={onNext} className="btn-primary flex-1" disabled={busy}>
          {busy ? <Spinner /> : null}
          다음
        </button>
      </div>
    </div>
  )
}

function GroupStep({ group, setGroup, userId, busy, setBusy, onSkip, onNext }) {
  const toast = useToast()
  const [mode, setMode] = useState(null) // 'create' | 'join'
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  async function doCreate() {
    if (!name.trim()) return toast.error('그룹 이름을 입력해주세요.')
    setBusy(true)
    try {
      const g = await createGroup(name)
      setGroup(g)
    } catch (e) {
      toast.error(humanError(e, '그룹을 만들지 못했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  async function doJoin() {
    if (code.trim().length < 4) return toast.error('초대 코드를 입력해주세요.')
    setBusy(true)
    try {
      await joinGroup(code)
      const g = await getMyGroup(userId)
      setGroup(g)
      toast.success('그룹에 참여했습니다.')
    } catch (e) {
      toast.error(humanError(e, '참여하지 못했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  function copy() {
    navigator.clipboard
      ?.writeText(group.invite_code)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => toast.info(`초대 코드: ${group.invite_code}`))
  }

  if (group) {
    return (
      <div className="animate-fadeUp text-center">
        <div className="text-4xl" aria-hidden="true">
          🤝
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">{group.name}</h1>
        <p className="mt-2 text-sm text-muted">준비됐습니다.</p>

        <div className="card mt-7 px-6 py-7">
          <p className="text-xs font-bold tracking-widest text-muted">초대 코드</p>
          <p className="mt-2 text-3xl font-black tracking-[0.25em] text-brand">
            {group.invite_code}
          </p>
          <button type="button" onClick={copy} className="btn-ghost mt-5 w-full">
            {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
            {copied ? '복사했어요' : '코드 복사하기'}
          </button>
          <p className="mt-4 break-keep text-xs leading-relaxed text-muted">
            친구들에게 이 코드를 알려주세요. 최대 4명까지 함께할 수 있어요.
          </p>
        </div>

        <button type="button" onClick={onNext} className="btn-primary mt-7 w-full">
          다음
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fadeUp">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">친구와 함께할까요?</h1>
      <p className="mt-2 break-keep text-sm leading-relaxed text-muted">
        최대 4명이 한 그룹에서 서로의 꾸준함을 볼 수 있어요. 지금 안 해도 나중에 설정에서 할 수
        있습니다.
      </p>

      {!mode && (
        <div className="mt-8 space-y-2.5">
          <button type="button" onClick={() => setMode('create')} className="btn-line w-full py-4">
            <Users size={18} aria-hidden="true" /> 새로운 그룹 만들기
          </button>
          <button type="button" onClick={() => setMode('join')} className="btn-line w-full py-4">
            <UserPlus size={18} aria-hidden="true" /> 초대 코드로 참여하기
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="w-full py-3 text-sm font-semibold text-muted hover:text-ink"
          >
            혼자 시작할게요
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="mt-8">
          <label className="label" htmlFor="gname">
            그룹 이름
          </label>
          <input
            id="gname"
            className="field"
            maxLength={20}
            value={name}
            placeholder="우리들의 약속"
            onChange={(e) => setName(e.target.value)}
          />
          <button type="button" onClick={doCreate} className="btn-primary mt-5 w-full" disabled={busy}>
            {busy ? <Spinner /> : null}
            그룹 만들기
          </button>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="mt-3 w-full py-2 text-sm font-semibold text-muted hover:text-ink"
          >
            뒤로
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="mt-8">
          <label className="label" htmlFor="gcode">
            초대 코드
          </label>
          <input
            id="gcode"
            className="field text-center text-xl font-black tracking-[0.3em] uppercase"
            maxLength={6}
            value={code}
            placeholder="7K4P2A"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="button" onClick={doJoin} className="btn-primary mt-5 w-full" disabled={busy}>
            {busy ? <Spinner /> : null}
            참여하기
          </button>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="mt-3 w-full py-2 text-sm font-semibold text-muted hover:text-ink"
          >
            뒤로
          </button>
        </div>
      )}
    </div>
  )
}

function DoneStep({ busy, onFinish, group }) {
  return (
    <div className="animate-fadeUp py-10 text-center">
      <div className="text-5xl" aria-hidden="true">
        🌿
      </div>
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">준비됐습니다</h1>
      <p className="mx-auto mt-3 max-w-[16rem] break-keep text-sm leading-relaxed text-muted">
        {group
          ? '오늘의 열 가지를 확인하고 하나씩 체크해보세요.'
          : '먼저 혼자 시작해도 괜찮아요. 친구는 언제든 초대할 수 있습니다.'}
      </p>

      <button type="button" onClick={onFinish} className="btn-primary mt-9 w-full" disabled={busy}>
        {busy ? <Spinner /> : null}
        오늘의 약속 보러 가기
      </button>
    </div>
  )
}
