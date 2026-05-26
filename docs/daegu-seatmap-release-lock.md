# 대구 삼성라이온즈파크 좌석도 release lock

검수 고정일: 2026-05-24 KST (갱신)

## 기준

- 공식 asset: `src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png`
- 공식 이미지 좌표계: `1707x2048`
- stadium id: `DAEGU_SAMSUNG_LIONS_PARK`
- map version: `DAEGU_SAMSUNG_LIONS_PARK_2026_MANUAL_POLYGON_V1`
- image sha256: `8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0`
- canonical data source: `src/data/daeguSeatData.ts`
- renderer: `src/components/daegu/DaeguSeatMapSvg.tsx`
- data policy: 외부 야구 crawling/search 없이 공식 PNG와 operator-approved 좌표만 사용한다.
- uploaded operator reference: `OPERATOR_REFERENCE_RAPAK_2025`는 업로드 이미지 기반 `4096x4096` polygon draft source이며, `npm run stadium:daegu:operator-reference-trace`, `npm run stadium:daegu:operator-reference-review-packet`, `npm run stadium:daegu:operator-reference-auto-map`으로 별도 산출물을 만든다. 이 source는 release lock의 canonical 좌표를 대체하지 않는다.
- MySeatCheck reference intake: `docs/daegu-seatmap-myseatcheck-reference-intake.md`에 `MYSEATCHECK_REFERENCE_2026`를 pending external reference로만 등록한다. 이 source는 release lock의 canonical 좌표를 대체하지 않는다.

## 고정 상태 (현재: PASS_LOCKED_164)

- pass level: `PASS_LOCKED_164`
- total inventory rows: `177`
- `lockedVerified`: `164`
- `classifiedReleaseRows`: `3` (MR-10, M-10: OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED; 12: WAYFINDING_MARKER)
- unresolved openWorkset: `10` (V3, MR-1~MR-6, MR-8, MR-9, M-9 — 아래 정책 참조)
- `releaseReady`: `true`

### openWorkset 10개 처리 방침

10개 블록(`V3`, `MR-1~MR-9` 중 MR-7 제외 8개, `M-9`)은 `DAEGU_BLOCKS` (공식 PNG 아카이브) 기준으로는 unresolved 상태이나, 사용자가 실제 보는 인터랙티브 맵은 `DAEGU_DEFAULT_SEATMAP_SOURCE_ID = 'OPERATOR_REFERENCE_RAPAK_2025'`로 서비스된다. 즉, **사용자 경험은 이미 `DAEGU_OPERATOR_REFERENCE_BLOCKS` (109개, 4096×4096 좌표계)로 정상 동작**하고 있다.

이 10개 블록의 DAEGU_BLOCKS unresolved 상태는 공식 PNG 참조 아카이브의 기술 부채이며, 사용자 클릭/선택 기능을 차단하지 않는다. 운영자가 공식 PNG와 재정렬(retrace)을 완료하면 unresolved가 해소된다.

**release 허용 조건**: `lockedVerified === 164 && openWorkset === 10` → `PASS_LOCKED_164` → release 허용.

### 정밀 완료 목표

`PASS_RELEASE_177`은 현재 `PASS_LOCKED_164` release 허용 상태와 구분되는 최종 정밀 완료 기준이다. 이 기준은 공식 PNG archive debt 10개가 해소된 뒤에만 사용한다.

- `LOCKED_VERIFIED`: `174`
- `classifiedReleaseRows`: `3`
- `releaseInventoryLocked`: `177`
- unresolved selectable seat polygon rows: `0`
- `normalSelectableSeats`: `171`
- `reviewOnlySeats`: `0`
- `officialUnconfirmedSeats`: `2`
- `visualBlockerRows`: `0`
- `normalVisualReviewRows`: `0`
- `queueRows`: `0`

`PASS_RELEASE_177`은 `MR-10`/`M-10`을 selectable seat로 확정했다는 뜻이 아니다. 대구 precision-complete lock은 official PNG에 정렬된 좌석 polygon 174개와 selectable seat layer에서 제외된 classified row 3개를 합산해 177개 inventory가 해결된 상태를 뜻한다.

## Classified row lock

| block | lock status | layer policy | 재진입 조건 |
| --- | --- | --- | --- |
| `MR-10` | `OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED` | not selectable, not review-only | 독립 official seat component가 확인되고 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, `reviewedAt`이 모두 채워진다. |
| `M-10` | `OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED` | not selectable, not review-only | 독립 official seat component가 확인되고 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, `reviewedAt`이 모두 채워진다. |
| `12` | `WAYFINDING_MARKER` | marker-only, not selectable | operator가 좌석 구역임을 별도 확인하고 official PNG 기준 polygon을 승인한다. |

## Layer contract

- normal seat layer는 `isDaeguNormalSelectableSeat`를 통과한 row만 렌더링하고 선택 가능해야 한다.
- debug review layer는 `isDaeguReviewOnlySeat`를 통과한 row만 orange overlay로 보여주며 pointer event는 꺼져 있어야 한다.
- `OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED` row는 normal/review seat layer 양쪽에 들어가면 안 된다.
- `WAYFINDING_MARKER`와 marker-only row는 seat polygon layer에 들어가면 안 된다.
- renderer 클릭 기준은 계속 `hitPath ?? visualPath ?? d`이지만, 이 기준은 normal selectable predicate 이후에만 적용한다.

## Source baseline audit (2026-05-26)

