### Frontend Mate Regression

| Stage | Status | Counts | Scope |
| --- | --- | --- | --- |
| Unit smoke | success | 41/41 passed | mate route barrels, query/cache helpers, mate utils/api |
| Build smoke | success | n/a | vite build + seo prerender + sitemap |
| Route regression | success | 29/29 passed | mate.cy.ts, mate-detail-states.cy.ts, mate-execution-flow.cy.ts, mate-qr-refresh.cy.ts |
| Create/session regression | success | 6/6 passed | mate-create.cy.ts, mate-create-session-recovery.cy.ts, mate-apply-session-recovery.cy.ts, mate-selling-payment-success.cy.ts |
| Extended regression | success | 14/14 passed | mate-chat-upload.cy.ts, mate-flow-policy.cy.ts, mate-visual.cy.ts |

- Trigger: nightly at 03:00 Asia/Seoul (18:00 UTC)
- Artifact policy: machine-readable reports/logs are uploaded as `frontend-mate-regression-reports`; failure screenshots/videos are uploaded as `frontend-mate-regression-cypress-failures` for 14 days
- Optional artifact: `frontend-mate-regression-visual-artifacts` uploads successful mate-visual screenshots when extended regression runs
