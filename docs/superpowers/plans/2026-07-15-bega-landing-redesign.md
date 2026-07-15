# BEGA Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the anonymous BEGA root landing with the approved CTA-free, screenshot-free, high-fidelity one-page product introduction.

**Architecture:** Keep `RootEntryRoute` and its authenticated redirect unchanged. Make `Landing.tsx` a small route-level orchestrator, place typed static handoff data and reusable landing primitives under `src/components/landing/`, and use one landing-only CSS payload plus a lifecycle hook for reveal, count-up, and parallax motion.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind tokens, landing-scoped CSS, Cypress, the existing Chrome DevTools landing QA runner.

## Global Constraints

- The operator handoff and approved design at `docs/superpowers/specs/2026-07-15-bega-landing-redesign-design.md` are authoritative.
- Preserve `RootEntryRoute` and `RootEntryRouteAuthAware`; authenticated `/` still redirects to `/home`.
- The anonymous landing must make no `/auth/mypage` bootstrap request.
- The landing contains no CTA, navigation header, login button, app-open button, feature-navigation button, or navigation footer. A text-labelled ticker pause/resume accessibility control is allowed and is not a CTA.
- Render all product vignettes in React/HTML/CSS; do not render the six `landing-showcase-*.webp` product screenshots.
- Reuse repository assets only: BEGA logo `d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png`, mascot `27f7b8ac0aacea2470847e809062c7bbf0e4163f.webp`, stadium `images/stadium_bg.webp`, and the ten existing team logo files.
- Treat every score, date, standing, probability, venue fact, and record as operator-provided static marketing data. Add no API call, crawler, scraper, web search, external baseball client, or synthesized repair.
- Primary `#2d5f4f`; tint `#f0f9f6`; chip `#e8f5f0`; deep mint `#173b34`; content width `1120px`.
- Hero type is `clamp(44px, 7.5vw, 80px)`; feature titles are `clamp(28px, 3.6vw, 38px)`.
- Support 375px mobile without horizontal overflow, dark theme, and `prefers-reduced-motion: reduce`.
- Preserve unrelated dirty worktree changes. Stage and commit only files listed by the current task.

---

## File Structure

**Create**

- `src/components/landing/landingAssets.ts` — typed paths for the logo, mascot, stadium, and ten team assets.
- `src/components/landing/landingShowcaseData.ts` — typed operator-provided ticker, team, feature-copy, stadium-chip, diary, and start-guide values.
- `src/components/landing/useLandingMotion.ts` — reveal, bar, count-up, and parallax lifecycle.
- `src/components/landing/LandingTicker.tsx` — duplicated accessible score ticker.
- `src/components/landing/LandingHero.tsx` — hero, statistics, team row, and scroll indicator.
- `src/components/landing/LandingPhonePreview.tsx` — fixed-light phone screen rendered with cards.
- `src/components/landing/LandingAppPreview.tsx` — deep-mint copy and responsive phone frame.
- `src/components/landing/LandingFeatureSection.tsx` — shared alternating numbered feature layout.
- `src/components/landing/vignettes/LandingGameDataVignette.tsx`
- `src/components/landing/vignettes/LandingPredictionVignette.tsx`
- `src/components/landing/vignettes/LandingCheerVignette.tsx`
- `src/components/landing/vignettes/LandingMateVignette.tsx`
- `src/components/landing/vignettes/LandingStadiumVignette.tsx`
- `src/components/landing/vignettes/LandingDiaryVignette.tsx`
- `src/components/landing/LandingOffseason.tsx`
- `src/components/landing/LandingStartGuide.tsx`
- `src/components/landing/LandingClosing.tsx`

**Modify**

- `src/components/Landing.tsx` — replace the old lazy screenshot/CTA composition with the new ordered sections.
- `src/components/Landing.css` — replace old screenshot/laptop/CTA rules with the approved responsive, dark, and motion styles.
- `cypress/e2e/landing-visual.cy.ts` — replace old CTA/screenshot/accordion assertions with the approved landing contract.
- `scripts/landing-qa.mjs` — capture the new sections and assert section order, no CTA, responsive layout, fixed themes, and reduced motion.

