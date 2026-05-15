# 대구 좌석도 operator corrections runbook

작성일: 2026-05-10

## 목적

대구 좌석도 177개 블록 중 audit에서 확정되지 않은 블록은 운영자 corrected path가 들어오기 전까지 production 좌표로 승격하지 않는다.
이 runbook은 운영자가 corrected path를 제출하고, 프론트엔드에서 검증/preview/write를 진행하는 표준 절차를 고정한다.

## 현재 기준

- 공식 PNG 좌표계: `1707x2048`
- 전체 블록: `177`
- `LOCKED_VERIFIED`: `80`
- 운영자 handoff 대상: `97`
- 현재 approved rows: `0`
- 현재 production write 상태: `readyForWrite=false`
- 현재 blocker: `NO_APPROVED_OPERATOR_CORRECTIONS`

## 통과 기준 재정의

대구 좌석도에서 `통과`는 하나의 의미가 아니다. 자동 테스트 또는 workflow가 통과해도 polygon 정밀화가 끝났다는 뜻으로 보지 않는다.

| pass level | 의미 |
| --- | --- |
| `PASS_WORKFLOW` | 스크립트와 데이터 계약이 실행 가능하다. polygon 정밀화 완료가 아니다. |
| `PASS_LOCKED_80` | 현재 공식 traced baseline 80개만 label/top-hit 등 기본 검증을 통과했다. 나머지 97개는 미해결이다. |
| `PASS_UI_CONTAINMENT` | 미검수 97개 seat polygon은 일반 사용자 UI에서 숨겨지고 debug review overlay로만 노출된다. release 완료가 아니다. |
| `PASS_RELEASE_177` | 177개 전체가 operator 승인, official PNG 정렬, 중복/overlap/label top-hit 검증을 통과했다. 이 상태만 정밀화 완료다. |

정밀 audit는 아래 명령으로 생성한다.

```bash
npm run stadium:daegu:precision-audit
```

이 명령은 `reports/stadium/daegu-seatmap-precision-audit.json`, `.csv`, `.md`, `.svg`를 생성한다. 기본 모드는 release가 막혀 있어도 exit code 0으로 report를 남긴다. release lock 판단은 아래 명령만 사용한다.

일반 사용자 화면에서 허공/미검수 polygon이 선택되지 않는지는 아래 render safety audit로 확인한다.

```bash
npm run stadium:daegu:render-safety-audit
```

이 명령은 `precision-audit`를 먼저 갱신하고 `reports/stadium/daegu-seatmap-render-safety-audit.json`, `.csv`, `.md`, `.svg`를 생성한다. `PASS_UI_CONTAINMENT`는 미검수 polygon 노출 차단 기준이며, `PASS_RELEASE_177`을 대체하지 않는다.

구역별 정밀화 작업 순서와 workset은 아래 명령으로 고정한다.

```bash
npm run stadium:daegu:zone-precision-worksets
```

이 명령은 `render-safety-audit`까지 먼저 갱신한 뒤 `reports/stadium/daegu-seatmap-zone-precision-worksets.json`, `.csv`, `.md`, `.svg`를 생성한다.
현재 repo 기준 97개는 `ZONE_3F_FIRST_BASE` 13개, `ZONE_3F_CENTER_THIRD` 11개, `ZONE_5F_SKY` 39개, `ZONE_OUTFIELD` 34개로 분류한다.
실행 순서는 `STAGE_01_BOUNDARY_FIRST` 5개, `STAGE_02_DUPLICATE_SHARED` 12개, `STAGE_03_3F_MANUAL_RETRACE` 9개, `STAGE_04_5F_SKY` 39개, `STAGE_05_OUTFIELD` 32개다.
`M-9`처럼 외야 zone에 속하지만 duplicate/shared risk가 있는 row는 zone은 외야로 남기고 실행 stage만 `STAGE_02_DUPLICATE_SHARED`로 앞당긴다.
이 workset은 read-only이며 `productionWriteAllowed=false`다. operator 승인 필드가 채워진 source input만 production data 반영 대상이다.

```bash
npm run qa:stadium:daegu:release-lock
```

`qa:stadium:daegu:release-lock`은 `PASS_RELEASE_177`이 아니면 실패한다. 현재 기준 97개 미해결 row가 남아 있으므로 release lock은 실패하는 것이 정상이다.

현재 상태는 다음 리포트에서 확인한다.

- `reports/stadium/daegu-seatmap-operator-corrections-status.md`
- `reports/stadium/daegu-seatmap-precision-audit.md`
- `reports/stadium/daegu-seatmap-render-safety-audit.md`
- `reports/stadium/daegu-seatmap-zone-precision-worksets.md`
- `reports/stadium/daegu-seatmap-operator-state-audit.md`
- `reports/stadium/daegu-seatmap-operator-corrections-batches.md`
- `reports/stadium/daegu-seatmap-operator-corrections-template.csv`
- `reports/stadium/daegu-seatmap-operator-handoff.md`
- `reports/stadium/daegu-seatmap-handoff-evidence-crops.md`
- `reports/stadium/daegu-retrace-work-queue.md`
- `reports/stadium/daegu-non-overlap-priority-queue.md`
- `reports/stadium/daegu-visual-issue-queue.md`
- `reports/stadium/daegu-visual-off-seat-workset.md`
- `reports/stadium/daegu-off-seat-retrace-intake.md`
- `reports/stadium/daegu-p0-p1-off-seat-workset.md`
- `reports/stadium/daegu-p0-off-seat-operator-input.md`
- `reports/stadium/daegu-p0-off-seat-operator-import.md`
- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-retrace-intake.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-checklist.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-audit.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-next-action-packet.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-precision-workset.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-readiness.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-packet.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-overlay.svg`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-operator-template.json`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-template-gate.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-source-copy.md`
- `reports/stadium/daegu-seatmap-p1-operator-import.md`
- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-checklist.md`
- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-audit.md`
- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-decision-packet.md`
- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-readiness.md`
- `reports/stadium/daegu-seatmap-p3-p4-operator-import.md`
- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-review-checklist.md`
- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-operator-approval-candidates.json`
- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-manual-retrace-template.json`
- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-package.md`
- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-checklist.md`
- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-decision-packet.md`
- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-next-action-packet.md`
- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-readiness.md`
- `reports/stadium/daegu-seatmap-p2-operator-import.md`

## 운영자 입력 파일

기본 입력 파일은 아래 JSON 또는 CSV다.

- JSON: `reports/stadium/daegu-seatmap-operator-corrections-template.json`
- CSV: `reports/stadium/daegu-seatmap-operator-corrections-template.csv`

운영자는 handoff 대상 row마다 다음 필드를 검토한다.

| field | required | rule |
| --- | --- | --- |
| `blockId` | always | 기존 template 값을 변경하지 않는다. |
| `operatorDecision` | always | `PENDING`, `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나만 사용한다. |
| `correctedPath` | approved only | 공식 PNG 픽셀 좌표계의 단일 폐합 SVG polygon path다. `M/L/Z` 명령만 사용하고, 최소 6개 polygon point를 포함한다. |
| `correctedLabelX` | approved only | `correctedPath` 내부의 대표 label x 좌표다. |
| `correctedLabelY` | approved only | `correctedPath` 내부의 대표 label y 좌표다. |
| `reviewer` | approved only | 운영자 또는 검수자 식별자다. |
| `reviewedAt` | approved only | parse 가능한 ISO date 또는 datetime이다. |
| `operatorNote` | optional | 판단 근거, 경계 모호성, 반려 사유를 남긴다. |

`APPROVED` row는 아래 조건을 모두 만족해야 한다.

1. `correctedPath`는 공식 PNG bounds 밖으로 나가지 않는다.
2. `correctedPath`는 하나의 polygon이며 self-intersection이 없다.
3. `correctedPath`는 대구 official hit-area 계약과 동일하게 최소 6개 polygon point를 가진다.
4. `correctedLabelX/correctedLabelY`는 corrected path 내부에 있다.
5. corrected label point를 적용 후 top-hit했을 때 같은 `blockId`를 선택한다.
6. duplicate candidate 그룹의 블록끼리는 같은 corrected path를 공유하지 않는다.

## 재트레이싱 작업 큐

운영자 corrected path가 아직 없는 `NEEDS_RETRACE` row는 단일 큐 리포트로 다시 묶는다.

```bash
npm run stadium:daegu:retrace-work-queue
```

이 명령은 P0, P1, P2, P3/P4 operator input 파일을 source of truth로 읽고 `reports/stadium/daegu-retrace-work-queue.md`, `.json`, `.csv`를 생성한다.
큐에는 evidence crop, current path, candidate path, operator action, duplicate group/id, failure reason, risk flag가 포함된다.
이 리포트는 read-only이며 main corrections template과 `src/data/daeguSeatData.ts`를 수정하지 않는다.
candidate path는 계속 참고값이며, 운영자가 source input row를 `operatorDecision=APPROVED`로 되돌리고 `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채운 row만 production write gate로 들어갈 수 있다.

### 겹침 없는 블록 우선 큐

겹치는 후보 경계가 없는 블록부터 작업하고, 현재 path가 좌석이 아닌 곳에 놓인 의심 블록을 먼저 고르려면 아래 큐를 생성한다.

```bash
npm run stadium:daegu:non-overlap-priority-queue
```

이 명령은 P0/P1/P2/P3/P4 operator input 파일을 source of truth로 읽고 `reports/stadium/daegu-non-overlap-priority-queue.md`, `.json`, `.csv`를 생성한다.
현재 기준 분류는 `NO_OVERLAP_OFF_SEAT_RETRACE_FIRST`, `NO_OVERLAP_VISUAL_APPROVAL_CANDIDATE`, `NO_OVERLAP_MANUAL_RETRACE`, `DEFER_DUPLICATE_BOUNDARY` 순서다.
`LOW_COMPONENT_INSIDE_CURRENT_PATH` 또는 `LOW_CURRENT_PATH_COLOR_COVERAGE`가 있는 row는 좌석 영역과 현재 path가 어긋난 의심 블록으로 보고 첫 번째 tier에 둔다.
이 큐도 read-only이며 candidate path는 참고값이다. 운영자 승인 row는 기존 operator input에 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채운 뒤 표준 gate를 통과해야 한다.

### 시각 오류 우선 queue

첨부 스크린샷에서 확인한 좌석 외부/큰 사각형/경계 불일치 문제를 남은 operator input 작업 순서에 반영하려면 아래 queue를 생성한다.

```bash
npm run stadium:daegu:visual-issue-queue
```

이 명령은 P0/P1/P2/P3/P4 operator input 파일을 source of truth로 읽고 `reports/stadium/daegu-visual-issue-queue.md`, `.json`, `.csv`를 생성한다.
출력은 남은 unresolved row 97건을 포함하고 `productionWriteAllowed=false`로 고정한다. production write가 끝난 row는 source input 재생성 뒤 queue에서 빠질 수 있다.
첨부 이미지 기반 visual seed는 현재 19건이며 `Image #1`, `Image #2`, `Image #3` evidence group과 `observedIssue`를 함께 남긴다.
이미지에서 보인 `LF-9`처럼 현재 source input에 없는 블록은 observation으로만 남기고 visual seed row에는 포함하지 않는다.

