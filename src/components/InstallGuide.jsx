import { useEffect, useState } from 'react'
import { Share, MoreVertical, Check } from 'lucide-react'
import { isIOS, isStandalone } from '../services/notifications'

/**
 * 홈 화면에 추가하는 방법 안내.
 * 이미 앱으로 실행 중이면 "설치됨" 만 보여주고 설명은 접어둔다.
 */
export default function InstallGuide() {
  const [standalone, setStandalone] = useState(isStandalone())
  const [deferred, setDeferred] = useState(null)
  const ios = isIOS()

  useEffect(() => {
    // 안드로이드 크롬은 설치 가능해지면 이 이벤트를 준다 → 버튼 한 번으로 설치
    function onPrompt(e) {
      e.preventDefault()
      setDeferred(e)
    }
    function onInstalled() {
      setStandalone(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (standalone) {
    return (
      <div className="flex items-center gap-2.5 px-5 py-4">
        <Check size={17} className="shrink-0 text-done" aria-hidden="true" />
        <p className="text-sm font-semibold text-ink">앱으로 실행 중입니다</p>
      </div>
    )
  }

  return (
    <div className="px-5 py-5">
      <p className="break-keep text-sm leading-relaxed text-muted">
        홈 화면에 추가하면 주소창과 아래 도구막대가 사라지고 보통 앱처럼 열립니다.
      </p>

      {deferred && (
        <button
          type="button"
          onClick={async () => {
            deferred.prompt()
            await deferred.userChoice
            setDeferred(null)
          }}
          className="btn-primary mt-4 w-full"
        >
          앱으로 설치하기
        </button>
      )}

      {ios ? (
        <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink">
          <Step n="1">
            사파리 아래쪽 가운데의 공유 버튼
            <Share size={14} className="mx-1 inline align-[-2px] text-brand" aria-hidden="true" />을
            누릅니다
          </Step>
          <Step n="2">
            목록을 아래로 내려 <b>홈 화면에 추가</b> 를 선택합니다
          </Step>
          <Step n="3">
            오른쪽 위 <b>추가</b> 를 누릅니다
          </Step>
        </ol>
      ) : (
        <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink">
          <Step n="1">
            오른쪽 위 점 세 개
            <MoreVertical size={14} className="mx-1 inline align-[-2px] text-brand" aria-hidden="true" />
            메뉴를 누릅니다
          </Step>
          <Step n="2">
            <b>앱 설치</b> 또는 <b>홈 화면에 추가</b> 를 선택합니다
          </Step>
          <Step n="3">
            <b>설치</b> 를 누릅니다
          </Step>
        </ol>
      )}

      <p className="mt-4 break-keep rounded-xl2 bg-surface2 px-4 py-3 text-xs leading-relaxed text-muted">
        {ios ? (
          <>
            이미 홈 화면에 추가해뒀는데 위아래 막대가 계속 보인다면, 그 아이콘을 길게 눌러{' '}
            <b className="text-ink">삭제한 뒤 다시 추가</b>해주세요. 아이폰은 추가한 시점의 설정을
            그대로 기억합니다.
          </>
        ) : (
          <>
            삼성 인터넷을 쓰신다면 아래쪽 메뉴(≡) → <b className="text-ink">현재 페이지 추가</b> →{' '}
            <b className="text-ink">홈 화면</b> 순서로도 추가할 수 있습니다.
          </>
        )}
      </p>
    </div>
  )
}

function Step({ n, children }) {
  return (
    <li className="flex gap-2.5">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brandSoft text-[11px] font-black text-brand">
        {n}
      </span>
      <span className="break-keep">{children}</span>
    </li>
  )
}