**Leave unchanged**

- `src/components/RootEntryRoute.tsx`
- `src/components/RootEntryRouteAuthAware.tsx`
- existing unrelated source and worktree changes

The old landing runtime files and screenshot binaries may remain unreferenced in source. Vite tree-shaking and the existing asset-prune build stage keep them out of the shipped landing bundle; deleting historical binaries is not required for this feature.

---

### Task 1: Lock the CTA-Free Hero and Ticker Contract

**Files:**

- Create: `src/components/landing/landingAssets.ts`
- Create: `src/components/landing/landingShowcaseData.ts`
- Create: `src/components/landing/LandingTicker.tsx`
- Create: `src/components/landing/LandingHero.tsx`
- Modify: `src/components/Landing.tsx`
- Modify: `src/components/Landing.css`
- Test: `cypress/e2e/landing-visual.cy.ts`

**Interfaces:**

- Produces `TeamKey`, `TEAM_ASSETS`, `TEAM_ORDER`, `TICKER_ITEMS`, `LandingTicker`, and `LandingHero`.
- `TEAM_ASSETS` is `Record<TeamKey, string>` and is reused by every later vignette.

- [ ] **Step 1: Replace the obsolete Cypress spec with the first failing contract**

Remove every old CTA, screenshot-grid, deferred accordion, laptop mockup, and tap-target case from the spec. Keep the existing `visitLanding` auth-request tracing helper and `assertNoHorizontalOverflow`, change the hero readiness assertion, and make the new spec contain only the foundation cases at this stage with these exact assertions:

```ts
cy.getBySel('landing-page').should('be.visible');
cy.contains('10개 구단').should('be.visible');
cy.contains('720경기의 시즌').should('be.visible');
cy.getBySel('landing-score-ticker').should('be.visible');
cy.getBySel('landing-team-row').find('img').should('have.length', 10);
cy.get('[data-testid^="landing-header-"]').should('not.exist');
cy.get('[data-testid*="cta"]').should('not.exist');
cy.get('footer').should('not.exist');
cy.getBySel('landing-ticker-toggle').should('have.attr', 'aria-pressed', 'false').click();
cy.getBySel('landing-ticker-toggle').should('have.attr', 'aria-pressed', 'true').and('contain', '재생');
cy.get('@getSessionProfile.all').should('have.length', 0);
getHomeAuthRequestTraces().should('deep.equal', []);
```

- [ ] **Step 2: Run the focused spec and verify RED**

Run: `npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts`

Expected: FAIL because the current page still renders `landing-header-login`, CTA elements, the old headline, and the footer.

- [ ] **Step 3: Add typed asset and handoff data modules**

Define these public shapes and values:

```ts
export type TeamKey = 'lg' | 'doosan' | 'kia' | 'samsung' | 'ssg' | 'lotte' | 'kt' | 'nc' | 'hanwha' | 'kiwoom';

export interface TickerItem {
  firstTeam: TeamKey;
  firstLabel: string;
  score: string;
  secondTeam: TeamKey;
  secondLabel: string;
  status: string;
  tone: 'finished' | 'live' | 'scheduled' | 'extra';
}

export const TEAM_ORDER: TeamKey[] = ['lg', 'doosan', 'kia', 'samsung', 'ssg', 'lotte', 'kt', 'nc', 'hanwha', 'kiwoom'];

export const TICKER_ITEMS: TickerItem[] = [
  { firstTeam: 'kia', firstLabel: 'KIA', score: '5 : 3', secondTeam: 'samsung', secondLabel: '삼성', status: '경기종료', tone: 'finished' },
  { firstTeam: 'lg', firstLabel: 'LG', score: '4 : 2', secondTeam: 'doosan', secondLabel: '두산', status: 'LIVE 7회', tone: 'live' },
  { firstTeam: 'ssg', firstLabel: 'SSG', score: '18:30', secondTeam: 'lotte', secondLabel: '롯데', status: '예정', tone: 'scheduled' },
  { firstTeam: 'kt', firstLabel: 'KT', score: '2 : 2', secondTeam: 'nc', secondLabel: 'NC', status: '연장 10회', tone: 'extra' },
  { firstTeam: 'hanwha', firstLabel: '한화', score: '18:30', secondTeam: 'kiwoom', secondLabel: '키움', status: '예정', tone: 'scheduled' },
];
```

