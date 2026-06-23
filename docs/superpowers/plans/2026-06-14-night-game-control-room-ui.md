# Night Game Control Room UI Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first focused UI improvement slice that keeps BEGA's dark baseball identity while fixing mobile overlap, improving landing conversion, and piloting product-grade loading and empty states.

**Architecture:** Keep the existing React/Vite/Tailwind structure. Add small token and primitive improvements first, then apply them to one high-impact vertical slice: public mobile chrome, landing, and representative state surfaces. Do not redesign every page in this plan.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS classes, CSS custom properties in `src/index.css`, Cypress for visual and mobile UX regression checks.

---

## Recommended First PR Scope

First PR title: `ui: refine public mobile chrome and landing state slice`

Include only:
- Mobile bottom chrome safe-area and overlap fixes for public shell and cheer shell.
- Landing hero density, CTA wording, and feature fallback improvements.
- A shared `ProductState` primitive applied to `PredictionLoadingView` and `StadiumSeatMapManualRequired` as a pilot.
- Token additions that support those changes.
- Cypress coverage for the modified slice.

Exclude from first PR:
- Login/auth layout redesign.
- Full stadium seat map UX redesign.
- Team-color expansion across all screens.
- Admin, mypage, diary, leaderboard, and full prediction detail redesign.
- New generated assets.

## File Structure

### Change Targets

- Modify: `src/index.css`
  - Reason: Add reversible design tokens for dark surface depth, mobile chrome spacing, and typography tightening.
  - Responsibility: Global tokens only. Do not move component-specific layout here except shared utility classes.

- Modify: `src/components/Layout.tsx`
  - Reason: Ensure mobile pages have bottom safe space when fixed bottom chrome is present.
  - Responsibility: Public/auth layout wrapper spacing only.

- Modify: `src/components/PublicNavbar.tsx`
  - Reason: Make public mobile bottom nav measurable and token-driven.
  - Responsibility: Public shell top and bottom chrome only.

- Modify: `src/components/Navbar.tsx`
  - Reason: Keep authenticated shell mobile chrome aligned with public shell tokens.
  - Responsibility: Authenticated shell top and bottom chrome only.

- Modify: `src/components/CheerMobileBottomNav.tsx`
  - Reason: Keep cheer-specific mobile nav from covering content and align sizing with shared mobile chrome tokens.
  - Responsibility: Cheer mobile bottom nav only.

- Modify: `src/components/CheerFeedRuntimeContent.tsx`
  - Reason: Expose a stable feed-content test target for mobile chrome overlap verification.
  - Responsibility: Add test id only; do not change feed data, virtualization, or card rendering.

- Modify: `src/components/AuthenticatedLayoutChrome.tsx`
  - Reason: Move the authenticated floating chat launcher above bottom chrome on mobile.
  - Responsibility: Authenticated shell chat launcher offset only.

- Modify: `src/components/ChatBotRuntime.tsx`
  - Reason: Move the standalone chat launcher above bottom chrome on mobile.
  - Responsibility: Chat runtime launcher offset only.

- Modify: `src/components/Landing.tsx`
  - Reason: Improve first-screen conversion and CTA clarity.
  - Responsibility: Landing copy and button destinations only.

- Modify: `src/components/Landing.css`
  - Reason: Reduce first viewport dead space, remove overly artificial dark hero surfaces, and keep feature fallback compact.
  - Responsibility: Landing layout and landing-specific visual tokens only.

- Create: `src/components/ui/product-state.tsx`
  - Reason: Provide one product-grade primitive for loading, empty, warning, and error states.
  - Responsibility: Presentational state panel with typed props; no data fetching.

- Modify: `src/components/prediction/PredictionLoadingView.tsx`
  - Reason: Replace large blank skeleton blocks with a branded loading state that explains what is happening.
  - Responsibility: Prediction loading view only.

- Modify: `src/components/StadiumSeatMapStates.tsx`
  - Reason: Hide internal manual-data contract text from users while preserving operator meaning in test ids and metadata.
  - Responsibility: Stadium seat map state views only.

- Modify: `cypress/e2e/landing-visual.cy.ts`
  - Reason: Update landing expectations to match tighter hero and CTA copy.
  - Responsibility: Landing visual regression.

- Create: `cypress/e2e/mobile-chrome-safe-area.cy.ts`
  - Reason: Verify bottom chrome no longer covers primary mobile content.
  - Responsibility: Mobile public/cheer chrome regression.

