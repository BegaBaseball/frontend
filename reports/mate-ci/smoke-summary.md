### Frontend Mate Smoke

| Stage | Status | Counts | Scope |
| --- | --- | --- | --- |
| Unit smoke | success | 41/41 passed | mate route barrels, query/cache helpers, mate utils/api |
| Build smoke | success | n/a | vite build + seo prerender + sitemap |
| Core E2E smoke | success | 22/22 passed | mate-detail-states.cy.ts, mate-execution-flow.cy.ts |

- Trigger: PR path changes and manual workflow dispatch
- Artifact policy: machine-readable reports/logs are uploaded as `frontend-mate-smoke-reports`; failure screenshots/videos are uploaded as `frontend-mate-smoke-cypress-failures` for 14 days
