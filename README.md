# Yap

> every day, one more sentence than yesterday

영어 말하기를 매일 조금씩 늘리는 웹앱. AI가 친근한 원어민 튜터처럼 질문하고, 답변을 자연스럽게 고쳐주고, 절대 대화를 끝내지 않습니다.

기획 의도, 데이터 모델, 로드맵은 [기획서](docs/product-spec.md)에 있습니다.

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # GEMINI_API_KEY=... 를 채워넣기
npm run dev
```

<http://localhost:3000> 접속.

키는 <https://aistudio.google.com/apikey> 에서 발급합니다. 서버 라우트에서만 쓰이고 브라우저로 나가지 않습니다.

## 모델 프로바이더 고르기

`.env.local`의 `LLM_PROVIDER`로 전환합니다.

| | Gemini (기본값) | Claude |
|---|---|---|
| 설정 | `LLM_PROVIDER=gemini`<br>`GEMINI_API_KEY=...` | `LLM_PROVIDER=claude`<br>`ANTHROPIC_API_KEY=...` |
| 모델 | `gemini-3.6-flash` | `claude-opus-5` |
| 비용 | 무료 티어 있음 (분당·일일 요청 제한) | 무료 티어 없음, 종량제 |

무료 티어의 정확한 한도는 계정·지역마다 달라서 [AI Studio 대시보드](https://aistudio.google.com/rate-limit)에서 확인해야 합니다. Pro 모델은 유료 전용이라 `GEMINI_MODEL`을 Pro로 바꾸면 과금됩니다.

프로바이더 코드는 `src/lib/llm.ts`가 분기하고, 실제 호출은 `gemini.ts` / `claude.ts`에 각각 들어 있습니다. 프롬프트·스키마·UI는 양쪽이 공유합니다.

## 동작 방식

1. 토픽을 하나 고른다 (자기소개, 직업, 취미, 힘들었던 일, 고향, 여행, 목표, 연애, 하루 일과)
2. Yap이 열린 질문 하나 + **💡 Need ideas?** 힌트 4~5개를 준다 — "생각이 안 나요" 문제를 막기 위한 핵심 기능
3. 3~10문장을 쓴다 (⌘↵ 로 제출)
4. 피드백이 정해진 순서로 온다:
   - **칭찬 먼저** — 문법 지적으로 절대 시작하지 않음
   - **자연스러운 리라이트** — 문법만 고친 게 아니라 원어민이 실제로 말하는 방식으로
   - **중요한 실수 3~5개만** — 원문 / 개선문 / 짧은 이유 / 다른 예문
   - **유용한 표현 3개** — 리라이트에서 뽑아옴
   - **쉐도잉 문장 2~3개** — 탭하면 소리로 읽어줌 (Web Speech API)
   - **다음 질문** — 힌트까지 같이. 대화는 끝나지 않음
5. 계속 답하면 대화가 이어짐

## 기억하는 것

`data/yap.db` (로컬 SQLite 파일 하나, gitignore 대상). 계정도 서버도 없습니다 — Node 내장 `node:sqlite`를 써서 추가 의존성도 없습니다.

### 지난 연습 다시 보기

앱 상단의 **지난 연습**을 누르면 날짜별 목록이 나오고, 세션을 고르면 그때 받은 질문 / 내가 쓴 답변 / 피드백 전문이 그대로 다시 보입니다.

`localStorage`에서 이전해온 기록은 점선 카드로 표시되고 열리지 않습니다 — 옛 구조가 질문·답변을 저장하지 않아서 통계만 남아 있기 때문입니다.

### 터미널에서 들여다보기

```bash
npm run db          # 요약 + 최근 세션 + 배운 표현 + 자주 틀리는 패턴
npm run db -- 12    # 12번 세션 전문 (질문 / 답변 / 피드백 전체)
```

SQL을 직접 쓰고 싶으면 macOS에 이미 들어 있는 `sqlite3`로:

```bash
sqlite3 data/yap.db
sqlite> .tables
sqlite> select practised_on, topic, word_count from sessions order by id desc limit 5;
```

테이블은 `sessions` / `expressions` / `mistakes` / `badges` / `profile` 다섯 개입니다. 구조는 [기획서 8절](docs/product-spec.md)에 있습니다.

### 백업

`.env.local`에 백업 경로를 넣으면 **세션이 저장될 때마다 자동으로 스냅샷을 뜹니다.** 따로 하실 게 없습니다.

```
YAP_BACKUP=/Users/사용자명/Library/Mobile Documents/com~apple~CloudDocs/yap-backup.db
```

지금 바로 한 번 뜨고 싶으면 `npm run backup`.

DB 파일을 iCloud 폴더에 **직접 두지는 마세요.** 옆에 WAL 파일이 같이 돌아가서 동기화 중에 깨질 수 있습니다. 위 방식은 SQLite의 `VACUUM INTO`로 일관된 사본 하나를 만들기 때문에 안전하고, 임시 파일에 쓴 뒤 이름을 바꾸므로 백업이 중간에 끊겨도 기존 백업이 망가지지 않습니다. 백업이 실패해도 연습 기록 저장은 그대로 됩니다.

경로를 비워두면 백업을 하지 않습니다. 그 경우 `data/yap.db`가 유일한 사본이라 노트북이 죽으면 기록도 사라집니다.

예전에 `localStorage`로 쓰던 기록이 있으면 첫 실행 때 자동으로 옮겨옵니다 (원본은 `yap.profile.v1.migrated` 키에 그대로 남겨둡니다). 다만 옛 구조가 질문·답변 원문을 저장하지 않아서, 통계와 그래프는 살아나지만 지난 대화를 다시 읽는 건 이전 이후 기록부터 가능합니다.

매 요청마다 서버가 DB에서 프로필을 읽어 프롬프트에 넣기 때문에 Yap이:

- 이미 가르친 표현을 다시 가르치지 않음
- 반복되는 실수 패턴을 추적함
- 이미 다룬 토픽을 기억함
- 추정 CEFR 레벨(A2~C1)에 맞춰 다음 질문 난이도를 조절함

## 대시보드

연속 학습일(streak), 총 대화 수, 누적 단어 수, 배운 표현 수, CEFR 진행도, 그리고 **답변당 주요 실수 추이** 그래프. 트로피는 7일 연속, 하루 200단어, 표현 30개 등에서 열립니다.

## 구조

```
src/
  app/
    page.tsx              앱 셸 (홈 ↔ 세션 전환, 뱃지 토스트)
    api/question/route.ts 토픽 → 질문 + 힌트
    api/coach/route.ts    답변 → 6단계 피드백
  components/
    Home.tsx              히어로 + 토픽 그리드 + 대시보드
    Session.tsx           질문 / 작성 / 피드백 루프
    FeedbackView.tsx      피드백 6단계 카드
    Dashboard.tsx         스탯, CEFR 미터, 실수 추이 차트, 트로피
    ui.tsx                Card / Button / Pill 등 공용 요소
  lib/
    llm.ts                프로바이더 분기 + 에러 메시지
    gemini.ts             Gemini 호출 (structured output)
    claude.ts             Claude 호출 (structured output)
    prompts.ts            튜터 페르소나와 피드백 규칙 (톤 수정은 여기서)
    english.ts            영어 변종 규칙 (호주·뉴질랜드 / 미국)
    schemas.ts            응답 JSON 스키마
    store.ts              localStorage 외부 스토어, streak/뱃지 계산
    types.ts, topics.ts
