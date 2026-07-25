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
- 로그인 → **없음.** 노트북에서만 돌리니 구분할 사용자도, 막을 외부 접근도 없다 (7절)
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

### 5.5 기록 영속화 — 구현 완료 (2026-07-26)

로컬 SQLite 파일. 6~9절 참고.

## 6. 왜 DB가 필요한가

지금 모든 기록은 `localStorage`에 있다. 개인 프로젝트에서 흔한 선택이고 시작하기엔 옳았지만, 이 앱에서는 **핵심 기능을 직접 무너뜨린다.**

| 문제 | 결과 |
|---|---|
| 브라우저 데이터 삭제 | 전부 소멸. 복구 불가 |
| **사파리 7일 규칙** | WebKit은 7일간 방문이 없으면 스크립트가 저장한 데이터를 삭제한다 |
| 시크릿 모드 | 창 닫으면 소멸 |
| 브라우저마다 별도 저장 | 크롬에서 쌓은 기록이 사파리엔 없음 |

사파리 항목이 결정적이다. 이 앱의 동기 부여 장치는 연속 학습일인데, **일주일 쉬었다고 30일 기록이 0이 되면** 다시 시작할 이유가 사라진다. 습관 앱에서 이건 치명적이다.

## 7. 스택 결정 — 로컬 SQLite

**`node:sqlite`로 노트북에 파일 하나.** 의존성 추가 없음, 서버 없음, 로그인 없음.

이 결정은 3절에서 나온다. **노트북에서만 쓴다.** 폰에서 안 쓰면 기록을 인터넷에 올릴 이유가 없고, 인터넷에 안 올리면 배포할 이유가 없고, 배포를 안 하면 로그인이 필요 없다. 인증은 저장 문제를 풀려고 있었던 게 아니라 **공개 배포의 부작용을 막으려고** 있었던 것이다. 배포를 안 하면 그 부작용 자체가 없다.

| | 로컬 SQLite | ~~Supabase~~ |
|---|---|---|
| 준비물 | 없음. Node 22.5+ 내장 | 프로젝트 생성, 구글 OAuth, RLS 정책, 세션 처리, 가입 차단 |
| 의존성 | **0개** | `@supabase/supabase-js`, `@supabase/ssr` |
| 로그인 | 불필요 | 필수 |
| 폰에서 접속 | 안 됨 | 됨 |
| 백업 | **직접 해야 함** | 벤더가 함 |

`node:sqlite`는 Node 22.5부터 표준 라이브러리다 (현재 로컬 Node v23.7.0에서 동작 확인). `better-sqlite3` 같은 네이티브 모듈도 필요 없다.

**대신 백업은 내 책임이 된다.** 노트북이 죽으면 기록도 죽는다. DB 파일을 iCloud/Dropbox 동기화 폴더에 두거나 주기적으로 복사하는 것으로 충분하다 — 파일 하나다.

폰에서 쓰고 싶어지면 그때 Supabase로 옮긴다. 8절 스키마를 Postgres 문법으로 바꾸고 `user_id` 컬럼을 더하면 되게 설계해 둔다.

## 8. 데이터 모델

원칙: **`sessions`가 사실의 원본이고, 나머지 통계는 전부 계산해서 얻는다.** 지금처럼 집계값을 따로 들고 다니면 언젠가 어긋난다.

파일 위치는 `data/yap.db` (gitignore 대상). 열 때 `pragma journal_mode = WAL`과 `pragma foreign_keys = ON`을 건다.

