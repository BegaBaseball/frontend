# 사직 좌석도 hitPath 확장 후보 리뷰

작성일: 2026-05-14 KST

## 목적

이번 v2+ PR은 실제 좌표 확장을 적용하지 않고, 모바일 터치 보정이 필요할 가능성이 높은 섹션을 `hitPathExpansionCandidate`로 표시한다.
후속 PR에서 운영자 승인 좌표가 있을 때만 `hitPath`를 `visualPath`와 분리한다.

현재 release lock 기준:

- `visualPath === hitPath`
- 실제 좌표 확장 없음
- `HIT_POLYGON_TOO_SMALL` guardrail 적용
- 외부 검색/크롤링/추정 좌표 사용 금지

## 후보 목록

| 우선순위 | sectionId | 그룹 | 사유 | 이번 PR 처리 |
| --- | --- | --- | --- | --- |
| P0 | `021`, `022`, `031`, `032` | 홈플레이트 주변 | 작은 중앙 하단 블럭이며 모바일 터치 오차 영향이 큼 | 후보 metadata만 유지 |
| P0 | `121`, `122`, `123`, `124`, `125` | 1루 얇은 블럭 | 폭이 좁고 인접 경계가 촘촘함 | 후보 metadata만 유지 |
| P0 | `131`, `132`, `133`, `134`, `135`, `142`, `143` | 1루 얇은 블럭 | thin outside leakage audit 대상과 가까움 | 후보 metadata만 유지 |
| P1 | `012`, `013`, `023` | 중앙/테이블 인접 | 홈플레이트 주변 작은 블럭과 인접 | 후보 metadata만 유지 |
| P1 | `041`, `044` | 중앙/상단 인접 | 검색/클릭 오차가 생기기 쉬운 경계 | 후보 metadata만 유지 |
| P2 | `033` | 중앙 인접 | P0/P1 후보 검수 뒤 필요 시 확장 | 후보 metadata만 유지 |

source of truth:

```ts
SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS
```

자동 리포트:

- JSON: `reports/stadium/sajik-seatmap-hitpath-candidate-review.json`
- Markdown: `reports/stadium/sajik-seatmap-hitpath-candidate-review.md`
- command: `npm run stadium:sajik:hitpath-review`

구역별 정밀화 workset:

- JSON: `reports/stadium/sajik-seatmap-zone-precision-worksets.json`
- Markdown: `reports/stadium/sajik-seatmap-zone-precision-worksets.md`
- SVG: `reports/stadium/sajik-seatmap-zone-precision-worksets.svg`
- command: `npm run stadium:sajik:zone-precision-worksets`
- status: `waiting-for-operator`
- candidate rows: `22`
- regression guard rows: `3`
- productionWriteAllowed: `false`

Stage 01 operator package/prewrite:

- operator input JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json`
- operator checklist: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-checklist.md`
- package summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-package.md`
- operator input aid: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.md`
- prewrite gate: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.md`
- patch preview: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.patch-preview.ts`
- apply-ready gate: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-apply-ready.md`
- post-apply audit: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-post-apply-audit.md`
- operator status board: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.md`
- manual patch plan: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.md`
- prewrite smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite-smoke.md`
- command: `npm run stadium:sajik:stage01-prewrite`
- operator input aid command: `npm run stadium:sajik:stage01-operator-input-aid`
- apply-ready command: `npm run stadium:sajik:stage01-apply-ready`
- post-apply command: `npm run stadium:sajik:stage01-post-apply-audit`
- operator status command: `npm run stadium:sajik:stage01-operator-status`
- manual patch plan command: `npm run stadium:sajik:stage01-manual-patch-plan`
- smoke command: `npm run stadium:sajik:stage01-prewrite-smoke`
- status: `waiting-for-operator`
- Stage 01 rows: `16`
- approved rows: `0`
- operator input aid: `waiting-for-operator`, `pending=16`, `invalid=0`
- apply-ready status: `waiting-for-operator`
- post-apply status: `waiting-for-operator`, `approvedPatchPayloads=0`, `applied=0`, `unapplied=0`, `readOnly=true`
- operator status: `waiting-for-operator`, `pending=16`, `applied=0`, `notApplied=0`, `invalid=0`
- manual patch plan: `waiting-for-operator`, `manualPatchRows=0`
- smoke status: `passed`, `cases=5/5`, `operatorPackagePreservationPassed=true`
- productionWriteAllowed: `false`

현재 자동 리포트 기준:

- status: `passed`
- candidates: `22`
- P0: `16`
- P1: `5`
- P2: `1`
- alias-only exceptions: `2`
- `visualPath === hitPath`: `22`
- approved expanded hitPath: `0`
- blockers: `0`

## 후속 확장 승인 기준

확장 PR은 다음 조건을 만족해야 한다.

- 공식 PNG `960x640` 좌표계 기준으로 작성한다.
- `visualPath`는 공식 이미지 경계를 계속 유지한다.
- `hitPath`만 모바일 터치 편의를 위해 확장한다.
- `hitPath`는 `visualPath` 면적의 75% 이상이어야 한다.
- self-intersection, out-of-bounds, labelPoint outside issue가 없어야 한다.
- 인접 섹션과 의도하지 않은 click priority 회귀가 없어야 한다.
- `npm run qa:stadium:sajik:polygon-v2`가 통과해야 한다.

## 리뷰 batch

| batch | 우선순위 | sectionId | 처리 |
| --- | --- | --- | --- |
| P0-A | P0 | `021`, `022`, `031`, `032` | 홈플레이트 주변 작은 블럭 우선 검토 |
| P0-B | P0 | `121`, `122`, `123`, `124`, `125` | 1루 얇은 블럭 1차 검토 |
| P0-C | P0 | `131`, `132`, `133`, `134`, `135`, `142`, `143` | seam evidence와 함께 검토 |
| P1-A | P1 | `012`, `013`, `023` | P0 완료 후 중앙/테이블 인접 검토 |
| P1-B | P1 | `041`, `044` | P0 완료 후 중앙/상단 인접 검토 |
| P2-A | P2 | `033` | P0/P1 완료 후 필요 시 보류 해제 |

## 검수 방식

1. editor에서 `hit-candidate` 검색으로 후보를 필터링한다.
2. 후보 섹션을 선택하고 `hitPath` mode로 전환한다.
3. `visualPath edit syncs hitPath`를 끄고 hit-area만 조정한다.
4. `PATCH PASS`를 확인한다.
5. JSON/TS preview를 별도 patch로 검토한다.
6. 모바일 390과 데스크톱 1440에서 같은 섹션 선택이 유지되는지 확인한다.

## 이번 PR에서 하지 않는 것

- 실제 `hitPath` 좌표 확장
- 작은 블럭의 우선순위 클릭 정책 변경
- `011/903` alias-only 예외 해제
- 휠체어석 marker-only 전환
