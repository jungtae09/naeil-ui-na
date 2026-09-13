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
| `profiles` | 닉네임, 아바타 | 같은 그룹원에게만 |
| `groups` / `group_members` | 그룹, 초대코드, 멤버 (최대 4명) | 같은 그룹원에게만 |
| `rules` | 나의 10가지 약속 | **본인만** |
| `daily_records` | 날짜별 규칙 완료 기록 | **본인만** |
| `daily_stats` | 하루 요약 (개수/완주 여부) | **본인만** (그룹 공개값은 RPC 로만) |
| `weekly_reviews` | 주간 회고 | **본인만** |
| `encouragements` | 응원 | 보낸 사람 / 받은 사람 |

---

## 3. 이메일 인증 설정

친구 4명끼리 바로 쓰려면 **이메일 확인을 꺼두는 쪽**이 편합니다.

1. 왼쪽 메뉴 → **Authentication** → **Sign In / Providers** → **Email**
2. **Confirm email** 을 **OFF**
3. Save

> 켜두면 회원가입 후 메일함에서 링크를 눌러야 로그인이 됩니다.
> 나중에 공개 서비스로 쓸 거라면 그때 다시 켜세요.

또한 **Authentication → URL Configuration** 에서
- **Site URL**: 로컬 개발 중이면 `http://localhost:5173`, 배포 후에는 Netlify 주소
- **Redirect URLs**: 위 두 주소를 모두 추가

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