```sql
create table if not exists profile (          -- 한 줄만 존재
  id               integer primary key check (id = 1),
  level            text not null default 'B1' check (level in ('A2','B1','B2','C1')),
  english_variant  text not null default 'anz',
  updated_at       text not null default (datetime('now'))
);

create table if not exists sessions (
  id             integer primary key autoincrement,
  practised_on   text not null,           -- 'YYYY-MM-DD', 로컬 기준 날짜. streak의 근거
  topic          text,
  question       text,
  answer         text,
  word_count     integer not null default 0,
  mistake_count  integer not null default 0,  -- 추이 그래프용 비정규화
  level          text check (level in ('A2','B1','B2','C1')),
  feedback       text,                    -- 응답 JSON 원본 전체
  source         text not null default 'live' check (source in ('live','import')),
  created_at     text not null default (datetime('now'))
);
create index if not exists sessions_day on sessions (practised_on);

create table if not exists expressions (
  id          integer primary key autoincrement,
  session_id  integer references sessions(id) on delete set null,
  phrase      text not null,
  meaning     text not null,
  example     text not null,
  created_at  text not null default (datetime('now'))
);
create unique index if not exists expressions_phrase on expressions (lower(phrase));

create table if not exists mistakes (
  id          integer primary key autoincrement,
  session_id  integer not null references sessions(id) on delete cascade,
  tag         text not null,
  original    text not null,
  better      text not null,
  reason      text not null
);
create index if not exists mistakes_tag on mistakes (tag);

create table if not exists badges (
  badge_id   text primary key,
  earned_at  text not null default (datetime('now'))
);
```

설계 판단 세 가지:

**`practised_on`을 따로 저장한다.** `created_at`에서 뽑으면 안 된다. SQLite의 `datetime('now')`는 UTC라, 한국 시간 새벽 12시 30분 세션은 전날로 기록돼 streak이 하루 어긋난다. 클라이언트가 계산한 로컬 날짜를 그대로 넣는다.

**`feedback`을 JSON 문자열로 통째로 남긴다.** 정규화한 테이블과 중복이지만, 지난 세션을 그대로 다시 렌더링할 수 있고 나중에 "이것도 뽑아둘 걸" 할 때 원본이 남아 있다. 세션당 몇 KB의 보험.

**`expressions`에 `lower(phrase)` 유니크.** "이미 가르친 표현 다시 가르치지 않기"가 DB 제약으로 강제된다.

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

### 인증 — 없음

로컬에서만 도는 앱이라 로그인이 없다. `next dev`는 기본으로 localhost에만 바인딩되므로 외부에서 접근할 수 없고, 따라서 내 Gemini 키를 남이 쓸 경로도 없다.

**이 전제가 깨지는 순간이 두 개 있고, 둘 다 하면 안 된다.** (1) `next dev --hostname 0.0.0.0`으로 띄워 같은 와이파이에 노출하는 것, (2) Vercel 등에 배포하는 것. 둘 중 하나라도 하려면 그 전에 인증을 붙여야 한다. 11절 참고.

### DB 접근

`src/lib/db.ts`가 `DatabaseSync` 인스턴스 하나를 들고, 처음 열 때 8절 스키마를 실행한다 (`create table if not exists`라 매번 안전하다). 개발 서버는 코드가 바뀔 때마다 모듈을 다시 불러오므로 **인스턴스를 `globalThis`에 캐시해서** 핫 리로드마다 파일을 다시 여는 것을 막는다.

`node:sqlite`는 동기 API다. 라우트 안에서 그냥 호출하면 된다 — 로컬 파일이라 지연이 마이크로초 단위고, 사용자가 한 명이라 경합도 없다.

### API 라우트

지금은 클라이언트가 `profile`을 요청 본문에 실어 보낸다. 즉 **클라이언트가 자기 학습 이력을 스스로 주장하는 구조**다. 바꾼다.

```
현재:  브라우저 ──profile 전체──> /api/coach ──> Gemini
변경:  브라우저 ──답변만──────> /api/coach ──> DB에서 프로필 조회
                                        └──> Gemini
                                        └──> 세션·표현·실수·트로피 저장
                                        <──  피드백 + 새로 딴 트로피
```

혼자 쓰는 앱이라 위조 방지는 이유가 아니다. **저장 누락을 없애는 게 이유다.** 지금은 피드백을 받은 뒤 브라우저가 따로 저장하는데, 그 사이에 탭을 닫으면 방금 한 연습이 사라진다. 서버가 응답을 돌려주기 전에 저장하면 그 창이 없어진다. 페이로드가 줄어드는 건 덤이다.

트로피 판정도 서버로 옮긴다 — 규칙은 `src/lib/store.ts`의 `newBadges()`를 그대로 가져오면 된다.

### 기존 기록 이전

`localStorage`에 기록이 남아 있으면 첫 실행 때 한 번 가져온다.

가져올 수 있는 것: 레벨, 연습한 날짜들, 대화 수, 단어 수, 세션별 실수 개수, 배운 표현, 획득한 트로피.