작업 순서는 `VISUAL_OFF_SEAT_HARD_FAIL`, `OVERSIZED_RECT_MANUAL_RETRACE`, `LABEL_AND_HIT_AREA_REVIEW`, `VISUAL_APPROVAL_CANDIDATE`, `DEFER_DUPLICATE_BOUNDARY` 순서다.
`PIXEL_CANDIDATE_READY` row도 자동 승격하지 않으며, candidate path는 evidence crop과 label/top-hit를 운영자가 시각 승인할 때만 참고한다.
`currentPath` 또는 `candidatePath`를 그대로 `correctedPath`로 복사하지 않는다.
승인 row는 기존 source input에 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채운 뒤 batch gate를 통과해야 한다.
production write 순서는 계속 P0, P1, P2, P3/P4 gate를 따른다.

### VISUAL_OFF_SEAT_HARD_FAIL 27건 workset

시각 오류 queue의 1순위인 `VISUAL_OFF_SEAT_HARD_FAIL` row만 운영자 재트레이싱 작업 패키지로 끊으려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:visual-off-seat-workset
```

이 명령은 `npm run stadium:daegu:visual-issue-queue`를 먼저 실행한 뒤 `reports/stadium/daegu-visual-issue-queue.json`에서 `VISUAL_OFF_SEAT_HARD_FAIL` 27건만 읽어 `reports/stadium/daegu-visual-off-seat-workset.md`, `.json`, `.csv`를 생성한다.
현재 기준 분포는 P0 0건, P1 5건, P2 0건, P3/P4 22건이며 visual seed row는 7건이어야 한다.
이 workset은 read-only이고 `productionWriteAllowed=false`다.
운영자는 이 workset을 보고 실제 좌석 경계를 최소 6점 이상으로 수동 트레이싱한 뒤, 승인 row만 matching source input에 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`으로 반영한다.
`currentPath`와 `candidatePath`는 reference-only이며 `correctedPath`로 복사하지 않는다.
승인 후에도 production write는 기존 batch gate 순서대로만 진행한다.

### P1 paired boundary review

P1 hard-fail 중 단일 row 승인으로는 label/top-hit 또는 locked neighbor ownership이 깨지는 잔여 블록은 paired boundary review로 분리한다.

```bash
npm run stadium:daegu:p1-paired-boundary-review
```

이 명령은 `alignment-audit`, `visual-off-seat-workset`을 먼저 갱신한 뒤 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-paired-boundary-review.md`, `.json`, `.csv`를 생성한다.
현재 post-write 기준 대상은 `T1-1`, `T3-2`, `V1`, `V2`, `V3` 5건이며, `T1-1`/`T3-2`는 `PAIRED_RELABEL_BOUNDARY_REVIEW`, `V1`/`V2`/`V3`는 `MANUAL_NON_OVERLAP_SPLIT_REQUIRED`로 분류한다.
이 report는 read-only이고 `productionWriteAllowed=false`다.
이 5건은 단일 row로 `APPROVED` 처리하지 않는다.
운영자는 paired block context를 보고 영향을 받는 locked neighbor까지 함께 경계를 재검수한 뒤, 모든 영향을 받은 row가 label-inside/top-hit/non-overlap 조건을 만족할 때만 기존 P1 source input과 batch gate로 반영한다.

### P1 boundary input aid

P1 paired boundary 5건을 운영자가 실제로 다시 그릴 수 있는 입력 보조표로 보려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p1-boundary-input-aid
```

이 명령은 `p1-paired-boundary-review`를 먼저 갱신한 뒤 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-input-aid.md`, `.json`, `.csv`를 생성한다.
대상은 계속 `T1-1`, `T3-2`, `V1`, `V2`, `V3` 5건이며, paired relabel 2건과 manual split 3건을 유지해야 한다.
이 aid는 read-only이고 `productionWriteAllowed=false`다.
또한 production template이 아니므로 `operatorDecision` column을 쓰지 않고, main corrections template과 `src/data/daeguSeatData.ts`를 수정하지 않는다.
`currentPath`와 `candidatePath`는 reference-only이며 `correctedPath`로 복사하지 않는다.
운영자가 최종 경계를 승인할 때만 matching P1 source input row에 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채우고 `npm run stadium:daegu:p1-operator-prewrite-gate`를 통과시킨다.

### P1 next action packet

P1 17건의 실제 작업 순서를 고정하려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p1-next-action-packet
```

이 명령은 `p1-boundary-input-aid`와 `p1-decision-packet`을 먼저 갱신한 뒤 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-next-action-packet.md`, `.json`, `.csv`를 생성한다.
이 packet은 read-only이고 `productionWriteAllowed=false`다.
작업 순서는 paired/manual boundary 5건을 먼저 처리하고, `M-9` 단일 corrected path 1건을 처리한 뒤, duplicate candidate split 11건을 처리하는 순서로 고정한다.
이 packet은 source input을 수정하지 않으며, operator가 승인할 때만 matching P1 source input row에 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채운다.

### P1 precision workset

P1 17건의 next-action 순서와 precision audit flag, draft evidence를 한 검수표에서 보려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p1-precision-workset
```

이 명령은 `precision-audit`와 `p1-next-action-packet`을 먼저 갱신한 뒤 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-precision-workset.md`, `.json`, `.csv`, `.svg`를 생성한다.
이 workset은 read-only이고 `productionWriteAllowed=false`, `sourceOfTruth=false`, `draftOnly=true`다.
`draftVisualPath`, `draftHitPath`, `draftLabelPoint`는 evidence-only이며 `correctedPath`로 복사하지 않는다.
작업 순서는 `PAIR_BOUNDARY_FIRST` 5건, `SINGLE_CORRECTED_PATH` 1건, `DUPLICATE_CANDIDATE_SPLIT` 11건으로 고정한다.
운영자가 최종 승인할 때만 P1 source input에 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채운다.

### P1 boundary-first readiness

P1 전체 17건 중 `PAIR_BOUNDARY_FIRST` 5건만 따로 검수하려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p1-boundary-first-readiness
```

이 명령은 `p1-next-action-packet`과 P1 validation을 먼저 갱신한 뒤 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-readiness.md`, `.json`, `.csv`를 생성한다.
대상은 `T1-1`, `T3-2`, `V1`, `V2`, `V3` 5건으로 고정한다.
각 row는 `READY_FOR_OPERATOR`, `MISSING_EVIDENCE`, `MISSING_CONTEXT`, `APPROVED_VALID`, `APPROVED_INVALID` 중 하나로 분류된다.
5건이 모두 `APPROVED_VALID`가 되기 전에는 `M-9` 단일 corrected path와 duplicate split 11건으로 넘어가지 않는다.
이 readiness는 read-only이며 source P1 input, main template, `src/data/daeguSeatData.ts`를 수정하지 않는다.

boundary-first 5건의 operator 검수 자료와 입력용 staging template을 만들려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p1-boundary-first-packet
```

이 명령은 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-packet.md`, `.json`, `.csv`, `daegu-seatmap-p1-boundary-first-overlay.svg`, `daegu-seatmap-p1-boundary-first-operator-template.json`, `.csv`를 생성한다.
overlay는 red target, blue paired neighbor, orange candidate reference-only로 표시한다.
operator는 generated template의 5개 row에만 `operatorDecision`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, `operatorNote`를 채운다.
이 template은 staging material이며 `templateOnly=true`, `productionWriteAllowed=false`다. source P1 input 또는 production data로 자동 복사되지 않는다.
packet 재생성은 기존 `daegu-seatmap-p1-boundary-first-operator-template.json`에 operator가 채운 editable field를 보존해야 한다. 이미 채운 row는 `editableSource=existingOperatorTemplate`로 남기고, 비어 있는 row만 source input 기본값으로 재생성한다.

boundary-first packet, operator template, gate, source-copy dry-run을 한 번에 묶어 operator 검수용 review board를 만들려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p1-boundary-first-review-board
```

이 명령은 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-review-board.md`, `.json`, `.csv`, `.svg`를 생성한다.
review board는 `T1-1`, `T3-2`, `V1`, `V2`, `V3`의 evidence crop, paired neighbor, current path, candidate reference-only path, approval checklist, gate 상태를 한 산출물에 모은다.
각 row에는 `approvalMissingFields`와 `nextOperatorAction`이 포함되어 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, `reviewedAt` 중 아직 채워야 할 값을 보여준다.
이 산출물도 read-only이며 `productionWriteAllowed=false`, `writesOperatorDecision=false`, `writesCorrectionsTemplate=false`, `writesProductionData=false` 계약을 유지한다.
operator는 review board를 참고해 `daegu-seatmap-p1-boundary-first-operator-template.json`의 5개 row만 채우고, candidatePath는 correctedPath로 복사하지 않는다.

review board를 operator 입력용 필드 단위 체크리스트로 다시 정리하려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p1-boundary-first-entry-sheet
```

