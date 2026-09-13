import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 py-14">
      <div className="w-full max-w-sm text-center animate-fadeUp">
        <div className="text-4xl" aria-hidden="true">
          🌱
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">내일의 나</h1>

        <p className="mt-5 break-keep text-[15px] leading-relaxed text-muted">
          어제보다 나은 오늘을 만들고,
          <br />
          오늘보다 나은 내일을 준비하세요.
        </p>

        <div className="mt-10 space-y-2.5">
          <Link to="/signup" className="btn-primary w-full">
            시작하기
          </Link>
          <Link to="/login" className="btn-line w-full">
            로그인
          </Link>
        </div>

        <ul className="mx-auto mt-12 max-w-[17rem] space-y-3 text-left text-sm text-muted">
          <li className="flex gap-3">
            <span aria-hidden="true">①</span>
            <span className="break-keep">매일 지키고 싶은 10가지 약속을 정하고</span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true">②</span>
            <span className="break-keep">하나씩 체크하며 도장을 채우고</span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true">③</span>
            <span className="break-keep">일주일마다 돌아보며 조금씩 나아집니다</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