- Modify: `cypress/e2e/stadium.cy.ts`
  - Reason: Assert user-facing manual-required copy no longer exposes internal contract text.
  - Responsibility: Stadium state UX regression.

## Vertical Slice Breakdown

### Task 1: Tokenize Mobile Chrome And Dark Surface Depth

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/Layout.tsx`

**Change Reason:** Mobile overlap is the highest-severity usability issue. Global tokens make the fix reversible and keep future pages from reintroducing ad hoc bottom padding.

**Concrete Changes:**
- Add these tokens inside `:root` in `src/index.css`:

```css
--surface-app-dark: 222 84% 4.9%;
--surface-panel-dark: 220 18% 8%;
--surface-panel-raised-dark: 220 16% 11%;
--mobile-chrome-height: 4rem;
--mobile-chrome-bottom-offset: 1rem;
--mobile-content-safe-bottom: calc(
  var(--mobile-chrome-height) + var(--mobile-chrome-bottom-offset) + env(safe-area-inset-bottom) + 1rem
);
--letter-spacing-korean-tight: 0;
```

- In `.dark`, map dark surfaces through the tokens:

```css
--surface-default: var(--surface-app-dark);
--surface-subtle: var(--surface-panel-dark);
--surface-raised: var(--surface-panel-raised-dark);
```

- Add a utility class in `@layer utilities`:

```css
.mobile-chrome-safe-bottom {
  padding-bottom: var(--mobile-content-safe-bottom);
}
```

- In `src/components/Layout.tsx`, change the `main` class from:

```tsx
<main className="min-h-screen bg-background text-base font-sans leading-relaxed text-foreground antialiased transition-colors duration-200">
```

to:

```tsx
<main className="min-h-screen bg-background text-base font-sans leading-relaxed text-foreground antialiased transition-colors duration-200 max-md:mobile-chrome-safe-bottom">
```

**Verification Method:**
- Run: `npm run build`
- Expected: Vite build completes with exit code 0.
- Run after Task 2 test exists: `npm run cy:run -- --spec "cypress/e2e/mobile-chrome-safe-area.cy.ts"`
- Expected: mobile chrome spec passes.

**Reversible Unit:**
- Revert only `src/index.css` token additions and the single `Layout.tsx` class addition. No route behavior changes are included in this task.

### Task 2: Normalize Mobile Bottom Chrome

**Files:**
- Modify: `src/components/PublicNavbar.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/components/CheerMobileBottomNav.tsx`
- Modify: `src/components/CheerFeedRuntimeContent.tsx`
- Modify: `src/components/AuthenticatedLayoutChrome.tsx`
- Modify: `src/components/ChatBotRuntime.tsx`
- Create: `cypress/e2e/mobile-chrome-safe-area.cy.ts`

**Change Reason:** The audit showed bottom nav and chat floating controls covering home, stadium, and cheer content. This task fixes the interaction layer without changing page content.

**Concrete Changes:**
- In both `PublicNavbar.tsx` and `Navbar.tsx`, add `data-testid="public-mobile-bottom-nav"` or `data-testid="auth-mobile-bottom-nav"` to the fixed bottom nav element.
- Replace hardcoded bottom nav sizing:

```tsx
className="md:hidden fixed bottom-4 inset-x-3.5 z-50"
```

with:

```tsx
className="md:hidden fixed inset-x-3.5 z-50"
style={{
  bottom: 'calc(var(--mobile-chrome-bottom-offset) + env(safe-area-inset-bottom))',
  paddingBottom: 0,
}}
```

- Replace the inner nav height:

```tsx
className="h-16 rounded-3xl bg-white/85 dark:bg-[#16181c]/85 backdrop-blur-xl backdrop-saturate-150 border border-white/90 dark:border-white/10 shadow-[0_18px_40px_-16px_rgba(15,67,56,.32)] grid grid-cols-4 p-1.5 gap-0.5"
```

with:

```tsx
className="h-[var(--mobile-chrome-height)] rounded-3xl bg-white/85 dark:bg-[#16181c]/85 backdrop-blur-xl backdrop-saturate-150 border border-white/90 dark:border-white/10 shadow-[0_18px_40px_-16px_rgba(15,67,56,.32)] grid grid-cols-4 p-1.5 gap-0.5"
```

- In `CheerMobileBottomNav.tsx`, add the same bottom positioning:

```tsx
style={{
  bottom: 'calc(var(--mobile-chrome-bottom-offset) + env(safe-area-inset-bottom))',
}}
```

and remove competing `bottom-0 pb-4 safe-area-bottom` classes from the fixed nav wrapper.

- In `CheerFeedRuntimeContent.tsx`, change the feed section test target from:

```tsx
<section className="mt-3" data-testid="cheer-feed-section">
```

to:

```tsx
<section className="mt-3" data-testid="cheer-feed-content">
```

If an existing Cypress spec already depends on `cheer-feed-section`, keep that id and add `data-testid="cheer-feed-content"` to a stable wrapper inside the same feed area instead.

- In `AuthenticatedLayoutChrome.tsx`, replace the shared mobile launcher offset:

```tsx
const mobileBottomNavOffsetClass =
  'bottom-[calc(5.75rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]';