이 명령은 review board를 먼저 갱신한 뒤 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-entry-sheet.md`, `.json`, `.csv`를 생성한다.
entry sheet는 `corrections[0]`부터 `corrections[4]`까지 정확히 5개 `editableTarget`을 보여주고, 각 row의 `missingOperatorInputFields`에 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, `reviewedAt` 중 아직 채워야 할 필드를 표시한다.
status가 `waiting-for-operator-entry`이면 operator 입력이 남아 있는 상태이며, 5개 row의 필드가 모두 채워져 `ready-for-template-gate`가 되기 전까지 source input 반영을 시도하지 않는다.
entry sheet도 read-only이고 `productionWriteAllowed=false`, `writesOperatorDecision=false`, `writesCorrectionsTemplate=false`, `writesProductionData=false` 계약을 유지한다.
candidatePath는 reference-only이므로 entry sheet에서도 correctedPath로 복사하지 말아야 한다.

entry sheet 기준으로 다음 단계 진행 가능 여부만 명시적으로 확인하려면 아래 preflight를 실행한다.

```bash
npm run stadium:daegu:p1-boundary-first-entry-preflight
```

이 명령은 entry sheet를 먼저 갱신한 뒤 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-entry-preflight.md`, `.json`, `.csv`를 생성한다.
기본 `report-only` 모드는 `waiting-for-operator-entry` 상태를 리포트로 남기고 실패하지 않는다.
자동화나 write 직전에는 아래 require-ready 모드를 사용한다.

```bash
npm run stadium:daegu:p1-boundary-first-entry-preflight:require-ready
```

require-ready 모드는 5개 row 중 하나라도 `missingOperatorInputFields`가 남아 있으면 `ENTRY_PREFLIGHT_REQUIRES_OPERATOR_INPUT` blocker로 실패해야 한다.
`source-copy:write-source-input` 명령은 이 require-ready preflight를 먼저 통과한 뒤에만 template gate와 source-copy write를 실행한다.
preflight도 read-only이고 source input, main corrections template, `src/data/daeguSeatData.ts`를 수정하지 않는다.

operator가 5개 boundary-first row를 실제로 trace할 수 있는 SVG 작업 묶음을 만들려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p1-boundary-first-tracing-pack
```

이 명령은 entry preflight를 먼저 갱신한 뒤 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-tracing-pack/` 아래에 `daegu-seatmap-p1-boundary-first-tracing-pack.md`, `.json`, `.csv`, `daegu-seatmap-p1-boundary-first-tracing-overview.svg`, 대상별 SVG 5개를 생성한다.
각 SVG는 공식 PNG `1707x2048` 원본을 배경으로 사용하고, crop은 SVG `viewBox`로만 제한한다. 따라서 표시 좌표는 계속 원본 이미지 좌표계이며 별도 좌표 변환을 하지 않는다.
SVG layer는 red current target, blue paired neighbor, orange candidate reference-only path, label point, 25px grid, `editableTarget`을 표시한다.
tracing pack도 read-only이고 `productionWriteAllowed=false`, `writesOperatorDecision=false`, `writesCorrectionsTemplate=false`, `writesProductionData=false` 계약을 유지한다.
candidatePath는 tracing pack에서도 evidence-only이며 correctedPath로 복사하지 않는다.

P1 boundary-first operator 작업 상태를 한 handoff 문서로 고정하려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p1-boundary-first-operator-handoff
```

이 명령은 tracing pack과 postwrite gate를 먼저 갱신한 뒤 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-operator-handoff.md`, `.json`, `.csv`를 생성한다.
handoff는 `T1-1`, `T3-2`, `V1`, `V2`, `V3`의 `editableTarget`, 대상별 tracing SVG, evidence crop, `missingOperatorInputFields`, 현재 render layer, postwrite gate 상태를 한 표에 묶는다.
현재처럼 승인 row가 없으면 `status=ready-for-operator-tracing`, `waiting for operator=5/5`로 남고, 다음 조치는 `daegu-seatmap-p1-boundary-first-operator-template.json`에 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, `reviewedAt`을 채우는 것이다.
handoff도 read-only이며 source input, main corrections template, `src/data/daeguSeatData.ts`를 수정하지 않는다.

operator가 template을 채운 뒤 source P1 input에 옮기기 전에는 아래 read-only gate를 먼저 실행한다.

```bash
npm run stadium:daegu:p1-boundary-first-template-gate
```

이 gate는 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-template-gate.md`, `.json`, `.csv`를 생성한다.
gate는 template row가 정확히 5개인지, non-boundary row가 없는지, `APPROVED` row의 required field와 closed polygon, image bounds, label-inside-path, duplicate correctedPath를 검사한다.
`status=ready-for-source-copy`일 때만 boundary-first 5개 row가 모두 승인되어 source P1 input 반영 후보가 된다. `status=waiting-for-operator`는 승인 row가 없다는 뜻이며 실패가 아니라 write 금지 상태다. 일부 row만 승인된 경우에는 `status=partial-boundary-approval`로 남기고 5개가 모두 승인될 때까지 source input 반영을 보류한다.
template gate는 packet을 재생성하지 않는다. operator가 채운 값을 덮어쓰지 않기 위해 packet 생성과 gate 실행을 분리한다.

template gate가 `ready-for-source-copy`가 된 뒤에는 아래 dry-run copy gate로 source input 반영 전 상태를 확인한다.

```bash
npm run stadium:daegu:p1-boundary-first-source-copy
```

이 명령은 최신 template gate를 다시 실행한 뒤 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-source-copy.md`, `.json`, `.csv`를 생성한다.
copy gate는 template/source input SHA-256을 template gate 결과와 비교해 stale gate를 차단한다.
승인 row가 5개가 아니거나 gate가 `ready-for-source-copy`가 아니면 `--write-source-input`은 실패해야 한다.

source input 반영은 dry-run report가 `status=ready-for-write-source-input`일 때만 아래 명령으로 수행한다.

```bash
npm run stadium:daegu:p1-boundary-first-source-copy:write-source-input
```

