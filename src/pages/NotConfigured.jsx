import { configIssue } from '../lib/supabase'

export default function NotConfigured() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-5 py-10">
      <div className="card w-full max-w-md px-6 py-8">
        <div className="text-3xl" aria-hidden="true">
          ⚙️
        </div>
        <h1 className="mt-3 text-lg font-extrabold text-ink">Supabase 설정이 필요합니다</h1>

        <div className="mt-4 rounded-xl2 bg-brandSoft px-4 py-3.5">
          <p className="text-xs font-bold tracking-wider text-brand">확인된 문제</p>
          <p className="mt-1.5 break-keep text-sm leading-relaxed text-ink">
            <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-bold">
              {configIssue.field}
            </code>{' '}
            — {configIssue.reason}
          </p>
        </div>

        <p className="mt-5 break-keep text-sm leading-relaxed text-muted">
          프로젝트 폴더의 <code className="rounded bg-surface2 px-1.5 py-0.5 text-xs">.env</code>{' '}
          파일을 열어 아래 두 값을 채워주세요.
        </p>

        <pre className="mt-3 overflow-x-auto rounded-xl2 bg-surface2 p-4 text-xs leading-relaxed text-ink">
{`VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
        </pre>

        <div className="mt-5 border-t border-line pt-5">
          <p className="text-xs font-bold tracking-wider text-muted">값을 어디서 가져오나요?</p>
          <ol className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted">
            <li>1. Supabase 대시보드 → 내 프로젝트</li>
            <li>
              2. 왼쪽 아래 <b className="text-ink">Project Settings</b> (톱니) →{' '}
              <b className="text-ink">API Keys</b>
            </li>
            <li>
              3. <b className="text-ink">Project URL</b> 과{' '}
              <b className="text-ink">anon / public</b> 키를 복사
            </li>
          </ol>
        </div>

        <p className="mt-5 break-keep rounded-xl2 bg-surface2 px-4 py-3 text-xs leading-relaxed text-muted">
          ⚠️ <b className="text-ink">service_role</b> 키는 넣지 마세요. 프론트엔드에 들어가면 모든
          데이터가 노출됩니다. anon 키는 공개되어도 되는 값이고, 실제 보안은 데이터베이스의 RLS
          정책이 담당합니다.
        </p>

        <p className="mt-4 text-sm font-semibold text-ink">
          값을 고친 뒤에는 개발 서버를 껐다가 다시 켜야 반영됩니다.
        </p>
      </div>
    </div>
  )
}