**가져올 수 없는 것: 실제 질문과 답변 원문.** 지금 구조가 애초에 저장하지 않았다. 그래서 과거 세션은 `source = 'import'`로, `question`/`answer`가 비어 있는 행으로 들어간다. 통계와 그래프는 그대로 살아나고, 지난 대화를 다시 읽는 것만 불가능하다. 오늘 이후 세션부터는 전문이 남는다.

## 10. 안 만들 것

명시적으로 범위 밖. 나중에 마음이 바뀌면 그때 기획한다.

- **음성 입력 (말하기 → STT).** 이름은 "말하기 연습"이지만 지금은 타이핑이다. 쓰면서 생각을 정리하는 단계가 오히려 도움이 되고, STT를 붙이면 정확도 문제로 피드백 품질이 흔들린다.
- **소셜 기능.** 랭킹, 친구, 공유. 혼자 쓰는 앱이다.
- **배포와 로그인.** 노트북에서 `npm run dev`로 쓴다. 7절 참고 — 이걸 안 하는 대가로 인증·RLS·벤더 관리가 통째로 빠진다.
- **폰 지원.** 위와 같은 이유. 폰에서 쓰고 싶어지면 그때 Supabase로 옮긴다.
- **결제.**
- **여러 언어 학습.** 영어만.
- **오프라인 모드.** 어차피 매 세션 API 호출이 필요하다.

## 11. 리스크

| 리스크 | 정도 | 대응 |
|---|---|---|
| **노트북이 죽으면 기록도 죽는다** | 높음 | 로컬 저장을 택한 대가. `data/yap.db`를 동기화 폴더에 두거나 주기적으로 복사. 파일 하나다 |
| **Gemini 무료 한도** — `limit: 20`에서 429 | 높음. 이미 겪음 | 한 대화가 요청 1 + 답변 수만큼이라 하루 서너 판. 부족하면 `GEMINI_MODEL`을 lite로 바꾸거나 유료 전환. 정확한 한도는 [AI Studio 대시보드](https://aistudio.google.com/rate-limit)에서 확인 |
| 배포하거나 `--hostname 0.0.0.0`으로 띄우면 API 키가 열린다 | 높음 | **인증 없는 지금 구조에서는 하지 않는다.** 하려면 그 전에 로그인을 붙인다 (9절) |
| 모델이 지정한 영어 변종을 못 지킴 | 중간 | 프롬프트에 명시 + 실제 호출로 검증. 변종 추가 시 재확인 |
| 마이그레이션 중 기존 기록 유실 | 중간 | DB 저장 성공을 확인하기 전까지 `localStorage`를 지우지 않는다 |

### 비용 (2026-07 실측 기준)

프롬프트 실측: 피드백 시스템 1,763토큰 / 질문 시스템 1,506토큰. 단가는 3.6 Flash 유료 기준 입력 $1.50, 출력 $7.50 per 1M (사고 토큰은 출력 단가).

대화 한 판(답변 5개) 약 $0.10, **매일 한 판이면 월 $3 안팎.** 무료 티어에 머물면 $0. 호스팅도 DB도 없으니 이게 전부다.

**프롬프트를 줄이는 최적화는 하지 않는다.** 입력은 전체 비용의 15% 남짓이라 절반으로 줄여도 월 100원 수준이고, 무엇보다 지금 병목은 토큰이 아니라 요청 수라서 아무 효과가 없다. 비용이 문제가 되면 `thinking_level`을 낮추는 쪽이 유일하게 의미 있는 레버다.

## 12. 로드맵

**1단계 — 저장 ✅ 완료 (2026-07-26)**
`db.ts`(스키마·싱글턴·트랜잭션) + `repo.ts`(질의) + `stats.ts`(서버·클라이언트 공용 순수 함수). 라우트는 DB에서 프로필을 읽고 응답 전에 세션을 저장한다. `store.ts`는 서버 프로필의 브라우저 캐시가 됐고, 첫 실행 때 `localStorage` 기록을 한 번 가져온 뒤 원본을 `yap.profile.v1.migrated`로 보관한다. `data/`는 gitignore.

**1.5단계 — 백업 (해야 함)**
`data/yap.db`를 동기화 폴더에 두거나 복사하는 습관. 11절 첫 줄이 이제 유일한 데이터 손실 경로다.

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