이 write 명령도 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json`만 갱신한다.
main corrections template과 `src/data/daeguSeatData.ts`는 수정하지 않는다.

boundary-first 승인 row를 production write까지 진행한 뒤에는 전용 postwrite gate로 다섯 row가 실제 selectable seat로만 복귀했는지 확인한다.

```bash
npm run stadium:daegu:p1-boundary-first-postwrite-gate
```

이 gate는 read-only이며 `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-postwrite-gate.md`, `.json`, `.csv`를 생성한다.
현재처럼 승인 row가 없으면 `status=waiting-for-operator`로 남고 production data write를 허용하지 않는다.
승인 row가 생긴 뒤에는 `T1-1`, `T3-2`, `V1`, `V2`, `V3` 다섯 row 전체가 source input, main validation, apply write, alignment audit, render-safety audit에서 일치해야 `status=postwrite-verified`가 된다.
CI 또는 release 체크에서 반드시 write 완료 상태를 요구하려면 아래 명령을 사용한다.

```bash
npm run stadium:daegu:p1-boundary-first-postwrite-gate:require-written
```

차단 조건은 승인 없는 row의 `OFFICIAL_IMAGE_TRACED` 승격, apply report가 write mode가 아닌 상태, apply row 수 불일치, label top-hit 실패, `LOCKED_VERIFIED` 미달, normal selectable predicate 실패, render layer 불일치다.

잘못된 boundary-first 승인 차단 계약은 아래 regression 명령으로 별도 fixture에서 확인한다. 이 명령은 `reports/stadium/daegu-p1-boundary-first-regression/` 아래에만 파일을 쓰고, source P1 input과 production data는 수정하지 않는다.

```bash
npm run stadium:daegu:p1-boundary-first-regression
```

이 regression은 `correctedPath` 누락, label 좌표 누락, V 계열 duplicate `correctedPath`, label outside path 같은 invalid approval을 만들고 `APPROVED_INVALID`, `canAdvanceToSingleCorrectedPath=false`가 나오는지 확인한다.
또한 `template-preservation` fixture에서 operator가 채운 approved row를 만든 뒤 packet을 재생성해 `preservedEditableRows`와 `editableSource=existingOperatorTemplate`가 유지되는지 확인한다.

### 좌석 아닌 위치 의심 intake

겹침 없는 큐 중에서도 현재 path가 좌석 영역과 어긋난 의심 블록만 먼저 작업하려면 off-seat intake를 생성한다.

```bash
npm run stadium:daegu:off-seat-retrace-intake
```

이 명령은 `candidateDuplicateGroup`이 비어 있고 `LOW_COMPONENT_INSIDE_CURRENT_PATH` 또는 `LOW_CURRENT_PATH_COLOR_COVERAGE`가 있는 row만 `reports/stadium/daegu-off-seat-retrace-intake.md`, `.json`, `.csv`로 묶는다.
현재 기준 off-seat intake는 27건이며, 운영자 선처리 대상인 P0/P1 subset은 5건이다.
이 intake에는 evidence crop, current path, candidate path, current/candidate label 좌표, component-inside ratio, path-color coverage, failure/risk flag, source input, 그리고 운영자가 채워야 하는 corrected field가 포함된다.
중복 후보 경계가 있는 row는 이 intake에서 제외하고 `DEFER_DUPLICATE_BOUNDARY` 큐에서 따로 처리한다.
이 산출물은 read-only이며 운영자 승인 없는 추정 좌표, 자동 candidate 승격, external crawling/web search를 사용하지 않는다.

### P0/P1 off-seat 5건 작업 패키지

off-seat intake 27건 중 P0/P1 선처리 5건만 운영자 작업 단위로 끊으려면 아래 workset을 생성한다.

```bash
npm run stadium:daegu:p0-p1-off-seat-workset
```

이 명령은 `reports/stadium/daegu-off-seat-retrace-intake.json`을 source로 읽고 `P0_P1_OFF_SEAT_FIRST` row만 `reports/stadium/daegu-p0-p1-off-seat-workset.md`, `.json`, `.csv`로 묶는다.
현재 기준 workset은 P0 0건, P1 5건, 총 5건이며 duplicate row는 0건이어야 한다.
현재 P0 off-seat 선처리 대상은 닫혀 있으므로 P1 5건에 대해 `p1-operator-prewrite-gate`와 `p1-operator-import:write-template`를 사용한다.
이 workset도 read-only이며 `currentPath`는 오류 확인용, `candidatePath`는 참고용이다. production data는 기존 validation/preview/apply/write gate를 통과한 승인 row만 변경할 수 있다.

### P0 off-seat 입력 보조 파일

현재 기준 P0 off-seat row는 0건이다. 회귀 확인이 필요할 때는 아래 draft helper를 생성해 빈 산출물 상태를 확인한다.

```bash
npm run stadium:daegu:p0-off-seat-operator-input
```

이 명령은 `reports/stadium/daegu-p0-p1-off-seat-workset.json`에서 P0 row만 읽고 `reports/stadium/daegu-p0-off-seat-operator-input.md`, `.json`, `.csv`를 생성한다.
현재 대상 row는 0건이며 duplicate row는 0건이어야 한다.
이 파일은 `draftOnly=true`, `sourceOfTruth=false`, `productionWriteAllowed=false`인 입력 보조 자료다.
운영자가 이 보조 파일에 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채운 뒤에도, 승인 row는 반드시 `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json`으로 복사해야 한다.
`currentPath`는 잘못된 legacy path 확인용이므로 `correctedPath`로 복사하면 안 되고, `candidatePath`는 참고용이다.
source P0 input으로 복사한 뒤에만 `npm run stadium:daegu:p0-operator-prewrite-gate`와 `npm run stadium:daegu:p0-operator-import:write-template`를 실행한다.

### P0 off-seat draft import

P0 off-seat draft helper에서 운영자가 승인한 row만 source P0 input으로 옮기려면 아래 dry-run을 먼저 실행한다.

```bash
npm run stadium:daegu:p0-off-seat-operator-import
```

이 명령은 `reports/stadium/daegu-p0-off-seat-operator-input.json`과 `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json`을 비교해 `reports/stadium/daegu-p0-off-seat-operator-import.md`, `.json`, `.csv`를 생성한다.
기본 모드는 dry-run이며 source input, main corrections template, `src/data/daeguSeatData.ts`를 수정하지 않는다.
승인 row만 복사 대상이고 `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`이 모두 필요하다.
`correctedPath`는 최소 6점 이상이어야 하며 `currentPath` 또는 reference `candidatePath`와 같으면 source import를 차단한다.
`reviewer=DRAFT_VALIDATION_ONLY`, draft timestamp, `draftOnly=true`, `stagingOnly=true` marker가 승인 row에 남아 있어도 차단한다.
승인 row가 없으면 source input을 쓰지 않는다.

dry-run report가 `status=ok`이고 승인 row를 source input에 복사해야 할 때만 아래 명령을 사용한다.

```bash
npm run stadium:daegu:p0-off-seat-operator-import:write-source-input
```

이 write-source-input 모드도 source P0 input만 수정할 수 있으며 main corrections template과 production data는 수정하지 않는다.
복사 후에는 `npm run stadium:daegu:p0-operator-prewrite-gate`와 `npm run stadium:daegu:p0-operator-import:write-template`를 순서대로 실행한다.

### P0 retrace intake

P0 terminal 1건은 이미 operator 승인 반영이 끝났고, 추가 P0 재트레이싱 대상은 현재 0건이다.

```bash
npm run stadium:daegu:p0-retrace-intake
```

이 명령은 `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json`을 source of truth로 읽고 P0 terminal 승인 row와 남은 retrace row 수를 `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-retrace-intake.md`, `.json`, `.csv`로 묶는다.
intake에는 evidence crop, current path, candidate path, candidate duplicate group/id, failure reason, risk flag, 그리고 운영자가 채워야 하는 `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt` 필드가 포함된다.
이 산출물은 read-only이며 main corrections template, `src/data/daeguSeatData.ts`, `DAEGU_BLOCKS`, `DAEGU_SEATMAP_IMAGE`, viewport contract를 수정하지 않는다.
candidate path는 참고값일 뿐 자동 승격하지 않으며, 운영자는 source P0 input row를 직접 `operatorDecision=APPROVED`로 바꾸고 corrected geometry를 채운 뒤 표준 P0 gate를 다시 실행한다.

## Batch 반영 순서

운영자 corrected path는 아래 우선순위 batch 단위로만 production write 대상이 된다.

| batch | priorities | target rows | rule |
| --- | --- | ---: | --- |
| `BATCH_1_P0` | `P0` | 3 | 첫 번째 write batch다. |
| `BATCH_2_P1` | `P1` | 29 | P0 batch가 종료된 뒤 진행한다. |
| `BATCH_3_P2` | `P2` | 50 | P1 batch가 종료된 뒤 진행한다. |
| `BATCH_4_P3_P4` | `P3`, `P4` | 52 | 마지막 operator batch다. |

batch 정책은 `reports/stadium/daegu-seatmap-operator-corrections-batches.md`에서 확인한다.

- 한 번의 production write에는 하나의 batch에 속한 `APPROVED` row만 포함한다.
- 현재 batch 안에 `PENDING` row가 남아 있으면 write 준비 상태가 아니다.
- `REJECTED` 또는 `NEEDS_RETRACE` row는 실패/보류 row로 보고 다음 batch로 넘기지 않는다.
- later batch에 승인 row가 있어도 earlier batch가 열려 있으면 `APPROVED_ROWS_OUT_OF_PRIORITY_ORDER`로 차단한다.

## 금지 조건

다음 상황에서는 `src/data/daeguSeatData.ts`를 수정하지 않는다.

- `reports/stadium/daegu-seatmap-operator-corrections-status.md`에 `readyForWrite=false`가 표시된다.
- blocker에 `NO_APPROVED_OPERATOR_CORRECTIONS`가 남아 있다.
- validation status가 `ok`가 아니다.
- approved row와 valid approved row 수가 다르다.
- preview row 수가 approved row 수와 다르다.
- dry-run apply가 `dataFileChanged=true`를 보고한다.
- write-smoke가 `productionDataUnchanged=false`를 보고한다.
- batch 리포트가 `readyForWrite=false`를 보고한다.
- 승인 row가 한 번에 둘 이상의 batch에 걸쳐 있다.
- write guard가 `passed=false`를 보고한다.
- 운영자 corrected path가 아닌 추정/임의 좌표로 경계를 채우려는 경우다.

## P0 기준 재정렬 절차

P0/P1/P2/P3/P4 operator input 파일을 source of truth로 둔다.
operator input이 `PENDING`인 row는 main template에서도 `PENDING`이어야 하며, 기존 `write-template` import report가 stale 상태로 남아 있으면 `operator-state-audit`가 차단한다.

P0부터 다시 시작할 때는 아래 순서로 main template과 dry-run import report를 맞춘다.

```bash
npm run stadium:daegu:operator-corrections-template
npm run stadium:daegu:p0-operator-package
npm run stadium:daegu:p0-operator-validate
npm run stadium:daegu:p0-operator-import
npm run stadium:daegu:p0-operator-readiness
npm run stadium:daegu:p1-operator-package
npm run stadium:daegu:p1-operator-import
npm run stadium:daegu:p2-operator-import
npm run stadium:daegu:p3-p4-operator-import
npm run stadium:daegu:operator-state-audit
```

현재 기준 P0는 terminal 승인 row 1건, retrace 대기 0건이며 P1 이후 batch가 다음 operator 작업 대상이다.
`p0-operator-readiness`가 `WRITE_TEMPLATE_REQUIRES_NO_P0_PENDING_ROWS` 또는 `P0_PENDING_ROWS_REMAIN`으로 막히면 P0 input/template 상태를 먼저 재확인한다.
reviewer/reviewedAt, 운영자 직접 메모, corrected geometry가 없고 `No operator corrected path provided;` note만 남은 terminal decision은 stale 산출물로 보고 package 재생성 시 보존하지 않는다.
P0/P1/P2/P3/P4 input에 실제 운영자 결정이 들어간 뒤에는 `write-template` import report mode와 input/template decision이 서로 일치해야 한다.
`p0-operator-import:write-template` 이후에는 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않고, write 전 gate는 `npm run stadium:daegu:operator-corrections-write` 내부 순서를 따른다.

## 표준 절차

1. 최신 handoff와 template을 만든다.

```bash
npm run stadium:daegu:operator-corrections-template
```

2. 닫힌 P0 terminal row와 후속 batch 상태를 확인한다.

```bash
npm run stadium:daegu:p0-operator-package
npm run stadium:daegu:p0-operator-audit
npm run stadium:daegu:p0-decision-packet
npm run stadium:daegu:p0-retrace-intake
```

이 명령은 P0 operator input, evidence crop 링크, checklist를 `reports/stadium/daegu-p0-operator/` 아래에 다시 만든다.
현재 기준에서는 3건 모두 운영자 corrected path 입력 전이므로 production write 대상이 아니다.
`p0-operator-audit`는 현재 P0 terminal 승인 row와 남은 retrace row 0건 상태를 고정한다.
`p0-decision-packet`은 P0 evidence crop을 한 검수 문서로 묶는 read-only 산출물이며, main template이나 `src/data/daeguSeatData.ts`를 수정하지 않는다.
`p0-retrace-intake`는 P0 input이 `NEEDS_RETRACE`로 닫힌 뒤 실제 corrected path를 다시 받을 때 쓰는 read-only 작업지시서다.

3. P0 operator input을 검증하고 import preview를 만든다.

```bash
npm run stadium:daegu:p0-operator-validate
npm run stadium:daegu:p0-operator-import
npm run stadium:daegu:p0-operator-readiness
```

`p0-operator-import`는 기본 dry-run이며, `src/data/daeguSeatData.ts`와 main template을 수정하지 않는다.
`p0-operator-readiness`는 validation/import dry-run 결과와 P0 입력 row를 비교하는 read-only gate다.
한 번에 실행하려면 `npm run stadium:daegu:p0-operator-prewrite-gate`를 사용한다.
운영자가 P0 input을 채운 뒤 main template에 옮길 때만 아래 명령을 사용한다.
`p0-operator-import:write-template`은 P0 input에 `draftOnly`, `stagingOnly`, `DRAFT_VALIDATION_ONLY` marker가 남아 있으면 main template 반영 전에 차단한다.
P0 input 중 `PENDING` row가 하나라도 남아 있으면 `WRITE_TEMPLATE_REQUIRES_NO_P0_PENDING_ROWS`로 차단한다.
승인된 P0 row가 0건이면 `WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P0_ROW` / `NO_APPROVED_P0_ROWS_TEMPLATE_IMPORT_WILL_BLOCK` 기준으로 write-template 단계에 들어가지 않는다.
`p0-operator-readiness`가 `readyForTemplateImport=true`를 출력한 경우에만 write-template 단계로 넘어간다.

```bash
npm run stadium:daegu:p0-operator-import:write-template
```

`p0-operator-import:write-template` 이후에는 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않는다.
그 명령은 handoff 기준으로 main template을 재생성하므로, import한 P0 운영자 결정을 `PENDING`으로 되돌릴 수 있다.
P0 import 이후 write 전 검증은 `npm run stadium:daegu:operator-corrections-write` 내부의 validate/preview/apply/write-smoke/batches/status/write-guard 순서를 사용한다.

4. 후속 P1 17건 운영자 패키지를 미리 갱신한다.

```bash
npm run stadium:daegu:p1-operator-package
npm run stadium:daegu:p1-operator-audit
npm run stadium:daegu:p1-decision-packet
npm run stadium:daegu:p1-next-action-packet
npm run stadium:daegu:p1-precision-workset
npm run stadium:daegu:p1-operator-validate
npm run stadium:daegu:p1-operator-import
npm run stadium:daegu:p1-operator-readiness
```

P1은 batch 순서상 P0가 종료된 뒤 production write 대상이 된다.
이 명령은 `reports/stadium/daegu-p1-operator/` 아래에 P1 operator input, evidence crop 링크, checklist를 만든다.
현재 기준에서는 P1 17건 모두 `NEEDS_RETRACE`이고 `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`은 비어 있어야 한다.
`p1-operator-audit`는 이 상태를 고정하며, P1 candidate path는 참고자료일 뿐 운영자 승인 없이 production template으로 복사하지 않는다.
`p1-decision-packet`은 P1 17건 evidence crop을 검수 문서로 묶는 read-only 산출물이며, P0 batch가 닫히기 전에는 write-template으로 넘어가지 않는다.
`p1-next-action-packet`은 P1 17건을 paired/manual boundary 5건, `M-9` 단일 corrected path 1건, duplicate candidate split 11건 순서로 정렬하는 read-only 산출물이다.
`p1-operator-import`는 기본 dry-run이며, `src/data/daeguSeatData.ts`와 main template을 수정하지 않는다.
`p1-operator-readiness`는 P0 batch가 닫혔는지, P1 validation/import dry-run 결과가 서로 맞는지 확인하는 read-only gate다.
한 번에 실행하려면 `npm run stadium:daegu:p1-operator-prewrite-gate`를 사용한다. 이 묶음 명령은 `p1-boundary-first-readiness`를 먼저 실행해 boundary-first invalid approval을 선차단한다.
P0 batch가 종료되고 운영자가 P1 input을 채운 뒤 main template에 옮길 때만 아래 명령을 사용한다.
`p1-operator-import:write-template`은 P1 input에 `draftOnly`, `stagingOnly`, `DRAFT_VALIDATION_ONLY` marker가 남아 있으면 차단한다.
P1 17건 중 `PENDING` row가 하나라도 남아 있으면 `WRITE_TEMPLATE_REQUIRES_NO_P1_PENDING_ROWS`로 차단한다.
P1 input이 현재 template에 만들 변경이 없으면 `p1-operator-readiness`는 `status=waiting-for-operator`, `readyForTemplateImport=false`로 종료한다.
P0 row가 아직 `PENDING`이거나 P0 `APPROVED` row가 main template에 남아 있으면 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED` 또는 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN`으로 차단한다.
승인된 P1 row가 0건이면 `WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P1_ROW` / `NO_APPROVED_P1_ROWS_TEMPLATE_IMPORT_WILL_BLOCK` 기준으로 write-template 단계에 들어가지 않는다.
`PAIR_BOUNDARY_FIRST` 5건이 완료되기 전에 `SINGLE_CORRECTED_PATH` 또는 `DUPLICATE_CANDIDATE_SPLIT` row가 승인되면 `WRITE_TEMPLATE_REQUIRES_P1_STAGE_ORDER` / `P1_STAGE_ORDER_APPROVAL_BLOCKED` 기준으로 write-template 단계에 들어가지 않는다.
이 stage-order 차단 계약은 아래 regression 명령으로 별도 fixture에서 확인한다. 이 명령은 `reports/stadium/daegu-p1-stage-order-regression/` 아래에만 파일을 쓰고, production data와 source P1 input은 수정하지 않는다.

```bash
npm run stadium:daegu:p1-stage-order-regression
```

`p1-operator-readiness`가 `readyForTemplateImport=true`를 출력한 경우에만 write-template 단계로 넘어간다.

```bash
npm run stadium:daegu:p1-operator-import:write-template
```

`p1-operator-import:write-template` 이후에도 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않는다.
그 명령은 handoff 기준으로 main template을 재생성하므로, import한 P1 운영자 결정을 `PENDING`으로 되돌릴 수 있다.
P1 import 이후 write 전 검증은 `npm run stadium:daegu:operator-corrections-write` 내부의 validate/preview/apply/write-smoke/batches/status/write-guard 순서를 사용한다.

5. 후속 P2 draft 검수 패키지와 operator approval 입력 패키지를 갱신한다.

```bash
npm run stadium:daegu:p2-review-package
npm run stadium:daegu:p2-staging-audit
npm run stadium:daegu:p2-operator-package
npm run stadium:daegu:p2-decision-packet
npm run stadium:daegu:p2-next-action-packet
npm run stadium:daegu:p2-operator-validate
npm run stadium:daegu:p2-operator-import
npm run stadium:daegu:p2-operator-readiness
```

이 명령은 P2 draft corrections, validation, preview, dry-run apply, checklist, operator staging 파일을 `reports/stadium/daegu-p2-draft/` 아래에 다시 만든다.
현재 기준에서는 34건이 `PATH_REQUIRES_AT_LEAST_SIX_POINTS`로 invalid여야 정상이다.
P2 draft validation은 검수용 `--allow-draft-markers` 예외를 사용하지만, production template validation은 이 예외를 사용하지 않는다.

staging 파일은 production approval이 아니다.
`daegu-seatmap-p2-operator-approval-candidates.json`의 row는 `PENDING` 상태로만 제공되며, 운영자가 실제 승인자와 승인 시간을 채워 `APPROVED`로 바꾼 row만 production template으로 옮긴다.
`daegu-seatmap-p2-manual-retrace-template.json`의 manual retrace row는 corrected fields가 비어 있어야 하며, 운영자가 최소 6점 이상의 새 path를 작성한 뒤 승인한다.
`p2-staging-audit`는 현재 P2 package count 기준으로 approval candidates와 manual retrace row의 `PENDING`/blank-field 계약을 고정한다.
`p2-operator-package`는 staging row의 `candidatePath`, `candidateLabelX`, `candidateLabelY`를 참고값으로 포함하되, 운영자 승인 없이 `corrected*` field로 복사하지 않는다.
`p2-decision-packet`은 P2 evidence crop을 검수 문서로 묶는 read-only 산출물이며, staging/draft 값은 production approval이 아니다. P0/P1이 닫히기 전 write-template으로 넘어가지 않는다.
`p2-next-action-packet`은 P2 36건을 label/hit area review 2건, visual approval candidate 1건, manual retrace 33건 순서로 정렬하는 read-only 산출물이다.
P2 operator 상태를 한 handoff 문서로 고정하려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p2-operator-handoff
```

