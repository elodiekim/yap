# Yap

> every day, one more sentence than yesterday

영어 말하기를 매일 조금씩 늘리는 웹앱. AI가 친근한 원어민 튜터처럼 질문하고, 답변을 자연스럽게 고쳐주고, 절대 대화를 끝내지 않습니다.

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

`localStorage`에 저장됩니다 (계정·서버 DB 없음). 매 요청마다 프로필이 프롬프트로 전달돼서 Yap이:

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

## 참고

- 응답은 양쪽 프로바이더 모두 JSON schema로 강제됩니다 (`src/lib/schemas.ts`).
- 피드백 생성은 thinking/effort `medium`, 질문 생성은 `low`.
- 배포 시 `LLM_PROVIDER`와 해당 API 키를 환경변수로 넣으세요. 앱 자체에 인증이 없으니 공개 배포하면 API 비용이 누구에게나 열립니다 — 공개할 거면 인증이나 rate limit을 먼저 붙이세요.
