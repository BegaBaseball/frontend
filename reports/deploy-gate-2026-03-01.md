# Deploy Gate Report (2026-03-01)

## Scope
- Frontend-backend real integration smoke automation
- Chat image upload activation + regression verification
- Type mismatch hardening for leaderboard numeric fields
- Mate/payment real API smoke coverage expansion
- WebSocket real connection smoke verification

## Executed Checks
1. `npm run build`
- Result: PASS

2. `npm run cy:run:heal -- --spec cypress/e2e/auth-signup-policy-consent.cy.ts`
- Result: PASS
- Validates required `policyConsents` are included in signup payload.

3. `npm run cy:run:heal -- --spec cypress/e2e/mate-chat-upload.cy.ts`
- Result: PASS
- Validates chat image upload button enabled and image send flow.

4. `SMOKE_SKIP_SIGNUP=1 SMOKE_LOGIN_EMAIL=... SMOKE_LOGIN_PASSWORD=... npm run test:integration:real`
- Result: PASS
- Report: `reports/real-integration-smoke-latest.json`
- Covered endpoints:
  - `GET /api/auth/policies/required` (200)
  - `POST /api/auth/login` (200)
  - `GET /api/auth/mypage` (200)
  - `GET /api/chat/my/unread-counts` (200)
  - `POST /api/storage/image` (200)
  - `GET /api/parties` (200)
  - `GET /api/applications/my` (200)
  - `POST /api/payments/toss/prepare` (503 business rejection: direct trade mode)

5. `npm run cy:run:heal -- --spec cypress/e2e/websocket-real.cy.ts`
- Result: PASS
- Validates authenticated STOMP connection over `/ws`.

6. `npm run cy:run:heal -- --spec cypress/e2e/auth-signup-policy-consent.cy.ts,cypress/e2e/mate-chat-upload.cy.ts,cypress/e2e/websocket-real.cy.ts`
- Result: PASS (3/3)

## Key Findings
- Real integration smoke now runs with a single command: `npm run test:integration:real`.
- Storage upload works end-to-end in current environment.
- Payment prepare endpoint returns expected business-mode rejection (503) under direct-trade mode.
- WebSocket real smoke now passes after backend `APP_ALLOWED_ORIGINS` includes `http://localhost:5176` for local parity.
- In Codex sandbox, `npm run test:integration:real` may require elevated execution because loopback fetch can fail with `EPERM`; this is an execution-environment constraint, not an app regression.

## Recommendation Before Deploy Sign-off
1. Current gate can be treated as GREEN for covered scope (HTTP + upload + signup consent + WebSocket connect).
2. Keep production origin policy strict; use local origin only in local/dev compose profile.
3. Re-run `npm run test:integration:real` and the 3-spec Cypress set immediately before release cut.