Map each `TeamKey` to the existing hashed imports from `TeamLogo.tsx`; import the BEGA logo, mascot, and stadium files named in Global Constraints.

- [ ] **Step 4: Render the accessible ticker and hero**

`LandingTicker` renders `TICKER_ITEMS` twice, with the second group `aria-hidden="true"`, plus a text-labelled pause/resume button that toggles `aria-pressed` and `animation-play-state`. `LandingHero` renders the exact headline, subcopy, `10 / 720 / 9` statistics, ten logos, and SCROLL indicator. Use these stable hooks:

```tsx
<aside data-testid="landing-score-ticker" aria-label="BEGA 기능 예시 스코어">
  <div className="landing-ticker-track" data-motion-loop data-paused={isPaused || undefined}>
    <TickerGroup />
    <TickerGroup ariaHidden />
  </div>
  <button type="button" data-testid="landing-ticker-toggle" aria-pressed={isPaused}>
    {isPaused ? '티커 재생' : '티커 일시정지'}
  </button>
</aside>

<section className="landing-hero" data-testid="landing-hero">
  <div className="landing-hero-watermark" data-parallax="0.12" data-parallax-center aria-hidden="true">720</div>
  <h1>10개 구단<br /><strong>720경기</strong>의 시즌,<br />앱 하나로.</h1>
  <div data-testid="landing-team-row">...</div>
</section>
```

- [ ] **Step 5: Replace `Landing.tsx` with the initial orchestrator and base CSS**

Keep only the load-trace effect, call `useLandingMotion` after Task 2 adds it, inject `Landing.css?inline`, and render the ticker and hero. The shell is:

```tsx
export default function Landing() {
  useEffect(() => {
    requestLoadTrace('Landing mount');
    return () => requestLoadTrace('Landing unmount');
  }, []);

  return (
    <main className="landing-page" data-testid="landing-page">
      <style>{landingCriticalCss}</style>
      <LandingTicker />
      <LandingHero />
    </main>
  );
}
```

Base CSS must set `.landing-page { min-height: 100vh; overflow: clip; background: #fff; color: #0f1419; }`, the 26-second ticker keyframe, hero clamp sizing, `1120px` content width, and dark page surfaces. Align the duplicated track with `translateX(calc(-50% - 22px))` for the 44px inter-group gap and pause it under `[data-paused="true"]`.

- [ ] **Step 6: Re-run the focused spec and verify GREEN for this behavior group**

Run: `npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts`

Expected: PASS for the hero/ticker/CTA-absence tests; later-section tests have not been added yet.

- [ ] **Step 7: Commit only Task 1 files**

```bash
git add cypress/e2e/landing-visual.cy.ts src/components/Landing.tsx src/components/Landing.css src/components/landing/landingAssets.ts src/components/landing/landingShowcaseData.ts src/components/landing/LandingTicker.tsx src/components/landing/LandingHero.tsx
git commit -m "feat: rebuild landing hero and ticker"
```

---

### Task 2: Add the Code-Rendered App Preview and Motion Lifecycle

**Files:**

- Create: `src/components/landing/useLandingMotion.ts`
- Create: `src/components/landing/LandingPhonePreview.tsx`
- Create: `src/components/landing/LandingAppPreview.tsx`
- Modify: `src/components/Landing.tsx`
- Modify: `src/components/Landing.css`
- Test: `cypress/e2e/landing-visual.cy.ts`

**Interfaces:**

- Produces `useLandingMotion(): void`, `LandingPhonePreview`, and `LandingAppPreview`.
- Motion consumes `data-reveal`, `data-count`, `data-bar`, `data-parallax`, `data-parallax-center`, and `data-motion-loop` attributes.

- [ ] **Step 1: Add failing app-preview and reduced-motion tests**