```

with:

```tsx
const mobileBottomNavOffsetClass =
  'bottom-[var(--mobile-content-safe-bottom)] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]';
```

- In `ChatBotRuntime.tsx`, apply the same replacement to the non-mate branch of `launcherOffsetClass`.

- For mate bottom-action routes in both files, replace the mobile-only part of the `8rem` offset with:

```tsx
'bottom-[calc(var(--mobile-content-safe-bottom)+2.25rem)] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'
```

Keep the existing `right-[calc(1rem+env(safe-area-inset-right))]`, `sm:right-[calc(1.125rem+env(safe-area-inset-right))]`, `lg:right-[calc(1.5rem+env(safe-area-inset-right))]`, `sm:bottom`, and `lg:bottom` classes unchanged.

- Create `cypress/e2e/mobile-chrome-safe-area.cy.ts`:

```ts
/// <reference types="cypress" />

const assertNoChromeOverlap = (contentSelector: string, chromeSelector: string) => {
  cy.get(contentSelector).first().then(($content) => {
    cy.get(chromeSelector).then(($chrome) => {
      const contentRect = $content[0].getBoundingClientRect();
      const chromeRect = $chrome[0].getBoundingClientRect();
      expect(contentRect.bottom, `${contentSelector} bottom`).to.be.lessThan(chromeRect.top);
    });
  });
};

describe('mobile bottom chrome safe area', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('keeps home game cards clear of public bottom nav', () => {
    cy.visit('/home');
    cy.get('body').then(($body) => {
      const $button = $body.find('[data-testid="home-onboarding-start-cta"]');
      if ($button.length > 0) cy.wrap($button).click({ force: true });
    });
    cy.get('[data-testid="public-mobile-bottom-nav"]').should('be.visible');
    cy.get('[data-testid="home-game-card"]').first().scrollIntoView();
    assertNoChromeOverlap('[data-testid="home-game-card"]', '[data-testid="public-mobile-bottom-nav"]');
  });

  it('keeps stadium mobile panels clear of public bottom nav', () => {
    cy.visit('/stadium');
    cy.get('[data-testid="public-mobile-bottom-nav"]').should('be.visible');
    cy.get('[data-testid="stadium-guide-mobile-panels"]').scrollIntoView();
    assertNoChromeOverlap('[data-testid="stadium-guide-mobile-panels"]', '[data-testid="public-mobile-bottom-nav"]');
  });

  it('keeps cheer composer feed clear of cheer bottom nav', () => {
    cy.visit('/cheer');
    cy.get('[data-testid="cheer-mobile-bottom-nav"]').should('be.visible');
    cy.get('[data-testid="cheer-feed-content"]').scrollIntoView();
    assertNoChromeOverlap('[data-testid="cheer-feed-content"]', '[data-testid="cheer-mobile-bottom-nav"]');
  });
});
```

**Verification Method:**
- Run: `npm run cy:run -- --spec "cypress/e2e/mobile-chrome-safe-area.cy.ts"`
- Expected before implementation: FAIL on at least one overlap assertion.
- Expected after implementation: PASS.
- Run: `npm run cy:run -- --spec "cypress/e2e/cheer-mobile-nav.cy.ts"`
- Expected: existing cheer bottom nav behavior still passes.

**Reversible Unit:**
- Revert nav wrapper class/style changes, remove the `CheerFeedRuntimeContent.tsx` test id addition, and delete `mobile-chrome-safe-area.cy.ts`. This does not require reverting landing or state component work.

### Task 3: Improve Landing Conversion Without Rebranding

**Files:**
- Modify: `src/components/Landing.tsx`
- Modify: `src/components/Landing.css`
- Modify: `cypress/e2e/landing-visual.cy.ts`

**Change Reason:** The landing page currently has excessive first-screen dead space and repeated generic CTAs. This task improves conversion while preserving BEGA character, dark tone, and existing feature sections.

**Concrete Changes:**
- In `Landing.tsx`, change primary CTA copy:

```tsx
오늘 경기 보기
```

for header, hero, and CTA panel primary actions that route to `/home`.

- Change secondary hero CTA copy from:

```tsx
더 알아보기
```

to:

```tsx
주요 기능 보기
```

and keep its scroll target as `#features`.