```

## 커스터마이즈

- **튜터 성격·피드백 규칙** → `src/lib/prompts.ts`
- **토픽 추가** → `src/lib/topics.ts`
- **트로피 조건** → `src/lib/store.ts`의 `newBadges()` + `Dashboard.tsx`의 `BADGE_LABELS`
- **색상·폰트** → `src/app/globals.css`의 `@theme`. 클라우드 화이트(`#F7F8FA`) 배경에 1px 헤어라인과 여백으로만 층을 만듭니다. 강조색은 딥 틸 하나뿐이고, 의미가 있는 자리에만 씁니다. 폰트는 IBM Plex Sans KR 한 종류로 영문·한글을 모두 처리합니다.
- **차트 색** → `Dashboard.tsx`의 `LINE`·`RAMP` 상수. `LINE`은 흰 카드 위 5.4:1 대비, `RAMP`는 밝기가 단조 감소하는 단일 색조 램프입니다. 바꾸면 두 성질을 유지하세요.
- **표시 언어** → 학습 재료(질문·리라이트·표현·쉐도잉)는 영어, 설명(실수 이유·표현 뜻·레벨 코멘트)은 한국어입니다. 규칙은 `src/lib/prompts.ts`의 LANGUAGE 절에 있고, UI 문구는 각 컴포넌트에 직접 들어 있습니다.
- **영어 변종** → `src/lib/english.ts`. 호주·뉴질랜드(기본) 또는 미국식. 아래 절 참고.

