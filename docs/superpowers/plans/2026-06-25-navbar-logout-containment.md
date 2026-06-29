# Navbar Logout Containment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the desktop logout control visually and geometrically inside the navbar capsule in both expanded and compact states.

**Architecture:** Treat the right auth controls as part of the capsule layout contract, not as content that can overflow a fixed capsule width. Update the desktop navbar shell to reserve a right-side track and prevent scroll compacting from shrinking below the logged-in minimum.

**Tech Stack:** React, TypeScript, Tailwind CSS, Cypress, Vite.

---

## File Structure

- Modify: `src/components/PublicNavbar.tsx`
  - Public desktop navbar capsule width, right control layout, and test ids.
- Modify: `src/components/Navbar.tsx`
  - Authenticated shell version of the same desktop navbar rules.
- Modify: `src/components/PublicNavbarDesktopAuthControls.tsx`
  - Auth control sizing contract only if the tests show the logout pill has an incorrect intrinsic width.
## Task 1: Reserve Capsule Width For Logged-In Right Controls

**Files:**
- Modify: `src/components/PublicNavbar.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Add desktop capsule width constants in both navbar files**

Place near the existing component-level constants:

```ts
const DESKTOP_NAVBAR_GUEST_WIDTH = 980;
const DESKTOP_NAVBAR_GUEST_COMPACT_WIDTH = 760;
const DESKTOP_NAVBAR_AUTH_WIDTH = 1180;
const DESKTOP_NAVBAR_AUTH_COMPACT_WIDTH = 1040;
```

- [ ] **Step 2: Replace capsule width calculation in `PublicNavbar.tsx`**

Replace the current `capsuleStyle` width fields with:

```ts
const desktopCapsuleExpandedWidth = isLoggedIn
  ? DESKTOP_NAVBAR_AUTH_WIDTH
  : DESKTOP_NAVBAR_GUEST_WIDTH;
const desktopCapsuleCompactWidth = isLoggedIn
  ? DESKTOP_NAVBAR_AUTH_COMPACT_WIDTH
  : DESKTOP_NAVBAR_GUEST_COMPACT_WIDTH;

const capsuleStyle = {
  '--navbar-capsule-width': `${desktopCapsuleExpandedWidth - ((desktopCapsuleExpandedWidth - desktopCapsuleCompactWidth) * shrinkProgress)}px`,
  '--navbar-capsule-height': `${60 - (14 * shrinkProgress)}px`,
  '--navbar-capsule-px': `${14 - (4 * shrinkProgress)}px`,
  '--navbar-capsule-gap': `${14 - (6 * viewportFitProgress)}px`,
} as CSSProperties;
```

- [ ] **Step 3: Apply the same width calculation in `Navbar.tsx`**

Use the same constants and `capsuleStyle` expression. Use `isLoggedIn` as the auth width switch so logged-in shells do not shrink to the guest width while auth controls are present.

## Task 2: Make The Desktop Capsule A Three-Track Layout

**Files:**
- Modify: `src/components/PublicNavbar.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Change capsule class in both files**

Replace the desktop capsule layout class segment:

```tsx
'relative flex h-12 items-center gap-2 md:gap-[var(--navbar-capsule-gap)] rounded-full border px-3 transition-[width,height,padding,gap,background-color,border-color,box-shadow] duration-150 ease-out md:left-1/2 md:h-[var(--navbar-capsule-height)] md:w-[var(--navbar-capsule-width)] md:max-w-[calc(100vw-1rem)] md:-translate-x-1/2 md:px-[var(--navbar-capsule-px)]'
```

with:

```tsx
'relative flex h-12 items-center gap-2 rounded-full border px-3 transition-[width,height,padding,gap,background-color,border-color,box-shadow] duration-150 ease-out md:left-1/2 md:grid md:h-[var(--navbar-capsule-height)] md:w-[var(--navbar-capsule-width)] md:max-w-[calc(100vw-1rem)] md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-[var(--navbar-capsule-gap)] md:-translate-x-1/2 md:px-[var(--navbar-capsule-px)]'
```

- [ ] **Step 2: Make desktop nav shrink inside the middle track**

In both files, change the desktop nav class from:

```tsx
<nav className="flex flex-1 items-center justify-center" aria-label="주 메뉴">
```

to:

```tsx
<nav className="flex min-w-0 items-center justify-center" aria-label="주 메뉴">
```

- [ ] **Step 3: Add test ids and right alignment**

In both files, change the right controls wrapper from:

```tsx
<div className="flex items-center shrink-0 ml-auto" style={rightControlsStyle}>
```

to:

```tsx
<div
  data-testid="navbar-right-controls"
  className="flex min-w-0 items-center justify-self-end"
  style={rightControlsStyle}
>
```

Change the auth wrapper from:

```tsx
<div className="flex items-center" style={desktopAuthWrapperStyle}>
```

to:

```tsx
<div data-testid="navbar-auth-controls" className="flex items-center" style={desktopAuthWrapperStyle}>
```

## Task 3: Keep Auth Button Intrinsic Widths Predictable

**Files:**
- Modify: `src/components/PublicNavbarDesktopAuthControls.tsx`

- [ ] **Step 1: Only change this file if visual verification or existing Cypress still shows logout overflow after Tasks 1-2**

If the logout button still exceeds its intended width, add explicit flex-basis and max-width to `authButtonStyle`:

```ts
const authButtonStyle = (expandedWidth: number): CSSProperties => {
  const width = COMPACT_AUTH_BUTTON_SIZE + ((expandedWidth - COMPACT_AUTH_BUTTON_SIZE) * expandedProgress);

  return {
    width: `${width}px`,
    flexBasis: `${width}px`,
    maxWidth: `${width}px`,
    paddingLeft: `${16 * expandedProgress}px`,
    paddingRight: `${16 * expandedProgress}px`,
    paddingTop: '0px',
    paddingBottom: '0px',
    fontSize: `${14 + (2 * expandedProgress)}px`,
  };
};
```

- [ ] **Step 2: Apply the same width contract to the profile button**

Change the profile button style to:

```tsx
style={{
  width: `${COMPACT_AUTH_BUTTON_SIZE + (102 * expandedProgress)}px`,
  flexBasis: `${COMPACT_AUTH_BUTTON_SIZE + (102 * expandedProgress)}px`,
  maxWidth: `${COMPACT_AUTH_BUTTON_SIZE + (102 * expandedProgress)}px`,
  fontSize: `${13 + (2 * expandedProgress)}px`,
}}
```

## Task 4: Verify

**Files:**
- Test: `src/hooks/useNavbarViewportCompactProgress.test.ts`
- Test: `cypress/e2e/navbar-responsive.cy.ts`

- [ ] **Step 1: Run viewport compact unit test**

Run:

```bash
node --import tsx --test src/hooks/useNavbarViewportCompactProgress.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run navbar responsive Cypress spec**

Run:

```bash
npm run cy:run -- --spec cypress/e2e/navbar-responsive.cy.ts
```

Expected: all existing navbar responsive tests pass.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: build exits 0.

## Self-Review

- Spec coverage: The plan targets only the logout control leaving the navbar layout. It does not change routing, auth behavior, notification behavior, or menu labels.
- Placeholder scan: No placeholder implementation steps remain.
- Type consistency: The implementation tasks reuse existing navbar props, compact progress helpers, and auth control dimensions.