- In `Landing.css`, reduce first viewport dead space:

```css
.landing-hero-grid {
  min-height: min(760px, calc(100svh - 4rem));
  align-items: center;
  gap: var(--space-32);
  padding-block: var(--space-48);
}
```

- In the desktop media query, keep the hero compact:

```css
.landing-hero-grid {
  grid-template-columns: minmax(0, 1fr) minmax(360px, 480px);
  gap: var(--space-48);
  padding-block: var(--space-64);
}
```

- Remove Korean negative letter spacing from key landing type:

```css
.ds-hero-title,
.landing-wordmark,
.landing-cta-title {
  letter-spacing: var(--letter-spacing-korean-tight);
}
```

- Keep the device mockup, but reduce artificial darkness:

```css
.dark .landing-hero-panel {
  background: hsl(var(--surface-raised)) !important;
  border: 1px solid hsl(var(--border) / 0.9) !important;
  box-shadow: var(--surface-shadow) !important;
}
```

- In `LandingFeaturesFallback`, reduce placeholder height from:

```tsx
<div className="min-h-[960px]" aria-hidden="true" />
```

to:

```tsx
<div className="min-h-[360px] rounded-2xl border border-border/70 bg-card/50" aria-hidden="true" />
```

- Update `cypress/e2e/landing-visual.cy.ts` viewport expectations:

```ts
const viewportCases: ViewportCase[] = [
  { label: 'mobile', width: 375, height: 812, heroFontSize: '40px', visiblePanels: 1 },
  { label: 'tablet', width: 768, height: 1024, heroFontSize: '48px', visiblePanels: 1 },
  { label: 'desktop', width: 1280, height: 900, heroFontSize: '56px', visiblePanels: 2 },
];
```

Keep font-size expectations unless implementation intentionally changes token font sizes. Add this assertion:

```ts
cy.contains('오늘 경기 보기').should('be.visible');
cy.contains('주요 기능 보기').should('be.visible');
cy.getBySel('landing-hero').then(($hero) => {
  const rect = $hero[0].getBoundingClientRect();
  expect(rect.top).to.be.lessThan(80);
  expect(rect.height).to.be.lessThan(height * 1.15);
});
```

**Verification Method:**
- Run: `npm run cy:run -- --spec "cypress/e2e/landing-visual.cy.ts"`
- Expected before implementation: FAIL on CTA copy and hero height assertions.
- Expected after implementation: PASS.
- Run: `npm run qa:landing`
- Expected: landing QA exits 0.

**Reversible Unit:**
- Revert `Landing.tsx`, `Landing.css`, and `landing-visual.cy.ts` only. Mobile chrome and state primitive changes remain independent.

### Task 4: Pilot Product-Grade State Primitive

**Files:**
- Create: `src/components/ui/product-state.tsx`
- Modify: `src/components/prediction/PredictionLoadingView.tsx`
- Modify: `src/components/StadiumSeatMapStates.tsx`
- Modify: `cypress/e2e/stadium.cy.ts`

**Change Reason:** Empty and loading states currently feel unfinished or expose internal contracts. A small primitive lets the first slice prove the pattern before converting every page.

**Concrete Changes:**
- Create `src/components/ui/product-state.tsx`:

```tsx
import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { Button } from './button';

type ProductStateTone = 'loading' | 'empty' | 'warning' | 'error';

interface ProductStateProps {
  tone?: ProductStateTone;
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  testId?: string;
  className?: string;
  children?: ReactNode;
}

const toneClasses: Record<ProductStateTone, string> = {
  loading: 'border-border bg-card/70 text-foreground',
  empty: 'border-border bg-card/70 text-foreground',
  warning: 'border-amber-300/60 bg-amber-950/20 text-foreground',
  error: 'border-red-300/60 bg-red-950/20 text-foreground',
};

export default function ProductState({
  tone = 'empty',
  eyebrow,
  title,
  description,
  icon,
  actionLabel,
  onAction,
  testId,
  className,
  children,
}: ProductStateProps) {
  return (
    <section
      data-testid={testId}
      className={cn(
        'flex min-h-[240px] flex-col items-center justify-center rounded-2xl border px-5 py-10 text-center shadow-sm',
        toneClasses[tone],
        className,
      )}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          {icon}
        </div>
      ) : null}
      {eyebrow ? (
        <p className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="mt-3 text-lg font-black text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children ? <div className="mt-4 w-full max-w-md">{children}</div> : null}
      {actionLabel && onAction ? (
        <Button type="button" variant="brand" size="touch" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}
```

