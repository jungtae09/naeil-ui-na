import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, UserPlus, Copy, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AVATARS, updateProfile } from '../services/profiles'
import { DEFAULT_RULES, RULE_COUNT, createRules, listRules } from '../services/rules'
import { sendFriendRequest } from '../services/friends'
import { humanError } from '../utils/errors'
import { Spinner } from '../components/Skeleton'

const STEPS = ['intro', 'profile', 'rules', 'friends', 'done']

export default function Onboarding() {
  const { user, profile, setProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState('intro')
  const [busy, setBusy] = useState(false)

  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('🌱')
  const [rules, setRules] = useState(DEFAULT_RULES.map((t) => ({ title: t })))
  const [addedFriend, setAddedFriend] = useState(null)

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
      setStep('friends')
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

        {step === 'friends' && (
          <FriendStep
            myCode={profile?.friend_code}
            added={addedFriend}
            setAdded={setAddedFriend}
            busy={busy}
            setBusy={setBusy}
            onNext={() => setStep('done')}
          />
        )}

        {step === 'done' && <DoneStep busy={busy} onFinish={finish} added={addedFriend} />}
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
        <p className="mt-2 text-xs text-muted">친구에게 이 이름이 보입니다.</p>
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

function FriendStep({ myCode, added, setAdded, busy, setBusy, onNext }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!myCode) return
    navigator.clipboard
      ?.writeText(myCode)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => toast.info(`내 친구 코드: ${myCode}`))
  }

  async function add(e) {
    e.preventDefault()
    if (code.trim().length < 4) return toast.error('친구 코드를 입력해주세요.')
    setBusy(true)
    try {
      const result = await sendFriendRequest(code)
      setCode('')
      setAdded(result)
      toast.success(
        result.status === 'accepted'
          ? `${result.nickname}님과 친구가 되었습니다.`
          : `${result.nickname}님에게 친구 요청을 보냈습니다.`
      )
    } catch (err) {
      toast.error(humanError(err, '친구를 추가하지 못했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-fadeUp">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">친구와 함께할까요?</h1>
      <p className="mt-2 break-keep text-sm leading-relaxed text-muted">
        서로의 꾸준함을 볼 수 있어요. 지금 안 해도 나중에 친구 탭에서 언제든 추가할 수 있습니다.
      </p>

      <section className="card mt-7 px-6 py-6 text-center">
        <p className="text-xs font-bold tracking-widest text-muted">내 친구 코드</p>
        <p className="mt-2 text-3xl font-black tracking-[0.25em] text-brand">{myCode ?? '······'}</p>
        <button type="button" onClick={copy} className="btn-ghost mt-5 w-full" disabled={!myCode}>
          {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
          {copied ? '복사했어요' : '코드 복사하기'}
        </button>
        <p className="mt-4 break-keep text-xs leading-relaxed text-muted">
          친구에게 이 코드를 알려주면 친구가 나를 추가할 수 있어요.
        </p>
      </section>

      <form onSubmit={add} className="mt-4">
        <label className="label" htmlFor="fcode">
          친구에게 받은 코드가 있다면
        </label>
        <div className="flex gap-2">
          <input
            id="fcode"
            className="field text-center text-lg font-black uppercase tracking-[0.25em]"
            maxLength={6}
            value={code}
            placeholder="7K4P2A"
            autoComplete="off"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="submit" className="btn-primary shrink-0 px-5" disabled={busy}>
            {busy ? <Spinner /> : <UserPlus size={17} aria-hidden="true" />}
            <span className="sr-only">추가</span>
          </button>
        </div>
      </form>

      {added && (
        <p className="mt-4 rounded-xl2 bg-doneSoft px-4 py-3 text-sm font-medium text-done">
          {added.status === 'accepted'
            ? `${added.nickname}님과 친구가 되었습니다.`
            : `${added.nickname}님의 수락을 기다리는 중입니다.`}
        </p>
      )}

      <button type="button" onClick={onNext} className="btn-primary mt-7 w-full">
        다음
      </button>
      <button
        type="button"
        onClick={onNext}
        className="mt-2 w-full py-3 text-sm font-semibold text-muted hover:text-ink"
      >
        나중에 할게요
      </button>
    </div>
  )
}

function DoneStep({ busy, onFinish, added }) {
  return (
    <div className="animate-fadeUp py-10 text-center">
      <div className="text-5xl" aria-hidden="true">
        🌿
      </div>
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">준비됐습니다</h1>
      <p className="mx-auto mt-3 max-w-[16rem] break-keep text-sm leading-relaxed text-muted">
        {added
          ? '오늘의 열 가지를 확인하고 하나씩 체크해보세요.'
          : '먼저 혼자 시작해도 괜찮아요. 친구는 언제든 추가할 수 있습니다.'}
      </p>

      <button type="button" onClick={onFinish} className="btn-primary mt-9 w-full" disabled={busy}>
        {busy ? <Spinner /> : null}
        오늘의 약속 보러 가기
      </button>
    </div>
  )
}