```ts
cy.getBySel('landing-app-preview').should('be.visible');
cy.getBySel('landing-phone').should('be.visible');
cy.getBySel('landing-phone').contains('오늘의 승리 확률').should('be.visible');
cy.getBySel('landing-phone').contains('같이가요').should('be.visible');
cy.getBySel('landing-page').find('img[src*="landing-showcase-"]').should('not.exist');

visitLanding({ reducedMotion: true });
cy.get('[data-motion-loop]').should(($node) => {
  expect(getComputedStyle($node[0]).animationName).to.equal('none');
});
cy.get('[data-reveal]').should('have.css', 'opacity', '1');
```

- [ ] **Step 2: Run focused Cypress and verify RED**

Run: `npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts`

Expected: FAIL because the phone, app-preview section, and motion hooks do not exist.

- [ ] **Step 3: Add the motion hook**

Implement `useLandingMotion(): void` with one effect. It must:

```ts
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
if (reduced || typeof IntersectionObserver !== 'function') {
  revealNodes.forEach((node) => node.dataset.revealed = 'true');
  return;
}
```

For normal motion, observe once at threshold `0.18`, set `data-revealed="true"`, grow descendant bars to `data-bar`, and count descendant numbers to `data-count` over 1,200ms using `1 - (1 - progress) ** 3`. Use one requestAnimationFrame-throttled passive scroll listener for parallax and cancel it on cleanup.

- [ ] **Step 4: Add the phone and app preview**

The fixed-light `LandingPhonePreview` renders, in this order: BEGA/LIVE row, live-score card, `64%` prediction card, `LG vs 두산` mate card, cheer post, two-row standings card, and five-item bottom tab bar. `LandingAppPreview` renders the approved deep-mint copy and wraps the phone in a `372px × 690px` frame with a notch, status row, and home indicator.

- [ ] **Step 5: Add approved responsive and reduced-motion CSS**

Use `.landing-phone-scale { width: min(372px, 100%); }`, a device aspect ratio of `372 / 690`, fixed-light phone tokens, and:

```css
@media (prefers-reduced-motion: reduce) {
  .landing-page [data-motion-loop],
  .landing-page [data-anim] { animation: none !important; }
  .landing-page [data-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; }
}
```

- [ ] **Step 6: Run focused Cypress and verify GREEN**

Run: `npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts`

Expected: PASS with no product screenshot image in the landing DOM.

- [ ] **Step 7: Commit Task 2**

```bash
git add cypress/e2e/landing-visual.cy.ts src/components/Landing.tsx src/components/Landing.css src/components/landing/useLandingMotion.ts src/components/landing/LandingPhonePreview.tsx src/components/landing/LandingAppPreview.tsx
git commit -m "feat: add landing app preview motion"
```

---

### Task 3: Add Numbered Features 01–03

**Files:**

- Create: `src/components/landing/LandingFeatureSection.tsx`
- Create: `src/components/landing/vignettes/LandingGameDataVignette.tsx`
- Create: `src/components/landing/vignettes/LandingPredictionVignette.tsx`
- Create: `src/components/landing/vignettes/LandingCheerVignette.tsx`
- Modify: `src/components/Landing.tsx`
- Modify: `src/components/Landing.css`
- Test: `cypress/e2e/landing-visual.cy.ts`

**Interfaces:**

```ts
export interface LandingFeatureSectionProps {
  number: '01' | '02' | '03' | '04' | '05' | '06';
  title: string;
  description: string;
  visual: ReactNode;
  visualFirst?: boolean;
  tone: 'muted' | 'plain';
}
```

- [ ] **Step 1: Add failing feature-order and content tests**

```ts
cy.getBySel('landing-feature-01').contains('오늘의 KBO').should('be.visible');
cy.getBySel('landing-feature-02').contains('감이 아니라 데이터로').should('be.visible');
cy.getBySel('landing-feature-03').contains('우리 팀의 순간을').should('be.visible');
cy.get('[data-testid^="landing-feature-0"]').should('have.length', 3);
cy.getBySel('landing-feature-01').contains('LIVE · 7회말 · 잠실').should('be.visible');
cy.getBySel('landing-feature-02').contains('64%').should('be.visible');
cy.getBySel('landing-feature-03').contains('직관러버').should('be.visible');
```