- In `PredictionLoadingView.tsx`, replace the largest skeleton card with:

```tsx
<ProductState
  tone="loading"
  eyebrow="전력분석실"
  title="경기 데이터를 준비하고 있습니다"
  description="오늘 일정과 예측 가능한 경기를 불러오는 중입니다. 잠시 후 바로 승부예측으로 이어집니다."
  testId="prediction-loading-state"
/>
```

Keep a compact header skeleton if needed, but remove the oversized blank framed area.

- In `StadiumSeatMapStates.tsx`, replace the visible `MANUAL_BASEBALL_DATA_REQUIRED` pill with:

```tsx
<p className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
  좌석도 준비 중
</p>
```

Add the contract code as metadata on the existing wrapper so operator/debug flows keep a stable signal:

```tsx
<div
  data-testid="stadium-seatmap-manual-required"
  data-error-code="MANUAL_BASEBALL_DATA_REQUIRED"
  className="stadium-seatmap-state-card flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 px-5 py-10 text-center shadow-sm dark:border-amber-500/40 dark:bg-amber-950/20"
  role="status"
  aria-live="polite"
>
```

Change the title and description to:

```tsx
<h4 className="mt-3 text-lg font-black text-slate-900 dark:text-slate-100">
  {stadiumName || '선택한 구장'} 좌석도는 준비 중입니다
</h4>
<p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
  공식 좌석도와 선택 영역 검수가 끝나면 이 자리에서 바로 확인할 수 있습니다.
</p>
```

Keep `data-testid="stadium-seatmap-manual-required"` unchanged. Do not change operator visit panels, attribution components, static data files, or tests that intentionally validate the internal manual-data contract outside this user-facing empty state.

- In `cypress/e2e/stadium.cy.ts`, add:

```ts
it('does not expose internal manual data contract text in seat map state', () => {
  cy.viewport(390, 844);
  cy.visit('/stadium');
  cy.get('[data-testid="stadium-guide-seatmap"]').scrollIntoView();
  cy.get('[data-testid="stadium-seatmap-manual-required"]').should('be.visible');
  cy.get('[data-testid="stadium-seatmap-manual-required"]')
    .should('have.attr', 'data-error-code', 'MANUAL_BASEBALL_DATA_REQUIRED');
  cy.get('[data-testid="stadium-seatmap-manual-required"]')
    .should('not.contain', 'MANUAL_BASEBALL_DATA_REQUIRED')
    .and('contain', '좌석도');
});
```

**Verification Method:**
- Run: `npm run cy:run -- --spec "cypress/e2e/stadium.cy.ts"`
- Expected before implementation: FAIL because internal contract text is visible.
- Expected after implementation: PASS.
- Run: `npm run qa:prediction:mobile:smoke`
- Expected: prediction mobile smoke exits 0.

**Reversible Unit:**
- Revert `product-state.tsx`, `PredictionLoadingView.tsx`, `StadiumSeatMapStates.tsx`, and the added stadium spec assertion. This does not require reverting tokens or landing changes.

### Task 5: Final Slice Verification And PR Packaging

**Files:**
- Modify only if failures identify a missing test id or class in touched files.
- Do not expand scope to additional screens.

**Change Reason:** The first PR should prove that the vertical slice is stable without relying on visual inspection only.

**Concrete Verification Commands:**
- Run: `npm run build`
  - Expected: exit 0.
- Run: `npm run cy:run -- --spec "cypress/e2e/landing-visual.cy.ts"`
  - Expected: exit 0.
- Run: `npm run cy:run -- --spec "cypress/e2e/mobile-chrome-safe-area.cy.ts"`
  - Expected: exit 0.
- Run: `npm run cy:run -- --spec "cypress/e2e/cheer-mobile-nav.cy.ts"`
  - Expected: exit 0.
- Run: `npm run cy:run -- --spec "cypress/e2e/stadium.cy.ts"`
  - Expected: exit 0.
