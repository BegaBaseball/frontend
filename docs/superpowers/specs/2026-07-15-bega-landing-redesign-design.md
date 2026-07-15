# BEGA Landing Redesign Design

## Purpose

Replace the current screenshot-led landing page with the approved, high-fidelity one-page BEGA introduction supplied in the operator handoff. The page should explain the full fan journey through code-rendered product vignettes and should not contain calls to action.

The authoritative visual and copy references are:

- `/Users/mac/Downloads/design_handoff_bega_landing/README.md`
- `/Users/mac/Downloads/design_handoff_bega_landing/BEGA Landing.dc.html`
- `/Users/mac/Downloads/design_handoff_bega_landing/ios-frame.jsx`
- `/Users/mac/Downloads/design_handoff_bega_landing/assets/`

The prototype demonstrates the target result; production code will be rebuilt with the frontend's React, Vite, Tailwind, theme, and test conventions.

## Scope

The anonymous `/` route keeps its existing routing and authentication bootstrap behavior, but its rendered landing content is replaced. Authenticated visitors who reach `/` continue to redirect to `/home` through `RootEntryRouteAuthAware`.

The new landing contains, in order:

1. sticky animated score ticker
2. centered season hero with the large decorative `720`
3. deep-mint app preview with a code-rendered phone screen
4. `01 경기 데이터`
5. `02 승리예측`
6. `03 응원글`
7. `04 같이가요`
8. `05 구장가이드`
9. `06 직관일기`
10. offseason insight and retro-mode teaser
11. three-step start guide
12. deep-mint mascot closing

The current fixed header, login button, app-open buttons, feature-navigation button, screenshot showcase, interactive feature accordion, laptop mockup, final CTA, and link footer are removed from the landing page. Existing application routes and navigation outside the landing page are unchanged.

## Chosen Approach

Rebuild the handoff as small React components rather than transplanting its inline HTML or reskinning the current screenshot composition. This is the only approach that meets the high-fidelity requirement while retaining maintainable component boundaries, explicit accessibility, reduced-motion behavior, and focused tests.

`Landing.tsx` remains the route-level composition component. Landing-only implementation lives under `src/components/landing/`:

- `LandingTicker` renders the duplicated ticker track.
- `LandingHero` renders the brand lockup, headline, statistics, team marks, and scroll indicator.
- `LandingAppPreview` owns the phone frame and its static home-screen vignette.
- `LandingFeatureSection` provides the shared alternating two-column shell, watermark number, label, heading, body copy, and visual placement.
- Feature vignette components render game data, win prediction, cheer posts, mate matching, stadium guide, and diary examples.
- `LandingOffseason`, `LandingStartGuide`, and `LandingClosing` render the final three compositions.
- `useLandingMotion` owns reveal, count-up, and parallax lifecycle behavior.
- `landingShowcaseData` holds typed, operator-provided display examples and section copy.

The exact number of source files may be consolidated when a component would otherwise be trivial, but `Landing.tsx` must remain an orchestrator rather than a monolithic copy of the prototype.

## Visual System

Use the existing Pretendard setup and the frontend primary tokens where they match the approved palette. Reuse the existing `Press Start 2P` Google Fonts loading pattern for the small retro panel; do not introduce another font provider. Landing-specific CSS may use the approved fixed colors for deep-mint, retro, team, result, and status treatments that are not represented by shared tokens.

Key values:

- primary `#2d5f4f`, tint `#f0f9f6`, chip `#e8f5f0`, deep mint `#173b34`
- light section surfaces `#ffffff` and `#f9fafb`
- main text `#0f1419`, supporting text `#536471`
- card radii `16px` to `20px`, major panel radius `28px`
- hero title `clamp(44px, 7.5vw, 80px)` and feature titles `clamp(28px, 3.6vw, 38px)`
- content width approximately `1120px`, with responsive horizontal padding

Sections alternate light surfaces and text/visual order as shown in the handoff. Each numbered feature uses its large mint or gray watermark. At narrow widths, all two-column sections become a single column without horizontal overflow. The fixed-width phone scales down proportionally below `372px` of available width.

No product screenshots are rendered. The BEGA logo, mascot, stadium illustration, and team logos are reused from byte-identical assets already present under `src/assets`; no new binary assets are required.

## Theme Behavior

The page follows the existing application theme class without adding a new landing-specific theme toggle. Light sections map to the approved near-black surfaces in dark mode, with readable text and subtle white borders.

The ticker, deep-mint app-preview section, phone interior, deep-mint offseason card, retro card, and closing section intentionally keep their approved fixed palettes in both themes.

