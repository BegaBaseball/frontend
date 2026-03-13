# BEGA Frontend Design Rules

This document exists to keep layout decisions mechanical.
The first rollout is a landing-page pilot, not a global redesign.

## Rollout Policy

- Phase 1 adds tokens globally.
- Phase 1 does **not** change dense screen defaults for shared `Button` and `Card`.
- New visual rules are opt-in through landing primitives, landing button variants, and page-level utility classes.
- Promotion to shared defaults happens only after landing and smoke QA pass.

## Token Layers

### Primitive Tokens

Raw values only.

- Space: `8 / 16 / 24 / 32 / 48 / 64 / 80 / 96`
- Radius: `8 / 12 / pill`
- Control heights: `40 / 44 / 48`
- Core colors: neutral scale, brand green scale, destructive red

### Semantic Tokens

Component-facing names only.

- Surface: `surface-default`, `surface-subtle`, `surface-raised`
- Text: `text-primary`, `text-secondary`, `text-tertiary`, `text-inverse`
- Border: `border-subtle`, `border-default`, `border-strong`
- Action: `action-primary-bg`, `action-primary-bg-hover`, `action-primary-bg-active`, `action-primary-text`
- State: `action-disabled-bg`, `action-disabled-text`, `focus-ring`

Rules:

- Components must reference semantic tokens, never raw color values.
- Tailwind utility classes and shared CSS classes should map to semantic tokens.
- Runtime-only values, such as scroll-based transforms, are the only allowed exception.

## Layout Primitives

Use these first on new pages before adding custom wrappers:

- `Container`
- `Section`
- `SectionHeader`
- `TextBlock`
- `Stack`
- `CTAGroup`
- `MockupFrame`

Meaning:

- `Container`: page width and horizontal padding
- `Section`: vertical rhythm between blocks
- `SectionHeader`: eyebrow, title, description cluster
- `TextBlock`: readable measure and alignment
- `Stack`: vertical gap wrapper
- `CTAGroup`: primary and secondary action grouping
- `MockupFrame`: framed showcase surface for product imagery

## Width And Responsive Rules

- Container max width: `1200px`
- Default content width: `720px`
- Narrow intro width: `608px`
- Mobile horizontal padding: `16px`
- Desktop horizontal padding: `24px`

Breakpoints:

- Mobile: single-column layout, hero title uses mobile scale
- Tablet: larger type, same single-column narrative flow
- Desktop: hero becomes 2-column, feature layout becomes 2-column

Landing rules:

- Hero title: `40px` mobile, `48px` tablet, `56px` desktop
- Section title: `32px`
- Section spacing: `64px` mobile, `80px` desktop
- Feature layout: `1` column mobile and tablet, `2` columns desktop
- CTA text block uses narrow width, not full content width

## Typography

- Caption: `14px`
- Body: `16px / 1.6`
- Card title: `24px / 1.3`
- Section title: `32px / 1.2`
- Hero title: `40 / 48 / 56px` by breakpoint, `1.1`

Weight policy:

- `400`
- `500`
- `700`

Heading policy:

- One `h1` per page
- Section titles use descending hierarchy
- Decorative wordmarks do not replace content headings

## Radius, Shadow, And State

Defaults:

- Small radius: `8px`
- Base radius: `12px`
- Pill radius: `9999px`
- Shadows: `none`, `surface`, `floating`

Use:

- `12px` is the default for landing surfaces and controls.
- `8px` is allowed for tighter UI like compact chips or small controls.
- Pill is reserved for badges, pills, and rounded status labels.

State requirements:

- Primary button must define hover, active, disabled, and text-on-primary states.
- Outline button must define hover and disabled states.
- Focus ring must be visible on keyboard navigation.

## Accessibility And Motion

- Minimum touch target: `44px`
- Use `focus-visible`, not hover-only feedback
- Maintain readable contrast for text and controls
- Respect `prefers-reduced-motion`
- Any non-essential animation must have a reduced-motion fallback

Landing-specific interactions that must stay accessible:

- Hero CTA buttons
- Feature accordion
- Scroll-linked mockup

## Do

- Use layout primitives before inventing page-specific wrappers.
- Use semantic tokens for all surfaces, text, border, and action states.
- Keep action groups to one primary and one secondary emphasis.
- Limit custom values to documented exceptions.

## Don’t

- Don’t change shared defaults just because the landing pilot needs a new look.
- Don’t use raw hex colors or arbitrary spacing for landing sections.
- Don’t mix several shadow strengths on the same page.
- Don’t rely on hover alone for important interaction feedback.

## Example

```tsx
<Section>
  <Container>
    <SectionHeader
      eyebrow="주요 기능"
      title="한눈에 이해되는 야구 경험"
      description="같은 리듬으로 정보를 배치합니다."
    />
    <CTAGroup>
      <Button variant="brand" size="touchLg">시작하기</Button>
      <Button variant="brandOutline" size="touchLg">더 알아보기</Button>
    </CTAGroup>
  </Container>
</Section>
```

## Exceptions

- Scroll-driven transforms may use runtime CSS custom properties.
- Third-party or legacy screens may keep existing defaults until migration phase.
- Any new arbitrary value must be documented with why a token could not cover it.

## Pilot Success Criteria

- Landing uses shared `Container`, `Section`, `SectionHeader`, `TextBlock`, `CTAGroup`, and `MockupFrame`
- Landing has zero hardcoded visual inline styles, excluding runtime scroll transform values
- Landing uses semantic token-based classes for surfaces, text, border, and button states
- No horizontal overflow at `375`, `768`, or `1280`
- Dense screens keep their previous shared `Button` and `Card` defaults

## QA Checklist

- Build passes
- Shared component smoke QA on at least one dense screen
- Keyboard focus is visible
- Reduced motion disables non-essential motion
- Visual regression screenshots cover `375`, `768`, and `1280`

## Auth Extension Checklist

Use this when touching `AuthLayout`, login, signup, password reset, or recovery flows.

- Auth pages use `AuthShell`, `AuthStage`, `AuthHeroPanel`, `AuthFormPanel`, `AuthHeader`, `AuthFieldGroup`, `AuthActionGroup`, and `AuthStatusPanel`
- Auth pages expose stable `data-testid` hooks for home/back, submit, social login, and status panels
- Auth controls keep `44px` minimum height, `48px` for primary CTA where possible
- Redirect query is preserved for login -> signup, login -> password reset, password reset -> login, and recovery -> login
- Missing-token and invalid-link states render inside `AuthStatusPanel`

## Manual Browser QA

Safari/iOS:

- Login, signup, password reset, and recovery screens fit without horizontal scroll at `375px`
- iOS autofill does not break input height, radius, or label alignment
- Home and back actions remain reachable above the software keyboard
- Primary CTA and provider buttons keep `44px+` touch targets

Keyboard and motion:

- First `Tab` on `/login` shows a visible focus ring on the home CTA
- Tabbing reaches password reset, signup, and social buttons in a sensible order
- `prefers-reduced-motion` disables non-essential transitions on auth CTAs and provider buttons
- Error and success states remain readable with keyboard navigation only

Redirect smoke:

- `/login?redirect=...` -> signup preserves redirect
- `/login?redirect=...` -> password reset preserves redirect
- `/password/reset?redirect=...` -> login preserves redirect
- `/account/deletion/recovery?redirect=...` -> login preserves redirect

## CI Follow-Up

- `npm run qa:landing` and `npm run qa:auth` are the CI gate for public screen visual smoke
- GitHub Actions must publish summary markdown plus screenshots as artifacts
- Cypress auth happy-path specs remain valuable, but they are not the blocking gate until the local binary issue is resolved