- Optional if time permits: `npm run qa:mobile:smoke`
  - Expected: exit 0.

**First Commit Recommendation:**
- Commit 1: `ui: add mobile chrome design tokens`
  - Include `src/index.css` and `src/components/Layout.tsx`.
- Commit 2: `ui: prevent mobile chrome overlap`
  - Include `PublicNavbar.tsx`, `Navbar.tsx`, `CheerMobileBottomNav.tsx`, `CheerFeedRuntimeContent.tsx`, `AuthenticatedLayoutChrome.tsx`, `ChatBotRuntime.tsx`, and `mobile-chrome-safe-area.cy.ts`.
- Commit 3: `ui: tighten landing conversion slice`
  - Include `Landing.tsx`, `Landing.css`, and `landing-visual.cy.ts`.
- Commit 4: `ui: pilot product state surfaces`
  - Include `product-state.tsx`, `PredictionLoadingView.tsx`, `StadiumSeatMapStates.tsx`, and `stadium.cy.ts`.

**Reversible Unit:**
- Each commit maps to one revertable vertical unit. If mobile chrome tests fail late, revert Commit 2 only. If landing conversion copy is debated, revert Commit 3 only.

## Requested Output Format Summary

### 변경 대상 파일

- `src/index.css`
- `src/components/Layout.tsx`
- `src/components/PublicNavbar.tsx`
- `src/components/Navbar.tsx`
- `src/components/CheerMobileBottomNav.tsx`
- `src/components/CheerFeedRuntimeContent.tsx`
- `src/components/AuthenticatedLayoutChrome.tsx`
- `src/components/ChatBotRuntime.tsx`
- `src/components/Landing.tsx`
- `src/components/Landing.css`
- `src/components/ui/product-state.tsx`
- `src/components/prediction/PredictionLoadingView.tsx`
- `src/components/StadiumSeatMapStates.tsx`
- `cypress/e2e/landing-visual.cy.ts`
- `cypress/e2e/mobile-chrome-safe-area.cy.ts`
- `cypress/e2e/stadium.cy.ts`

### 변경 이유

- Mobile chrome currently overlaps content on key mobile screens.
- Landing first viewport has too much dead space and repeated generic CTAs.
- Loading and empty states look unfinished or expose operator/internal contract language.
- Existing dark baseball identity needs token support so the next UI fixes do not become one-off class patches.

### 구체적인 변경 내용

- Add mobile chrome and dark surface tokens.
- Add a shared mobile safe bottom utility.
- Normalize bottom nav and chat launcher positioning.
- Tighten landing hero height, gap, CTA copy, and feature fallback.
- Add `ProductState` as a small presentational primitive.
- Apply the state primitive pattern to prediction loading and stadium manual-required state.
- Add Cypress coverage for landing, mobile chrome overlap, cheer nav compatibility, and stadium internal-copy hiding.

### 검증 방법

- `npm run build`
- `npm run cy:run -- --spec "cypress/e2e/landing-visual.cy.ts"`
- `npm run cy:run -- --spec "cypress/e2e/mobile-chrome-safe-area.cy.ts"`
- `npm run cy:run -- --spec "cypress/e2e/cheer-mobile-nav.cy.ts"`
- `npm run cy:run -- --spec "cypress/e2e/stadium.cy.ts"`
- Optional broader gate: `npm run qa:mobile:smoke`

### 되돌리기 쉬운 작업 단위

1. Token and layout safe area.
2. Mobile nav and chat launcher positioning.
3. Landing conversion slice.
4. Product state pilot.
5. QA-only adjustments.

## Self-Review

### Spec Coverage

- Existing dark baseball tone preserved: covered by token additions and no new generated assets.
- AI-generated feeling reduced: covered by landing density and reduced artificial dark panel styling.
- Mobile overlap fixed: covered by Tasks 1 and 2.
- Landing conversion improved: covered by Task 3.
- Empty/loading state productized: covered by Task 4.
- Color/type token-centered cleanup: covered by Task 1 with limited first-slice application.

### Placeholder Scan

- No unresolved placeholders are present.
- Every task has exact files, concrete changes, commands, and expected outcomes.

### Type Consistency

- `ProductStateTone` values are consistently `loading`, `empty`, `warning`, and `error`.
- `ProductState` prop names are consistently used as `tone`, `eyebrow`, `title`, `description`, `icon`, `actionLabel`, `onAction`, `testId`, `className`, and `children`.