## Motion Behavior

Motion is decorative and never required to understand content.

- The ticker uses two identical groups and a 26-second linear loop, with an adjacent text-labelled pause/resume control that changes `animation-play-state`. This accessibility control is not a CTA or navigation element.
- Elements marked for reveal enter once through `IntersectionObserver` at approximately `0.18` threshold, using opacity and a 28px vertical offset.
- Bars animate to their declared percentage when their section enters.
- Hero statistics count up over 1.2 seconds with cubic ease-out.
- Hero `720` and stadium artwork use low-amplitude requestAnimationFrame-throttled parallax.
- Live dot, score roll, like pop, and mascot float use CSS keyframes.

`prefers-reduced-motion: reduce` disables ticker travel, reveal offsets, count-up interpolation, parallax, score roll, pulsing, like pop, and floating. Cleanup disconnects observers, cancels animation frames, and removes listeners when the landing unmounts.

## Static Baseball Data Policy

All scores, inning states, rankings, probabilities, dates, records, team names, and venue facts shown in the vignettes are operator-provided manual display examples from the handoff. They are static marketing examples, not current game data.

The landing makes no API request and adds no crawler, scraper, browser repair, web search, external baseball API client, or synthesized fallback. If future work requires live or corrected baseball facts, it must use an internal trusted source or surface `MANUAL_BASEBALL_DATA_REQUIRED` rather than changing this design into an external data flow.

## Accessibility

- Semantic `main`, `section`, headings, articles, lists, and figures describe the page hierarchy.
- Decorative watermarks, duplicate ticker content, and ornamental graphics are hidden from assistive technology.
- The first ticker group has an explicit label that identifies it as a BEGA product example.
- Meaningful logo and stadium images have concise alternate text; repeated decorative team marks use empty alternate text where surrounding text already names the team.
- Color is not the only status indicator: status, result, and progress values remain present as text.
- With no CTA or interactive vignette controls, the page introduces no false affordances. The ticker pause/resume control is the only landing utility control and has a clear accessible label.
- Reduced-motion users receive the complete final state with no delayed hidden content.

## Error and Fallback Behavior

The page has no remote data dependency, so there is no loading, retry, or error UI. Route-level lazy loading retains the existing neutral root fallback. If `IntersectionObserver` or animation APIs are unavailable, content renders immediately in its final state. Static image dimensions are declared to avoid layout shift.

## Testing Strategy

Implementation follows red-green-refactor:

1. Update the focused landing Cypress specification first and run it to observe expected failures against the current page.
2. Implement the smallest route composition and sections needed to satisfy each behavior group.
3. Re-run the focused specification after each group, then refactor while green.

The landing test covers:

- the approved section order and primary copy
- absence of header/login/app-open/feature CTA/footer navigation
- absence of screenshot-based showcase images
- presence of ten team marks, phone preview, six numbered vignettes, offseason cards, start steps, and mascot closing
- no anonymous `/auth/mypage` bootstrap request
- desktop, tablet, and 375px mobile layout without horizontal overflow
- alternating feature layout at desktop and stacked layout on mobile
- theme mappings for light sections and fixed-palette sections
- reduced-motion final states and disabled infinite animation
- accessible heading hierarchy and hidden duplicate ticker content

Fresh completion verification includes:

- focused Cypress landing spec
- `npm run qa:landing` for desktop/tablet/mobile screenshots and scripted layout assertions
- `npm run build`
- `python3 scripts/validate_baseball_data_policy.py` from the workspace root
- visual inspection of the generated desktop and mobile screenshots against the supplied handoff

## Non-Goals

- No change to auth, OAuth2, route exposure, or `/home` behavior.
- No live score, schedule, ranking, prediction, or stadium API integration.
- No new font provider or image download; the existing Press Start loader pattern and repository assets are reused.
- No restoration of the current screenshot carousel, feature accordion, laptop mockup, CTA, or marketing footer.
- No unrelated frontend reformatting or cleanup.

## Acceptance Criteria

- The anonymous `/` page matches the approved handoff structure, copy, palette, spacing, and responsive behavior at high fidelity.
- Every app preview and feature example is rendered with HTML/CSS/React rather than product screenshots.
- The landing itself contains no call to action or navigation footer.
- Existing authenticated root redirect and anonymous no-bootstrap-request behavior remain intact.
- Dark theme, reduced motion, accessibility, and 375px mobile behavior are verified.
- Focused tests, landing QA, production build, and baseball-data policy validation all pass with fresh evidence.