## 영어 변종 (호주·뉴질랜드 / 미국)

가르치는 영어의 종류를 고를 수 있습니다. `.env.local`에서 두 줄을 같은 값으로 맞추세요.

```
ENGLISH_VARIANT=anz              # anz(기본) | nz | au | us
NEXT_PUBLIC_ENGLISH_VARIANT=anz  # 쉐도잉 음성 선택용
```

| 값 | 가르치는 영어 |
|---|---|
| `anz` (기본) | 호주·뉴질랜드 공통. 한쪽에서만 쓰는 속어(arvo, sweet as, jandals 등)는 피합니다 |
| `nz` | 뉴질랜드 쪽으로. sweet as, chur, tramping, the dairy, jandals, bach |
| `au` | 호주 쪽으로. arvo, brekkie, servo, thongs, esky, "no dramas" |
| `us` | 일반 미국 영어(General American). 지역색 강한 속어(y'all, hella, wicked)는 피합니다 |

`both`는 `anz`의 옛 이름이라 그대로 써도 동작합니다.

변종을 바꾸면 다섯 가지가 함께 바뀝니다.

| | 호주·뉴질랜드 (`anz` / `nz` / `au`) | 미국 (`us`) |
|---|---|---|
| 철자 | realise, colour, centre, travelled, maths<br>practise(동사)/practice(명사) 구분 | realize, color, center, traveled, math<br>practice 하나로 통일 |
| 어휘 | lift, flat, holiday, uni, petrol, footpath, rubbish, queue, CV, mobile | elevator, apartment, vacation, college, gas, sidewalk, trash, line, resume, cell phone |
| 문법 | on the weekend, in hospital, different to, have got | on weekends, in the hospital, different from, gotten |
| 말투 | 절제하고 담백하게. 미국식 응원("awesome job", "you got this")과 느낌표 남발 금지 | 따뜻하고 직접적으로. 느낌표도 자연스럽게. 다만 과장된 hype와 회사원 상투어("reach out", "circle back")는 금지 |
| 교정 | 학습자가 미국식 표현을 쓰면 실수로 잡아서 고쳐줍니다 | 반대로 영연방식 표현을 쓰면 짚어줍니다 (틀린 게 아니라 "미국에선 이렇게 말해요" 톤으로) |
| 발음 | en-NZ → en-AU → en-GB 순으로 목소리 선택 | en-US → en-CA 순 |

어느 쪽이든 속어를 과하게 넣지 않도록 프롬프트에 제한을 걸어뒀습니다. 실사용 영어가 목적이지 흉내가 목적이 아니라서요.

## 참고

- 응답은 양쪽 프로바이더 모두 JSON schema로 강제됩니다 (`src/lib/schemas.ts`).
- 피드백 생성은 thinking/effort `medium`, 질문 생성은 `low`.
- 배포 시 `LLM_PROVIDER`와 해당 API 키를 환경변수로 넣으세요. 앱 자체에 인증이 없으니 공개 배포하면 API 비용이 누구에게나 열립니다 — 공개할 거면 인증이나 rate limit을 먼저 붙이세요.