이 명령은 P2 operator package, next-action packet, validation, import dry-run을 갱신하고 최신 readiness report를 읽은 뒤 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-handoff.md`, `.json`, `.csv`를 생성한다.
handoff는 P2 36건의 stage, evidence crop, missing approval fields, readiness 상태, P1 postwrite gate 상태를 한 표에 묶는다.
현재처럼 P1 boundary-first가 `postwrite-verified`가 아니고 P2 승인 row가 0건이면 `status=waiting-for-prior-batch-and-operator`로 남고 production write는 금지된다.
handoff도 read-only이며 P2 source input, main corrections template, `src/data/daeguSeatData.ts`를 수정하지 않는다.
P2 36건을 더 작은 operator 작업 묶음으로 나누려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p2-operator-worksets
```

이 명령은 P2 handoff를 먼저 갱신한 뒤 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-worksets.md`, `.json`, `.csv`와 workset별 handoff 파일을 생성한다.
분류는 `P2-A` label/hit review 2건, `P2-B` visual approval candidate 1건, `P2-C` SKY/U manual retrace 5건, `P2-D` outfield manual retrace 28건으로 고정한다.
각 workset row에는 evidence crop, currentPath, candidatePath reference, `missingApprovalFields`, `correctedPathBlank`, 최소 6점 corrected polygon 요구사항이 포함된다.
workset도 read-only이며 operator 승인 없는 candidate/current path 복사와 production write를 금지한다.
operator가 실제로 어떤 row와 field를 채워야 하는지 보려면 아래 entry sheet를 실행한다.

```bash
npm run stadium:daegu:p2-operator-entry-sheet
```

이 명령은 P2 workset preflight를 먼저 갱신한 뒤 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-entry-sheet.md`, `.json`, `.csv`와 workset별 entry sheet 파일을 생성한다.
entry sheet는 `editableTarget`으로 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json#corrections[n]` 위치를 표시하고, operator가 채울 field를 `operatorDecision`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, `operatorNote`로 고정한다.
`currentPath`와 `candidatePath`는 reference-only이며 entry sheet도 source input, main corrections template, `src/data/daeguSeatData.ts`를 수정하지 않는다.
entry sheet 기준으로 공식 PNG 위에 row별 tracing SVG를 만들려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:p2-operator-tracing-pack
```

이 명령은 P2 entry sheet를 먼저 갱신한 뒤 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-tracing-pack/daegu-seatmap-p2-operator-tracing-pack.md`, `.json`, `.csv`, 전체 overview SVG, workset별 overview SVG, target별 SVG 36개를 생성한다.
SVG는 공식 PNG `1707x2048` 좌표계를 그대로 사용하고 `red=currentPath, orange=candidatePath reference-only`로 표시한다.
tracing pack도 read-only이며 SVG는 operator evidence일 뿐 source-of-truth geometry가 아니다. `currentPath`와 `candidatePath`는 correctedPath로 복사하지 않는다.
operator가 P2 input row를 채운 뒤 승인 가능 상태를 사유별로 확인하려면 아래 post-entry QA를 실행한다.

