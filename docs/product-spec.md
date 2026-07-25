# Yap 기획서

> every day, one more sentence than yesterday — 어제보다 한 문장 더

마지막 수정: 2026-07-25

---

## 1. 한 줄 정의

매일 영어로 한 토픽씩 말하고, 원어민 톤으로 고쳐 받고, 그 기록이 쌓이는 것을 눈으로 보는 앱.

## 2. 왜 만드는가

ChatGPT로 영어 말하기 연습을 하고 있었지만 세 가지가 계속 걸렸다.

1. **기록이 안 남는다.** 대화창을 닫으면 끝이다. 지난주에 뭘 배웠는지, 같은 실수를 반복하는지 알 방법이 없다.
2. **매번 프롬프트를 다시 깔아야 한다.** "칭찬 먼저 해줘, 문법부터 지적하지 마" 를 세션마다 다시 설명하는 게 일이다.
3. **"생각이 안 나요"에서 막힌다.** 이게 제일 크다. 질문은 받았는데 할 말이 떠오르지 않아서 창을 닫아버린다.

Yap은 이 셋을 고정된 제품으로 만든 것이다. 특히 3번 — **질문에는 항상 힌트가 따라붙는다.** 이건 부가 기능이 아니라 이 앱의 존재 이유에 가깝다.

## 3. 누가 쓰는가

**나 혼자 쓴다.** 개인용이다. 이 결정이 아래를 전부 좌우한다.

- 온보딩, 튜토리얼, 랜딩 페이지, 요금제 → **없음**
- 로그인은 "여러 사용자를 구분하려고"가 아니라 **내 기기끼리 기록을 잇고, 남이 내 API 비용을 태우지 못하게 막으려고** 있다
- 사용자별 rate limit, 어뷰징 방어, 콘텐츠 신고 → 지금은 불필요
- 나중에 남에게 열고 싶어지면 그때 다시 기획한다. 지금 미리 만들지 않는다

학습자 프로필: 한국어 모어, 영어 중급(B1 전후), 개발자, 호주·뉴질랜드 영어에 익숙함.

## 4. 핵심 루프

```
토픽 선택 → 질문 + 힌트 4~5개 → 3~10문장 작성 → 피드백 6단계 → 다음 질문 → (반복)
```

이 루프에서 절대 깨지면 안 되는 두 가지:

- **대화가 끝나지 않는다.** 피드백 끝에는 항상 다음 질문이 있다. "오늘은 여기까지" 같은 마무리 멘트를 두지 않는다.
- **칭찬이 먼저다.** 문법 지적으로 시작하는 순간 다음 날 안 들어온다.

## 5. 기능 명세

### 5.1 질문과 힌트 — 구현 완료

토픽 9개(자기소개 / 직업 / 취미 / 힘들었던 일 / 고향 / 여행 / 목표 / 연애 / 하루 일과) 중 하나를 고르면 열린 질문 하나가 나온다. 그 아래 **💡 Need ideas?** 힌트 4~5개.

힌트 규칙: 2~6 단어의 명사구나 조각. 완성된 문장도, 모범 답안도 아니다. 서로 다른 각도를 커버해서 최소 하나는 걸리게 한다.

> "Tell me about a challenging project" → A difficult bug / Working with another team / Tight deadlines / A production issue / A communication problem

### 5.2 피드백 — 구현 완료

순서가 고정이다. 이 순서 자체가 기획이다.

| # | 항목 | 규칙 |
|---|---|---|
| 1 | 칭찬 | 구체적으로. "잘했어요" 같은 빈 칭찬 금지. 절대 첫 자리를 양보하지 않음 |
| 2 | 자연스러운 리라이트 | 문법 교정이 아니라 **원어민이 실제로 말하는 방식**으로. 사실 추가 금지, 학습자 개성 보존 |
| 3 | 중요한 실수 3~5개 | 원문 / 개선문 / 한국어 이유 한 줄 / 다른 예문 / 패턴 태그. 사소한 건 버림. 없으면 억지로 만들지 않음 |
| 4 | 유용한 표현 3개 | 반드시 리라이트에서 뽑아옴. 이미 가르친 건 제외 |
| 5 | 쉐도잉 2~3문장 | 리라이트에서 그대로 가져옴. 탭하면 음성 재생 |
| 6 | 다음 질문 | 힌트까지 함께. 방금 말한 구체적 내용을 물고 이어감 |