- [ ] **Step 2: Run focused Cypress and verify RED**

Run: `npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts`

Expected: FAIL because numbered feature sections do not exist.

- [ ] **Step 3: Add the shared feature shell**

Render a semantic `<section data-testid={`landing-feature-${number}`}>`, decorative watermark, copy block, and visual block. Desktop uses two equal columns; `visualFirst` controls DOM order, and mobile remains copy-first through CSS grid areas so reading order is consistent.

- [ ] **Step 4: Add the first three vignettes**

- Game data: live dot, rolling `3 → 4 → 5`, `5 : 2`, nine inning segments, and standings bars `LG 0.618`, `KIA 0.577`, `한화 0.563`.
- Prediction: `64%` vs `36%`, growth bar, `AI 코치`, and chips `선발 ERA 2.84`, `최근 10경기 7승`, `상대 전적 9:5`.
- Cheer: the two approved LG/KIA-style posts, text labels for likes/comments, follow pill, and like-pop decoration.

Use only `TEAM_ASSETS` and static values from `landingShowcaseData`.

- [ ] **Step 5: Add the three sections to `Landing.tsx` and style alternating surfaces**

Render `01 muted`, `02 plain + visualFirst`, and `03 muted`. Use watermark font `clamp(120px, 15vw, 190px)`, feature gap `clamp(32px, 5vw, 72px)`, card radius `20px`, and border `#e5e7eb`.

- [ ] **Step 6: Verify GREEN and commit**

Run: `npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts`

Expected: PASS for features 01–03 and all earlier behavior.

```bash
git add cypress/e2e/landing-visual.cy.ts src/components/Landing.tsx src/components/Landing.css src/components/landing/LandingFeatureSection.tsx src/components/landing/vignettes/LandingGameDataVignette.tsx src/components/landing/vignettes/LandingPredictionVignette.tsx src/components/landing/vignettes/LandingCheerVignette.tsx
git commit -m "feat: add primary landing feature stories"
```

---

### Task 4: Add Numbered Features 04–06

**Files:**

- Create: `src/components/landing/vignettes/LandingMateVignette.tsx`
- Create: `src/components/landing/vignettes/LandingStadiumVignette.tsx`
- Create: `src/components/landing/vignettes/LandingDiaryVignette.tsx`
- Modify: `src/components/Landing.tsx`
- Modify: `src/components/Landing.css`
- Test: `cypress/e2e/landing-visual.cy.ts`

- [ ] **Step 1: Add failing content and full-count tests**

```ts
cy.get('[data-testid^="landing-feature-0"]').should('have.length', 6);
cy.getBySel('landing-feature-04').contains('혼자 가는 직관은').should('be.visible');
cy.getBySel('landing-feature-04').contains('신청').should('be.visible');
cy.getBySel('landing-feature-04').contains('승인').should('be.visible');
cy.getBySel('landing-feature-04').contains('채팅').should('be.visible');
cy.getBySel('landing-feature-05').contains('처음 가는 구장도').should('be.visible');
cy.getBySel('landing-feature-05').find('[data-testid="landing-stadium-chip"]').should('have.length', 9);
cy.getBySel('landing-feature-06').contains('승률 0.700').should('be.visible');
cy.getBySel('landing-feature-06').find('[data-testid="landing-diary-result"]').should('have.length', 10);
```

- [ ] **Step 2: Run focused Cypress and verify RED**

Run: `npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts`

Expected: FAIL with three missing sections.

- [ ] **Step 3: Add mate, stadium, and diary vignettes**

- Mate: `LG vs 두산 · 잠실`, `2025.10.26(일) 18:30`, `2/4명`, `3루 응원석`, the dotted `신청 → 승인 → 채팅` progression, and deposit copy.
- Stadium: nine chips in handoff order, repository stadium art with low parallax, `잠실야구장 · 서울종합운동장`, and `25,000 / 32 / 2호선` statistics.
- Diary: ten result tiles in `승 승 패 승 무 승 승 패 승 승` order, `10회 · 승률 0.700`, and the approved one-line quote.