```bash
npm run stadium:daegu:p2-operator-post-entry-qa
```

이 명령은 P2 tracing pack까지 먼저 갱신한 뒤 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-post-entry-qa.md`, `.json`, `.csv`를 생성한다.
QA는 `operatorDecision=APPROVED` row에 대해 correctedPath 최소 6점, current/candidate path 복사 금지, 숫자형 correctedLabelX/Y, reviewer/reviewedAt, evidence crop 존재, tracing SVG 존재, workset assignment 일치를 확인한다.
실패 row는 `FILL_REQUIRED_FIELDS`, `RETRACE_FROM_OFFICIAL_PNG`, `MOVE_LABEL_POINT`, `REVIEW_LABEL_TOP_HIT`, `DO_NOT_COPY_REFERENCE_PATH`, `RUN_WORKSET_PREFLIGHT`, `WAIT_FOR_P1_POSTWRITE` action으로 분류한다.
승인 row가 0건이면 `status=waiting-for-operator-entry`로 끝나며, 승인 row가 있더라도 P1 boundary-first postwrite가 끝나지 않았으면 `status=waiting-for-p1-postwrite`로 남는다.
post-entry QA도 read-only이며 source input, main corrections template, `src/data/daeguSeatData.ts`를 수정하지 않는다.
P2 36건 중 label/top-hit 검증이 필요한 `P2-A` 2건만 먼저 확인하려면 아래 subset QA를 실행한다.

```bash
npm run stadium:daegu:p2a-operator-post-entry-qa
```

이 명령은 P2 전체 post-entry QA를 먼저 갱신한 뒤 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2a-operator-post-entry-qa.md`, `.json`, `.csv`를 생성한다.
대상은 `P2-A` workset 2건으로 고정하며, 각 row에 `P2A_LABEL_TOP_HIT_OPERATOR_QA_REQUIRED`, `REVIEW_LABEL_TOP_HIT`, `FILL_REQUIRED_FIELDS`, `WAIT_FOR_P1_POSTWRITE`, `CONTINUE_P2_FULL_READINESS` action을 붙여 다음 조치를 분리한다.
P2-A 승인 row가 0건이거나 2건이 모두 승인되지 않았으면 `status=waiting-for-operator-entry`로 남는다.
2건이 모두 승인됐더라도 P1 boundary-first postwrite가 `postwrite-verified`가 아니면 `status=waiting-for-p1-postwrite`로 남는다.
2건이 모두 승인되고 P1 postwrite가 끝난 경우에만 `status=ready-for-p2-readiness`가 되지만, 이 상태도 P2 전체 36건 readiness와 production write guard를 우회하지 않는다.
P2-A subset QA도 read-only이며 source input, main corrections template, `src/data/daeguSeatData.ts`를 수정하지 않는다.
P2-A operator가 실제 입력할 대상과 증거를 한 파일에서 확인하려면 아래 input packet을 실행한다.

```bash
npm run stadium:daegu:p2a-operator-input-packet
```

이 명령은 P2-A post-entry QA를 먼저 갱신한 뒤 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2a-operator-input-packet.md`, `.json`, `.csv`를 생성한다.
packet은 P2-A 2건의 `editableTarget`, evidence crop, tracing SVG, currentPath reference, candidatePath reference, required fields, label/top-hit checklist, post-entry QA status를 한 표로 묶는다.
operator가 채울 필드는 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, `operatorNote`로 고정한다.
label/top-hit checklist는 `CHECK_CORRECTED_LABEL_POINT_INSIDE_POLYGON`, `CHECK_LABEL_POINT_SELECTS_SAME_BLOCK`, `CHECK_HIT_PATH_DOES_NOT_CAPTURE_NEIGHBOR_BLOCK`, `CHECK_PATH_ALIGNED_TO_OFFICIAL_PNG_SEAT_AREA`, `CHECK_CURRENT_AND_CANDIDATE_PATHS_NOT_COPIED`로 고정한다.
`currentPath`와 `candidatePath`는 reference-only이며 correctedPath로 복사하지 않는다.
P2-A input packet도 read-only이며 source input, main corrections template, `src/data/daeguSeatData.ts`를 수정하지 않는다.
P2-A 2건을 full P2 readiness로 넘기기 전에는 아래 subset prewrite gate를 먼저 실행한다.

```bash
npm run stadium:daegu:p2a-prewrite-gate
```

이 명령은 P2-A input packet, P2 validation, P2 import dry-run을 먼저 갱신한 뒤 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2a-prewrite-gate.md`, `.json`, `.csv`와 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2a-prewrite-preview.svg`를 생성한다.
gate는 `1-7`, `우측 외야` 2건만 대상으로 `P2A_APPROVED_ROW_MISSING_FIELDS`, `P2A_CORRECTED_PATH_REUSES_CURRENT_PATH`, `P2A_CORRECTED_PATH_REUSES_CANDIDATE_PATH`, `P2A_CORRECTED_LABEL_OUTSIDE_PATH`, `P2A_CORRECTED_LABEL_TOP_HIT_MISMATCH`, `P2A_CORRECTED_HIT_PATH_CAPTURES_NEIGHBOR_LABEL`, `P2A_VALIDATION_ROW_NOT_VALID_FOR_APPROVAL`을 차단한다.
승인 row가 0건이면 `status=waiting-for-operator-entry`이며 명령은 production prewrite gate로서 실패 종료한다. readiness 보고서용으로 waiting 상태를 생성할 때만 script 내부에서 `--allow-waiting-exit-zero`를 사용한다.
2건이 모두 승인됐더라도 P1 boundary-first postwrite가 `postwrite-verified`가 아니면 `status=waiting-for-p1-postwrite`로 남고 production write는 금지된다.
P2-A prewrite gate도 read-only이며 source input, main corrections template, `src/data/daeguSeatData.ts`를 수정하지 않는다.

P2-A의 전체 상태를 post-entry QA, input packet, prewrite gate, render-safety와 함께 한 번에 보려면 아래 readiness V3를 실행한다.

```bash
npm run stadium:daegu:p2a-readiness-v3
```

이 명령은 P2-A prerequisite, P1 boundary-first postwrite gate, full P2 readiness, render-safety audit를 갱신한 뒤 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2a-readiness-v3.md`, `.json`, `.csv`를 생성한다.
full P2 readiness는 readiness report 생성을 위해 `--allow-waiting-exit-zero`로 실행하지만, 이 플래그는 waiting 상태 보고서 생성을 위한 것이며 template import나 production write를 허용하지 않는다.
readiness V3는 `P2A_WAITING_OPERATOR_ENTRY`, `P2A_WAITING_P1_POSTWRITE`, `P2A_WAITING_FULL_P2_READINESS`, `P2A_NEVER_ALLOWS_DIRECT_PRODUCTION_WRITE`를 별도 상태로 분리한다.
P2-A readiness가 통과해도 직접 production write를 허용하지 않으며, 반드시 full P2 readiness와 기존 production write guard를 다시 통과해야 한다.
operator가 workset input에 값을 채운 뒤 승인 row를 production readiness로 넘기기 전에는 아래 preflight를 실행한다.

```bash
npm run stadium:daegu:p2-operator-workset-preflight
```