- `npm run stadium:daegu:source-baseline-audit`: `review-required`
- generated evidence: `reports/stadium/daegu-seatmap-source-baseline-audit.{json,csv,md}`
- active runtime source references: `2` (`SAMSUNG_OFFICIAL_2026`, `OPERATOR_REFERENCE_RAPAK_2025`)
- default source: `OPERATOR_REFERENCE_RAPAK_2025`
- official selectable blocks: `171`
- operator-reference selectable blocks: `131`
- active section-id source overlaps: `101`
- active block-label source overlaps: `77`
- official-only active sections: `70`
- operator-only active sections: `30`
- geometry issues: `0`
- `MYSEATCHECK_REFERENCE_2026` remains reference-only and must not become an active runtime polygon source without operator-provided approval.
- generated baseline reports are QA evidence only and must not be staged as PR payload.

## Canonical decision table (2026-05-26)

- `npm run stadium:daegu:canonical-decision-table`: `review-required`
- generated evidence: `reports/stadium/daegu-seatmap-canonical-decision-table.{json,csv,md}`
- total decision rows: `206`
- `CANONICAL_READY`: `101` overlap rows; recommended source `OPERATOR_REFERENCE_RAPAK_2025`
- `OFFICIAL_ONLY_REVIEW`: `70` rows; recommended source `SAMSUNG_OFFICIAL_2026` until retrace/operator approval exists
- `OPERATOR_ONLY_REVIEW`: `29` rows; metadata/label ownership review required before promotion
- `ALIAS_OR_MARKER_REVIEW`: `4` rows; keep outside normal seat polygon layer
- `BLOCKED_UNCONFIRMED`: `2` rows (`MR-10`, `M-10`); no selectable canonical polygon until independent component evidence is approved
- geometry issues: `0`
- recommended source totals: `OPERATOR_REFERENCE_RAPAK_2025=130`, `SAMSUNG_OFFICIAL_2026=70`, `NO_CANONICAL_SOURCE=6`
- generated decision-table reports are QA evidence only and must not be staged as PR payload.

## QA ownership audit (2026-05-26)

- `npm run stadium:daegu:qa-ownership-audit`: `review-required`
- generated evidence: `reports/stadium/daegu-seatmap-qa-ownership-audit.{json,csv,md}`
- total normalized block keys: `191`
- selectable block keys: `189`
- active runtime source overlaps: `108` block keys
- active QA owner conflicts: `108` block keys
- active tracing owner conflicts: `108` block keys
- marker-in-seat-QA rows: `3` (`09`, `12`, `U22`)
- unconfirmed selectable trace rows: `1` (`MR-10`)
- package script ownership tiers: `active-tracing=47`, `active-validation=169`, `global-validation=5`, `historical-evidence=287`
- global smoke/audit commands are historical evidence for this ownership audit and are not counted as per-block owners.
- generated ownership reports are QA evidence only and must not be staged as PR payload.

## Canonical block decision guard (2026-05-26)

- `npm run stadium:daegu:canonical-block-decision-guard`: `review-required`
- canonical decision builder: `src/data/daeguCanonicalBlockDecision.ts`; the guard script only serializes generated evidence.
- generated evidence: `reports/stadium/daegu-seatmap-canonical-block-decision-guard.{json,csv,md}`
- total normalized block keys: `191`
- canonical selectable block keys: `188`
- `CANONICAL_OPERATOR_FROM_OVERLAP`: `108` block keys; official PNG polygons become historical evidence
- `CANONICAL_OFFICIAL_ONLY`: `58` block keys; keep official PNG polygon until operator-reference retrace/approval exists
- `CANONICAL_OPERATOR_ONLY`: `22` block keys; keep operator-reference polygon after metadata/label ownership review
- `MARKER_OR_ALIAS_ONLY`: `1` block key (`TC`)
- `BLOCKED_UNCONFIRMED`: `2` block keys (`MR-10`, `M-10`)
- marker alias separation required: `3` block keys (`09`, `12`, `U22`)
- geometry issues: `0`
- generated canonical block decision reports are QA evidence only and must not be staged as PR payload.

## Evidence

- `reports/stadium/daegu-seatmap-precision-audit.md`
- `reports/stadium/daegu-seatmap-render-safety-audit.md`
- `reports/stadium/daegu-visual-match-audit/daegu-seatmap-visual-match-audit.md`
- `reports/stadium/daegu-visual-match-workset/daegu-seatmap-visual-match-workset.md`
- `reports/stadium/daegu-seatmap-source-baseline-audit.md`
- `reports/stadium/daegu-seatmap-canonical-decision-table.md`
- `reports/stadium/daegu-seatmap-qa-ownership-audit.md`
- `reports/stadium/daegu-seatmap-canonical-block-decision-guard.md`
- `output/playwright/stadium-ux-daegu-full/stadium-mobile-smoke-summary.md`

## 검증 명령

- `npm run qa:stadium:daegu:release-lock`: PASS, `PASS_LOCKED_164` (2026-05-24 갱신)
- `npm run stadium:daegu:source-baseline-audit`: PASS, `review-required`, `geometry_issues=0`
- `npm run stadium:daegu:canonical-decision-table`: PASS, `review-required`, `canonical_ready=101`, `geometry_issues=0`
- `npm run stadium:daegu:qa-ownership-audit`: PASS, `review-required`, `active_source_overlaps=108`, `marker_in_seat_qa=3`
- `npm run stadium:daegu:canonical-block-decision-guard`: PASS, `review-required`, `canonical_selectable=188`, `operator_overlap=108`, `geometry_issues=0`
- `npm run stadium:daegu:visual-match-workset`: PASS, `queueRows=0`
- `npm run qa:stadium:daegu:full`: PASS
- `node --import tsx --test --test-concurrency=1 --test-name-pattern=대구 src/components/StadiumGuideRuntimeSeatMaps.test.ts src/data/daeguSeatData.test.ts`: PASS, 25/25
- `env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`: PASS
