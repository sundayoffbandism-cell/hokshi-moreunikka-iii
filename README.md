# 혹시 모르니까 iii

「혹시 모르니까」 전시 관객 참여 웹사이트입니다.
관객은 자신의 ‘혹시 모르니까’를 익명으로 남기고, 다른 관객의 기록을 종이 카드로 읽습니다.

- Next.js (App Router) · TypeScript · 순수 CSS
- Supabase Database · Vercel 배포

## 기능 요약

**첫 화면 (기록 남기기)**
- 100자 이내 입력, 빈 값/공백만 있는 값은 제출 불가
- 저장 중 버튼 잠금 + 연타 방지 + 같은 제출에 같은 토큰을 써서 중복 저장 방지
- 저장에 성공했을 때만 두 번째 화면으로 이동, 실패하면 오류 메시지 표시 (저장된 척하지 않음)

**두 번째 화면 (종이 카드)**
- 기록 하나를 종이 카드 한 장에 표시, 약 3초마다 자동 전환 (긴 문장은 최대 2초까지 더 머뭅니다)
- 좌우 스와이프, 이전/다음 버튼, 키보드 ←/→ 지원
- 직접 넘기면 자동 전환이 잠시(약 6초) 쉬었다가 이어지고, ‘자동 전환 멈춤/재생’ 버튼 제공
- 표시 순서(D 방식): 방금 내가 남긴 기록이 첫 카드 → 이후는 무작위로 섞되 최근 기록일수록 더 자주 앞에 오며, 한 바퀴 도는 동안 중복 없음
- 20초마다 새 기록을 확인해 아직 보지 않은 구간에 끼워 넣음 (숨김/삭제된 기록은 제거)
- 기록이 없을 때 안내 문구, 불러오기 실패 시 오류 안내와 다시 불러오기 버튼

## 1. Supabase 설정

1. https://supabase.com 에서 새 프로젝트를 만듭니다. (무료 플랜 가능)
2. 왼쪽 메뉴 **SQL Editor** → New query → `supabase/schema.sql` 내용을 붙여넣고 **Run**
3. **Project Settings → API** 에서 아래 두 값을 확인합니다.
   - Project URL
   - `anon` (또는 `publishable`) 키
   - ⚠️ `service_role` / `secret` 키는 이 프로젝트 어디에도 넣지 않습니다.

권한 구조: 공개 키로는 (1) 숨김 처리되지 않은 기록의 `id/content/created_at` 읽기, (2) 기록 추가만 가능합니다. 수정·삭제는 불가능합니다.

### 부적절한 기록 숨기기/삭제하기
Supabase 대시보드 → **Table Editor → records**
- 숨기기: 해당 행의 `is_hidden` 을 `true` 로 변경 (화면에서 사라지고 데이터는 보존)
- 삭제: 해당 행 삭제

## 2. 로컬 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:3000
```

`.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon 또는 publishable 키
```

## 3. GitHub에 올리기

```bash
git init
git add .
git commit -m "혹시 모르니까 iii"
git branch -M main
git remote add origin https://github.com/<내계정>/<저장소이름>.git
git push -u origin main
```

(`.env.local` 은 `.gitignore` 에 들어 있어 올라가지 않습니다.)

## 4. Vercel 배포

1. https://vercel.com 로그인 → **Add New → Project** → GitHub 저장소 선택
2. **Environment Variables** 에 위 두 값을 그대로 등록
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. **Deploy**
4. 배포가 끝나면 Production 도메인(예: `https://프로젝트이름.vercel.app`)이 생깁니다. 이 주소로 QR 코드를 만드세요.
   - 환경 변수를 나중에 바꾸면 **Redeploy** 해야 반영됩니다.
   - 프리뷰 주소(긴 해시가 붙은 주소)가 아니라 Production 도메인을 QR에 쓰세요.

## 5. 전시 전 확인 체크리스트

- [ ] 배포 주소에서 기록 제출 → 두 번째 화면으로 이동
- [ ] 다른 휴대폰/PC에서 같은 주소로 접속해 방금 남긴 기록이 보이는지 확인
- [ ] 카드 약 3초 자동 전환, 스와이프, 이전/다음, 멈춤/재생
- [ ] 휴대폰 와이파이를 끄고 제출 → 오류 메시지가 뜨는지 확인
- [ ] Supabase 에서 테스트 기록의 `is_hidden` 을 켜서 사라지는지 확인한 뒤, 테스트 기록 삭제
- [ ] QR 코드를 실제 휴대폰으로 스캔해서 접속 확인

## 참고

- 익명 참여가 원칙이라 이름·이메일 등은 받지 않습니다.
- 공개 폼이므로 악의적인 대량 입력이 들어올 수 있습니다. 전시 중에는 가끔 Table Editor 에서 확인해 주세요. 필요하면 이후 요청 제한(rate limit)을 추가할 수 있습니다.
- Supabase 무료 프로젝트는 일정 기간 접속이 없으면 일시 정지될 수 있으니, 전시 직전에 한 번 접속해 두세요.