이 명령은 P2 workset을 먼저 갱신한 뒤 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-workset-preflight.md`, `.json`, `.csv`를 생성한다.
승인 row는 `operatorDecision=APPROVED`, `correctedPath`, 숫자형 `correctedLabelX/Y`, `reviewer`, `reviewedAt`이 모두 있어야 하며, `CORRECTED_PATH_REUSES_CURRENT_PATH`와 `CORRECTED_PATH_REUSES_CANDIDATE_PATH`는 차단된다.
manual retrace 성격의 P2 row는 최소 6점 이상의 corrected polygon이 필요하고, `LABEL_TOP_HIT_REQUIRES_OPERATOR_QA` / `VISUAL_APPROVAL_OPERATOR_NOTE_RECOMMENDED` 경고는 operator QA 기록으로 남긴다.
승인 row가 0건이면 `status=waiting-for-operator`로 끝나며 production write는 여전히 금지된다.
preflight도 read-only이며 P2 source input, main corrections template, `src/data/daeguSeatData.ts`를 수정하지 않는다.
operator package를 다시 생성해도 기존 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json`의 운영자 editable field는 보존한다.
`p2-operator-import`는 기본 dry-run이며, `src/data/daeguSeatData.ts`와 main template을 수정하지 않는다.
`p2-operator-readiness`는 post-entry QA, P1 boundary-first postwrite gate, P2 validation/import dry-run 결과가 서로 맞는지 확인하는 read-only gate다.
승인 row가 0건이면 `status=waiting-for-operator-entry`로 남고, 승인 row가 있더라도 P1 boundary-first postwrite가 `postwrite-verified`가 아니면 `status=waiting-for-p1-postwrite`로 남는다.
post-entry QA에 blocked row가 있으면 `POST_ENTRY_QA_BLOCKED_ROWS` / `POST_ENTRY_QA_STATUS_BLOCKED_AFTER_ENTRY` 기준으로 template import를 차단한다.
한 번에 실행하려면 `npm run stadium:daegu:p2-operator-prewrite-gate`를 사용한다.
이 prewrite gate는 `p2-operator-post-entry-qa`를 먼저 실행한 뒤 validation, import dry-run, readiness를 차례로 실행한다.
현재 기준에서는 P2 36건 모두 `NEEDS_RETRACE`이며, operator가 변경할 row를 입력하기 전에는 template import/write로 넘어가지 않는다.
P0/P1 batch가 종료되고 운영자가 현재 P2 input row를 모두 결정한 뒤 main template에 옮길 때만 아래 명령을 사용한다.
`p2-operator-import:write-template`은 P2 input에 `draftOnly`, `stagingOnly`, `DRAFT_VALIDATION_ONLY` marker가 남아 있으면 차단한다.
P2 input 중 `PENDING` row가 하나라도 남아 있으면 `WRITE_TEMPLATE_REQUIRES_NO_P2_PENDING_ROWS`로 차단한다.
P0/P1 row가 아직 `PENDING`이거나 `APPROVED` row가 main template에 남아 있으면 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED` 또는 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN`으로 차단한다.
승인된 P2 row가 0건이면 `WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P2_ROW` / `NO_APPROVED_P2_ROWS_TEMPLATE_IMPORT_WILL_BLOCK` 기준으로 write-template 단계에 들어가지 않는다.
`APPROVED` row는 `p2-operator-validate` 결과에서 `validForApproval=true`여야 한다.
`p2-operator-readiness`가 `readyForTemplateImport=true`를 출력한 경우에만 write-template 단계로 넘어간다.

```bash
npm run stadium:daegu:p2-operator-import:write-template
```

`p2-operator-import:write-template` 이후에도 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않는다.
그 명령은 handoff 기준으로 main template을 재생성하므로, import한 P2 운영자 결정을 `PENDING`으로 되돌릴 수 있다.
P2 import 이후 write 전 검증은 `npm run stadium:daegu:operator-corrections-write` 내부의 validate/preview/apply/write-smoke/batches/status/write-guard 순서를 사용한다.

6. 마지막 P3/P4 44건 운영자 패키지를 미리 갱신한다.

```bash
npm run stadium:daegu:p3-p4-operator-package
npm run stadium:daegu:p3-p4-operator-audit
npm run stadium:daegu:p3-p4-decision-packet
npm run stadium:daegu:p3-p4-operator-validate
npm run stadium:daegu:p3-p4-operator-import
npm run stadium:daegu:p3-p4-operator-readiness
```

P3/P4는 batch 순서상 P0, P1, P2가 종료된 뒤 마지막 production write 대상이 된다.
이 명령은 `reports/stadium/daegu-p3-p4-operator/` 아래에 P3/P4 operator input, evidence crop 링크, checklist를 만든다.
현재 기준에서는 P3 0건, P4 44건 모두 `NEEDS_RETRACE`이고 `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`은 비어 있어야 한다.
분포는 P3 0건, P4 44건, manual trace required 22건, corrected path required 22건, label/hit-area review 3건으로 고정한다.
`p3-p4-operator-audit`는 이 상태를 고정하며, P3/P4 candidate path는 참고자료일 뿐 운영자 승인 없이 production template으로 복사하지 않는다.
`p3-p4-decision-packet`은 P3/P4 44건 evidence crop을 검수 문서로 묶는 read-only 산출물이며, P0/P1/P2가 닫히기 전 write-template으로 넘어가지 않는다.
`p3-p4-operator-import`는 기본 dry-run이며, `src/data/daeguSeatData.ts`와 main template을 수정하지 않는다.
`p3-p4-operator-readiness`는 P0/P1/P2 batch가 닫혔는지, P3/P4 validation/import dry-run 결과가 서로 맞는지 확인하는 read-only gate다.
한 번에 실행하려면 `npm run stadium:daegu:p3-p4-operator-prewrite-gate`를 사용한다.
P0, P1, P2 batch가 모두 종료되고 운영자가 P3/P4 input을 채운 뒤 main template에 옮길 때만 아래 명령을 사용한다.
`p3-p4-operator-import:write-template`은 P3/P4 input에 `draftOnly`, `stagingOnly`, `DRAFT_VALIDATION_ONLY` marker가 남아 있으면 차단한다.
P3/P4 44건 중 `PENDING` row가 하나라도 남아 있으면 `WRITE_TEMPLATE_REQUIRES_NO_P3_P4_PENDING_ROWS`로 차단한다.
P0/P1/P2 row가 아직 `PENDING`이거나 `APPROVED` row가 main template에 남아 있으면 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED` 또는 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN`으로 차단한다.
승인된 P3/P4 row가 0건이면 `WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P3_P4_ROW` / `NO_APPROVED_P3_P4_ROWS_TEMPLATE_IMPORT_WILL_BLOCK` 기준으로 write-template 단계에 들어가지 않는다.
`APPROVED` row는 `p3-p4-operator-validate` 결과에서 `validForApproval=true`여야 한다.
`p3-p4-operator-readiness`가 `readyForTemplateImport=true`를 출력한 경우에만 write-template 단계로 넘어간다.

```bash
npm run stadium:daegu:p3-p4-operator-import:write-template
```

`p3-p4-operator-import:write-template` 이후에도 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않는다.
그 명령은 handoff 기준으로 main template을 재생성하므로, import한 P3/P4 운영자 결정을 `PENDING`으로 되돌릴 수 있다.
P3/P4 import 이후 write 전 검증은 `npm run stadium:daegu:operator-corrections-write` 내부의 validate/preview/apply/write-smoke/batches/status/write-guard 순서를 사용한다.

7. 운영자가 현재 batch의 `operatorDecision=APPROVED` row에 corrected fields를 채운다.

8. validation, preview를 생성한다.

```bash
npm run stadium:daegu:operator-corrections
```

P0 input flow에서 `p0-operator-import:write-template`을 이미 실행한 경우에는 이 단계를 건너뛴다.
대신 `npm run stadium:daegu:operator-corrections-write`를 실행해 내부 prewrite gate가 최신 template을 직접 검증하게 한다.

9. production write 전 dry-run apply와 write-smoke를 확인한다.

```bash
npm run stadium:daegu:operator-corrections-apply
npm run stadium:daegu:operator-corrections-write-smoke
npm run stadium:daegu:operator-corrections-batches
npm run stadium:daegu:operator-corrections-status
npm run stadium:daegu:operator-state-audit
npm run stadium:daegu:operator-corrections-write-guard
```

write-smoke는 synthetic approval row를 만들지만 `--data-file`을 임시 복사본으로만 지정한다.
`src/data/daeguSeatData.ts`는 `productionDataUnchanged=true`일 때만 안전 계약을 통과한다.

10. status가 `readyForWrite=true`인지 확인한다.

확인할 파일:

