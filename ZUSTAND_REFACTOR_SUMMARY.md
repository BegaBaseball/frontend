# Zustand Refactor Summary

## Goal

- Reduce unnecessary global state.
- Separate server state from client/UI state.
- Replace direct `useAuthStore(...)` access with shared selector/action hooks.
- Minimize persisted data and remove unused store surface area.

## Shared auth hooks

Added common hooks in [src/store/authStore.ts](/Users/mac/project/KBO_platform/bega_frontend/src/store/authStore.ts):

- `useAuthSession()`
- `useAuthProfileSnapshot()`
- `useAuthProfileActions()`
- `useAuthAccessActions()`
- `useAuthAuthenticationActions()`
- `useAuthCheerActions()`
- `useAuthDialogState()`

Result:

- component/hook level direct `useAuthStore(...)` usage was removed
- auth reads now go through stable selectors
- auth actions are grouped by purpose instead of being pulled ad hoc

## Store-by-store changes

### `authStore`

- kept `persist`, but `partialize: () => ({})` so auth data is not stored
- normalized auth/session/dialog access through shared hooks

### `leaderboardStore`

- reduced to UI-only combo animation state
- server-side ranking/powerup data moved out of the store flow

### `diaryStore`

- removed `persist`
- reduced to pending draft handoff only
- server-backed diary data no longer lives in Zustand

### `mateStore`

- reduced to:
  - `selectedParty`
  - `searchQuery`
  - `createStep`
  - `formData`
  - `formErrors`
  - validation/update actions
- removed unused server/cache-like state:
  - parties/applications/chat/check-in/application form state
- kept session-scoped persist only for:
  - `createStep`
  - `formData` without `ticketFile`
  - `searchQuery`

### `predictionStore`

- already minimal enough
- persists only:
  - `rankings`
  - `isPredictionSaved`

### `uiStore`

- reduced to:
  - `showWelcome`
  - `isNotificationOpen`
- removed unused `isChatBotOpen`

### `notificationStore`

- kept as-is
- all actions are still in active use

### `cheerStore`

- kept as-is
- already a minimal UI store for `activeTab`

## Architectural effects

- server state is handled more explicitly outside Zustand
- Zustand stores are now focused on:
  - auth session/UI access
  - temporary UI state
  - multi-step form state
  - lightweight cross-component coordination

## Notable app-level changes

- `App.tsx` auth usage was migrated to shared auth hooks
- `OffSeasonList` lazy import was fixed to:
  - `./components/OffSeasonList.tsx`
- this resolved the intermittent build-time resolver failure seen on `./components/OffSeasonList`

## Validation performed

Repeated validation was done with:

```bash
cd /Users/mac/project/KBO_platform/bega_frontend
npm run build
```

Confirmed repeatedly:

- `vite build` passes
- `seo:prerender` passes
- `seo:sitemap` passes

## Current status

- Zustand cleanup is effectively complete for the frontend
- remaining work, if any, is optional follow-up:
  - browser-level smoke verification in a stable automation environment
  - further documentation or team conventions
