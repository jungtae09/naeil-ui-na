# 내일의 나

매일 스스로 정한 10가지 약속을 실천하고 체크하며, 연속 기록을 쌓고,
친구들과 서로의 꾸준함을 확인하는 습관 웹앱.

> 오늘의 행동 → 작은 성취 → 꾸준함 → 주간 회고 → 더 나은 목표 → 더 나은 내일

---

## 기술 구성

| 영역 | 사용 기술 |
|---|---|
| 프론트엔드 | React 18 + Vite |
| 스타일 | Tailwind CSS (라이트/다크/시스템 테마) |
| 라우팅 | React Router v6 |
| 인증 | Supabase Auth (이메일 + 비밀번호) |
| 데이터베이스 | Supabase PostgreSQL + Row Level Security |
| 아이콘 | Lucide React |
| 배포 | Netlify |

데이터는 전부 Supabase에 저장됩니다.
localStorage는 **테마·알림·지난날짜수정 같은 기기별 설정에만** 쓰입니다.

---

## 처음 실행하기

### 1. Supabase 설정

`supabase/SETUP.md` 를 따라 진행하세요. (10분)
요약하면:

1. supabase.com 에서 프로젝트 생성 (Region: **Seoul**)
2. SQL Editor 에 `supabase/schema.sql` 전체를 붙여넣고 실행
3. Authentication → Providers → Email → **Confirm email 끄기**
4. Project Settings → API 에서 URL / anon key 복사

### 2. 로컬 실행

```bash
cd naeil-ui-na

cp .env.example .env     # 복사한 뒤 값을 채워넣으세요
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

`.env` 값을 넣지 않으면 안내 화면이 나옵니다.
값을 넣은 뒤에는 **개발 서버를 다시 시작**해야 반영됩니다.

---

## 폴더 구조

```
src/
├── components/        화면 조각
│   ├── RuleCard          오늘의 약속 카드 (체크 애니메이션 + 도장)
│   ├── StampGrid         10칸 도장판
│   ├── ProgressBar       진행률
│   ├── QuoteCard         오늘의 한마디 / 오늘의 질문
│   ├── CompleteOverlay   10/10 완주 화면
│   ├── FriendCard        친구 카드 + 응원 + 친구 끊기
│   ├── Calendar          월간 기록 달력
│   ├── Layout            사이드바(PC) / 하단 네비(모바일)
│   ├── EmptyState        빈 화면
│   └── Skeleton          로딩 상태
│
├── pages/
│   ├── Landing           첫 화면
│   ├── Login / Signup    인증
│   ├── Onboarding        3단계 안내 → 프로필 → 10가지 → 친구
│   ├── Today             ★ 메인 화면
│   ├── History           통계 · 달력 · 배지
│   ├── Friends           친구 코드 · 요청 · 순위 · 응원
│   ├── Weekly            주간 분석
│   ├── Settings          프로필 · 테마 · 친구 코드 · 로그아웃
│   └── RulesEdit         10가지 약속 수정
│
├── context/
│   ├── AuthContext       세션 + 프로필 (새로고침해도 유지)
│   ├── ThemeContext      라이트 / 다크 / 시스템
│   └── ToastContext      알림 메시지
│
├── services/          Supabase 접근 계층
│   ├── profiles / rules / records / friends
│   └── stats             연속 기록 · 달성률 계산
│
├── utils/
│   ├── date              ★ Asia/Seoul 기준 날짜 처리
│   ├── messages          칭찬 · 명언 · 질문 (100문장 이상)
│   ├── badges            배지 규칙
│   └── errors            오류 메시지 한국어 변환
│
└── lib/supabase.js
```

---

## 설계에서 신경 쓴 것

**날짜 (Asia/Seoul)**
`src/utils/date.js` 의 `todayYmd()` 하나만 "오늘"을 결정합니다.
브라우저 시간대와 무관하게 항상 서울 기준이라, 해외에서 접속하거나 자정 전후에
체크해도 날짜가 밀리지 않습니다. 앱을 켜둔 채 자정을 넘기면 화면의 날짜도 자동으로 바뀝니다.

**연속 기록**
화면에서 임의로 계산하지 않고, DB의 `daily_stats` 기록만 근거로 계산합니다.
완주(10개 전부 완료)한 날만 연속에 포함되고, 마지막 완주일이 오늘 또는 어제여야 연속이 유지됩니다.
**최고 기록은 절대 지워지지 않습니다.**

**과거 기록 보존**
`daily_records` 에 그날의 규칙 제목(`rule_title`)을 함께 저장합니다.
나중에 규칙 내용을 바꿔도 과거 기록은 그때의 문장 그대로 남습니다.
규칙을 지워도 `is_active = false` 로만 바뀌고 기록은 보존됩니다.

**친구 시스템**
그룹이 아니라 1:1 친구 관계입니다. 각자 6자리 **친구 코드**를 가지고,
코드를 입력해 요청을 보내면 상대가 수락해야 친구가 됩니다.
서로 요청을 보냈다면 수락 없이 바로 친구가 됩니다. (`supabase/schema.sql` 의 `send_friend_request`)
이메일을 주고받을 필요가 없고, 친구마다 다른 사람과 연결될 수 있습니다. 최대 20명.

**프라이버시**
친구에게 나가는 값은 `friend_stats` RPC가 서버에서 계산한 것뿐입니다:
닉네임 · 아바타 · 오늘 완료 개수 · 완주 여부 · 연속 기록 · 주간 달성률 · 성장률 · 응원 여부.
규칙 내용, 회고, 날짜별 상세 기록은 RLS로 본인만 읽을 수 있습니다.

**압박하지 않는 게임화**
기록이 끊겨도 "다시 처음부터"라고 말하지 않고, 이어온 기록을 그대로 보여줍니다.
순위도 달성률 / 최장 연속 / 성장률 세 가지를 함께 보여줘서
가장 많이 한 사람만 인정받지 않도록 했습니다.

---

## 사용자 흐름 테스트 (배포 전)

브라우저 두 개(일반 창 + 시크릿 창)로 하면 편합니다.

**사용자 A**
회원가입 → 닉네임 설정 → 10가지 작성 → 내 친구 코드 확인 → 오늘 체크 → 로그아웃

**사용자 B**
회원가입 → A의 친구 코드 입력 → 요청 전송 → (A가 수락) → 자신의 10가지 작성 → 오늘 체크

**확인할 것**

- [ ] A가 체크해도 B의 기록은 변하지 않는다
- [ ] 친구 화면에서 서로의 완료 개수 / 연속 기록이 보인다
- [ ] 친구의 **규칙 내용**은 보이지 않는다
- [ ] 받은 요청을 수락해야 친구가 된다 (거절·취소도 동작)
- [ ] 잘못된 친구 코드 → "존재하지 않는 친구 코드입니다"
- [ ] 내 코드를 내가 입력하면 막힌다
- [ ] 10개 모두 체크 → 완주 화면 + 연속 기록 +1
- [ ] 새로고침해도 로그인과 기록이 유지된다
- [ ] 다른 기기에서 로그인해도 같은 기록이 보인다
- [ ] 로그아웃 후 `/today` 접속 → 로그인 화면으로 이동
- [ ] 모바일 화면에서 버튼이 충분히 크다

---

## Netlify 배포

### 1. GitHub에 올리기

```bash
git init
git add .
git commit -m "내일의 나 첫 버전"
git branch -M main
git remote add origin https://github.com/<아이디>/naeil-ui-na.git
git push -u origin main
```

`.env` 는 `.gitignore` 에 있어서 올라가지 않습니다. (그래야 합니다)

### 2. Netlify 연결

1. app.netlify.com → **Add new site** → **Import an existing project**
2. GitHub 저장소 선택
3. 빌드 설정은 `netlify.toml` 에 이미 들어 있습니다
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Site settings → Environment variables** 에 두 값을 추가

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` |