- `reports/stadium/daegu-seatmap-operator-corrections-status.md`
- `reports/stadium/daegu-seatmap-operator-state-audit.md`
- `reports/stadium/daegu-retrace-work-queue.md`
- `reports/stadium/daegu-non-overlap-priority-queue.md`
- `reports/stadium/daegu-visual-issue-queue.md`
- `reports/stadium/daegu-visual-off-seat-workset.md`
- `reports/stadium/daegu-off-seat-retrace-intake.md`
- `reports/stadium/daegu-p0-p1-off-seat-workset.md`
- `reports/stadium/daegu-p0-off-seat-operator-input.md`
- `reports/stadium/daegu-p0-off-seat-operator-import.md`
- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-package.md`
- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-checklist.md`
- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-decision-packet.md`
- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-retrace-intake.md`
- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-audit.md`
- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-readiness.md`
- `reports/stadium/daegu-seatmap-p0-operator-import.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-package.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-checklist.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-decision-packet.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-next-action-packet.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-audit.md`
- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-readiness.md`
- `reports/stadium/daegu-seatmap-p1-operator-import.md`
- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-review-package.md`
- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-review-checklist.md`
- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-staging-audit.md`
- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-operator-approval-candidates.json`
- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-manual-retrace-template.json`
- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-package.md`
- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-checklist.md`
- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-decision-packet.md`
- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-readiness.md`
- `reports/stadium/daegu-seatmap-p2-operator-import.md`
- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-package.md`
- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-checklist.md`
- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-audit.md`
- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-decision-packet.md`
- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-readiness.md`
- `reports/stadium/daegu-seatmap-p3-p4-operator-import.md`
- `reports/stadium/daegu-seatmap-operator-corrections-validation.md`
- `reports/stadium/daegu-seatmap-operator-corrections-preview.md`
- `reports/stadium/daegu-seatmap-operator-corrections-preview.svg`
- `reports/stadium/daegu-seatmap-operator-corrections-apply.md`
- `reports/stadium/daegu-seatmap-operator-corrections-batches.md`
- `reports/stadium/daegu-seatmap-operator-corrections-write-smoke/daegu-seatmap-operator-corrections-write-smoke.md`
- `reports/stadium/daegu-seatmap-operator-corrections-write-guard.md`

10. `readyForWrite=true`일 때만 production write를 실행한다.

```bash
npm run stadium:daegu:operator-corrections-write
```

이 명령은 내부적으로 validation, preview, dry-run apply, write-smoke, batches, status, write guard를 먼저 실행한다.
batch 리포트에서 현재 승인 row가 단일 우선순위 batch로 묶이지 않으면 write guard까지 도달해도 차단된다.
guard가 통과하지 않으면 `apply --write`가 호출되지 않는다.
`apply --write`는 표준 operator corrections template JSON/CSV 입력만 허용하며, P2 draft 또는 staging 파일을 직접 write 입력으로 사용할 수 없다.
validator는 기본적으로 `DRAFT_VALIDATION_ONLY`, draft timestamp, `draftOnly=true`, `stagingOnly=true`가 남은 `APPROVED` row를 차단한다.

11. write 후 전체 gate를 다시 실행한다.

```bash
npm run stadium:daegu:operator-corrections-postwrite-gate
```

post-write gate는 아래 검증을 순서대로 실행한다.

- `npm run stadium:daegu:alignment-audit`
- `npm run stadium:daegu:precision-audit`
- `npm run stadium:daegu:render-safety-audit`
- `npm run stadium:daegu:p1-boundary-first-postwrite-gate`
- `npm run test:stadium:seatmaps`
- `npm run qa:stadium:daegu:full`
- `npm run build`

## Acceptance Criteria

- `daeguSeatData.ts`의 계약은 유지된다.
- `DAEGU_BLOCKS`, `DAEGU_SEATMAP_IMAGE`, `DaeguBlock` public contract는 변경하지 않는다.
- approved row만 `OFFICIAL_IMAGE_TRACED`로 승격된다.
- `NEEDS_OPERATOR_REVIEW` row는 선택 가능 상태를 유지하되, 미승인 상태를 명확히 표시한다.
- `npm run stadium:daegu:alignment-audit` 결과에서 official traced 블록은 label-inside, top-hit, duplicate candidate 조건을 통과한다.
- `npm run qa:stadium:daegu:full` 결과에서 검색, 지도 선택, 상세 패널 선택이 같은 block id로 동기화된다.

## Troubleshooting

| symptom | likely cause | action |
| --- | --- | --- |
| `VALIDATION_INPUT_SHA256_MISMATCH` | template 수정 후 validation을 재실행하지 않았다. | `npm run stadium:daegu:operator-corrections`를 다시 실행한다. |
| `CORRECTED_LABEL_OUTSIDE_PATH` | label point가 corrected path 밖에 있다. | corrected label 좌표를 path 내부로 옮긴다. |
| `CORRECTED_LABEL_TOP_HIT_MISMATCH` | 적용 시뮬레이션에서 다른 블록이 top-hit된다. | path 경계와 label point를 함께 재검수한다. |
| `PATH_REQUIRES_AT_LEAST_SIX_POINTS` | corrected path가 4점 사각형 등 저상세 polygon이다. | 공식 PNG 경계에 맞춰 최소 6점 이상의 세부 polygon으로 다시 트레이싱한다. |
| `DUPLICATE_CORRECTED_PATH` | 승인 row끼리 같은 path를 공유했다. | duplicate candidate 블록은 각각 별도 경계를 입력한다. |
| `NO_APPROVED_OPERATOR_CORRECTIONS` | 승인된 운영자 row가 없다. | 운영자 승인 row를 채운 뒤 validation부터 다시 시작한다. |
| `INPUT_PENDING_TEMPLATE_NOT_PENDING` | operator input은 `PENDING`인데 main template에 terminal decision이 남아 있다. | `npm run stadium:daegu:operator-corrections-template`로 handoff 기본 template을 다시 만든 뒤 batch dry-run import를 재실행한다. |
| `INPUT_TEMPLATE_DECISION_MISMATCH` | operator input과 main template의 terminal decision이 서로 다르다. | 해당 batch input과 import report를 확인하고 source of truth인 operator input 기준으로 다시 import한다. |
| `IMPORT_REPORT_NOT_DRY_RUN` | import report mode가 dry-run 또는 정상 write-template이 아니다. | 해당 batch의 기본 import 명령을 다시 실행해 dry-run report를 갱신한다. |
| `STALE_WRITE_TEMPLATE_IMPORT_REPORT` | write-template report가 남아 있지만 현재 input/template decision이 맞지 않는다. | main template을 재정렬하고 해당 batch import를 dry-run부터 다시 만든다. |
| `WRITE_TEMPLATE_IMPORT_HAS_PENDING_INPUT` | `PENDING` row가 있는 input으로 write-template report가 생성됐다. | 운영자 결정을 모두 채운 뒤 prewrite gate를 다시 실행한다. |
| `FIRST_OPEN_BATCH_DOES_NOT_MATCH_INPUT_PENDING` | operator input에 미결 row가 있는데 main template의 첫 open batch가 가장 이른 미결 input batch와 다르다. | P0, P1, P2, P3/P4 순서로 template/import 상태를 다시 맞춘다. |
| `P0_PENDING_ROWS_REMAIN` | P0 readiness에서 아직 미결 row가 발견됐다. | P0 input 상태를 확인하고 남은 row를 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정한 뒤 `p0-operator-prewrite-gate`를 다시 실행한다. |
| `P0_IMPORT_REPORT_NOT_DRY_RUN` | readiness가 write-template 이후 report를 보고 있다. | `npm run stadium:daegu:p0-operator-import`를 다시 실행해 dry-run report를 만든 뒤 readiness를 재실행한다. |
| `P1_REQUIRES_PRIOR_BATCH_CLOSED` | P1 readiness에서 P0 `PENDING` row가 남아 있다. | P0 batch를 먼저 `APPROVED`, `REJECTED`, `NEEDS_RETRACE`로 모두 결정한다. |
| `P1_REQUIRES_PRIOR_BATCH_WRITTEN` | P1 readiness에서 P0 `APPROVED` row가 아직 main template에 남아 있다. | P0 approved row를 guarded write로 먼저 반영하거나 승인 결정을 철회한다. |
| `P1_PENDING_ROWS_REMAIN` | P1 readiness에서 아직 미결 row가 발견됐다. | P1 17건을 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정하고 `p1-operator-prewrite-gate`를 다시 실행한다. |
| `P1_IMPORT_REPORT_NOT_DRY_RUN` | readiness가 write-template 이후 report를 보고 있다. | `npm run stadium:daegu:p1-operator-import`를 다시 실행해 dry-run report를 만든 뒤 readiness를 재실행한다. |
| `P2_REQUIRES_PRIOR_BATCH_CLOSED` | P2 readiness에서 P0/P1 `PENDING` row가 남아 있다. | P0/P1 batch를 먼저 `APPROVED`, `REJECTED`, `NEEDS_RETRACE`로 모두 결정한다. |
| `P2_REQUIRES_PRIOR_BATCH_WRITTEN` | P2 readiness에서 P0/P1 `APPROVED` row가 아직 main template에 남아 있다. | earlier batch approved row를 guarded write로 먼저 반영하거나 승인 결정을 철회한다. |
| `P2_PENDING_ROWS_REMAIN` | P2 readiness에서 아직 미결 row가 발견됐다. | 현재 P2 input row를 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정하고 `p2-operator-prewrite-gate`를 다시 실행한다. |
| `P2_IMPORT_REPORT_NOT_DRY_RUN` | readiness가 write-template 이후 report를 보고 있다. | `npm run stadium:daegu:p2-operator-import`를 다시 실행해 dry-run report를 만든 뒤 readiness를 재실행한다. |
| `P3_P4_REQUIRES_PRIOR_BATCH_CLOSED` | P3/P4 readiness에서 P0/P1/P2 `PENDING` row가 남아 있다. | earlier batch를 먼저 `APPROVED`, `REJECTED`, `NEEDS_RETRACE`로 모두 결정한다. |
| `P3_P4_REQUIRES_PRIOR_BATCH_WRITTEN` | P3/P4 readiness에서 P0/P1/P2 `APPROVED` row가 아직 main template에 남아 있다. | earlier batch approved row를 guarded write로 먼저 반영하거나 승인 결정을 철회한다. |
| `P3_P4_PENDING_ROWS_REMAIN` | P3/P4 readiness에서 아직 미결 row가 발견됐다. | P3/P4 44건을 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정하고 `p3-p4-operator-prewrite-gate`를 다시 실행한다. |
| `P3_P4_IMPORT_REPORT_NOT_DRY_RUN` | readiness가 write-template 이후 report를 보고 있다. | `npm run stadium:daegu:p3-p4-operator-import`를 다시 실행해 dry-run report를 만든 뒤 readiness를 재실행한다. |
| `WRITE_TEMPLATE_REQUIRES_NO_P0_PENDING_ROWS` | P0 input에 아직 `PENDING` row가 남아 있다. | P0 input의 남은 row를 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정한다. |
| `WRITE_TEMPLATE_REQUIRES_NO_P1_PENDING_ROWS` | P1 input에 아직 `PENDING` row가 남아 있다. | P1 17건을 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정한다. |
| `WRITE_TEMPLATE_REQUIRES_NO_P2_PENDING_ROWS` | P2 input에 아직 `PENDING` row가 남아 있다. | 현재 P2 input row를 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정한다. |
| `WRITE_TEMPLATE_REQUIRES_NO_P3_P4_PENDING_ROWS` | P3/P4 input에 아직 `PENDING` row가 남아 있다. | P3/P4 44건을 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정한다. |
| `APPROVED_ROWS_MUST_BE_SINGLE_BATCH` | 승인 row가 둘 이상의 batch에 섞여 있다. | 현재 batch의 승인 row만 남기고 나머지는 `PENDING`으로 되돌린다. |
| `APPROVED_ROWS_OUT_OF_PRIORITY_ORDER` | earlier batch가 열려 있는데 later batch에 승인 row가 있다. | `BATCH_1_P0`부터 순서대로 확정한다. |
| `BATCH_HAS_PENDING_ROWS` | 현재 batch 안에 아직 미결 row가 남아 있다. | row를 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 결정한다. |
| `WRITE_SMOKE_PRODUCTION_DATA_CHANGED` | smoke test가 production data를 건드렸다. | production write를 중단하고 smoke output을 먼저 조사한다. |

## Production Data Policy

- 외부 크롤링, 웹 검색, 추정 좌표로 대구 좌석 데이터를 보강하지 않는다.
- 공식 PNG 또는 운영자 corrected path 없이 좌표/path를 새로 확정하지 않는다.
- 운영자 승인 없이 어떤 블록도 `OFFICIAL_IMAGE_TRACED`로 승격하지 않는다.
- 실제 write는 `npm run stadium:daegu:operator-corrections-write`만 사용한다.