- [ ] **Step 4: Add sections 04–06 with alternating placement**

Render `04 plain + visualFirst`, `05 muted`, and `06 plain + visualFirst`. Chips are informational `<span>` elements, not buttons, so the CTA-free page introduces no false tab stops.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts`

Expected: PASS with exactly six numbered features.

```bash
git add cypress/e2e/landing-visual.cy.ts src/components/Landing.tsx src/components/Landing.css src/components/landing/vignettes/LandingMateVignette.tsx src/components/landing/vignettes/LandingStadiumVignette.tsx src/components/landing/vignettes/LandingDiaryVignette.tsx
git commit -m "feat: complete landing feature stories"
```

---

### Task 5: Add Offseason, Start Guide, Closing, Theme, and Accessibility

**Files:**

- Create: `src/components/landing/LandingOffseason.tsx`
- Create: `src/components/landing/LandingStartGuide.tsx`
- Create: `src/components/landing/LandingClosing.tsx`
- Modify: `src/components/Landing.tsx`
- Modify: `src/components/Landing.css`
- Test: `cypress/e2e/landing-visual.cy.ts`

- [ ] **Step 1: Add failing closing-section, theme, and responsive tests**

```ts
cy.getBySel('landing-offseason').contains('야구는 겨울에도 계속됩니다').should('be.visible');
cy.getBySel('landing-offseason').contains('RETRO MODE').should('be.visible');
cy.getBySel('landing-start-guide').find('article').should('have.length', 3);
cy.getBySel('landing-closing').find('img[alt="BEGA 마스코트"]').should('be.visible');
cy.getBySel('landing-page').find('[data-testid*="cta"], a').should('not.exist');
cy.getBySel('landing-ticker-toggle').should('exist');

