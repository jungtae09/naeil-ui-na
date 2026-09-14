# Supabase 설정 가이드

처음 한 번만 하면 됩니다. 10분 정도 걸립니다.

---

## 1. 프로젝트 만들기

1. https://supabase.com 접속 → 로그인 (GitHub 계정으로 하면 편합니다)
2. **New project** 클릭
3. 입력
   - **Name**: `naeil-ui-na`
   - **Database Password**: 아무 강한 비밀번호 (어딘가 적어두세요. 앱에서는 안 씁니다)
   - **Region**: `Northeast Asia (Seoul)` ← 한국에서 쓰니까 서울로
4. **Create new project** → 1~2분 기다립니다.

---

## 2. 스키마(테이블 + 보안정책) 만들기

1. 왼쪽 메뉴 → **SQL Editor**
2. **New query** 클릭
3. 이 폴더의 `schema.sql` 파일을 열어서 **전체 복사 → 붙여넣기**
4. 오른쪽 아래 **Run** (또는 ⌘+Enter)
5. `Success. No rows returned` 가 나오면 완료입니다.

> 이 SQL은 여러 번 실행해도 안전합니다. 나중에 수정할 일이 생기면 다시 전체를 실행하면 됩니다.

만들어지는 것:

| 테이블 | 내용 | 공개 범위 |
|---|---|---|
| `profiles` | 닉네임, 아바타, 친구 코드 | 친구에게만 |
| `friendships` | 친구 요청 / 친구 관계 | 당사자 둘만 |
| `rules` | 나의 10가지 약속 | **본인만** |
| `daily_records` | 날짜별 규칙 완료 기록 | **본인만** |
| `daily_stats` | 하루 요약 (개수/완주 여부) | **본인만** (친구 공개값은 RPC 로만) |
| `weekly_reviews` | 주간 회고 | **본인만** |
| `encouragements` | 응원 | 보낸 사람 / 받은 사람 |

---

## 3. 이메일 인증 설정

친구들끼리 바로 쓰려면 **이메일 확인을 꺼두는 쪽**이 편합니다.

1. 왼쪽 메뉴 → **Authentication** → **Sign In / Providers** → **Email**
2. **Confirm email** 을 **OFF**
3. Save

끄면 메일이 아예 오지 않고, 가입하자마자 바로 앱으로 들어갑니다.
아는 사람 몇 명만 쓰는 앱이라면 이게 가장 덜 번거롭습니다.

켜둔 채로 쓰고 싶다면, 아래 **URL Configuration** 을 반드시 먼저 맞춰주세요.
안 맞추면 메일 속 링크가 `localhost` 로 가서 열리지 않습니다.

### ⚠️ 배포했다면 반드시 주소를 바꿔주세요

**Authentication → URL Configuration**

| 항목 | 값 |
|---|---|
| **Site URL** | `https://내사이트.netlify.app` ← **localhost 로 두면 안 됩니다** |
| **Redirect URLs** | `https://내사이트.netlify.app/**` 와 `http://localhost:5173/**` 둘 다 추가 |

여기가 `http://localhost:5173` 으로 남아 있으면, 가입 확인 메일의 링크를 폰에서 눌렀을 때
`localhost` 로 이동하려다 **아무 데도 가지 못하고 멈춥니다.**

이때 메일 인증 자체는 이미 끝난 상태입니다. 그래서 그냥 앱으로 돌아가
이메일과 비밀번호로 로그인하면 정상적으로 들어가집니다. 화면 이동만 실패한 거예요.

> `/**` 를 붙이면 그 주소 아래 모든 경로가 허용됩니다.
> 앱은 인증 링크를 `/auth/callback` 으로 돌려보내므로 이 경로가 허용돼 있어야 합니다.

### 로그인이 자꾸 풀린다면

**Authentication → Sessions** 를 확인하세요. 아래 두 값이 **비어 있어야** 로그인이 계속 유지됩니다.

| 설정 | 값 |
|---|---|
| **Time-box user sessions** | 비워둠 (설정하면 그 시간이 지나면 무조건 로그아웃) |
| **Inactivity timeout** | 비워둠 (설정하면 그동안 안 쓰면 로그아웃) |

기본값은 둘 다 비어 있습니다. 혹시 값이 들어가 있다면 지우고 저장하세요.

**Enforce single session per user** 도 켜져 있으면, 폰에서 로그인할 때 PC 쪽이 로그아웃됩니다.
여러 기기에서 쓰려면 꺼두세요.

---

## 4. 키 복사해서 `.env` 만들기

1. 왼쪽 메뉴 → **Project Settings**(톱니) → **API Keys**
2. 두 값을 복사
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **anon / public** 키
3. 프로젝트 폴더에서 `.env.example` 을 복사해 `.env` 로 만들고 값을 넣습니다.

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> ⚠️ **service_role 키는 절대 넣지 마세요.** 프론트엔드에 들어가면 모든 데이터가 노출됩니다.
> anon 키는 공개되어도 되는 값입니다. 실제 보안은 위에서 만든 RLS 정책이 담당합니다.

---

## 5. (선택) 실시간 업데이트 켜기

친구가 체크하면 내 화면에서도 바로 바뀌게 하려면, SQL Editor 에서 아래를 실행하세요.

```sql
alter publication supabase_realtime add table public.daily_stats;
alter publication supabase_realtime add table public.encouragements;
```

앱은 이 설정이 없어도 정상 동작합니다 (화면을 열 때마다 새로 불러옵니다).

---

## 문제가 생기면

**회원가입 시 "가입하지 못했습니다" 만 나온다**
→ 가장 흔한 원인은 `.env` 의 `VITE_SUPABASE_ANON_KEY` 가 예시값(`your-anon-public-key`)
그대로 남아 있는 경우입니다. 실제 키를 넣고 **개발 서버를 껐다 다시 켜세요.**
(`npm run dev` 는 시작할 때 한 번만 `.env` 를 읽습니다.)
값이 잘못돼 있으면 앱이 설정 안내 화면을 대신 보여줍니다.


**`permission denied for table ...`**
→ `schema.sql` 의 RLS 정책 부분이 실행되지 않았습니다. SQL 전체를 다시 실행하세요.

**회원가입은 되는데 프로필이 안 만들어짐**
→ `on_auth_user_created` 트리거가 안 걸린 경우입니다. SQL 전체를 다시 실행하세요.
앱에도 보정 로직이 있어서 로그인 시 프로필이 없으면 자동으로 만듭니다.

**`GROUP_FULL` / `ALREADY_IN_GROUP` / `INVALID_CODE`**
→ 정상 동작입니다. 앱이 한국어 안내 메시지로 바꿔서 보여줍니다.

**기존 테스트 데이터를 싹 지우고 싶을 때**
→ Authentication → Users 에서 사용자를 삭제하면 연결된 데이터가 모두 함께 지워집니다.
