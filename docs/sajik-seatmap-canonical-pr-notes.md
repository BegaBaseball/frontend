# 사직 좌석도 canonical 통합 PR notes

작성일: 2026-05-26 KST

## Summary

사직 사용자 runtime 좌석도는 `SAJIK_CANONICAL_2026` 한 벌로 고정한다. 배경 이미지는 operator-reference `1151x1367` 좌표계이며, 기존 공식 PNG와 operator-reference 산출물은 historical QA evidence로 보존한다.

## Runtime Contract

- source id: `SAJIK_CANONICAL_2026`
- map version: `BUSAN_SAJIK_2026_CANONICAL_OPERATOR_REFERENCE_V1`
- image: `src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp`
- active selectable seat sections: `78`
- operator-only promoted blocks: `322`, `323`, `921`
- operator accessibility markers: `14`
- linked selectable markers: `8`
- legacy official-only aliases: `935`, `013`, `012`, `011`, `914`, `913`, `912`, `911`, `903`, `902`, `901`
- official wheelchair pseudo-blocks: `휠체어석-3루`, `휠체어석-중앙`, `휠체어석-1루` are marker aliases only with `runtimePolygon=false`

## PR Description

This PR consolidates Sajik seatmap runtime ownership into one canonical source. The user-facing source selector is removed, canonical sections are rendered from `src/data/sajikCanonicalSeatMap.ts`, and the duplication audit fails if any active block has zero or multiple polygon sources. Legacy official PNG, operator-reference, stage01, candidate, proposed, and retrace artifacts remain available only as historical evidence unless explicitly promoted into canonical data.

## Verification

- `npm run stadium:sajik:block-source-duplication-audit`: PASS, `active_polygon_source_per_block=1`
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`: PASS, `37/37`
- `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS
- `npm run qa:stadium:sajik:full`: PASS
- `env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`: PASS

## QA Evidence Summary

- generated QA report files stay out of the PR payload: `reports/stadium/sajik-seatmap-*.{json,csv,md,png}`, `reports/stadium/sajik-stage01-operator/*`, `dist/*`, `output/playwright/*`
- block source duplication report: `reports/stadium/sajik-seatmap-block-source-duplication-audit.{json,csv,md}`; latest summary `active_canonical_blocks=78`, `active_polygon_source_per_block=1`, `legacy_alias_only=11`
- scope guard report: `reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`; latest summary `included=17`, `unexpected=0`, `blockers=0`
- scope guard smoke report: `reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`; full/partial guard snapshots pass
- full visual QA summary: `output/playwright/stadium-ux-sajik-full/stadium-mobile-smoke-summary.md`; report path is evidence only and is not staged
- build reports such as `reports/bundle-guard-report.json` and `reports/dist-assets-report.json` are regenerated evidence and are not part of this payload

## Official-Only Block Policy

The 11 official-only blocks `935`, `013`, `012`, `011`, `914`, `913`, `912`, `911`, `903`, `902`, `901` stay `ALIAS_ONLY` in canonical runtime. They keep search/reference metadata, but they do not create selectable polygons until an operator-reference trace exists and passes the canonical validator. Do not copy official PNG coordinates into runtime as a fallback.

Next operator review should split those 11 blocks into:

- retrace candidates: blocks visible enough on the operator-reference image to trace as closed single polygons.
- permanent alias-only candidates: blocks that cannot be confidently located on the operator-reference image.
- marker candidates: non-seat accessibility or service entities that should be modeled as markers, not seat polygons.

## Rollout Notes

- Do not stage regenerated `reports/*`, `dist/*`, or `output/playwright/*` artifacts by default.
- Use `git add -p` for shared files such as `package.json`, `scripts/stadium-seatmap-ops.mjs`, `scripts/stadium-ux-audit.mjs`, and `src/components/StadiumGuideRuntimeSeatMaps.test.ts`.
- External baseball crawling, web search, or synthesized seat data is out of scope.