5. **Deploy**

### 3. 배포 후 Supabase 설정 마무리

Supabase → Authentication → **URL Configuration**

- Site URL: `https://내사이트.netlify.app`
- Redirect URLs: 위 주소 추가

이제 이 주소를 친구들에게 보내면 각자 가입해서 사용할 수 있습니다.

> ⚠️ `service_role` 키는 절대 Netlify 환경변수나 코드에 넣지 마세요.
> 프론트엔드에는 `anon` 키만 들어갑니다.

---

## 폰에 앱처럼 설치하기

홈 화면에 추가하면 주소창과 도구막대 없이 보통 앱처럼 열립니다.
앱 안 **설정 → 앱으로 쓰기** 에도 같은 안내가 들어 있으니 친구들에게는 그쪽을 알려주세요.

**아이폰 (사파리)**

1. 아래 가운데 공유 버튼 → **홈 화면에 추가** → **추가**
2. 사파리가 아닌 크롬 등에서는 전체화면으로 열리지 않습니다. 반드시 사파리로 하세요.

> 이미 추가해뒀다면 **기존 아이콘을 지우고 다시 추가**해야 합니다.
> 아이폰은 추가한 시점의 설정을 그대로 기억해서, 나중에 고친 설정이 반영되지 않습니다.

**안드로이드 / 삼성**

- 크롬: 오른쪽 위 ⋮ → **앱 설치**
- 삼성 인터넷: 아래 ≡ → **현재 페이지 추가** → **홈 화면**

관련 파일: `public/manifest.webmanifest`, `public/sw.js`, `index.html` 의 메타 태그.
아이콘을 바꾸고 싶으면 `tools/make-icons.py` 를 고친 뒤 `python3 tools/make-icons.py` 를 실행하세요.

---

## 실시간 업데이트

친구가 체크하면 내 화면의 친구 목록도 바로 바뀝니다.

구현 방식이 조금 특이한데, 일부러 그렇게 했습니다.
실시간 채널로는 **아무 내용도 보내지 않고** "누가 뭔가 바꿨다" 는 신호만 던집니다.
받은 쪽은 그 신호를 보고 서버에서 자기가 볼 권한이 있는 공개 통계만 다시 불러옵니다.
그래서 실시간 기능 때문에 개인 기록이 새어 나갈 일이 없습니다. (`src/hooks/useFriendChannels.js`)

Supabase 쪽에 따로 켜야 하는 설정은 없습니다.

---

## 알림의 한계 (솔직하게)

**설정 → 알림** 에서 켜면 정한 시각에 남은 약속 개수를 알려줍니다. 기본값은 꺼짐입니다.

다만 지금은 **앱이 열려 있는 동안에만** 동작합니다. 앱을 완전히 종료하면 오지 않습니다.
앱을 꺼도 오는 진짜 푸시 알림을 만들려면 Web Push + 서버(Supabase Edge Function + 스케줄러)가
필요해서 다음 단계로 미뤄뒀습니다.

아이폰은 **홈 화면에 추가한 앱에서만** 알림을 받을 수 있습니다.

---

## 다음에 추가할 것 (Phase 5, 7)

- 주간 회고 작성 (`weekly_reviews` 테이블은 이미 준비되어 있음)
- 다음 주 목표 자동 추천 + 사용자 승인/수정
- 친구들 주간 결산
- 진짜 푸시 알림 (Web Push + Edge Function)