cy.viewport(375, 812);
assertNoHorizontalOverflow();
cy.getBySel('landing-phone').should(($phone) => {
  expect($phone[0].getBoundingClientRect().width).to.be.at.most(347);
});
```

Add a dark-theme case that sets `kbo-theme` to `dark`, visits `/`, and checks a light section has `rgb(16, 18, 21)` while the app-preview fixed palette remains `rgb(23, 59, 52)`.

- [ ] **Step 2: Run focused Cypress and verify RED**

Run: `npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts`

Expected: FAIL because the final sections and final dark mappings are absent.

- [ ] **Step 3: Add the final three components**

- Offseason: centered intro, deep-mint insight card, fixed-black retro card, two insight chips, and three-row pixel leaderboard.
- Start guide: `HOW TO START`, `시작은 3분이면 충분해요`, and three approved numbered articles.
- Closing: deep-mint gradient, floating mascot, approved closing copy, and non-interactive BEGA logo chip.

Load `Press Start 2P` using the existing `RetroTheme.tsx` link pattern and remove the link on unmount only when this component created it.

- [ ] **Step 4: Complete dark, mobile, and semantic CSS**

Add `.dark` mappings for alternating light sections/cards/borders/text. Exclude `[data-fixed-theme]` descendants from those overrides. Add `@media (max-width: 767px)` stacking, `min-width: 0` on grid children, safe word wrapping, and fixed-light phone rules.

- [ ] **Step 5: Run focused Cypress and verify GREEN**

Run: `npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts`

Expected: all landing Cypress cases pass on desktop and 375px mobile.

- [ ] **Step 6: Run the design-slop guard because landing CSS changed**

Run: `node --import tsx --test src/components/design-slop-guard.test.ts`

Expected: PASS with no forbidden inline SVG or style-pattern regression.

- [ ] **Step 7: Commit Task 5**

```bash
git add cypress/e2e/landing-visual.cy.ts src/components/Landing.tsx src/components/Landing.css src/components/landing/LandingOffseason.tsx src/components/landing/LandingStartGuide.tsx src/components/landing/LandingClosing.tsx
git commit -m "feat: finish landing introduction flow"
```

---

### Task 6: Rewrite Landing QA and Complete the Release Evidence

**Files:**

- Modify: `scripts/landing-qa.mjs`
- Modify: `cypress/e2e/landing-visual.cy.ts` only if the runtime reveals a missing regression assertion
- Modify: landing production files only when a new failing regression test proves a defect

**Interfaces:**

- `npm run qa:landing` continues to write `output/landing-qa/landing-report.json`, `landing-summary.md`, and desktop/tablet/mobile PNGs.
- Replace old report fields `navigation` and `interaction` with `structure`, `theme`, and `reducedMotion`.

- [ ] **Step 1: Change the QA script selectors and metrics**

Initial selectors must be:

```js
const landingSelectors = [
  '[data-testid="landing-page"]',
  '[data-testid="landing-score-ticker"]',
  '[data-testid="landing-hero"]',
  '[data-testid="landing-app-preview"]',
  '[data-testid="landing-feature-01"]',
  '[data-testid="landing-feature-06"]',
  '[data-testid="landing-offseason"]',
  '[data-testid="landing-start-guide"]',
  '[data-testid="landing-closing"]',
];
```

For each viewport capture `scrollWidth`, hero font size, phone width, numbered-feature count, CTA/link count, and full-page screenshot using `Page.captureScreenshot` with `captureBeyondViewport: true`. Capture additional feature and closing screenshots after scrolling those regions into view.

Assert:

```js
value.scrollWidth <= value.viewport.width + 1
value.featureCount === 6
value.ctaCount === 0
value.phoneWidth <= Math.min(372, value.viewport.width - 28)
```

In reduced motion, assert ticker, live dot, rolling score, like heart, and mascot have animation name `none`, and all reveal nodes have opacity `1`.

- [ ] **Step 2: Run the rewritten QA and verify failures are real**

Run: `npm run qa:landing`

Expected: either PASS or a precise layout/motion failure tied to the new landing. No selector may reference the deleted CTA, screenshot grid, feature accordion, or laptop mockup.

- [ ] **Step 3: For each QA defect, add a Cypress regression test before fixing production code**

Run the focused Cypress spec and confirm the new assertion fails for the same reason, then make the smallest CSS/React fix and re-run until green. Do not weaken a correct assertion to accommodate the implementation.

- [ ] **Step 4: Run fresh full verification**

From `bega_frontend`:

```bash
npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
npm run qa:landing
npm run build
```

From `/Users/mac/project/KBO_platform`:

```bash
python3 scripts/validate_baseball_data_policy.py
```

Expected: every command exits `0`; Cypress has zero failures; landing QA reports `pass: true`; build completes; baseball policy validation passes.

- [ ] **Step 5: Inspect generated desktop and mobile screenshots**

Open and compare:

- `bega_frontend/output/landing-qa/landing-desktop.png`
- `bega_frontend/output/landing-qa/landing-mobile.png`
- `/Users/mac/Downloads/design_handoff_bega_landing/BEGA Landing.dc.html`

Verify section order, text/visual alternation, deep-mint surfaces, phone proportions, card density, nine stadium chips, diary results, no CTA/footer, and no clipped or overflowing content. Any discovered defect returns to Step 3.

- [ ] **Step 6: Dispatch the required frontend review subagent in review-only mode**

Ask `frontend-code-reviewer` to inspect only the landing files for React structure, accessibility, dark mode, reduced motion, responsive overflow, performance, and test quality. Do not ask it to patch. Independently verify every finding before changing code; behavior changes require a failing test first.

- [ ] **Step 7: Re-run verification after accepted review fixes**

Repeat all four commands from Step 4 and re-inspect the two screenshots. Fresh successful output is required before any completion claim.

- [ ] **Step 8: Commit QA and verified fixes**

Stage only `scripts/landing-qa.mjs`, the landing spec, and landing production files actually changed by verified fixes:

```bash
git add scripts/landing-qa.mjs cypress/e2e/landing-visual.cy.ts src/components/Landing.tsx src/components/Landing.css src/components/landing
git diff --cached --check
git commit -m "test: verify redesigned landing experience"
```

- [ ] **Step 9: Completion audit**

Compare the final DOM, screenshots, test output, build output, policy output, and staged/committed diff against every Acceptance Criteria item in the approved design. Keep the goal active if any item lacks direct evidence.