**언어 분리 원칙:** 학습 재료(질문·힌트·리라이트·표현·쉐도잉·예문)는 영어, 설명(실수 이유·표현 뜻·레벨 코멘트)은 한국어. 설명까지 영어면 읽는 데 힘을 다 써서 정작 학습이 안 된다.

### 5.3 영어 변종 — 구현 완료

`anz`(기본) / `nz` / `au` / `us`. 철자·어휘·문법·말투·발음이 함께 바뀌고, 선택한 변종이 아닌 표현을 쓰면 교정 대상이 된다. 상세는 [README](../README.md#영어-변종-호주뉴질랜드--미국).

### 5.4 대시보드와 트로피 — 구현 완료

연속 학습일, 총 대화 수, 누적 단어 수, 배운 표현 수, CEFR 진행도, **답변당 주요 실수 추이** 그래프.

실수 추이가 이 대시보드의 핵심이다. 나머지는 "얼마나 했나"고, 이것만이 "늘고 있나"를 보여준다.

### 5.5 기록 영속화 — **미구현. 이번 작업 대상**

아래 6절부터.

## 6. 왜 DB가 필요한가

지금 모든 기록은 `localStorage`에 있다. 개인 프로젝트에서 흔한 선택이고 시작하기엔 옳았지만, 이 앱에서는 **핵심 기능을 직접 무너뜨린다.**

| 문제 | 결과 |
|---|---|
| 브라우저 데이터 삭제 | 전부 소멸. 복구 불가 |
| 브라우저·기기마다 별도 저장 | 노트북 크롬과 폰 사파리가 각자 다른 streak을 셈 |
| **사파리 7일 규칙** | WebKit은 7일간 방문이 없으면 스크립트가 저장한 데이터를 삭제한다 |
| 시크릿 모드 | 창 닫으면 소멸 |

사파리 항목이 결정적이다. 이 앱의 동기 부여 장치는 연속 학습일인데, **일주일 쉬었다고 30일 기록이 0이 되면** 다시 시작할 이유가 사라진다. 습관 앱에서 이건 치명적이다.

덤으로 하나 더 해결된다. 지금 API 라우트에는 인증이 없어서, 공개 배포하면 **주소를 아는 누구나 내 Gemini 키로 요청을 보낼 수 있다.** 로그인을 붙이면 저장 문제와 이 문제가 한 번에 해결된다.

## 7. 스택 결정

**Supabase** (Postgres + Auth 한 벤더).

| | 선택 이유 |
|---|---|
| Supabase | DB와 인증이 한 곳. 관리할 벤더가 하나. Next.js 연동 문서가 잘 돼 있음 |
| ~~Neon + Auth.js~~ | 각각은 좋지만 설정할 조각이 두 배. 개인 프로젝트엔 과함 |
| ~~Turso (SQLite)~~ | 가볍지만 인증을 따로 붙여야 함 |

무료 티어 (2026-07 기준, [공식 페이지](https://supabase.com/pricing) 확인):

- DB 500MB · 인증 50,000 MAU · egress 5GB · 파일 1GB · 활성 프로젝트 2개
- **1주일간 활동이 없으면 프로젝트가 일시정지된다** (대시보드에서 복구 가능)

세션 1건이 대략 2~4KB다. 500MB면 현실적으로 안 찬다. 일시정지 조건은 매일 쓰는 앱이라 걸릴 일이 없고, 걸려도 클릭 한 번이다.

## 8. 데이터 모델

원칙: **`sessions`가 사실의 원본이고, 나머지 통계는 전부 계산해서 얻는다.** 지금처럼 집계값을 따로 들고 다니면 언젠가 어긋난다.

```sql
create table profiles (
  id               uuid primary key references auth.users on delete cascade,
  level            text not null default 'B1' check (level in ('A2','B1','B2','C1')),
  english_variant  text not null default 'anz' check (english_variant in ('anz','nz','au','us')),
  timezone         text not null default 'Asia/Seoul',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  practised_on   date not null,          -- 사용자 로컬 기준 날짜. streak의 근거
  topic          text,
  question       text,
  answer         text,
  word_count     int  not null default 0,
  mistake_count  int  not null default 0, -- 추이 그래프용 비정규화
  level          text check (level in ('A2','B1','B2','C1')),
  feedback       jsonb,                   -- 응답 원본 전체
  source         text not null default 'live' check (source in ('live','import')),
  created_at     timestamptz not null default now()
);
create index on sessions (user_id, practised_on);

create table expressions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  session_id  uuid references sessions on delete set null,
  phrase      text not null,
  meaning     text not null,
  example     text not null,
  created_at  timestamptz not null default now()
);
create unique index expressions_user_phrase on expressions (user_id, lower(phrase));

create table mistakes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  session_id  uuid not null references sessions on delete cascade,
  tag         text not null,
  original    text not null,
  better      text not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);
create index on mistakes (user_id, tag);

create table badges (
  user_id   uuid not null references auth.users on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
```

설계 판단 세 가지:

**`practised_on`을 `date`로 따로 둔다.** `created_at`에서 뽑으면 안 된다. 한국 시간 새벽 12시 30분 세션은 UTC로는 전날이라 streak이 하루 어긋난다. 클라이언트가 계산한 로컬 날짜를 그대로 저장한다.

**`feedback`을 jsonb로 통째로 남긴다.** 정규화한 테이블과 중복이지만, 지난 세션을 그대로 다시 렌더링할 수 있고 나중에 "이것도 뽑아둘 걸" 할 때 원본이 남아 있다. 세션당 몇 KB의 보험.

**`expressions`에 `(user_id, lower(phrase))` 유니크.** "이미 가르친 표현 다시 가르치지 않기"가 DB 제약으로 강제된다.

### 계산으로 얻는 것 (테이블 없음)

| 지표 | 계산 |
|---|---|
| 연속 학습일 | `sessions`의 distinct `practised_on` |
| 총 대화 수 | `count(sessions)` |
| 누적 단어 수 | `sum(word_count)` |
| 실수 추이 | `practised_on` 순 `mistake_count` 이동평균 |
| 다룬 토픽 | distinct `topic` |
| 반복 실수 패턴 | `mistakes.tag` 빈도 |
| CEFR 이력 | `level`이 바뀐 세션들 |

## 9. 아키텍처

### 인증

Supabase Auth + 구글 로그인. 개인용이므로 **내 계정을 만든 직후 대시보드에서 신규 가입을 차단한다** (Authentication → 회원가입 비활성화). 이게 API 비용을 막는 가장 단순하고 확실한 장치다.

모든 테이블에 RLS를 켜고 `auth.uid() = user_id` 정책을 건다. 개인용이라도 켠다 — 키가 노출됐을 때의 마지막 방어선이고, 나중에 다인용으로 열 때 다시 설계하지 않아도 된다.

### API 라우트

지금은 클라이언트가 `profile`을 요청 본문에 실어 보낸다. 즉 **클라이언트가 자기 학습 이력을 스스로 주장하는 구조**다. 바꾼다.

```
현재:  브라우저 ──profile 전체──> /api/coach ──> Gemini
변경:  브라우저 ──답변만──────> /api/coach ──> DB에서 프로필 조회
                                        └──> Gemini
                                        └──> 세션·표현·실수·트로피 저장
                                        <──  피드백 + 새로 딴 트로피
```

이렇게 하면 페이로드가 줄고, 통계 위조가 불가능해지고, 저장 누락이 없어진다(피드백을 받았는데 저장에 실패하는 창이 사라진다). 트로피 판정도 서버에서 한다 — 규칙은 `src/lib/store.ts`의 `newBadges()`를 그대로 옮긴다.

### 기존 기록 이전

`localStorage`에 기록이 남아 있으면 첫 로그인 때 한 번 업로드한다.

가져올 수 있는 것: 레벨, 연습한 날짜들, 대화 수, 단어 수, 세션별 실수 개수, 배운 표현, 획득한 트로피.

**가져올 수 없는 것: 실제 질문과 답변 원문.** 지금 구조가 애초에 저장하지 않았다. 그래서 과거 세션은 `source = 'import'`로, `question`/`answer`가 비어 있는 행으로 들어간다. 통계와 그래프는 그대로 살아나고, 지난 대화를 다시 읽는 것만 불가능하다. 오늘 이후 세션부터는 전문이 남는다.

## 10. 안 만들 것

명시적으로 범위 밖. 나중에 마음이 바뀌면 그때 기획한다.

- **음성 입력 (말하기 → STT).** 이름은 "말하기 연습"이지만 지금은 타이핑이다. 쓰면서 생각을 정리하는 단계가 오히려 도움이 되고, STT를 붙이면 정확도 문제로 피드백 품질이 흔들린다.
- **소셜 기능.** 랭킹, 친구, 공유. 혼자 쓰는 앱이다.
- **모바일 앱.** 반응형 웹으로 충분하다.
- **결제.**
- **여러 언어 학습.** 영어만.
- **오프라인 모드.** 어차피 매 세션 API 호출이 필요하다.

## 11. 리스크

| 리스크 | 정도 | 대응 |
|---|---|---|
| **Gemini 무료 한도** — 실측 하루 20회에서 429 | 높음. 이미 겪음 | 하루 20세션이면 개인 사용엔 충분. 부족해지면 유료 전환하거나 `LLM_PROVIDER=claude`로 전환 |
| 인증 없이 공개 배포 시 API 비용 노출 | 높음 | 9절 — 로그인 + 신규 가입 차단. **배포 전 필수** |
| Supabase 1주일 미사용 시 일시정지 | 낮음 | 매일 쓰는 앱. 걸려도 대시보드에서 복구 |
| 모델이 지정한 영어 변종을 못 지킴 | 중간 | 프롬프트에 명시 + 실제 호출로 검증. 변종 추가 시 재확인 |
| 마이그레이션 중 기존 기록 유실 | 중간 | 업로드 성공 확인 전까지 `localStorage`를 지우지 않는다 |

## 12. 로드맵

**1단계 — 저장 (지금 할 것)**
Supabase 프로젝트 생성 → 스키마 + RLS → 구글 로그인 → 라우트를 서버 조회 방식으로 전환 → 기존 기록 이전 → 신규 가입 차단 후 배포

**2단계 — 복습**
지난 세션 다시 보기(전문이 쌓인 뒤에야 의미가 있음). 반복 실수 태그 상위 항목을 다음 질문에 반영. 배운 표현 목록 페이지.

**3단계 — 그 다음**
음성 입력 재검토. 토픽 직접 추가. 주간 요약.

---

## 부록: 현재 코드 구조

```
src/
  app/
    page.tsx              앱 셸 (홈 ↔ 세션 전환, 트로피 토스트)
    api/question/route.ts 토픽 → 질문 + 힌트
    api/coach/route.ts    답변 → 6단계 피드백
  components/
    Home.tsx / Session.tsx / FeedbackView.tsx / Dashboard.tsx / ui.tsx
  lib/
    llm.ts       프로바이더 분기        gemini.ts / claude.ts  실제 호출
    prompts.ts   페르소나·피드백 규칙   english.ts             영어 변종 규칙
    schemas.ts   응답 JSON 스키마       store.ts               localStorage (→ 1단계에서 교체)
    types.ts / topics.ts
```
