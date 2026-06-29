# 디자인 토큰 컨벤션 — 브랜드 그린

KBO Platform 프론트엔드의 브랜드 색상은 **[src/index.css](../src/index.css)의 `:root`가 단일 진실 공급원(SSOT)** 입니다. Tailwind(`tailwind.config.js`)는 이 토큰을 **참조만** 하며 색상 값을 직접 정의하지 않습니다.

> 원시 hex(`#1b4338` / `#2f6c5c` / `#63b39b`)를 컴포넌트에 다시 하드코딩하지 마세요. 아래 유틸리티/토큰을 사용합니다.

## 1. 토큰 ↔ 유틸리티 매핑

| 용도 | CSS 토큰 (index.css `:root`) | hex | Tailwind 유틸리티 | 모드 |
|---|---|---|---|---|
| Primary (기본) | `--primary` (= green-700, HSL) | #235346(light) / #40967f(dark) | `bg-primary`, `text-primary` | **모드 인식**(다크에서 자동 밝아짐) |
| Primary hover | `--brand-primary-hover` | #2f6c5c | `bg-primary-hover` | 모드 불변 |
| Primary dark(버튼 기본 배경) | `--brand-primary-rest` | #1b4338 | `bg-primary-dark` | 모드 불변 |
| Primary light(다크모드 텍스트) | `--brand-primary-light` | #63b39b | `text-primary-light` | 모드 불변 |

`--brand-primary-*`는 **공백 구분 RGB 채널**(`27 67 56` …)로 정의되어 Tailwind `<alpha-value>` 투명도 모디파이어를 지원합니다 (예: `bg-primary-dark/80`).

### 핵심 뉘앙스: 모드 인식 vs 모드 불변
- `bg-primary` / `text-primary`는 HSL 토큰이라 **다크모드에서 자동으로 더 밝은 그린**으로 전환됩니다.
- `bg-primary-dark` / `bg-primary-hover` / `text-primary-light`는 `:root`에만 정의되어 **light/dark에서 값이 동일**합니다.
- 그래서 어두운 배경에서 브랜드 텍스트 가독성이 필요할 때는 `text-primary`에 **`dark:text-primary-light`** 를 함께 붙입니다(예: `text-primary dark:text-primary-light`).

## 2. 권장 호버·셰이드 컨벤션 (둘 다 허용)

**A. 정식 컴포넌트 (shadcn 계열)**
- 채움 버튼: `bg-primary text-primary-foreground hover:bg-primary/90` (= [button.tsx](../src/components/ui/button.tsx)의 `default` variant)
- 또는 브랜드 CSS 컴포넌트 클래스 `btn-brand` / `btn-brand-outline` ([index.css](../src/index.css) `@layer components`) — `--action-primary-bg/-hover/-active` 토큰 사용, hover/active/disabled 상태 내장.

**B. 셰이드 계열 (Mate/Navbar 등 기존 패턴)**
- 버튼 기본/호버: `bg-primary-dark hover:bg-primary` 또는 `bg-primary hover:bg-primary-hover`
- 다크모드 강조 텍스트: `text-primary dark:text-primary-light`

신규 코드는 가급적 **A(정식)** 를 우선하되, 셰이드 토큰이 필요한 경우 **B**의 유틸리티를 사용하고 원시 hex는 쓰지 않습니다.

## 3. 의도적 예외 — coachStyleTokens

[src/components/prediction/coachStyleTokens.ts](../src/components/prediction/coachStyleTokens.ts)는 AI 코치 카드 전용의 **의도적으로 격리된** LIGHT/DARK 팔레트입니다. slate·emerald·rose·amber 및 페이퍼 텍스처 등 카드 고유 색을 인라인 스타일로 직접 정의하며, 이는 설계상 허용됩니다. 단 **브랜드 그린만은 SSOT(`--brand-primary-rest`)를 참조**합니다. 이 파일의 상태색/중립색을 앱 `--status-*`/중립 토큰으로 강제 치환하지 마세요(시각 회귀 발생).

## 4. 타이포·반경 토큰 (Phase 2 완료)

임의값 `text-[NNpx]` / `rounded-[NNpx]`는 모두 **명명 토큰으로 치환 완료**(0건 잔존). 신규 코드도 임의값 대신 아래 토큰을 사용합니다.

### 타이포 ([tailwind.config.js](../tailwind.config.js) `theme.extend.fontSize`)
- **font-size 전용**(line-height 미지정)으로 정의 → cascade line-height를 보존. Tailwind 기본 `text-base/sm/xs`(line-height 동반)로 매핑하지 **않습니다**.
- 시맨틱: `text-body`(=`var(--font-body-size)`, 16px) · `text-caption`(=`var(--font-caption-size)`, 14px).
- 숫자: `text-8 … text-160` (`text-11`, `text-13`, `text-15`, `text-17` 등 — px 그대로).

### 반경 ([tailwind.config.js](../tailwind.config.js) `theme.extend.borderRadius`)
- Tailwind 기본 정확 일치값 재사용: 8px→`rounded-lg`, 12px→`rounded-xl`, 16px→`rounded-2xl`, 24px→`rounded-3xl`.
- 그 외: `rounded-7 … rounded-56` (방향 변형 `rounded-t-20` 등 동일 토큰 사용).

### codemod
- 임의값 치환은 [scripts/codemod-arbitrary-classes.mjs](../scripts/codemod-arbitrary-classes.mjs)(매핑 테이블 + `--dry-run`/`--dir`/`--kind`)로 수행. 새 크기 추가 시 이 매핑과 위 토큰을 함께 갱신.

## 5. 로드맵 (Phase 3, 예정)
- 비-팀 하드코딩 hex(className 212곳) + 인라인 `fontSize`(88곳) → 토큰 치환 (구단색 `TEAM_COLORS_MAP`은 제외).
- 드리프트 재발 방지: 신규 `text-[NNpx]`/`rounded-[NNpx]`/비-팀 hex를 차단하는 grep/lint 가드.
