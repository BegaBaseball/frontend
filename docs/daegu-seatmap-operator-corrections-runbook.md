# 대구 좌석도 operator corrections runbook

작성일: 2026-05-10

## 목적

대구 좌석도 177개 블록 중 audit에서 확정되지 않은 블록은 운영자 corrected path가 들어오기 전까지 production 좌표로 승격하지 않는다.
이 runbook은 운영자가 corrected path를 제출하고, 프론트엔드에서 검증/preview/write를 진행하는 표준 절차를 고정한다.

## 현재 기준

- 공식 PNG 좌표계: `1707x2048`
- 전체 블록: `177`
- `LOCKED_VERIFIED`: `43`
- 운영자 handoff 대상: `134`
- 현재 approved rows: `0`
- 현재 production write 상태: `readyForWrite=false`
- 현재 blocker: `NO_APPROVED_OPERATOR_CORRECTIONS`

현재 상태는 다음 리포트에서 확인한다.

- `reports/stadium/daegu-seatmap-operator-corrections-status.md`
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
출력은 남은 unresolved row를 포함하고 `productionWriteAllowed=false`로 고정한다. 최초 기준은 134건이지만 production write가 끝난 row는 source input 재생성 뒤 queue에서 빠질 수 있다.
첨부 이미지 기반 visual seed는 29건이 최초 기준이며 `Image #1`, `Image #2`, `Image #3` evidence group과 `observedIssue`를 함께 남긴다.
이미지에서 보인 `LF-9`처럼 현재 source input에 없는 블록은 observation으로만 남기고 visual seed row에는 포함하지 않는다.

작업 순서는 `VISUAL_OFF_SEAT_HARD_FAIL`, `OVERSIZED_RECT_MANUAL_RETRACE`, `LABEL_AND_HIT_AREA_REVIEW`, `VISUAL_APPROVAL_CANDIDATE`, `DEFER_DUPLICATE_BOUNDARY` 순서다.
`PIXEL_CANDIDATE_READY` row도 자동 승격하지 않으며, candidate path는 evidence crop과 label/top-hit를 운영자가 시각 승인할 때만 참고한다.
`currentPath` 또는 `candidatePath`를 그대로 `correctedPath`로 복사하지 않는다.
승인 row는 기존 source input에 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채운 뒤 batch gate를 통과해야 한다.
production write 순서는 계속 P0, P1, P2, P3/P4 gate를 따른다.

### VISUAL_OFF_SEAT_HARD_FAIL 44건 workset

시각 오류 queue의 1순위인 `VISUAL_OFF_SEAT_HARD_FAIL` row만 운영자 재트레이싱 작업 패키지로 끊으려면 아래 명령을 실행한다.

```bash
npm run stadium:daegu:visual-off-seat-workset
```

이 명령은 `npm run stadium:daegu:visual-issue-queue`를 먼저 실행한 뒤 `reports/stadium/daegu-visual-issue-queue.json`에서 `VISUAL_OFF_SEAT_HARD_FAIL` 44건만 읽어 `reports/stadium/daegu-visual-off-seat-workset.md`, `.json`, `.csv`를 생성한다.
현재 기준 분포는 P0 2건, P1 12건, P2 0건, P3/P4 30건이며 visual seed row는 9건이어야 한다.
이 workset은 read-only이고 `productionWriteAllowed=false`다.
운영자는 이 workset을 보고 실제 좌석 경계를 최소 6점 이상으로 수동 트레이싱한 뒤, 승인 row만 matching source input에 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`으로 반영한다.
`currentPath`와 `candidatePath`는 reference-only이며 `correctedPath`로 복사하지 않는다.
승인 후에도 production write는 기존 batch gate 순서대로만 진행한다.

### 좌석 아닌 위치 의심 intake

겹침 없는 큐 중에서도 현재 path가 좌석 영역과 어긋난 의심 블록만 먼저 작업하려면 off-seat intake를 생성한다.

```bash
npm run stadium:daegu:off-seat-retrace-intake
```

이 명령은 `candidateDuplicateGroup`이 비어 있고 `LOW_COMPONENT_INSIDE_CURRENT_PATH` 또는 `LOW_CURRENT_PATH_COLOR_COVERAGE`가 있는 row만 `reports/stadium/daegu-off-seat-retrace-intake.md`, `.json`, `.csv`로 묶는다.
현재 기준 off-seat intake는 44건이며, 운영자 선처리 대상인 P0/P1 subset은 14건이다.
이 intake에는 evidence crop, current path, candidate path, current/candidate label 좌표, component-inside ratio, path-color coverage, failure/risk flag, source input, 그리고 운영자가 채워야 하는 corrected field가 포함된다.
중복 후보 경계가 있는 row는 이 intake에서 제외하고 `DEFER_DUPLICATE_BOUNDARY` 큐에서 따로 처리한다.
이 산출물은 read-only이며 운영자 승인 없는 추정 좌표, 자동 candidate 승격, external crawling/web search를 사용하지 않는다.

### P0/P1 off-seat 14건 작업 패키지

off-seat intake 44건 중 P0/P1 선처리 14건만 운영자 작업 단위로 끊으려면 아래 workset을 생성한다.

```bash
npm run stadium:daegu:p0-p1-off-seat-workset
```

이 명령은 `reports/stadium/daegu-off-seat-retrace-intake.json`을 source로 읽고 `P0_P1_OFF_SEAT_FIRST` row만 `reports/stadium/daegu-p0-p1-off-seat-workset.md`, `.json`, `.csv`로 묶는다.
현재 기준 workset은 P0 2건, P1 12건, 총 14건이며 duplicate row는 0건이어야 한다.
운영자는 P0 2건을 먼저 source P0 input에 반영한 뒤 `npm run stadium:daegu:p0-operator-prewrite-gate`를 실행한다.
P0 readiness가 통과하면 `npm run stadium:daegu:p0-operator-import:write-template`로 template만 동기화하고, 그 다음 P1 12건에 대해 같은 방식으로 `p1-operator-prewrite-gate`와 `p1-operator-import:write-template`를 사용한다.
이 workset도 read-only이며 `currentPath`는 오류 확인용, `candidatePath`는 참고용이다. production data는 기존 validation/preview/apply/write gate를 통과한 승인 row만 변경할 수 있다.

### P0 off-seat 2건 입력 보조 파일

P0 off-seat 2건만 운영자가 먼저 corrected path를 채울 때는 아래 draft helper를 생성한다.

```bash
npm run stadium:daegu:p0-off-seat-operator-input
```

이 명령은 `reports/stadium/daegu-p0-p1-off-seat-workset.json`에서 P0 2건만 읽고 `reports/stadium/daegu-p0-off-seat-operator-input.md`, `.json`, `.csv`를 생성한다.
대상은 `09 휠체어`, `U22 휠체어`이며 duplicate row는 0건이어야 한다.
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

P0 3건을 먼저 실제 재트레이싱할 때는 P0 전용 intake를 생성한다.

```bash
npm run stadium:daegu:p0-retrace-intake
```

이 명령은 `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json`을 source of truth로 읽고 `NEEDS_RETRACE` 상태인 P0 3건만 `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-retrace-intake.md`, `.json`, `.csv`로 묶는다.
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

기대 상태는 P0 3건 모두 `PENDING`, `readyForTemplateImport=false`, main batch first open `BATCH_1_P0`이다.
`p0-operator-readiness`가 `WRITE_TEMPLATE_REQUIRES_NO_P0_PENDING_ROWS` 또는 `P0_PENDING_ROWS_REMAIN`으로 막는 것은 운영자 입력 전 정상 상태다.
reviewer/reviewedAt, 운영자 직접 메모, corrected geometry가 없고 `No operator corrected path provided;` note만 남은 terminal decision은 stale 산출물로 보고 package 재생성 시 보존하지 않는다.
P0/P1/P2/P3/P4 input에 실제 운영자 결정이 들어간 뒤에는 `write-template` import report mode와 input/template decision이 서로 일치해야 한다.
`p0-operator-import:write-template` 이후에는 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않고, write 전 gate는 `npm run stadium:daegu:operator-corrections-write` 내부 순서를 따른다.

## 표준 절차

1. 최신 handoff와 template을 만든다.

```bash
npm run stadium:daegu:operator-corrections-template
```

2. 다음 write 대상인 P0 3건 운영자 패키지를 갱신한다.

```bash
npm run stadium:daegu:p0-operator-package
npm run stadium:daegu:p0-operator-audit
npm run stadium:daegu:p0-decision-packet
npm run stadium:daegu:p0-retrace-intake
```

이 명령은 P0 operator input, evidence crop 링크, checklist를 `reports/stadium/daegu-p0-operator/` 아래에 다시 만든다.
현재 기준에서는 3건 모두 운영자 corrected path 입력 전이므로 production write 대상이 아니다.
`p0-operator-audit`는 operator 입력 전 P0 3건이 모두 `PENDING`이고 corrected fields가 비어 있는지 고정한다.
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
P0 3건 중 `PENDING` row가 하나라도 남아 있으면 `WRITE_TEMPLATE_REQUIRES_NO_P0_PENDING_ROWS`로 차단한다.
`p0-operator-readiness`가 `readyForTemplateImport=true`를 출력한 경우에만 write-template 단계로 넘어간다.

```bash
npm run stadium:daegu:p0-operator-import:write-template
```

`p0-operator-import:write-template` 이후에는 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않는다.
그 명령은 handoff 기준으로 main template을 재생성하므로, import한 P0 운영자 결정을 `PENDING`으로 되돌릴 수 있다.
P0 import 이후 write 전 검증은 `npm run stadium:daegu:operator-corrections-write` 내부의 validate/preview/apply/write-smoke/batches/status/write-guard 순서를 사용한다.

4. 후속 P1 29건 운영자 패키지를 미리 갱신한다.

```bash
npm run stadium:daegu:p1-operator-package
npm run stadium:daegu:p1-operator-audit
npm run stadium:daegu:p1-decision-packet
npm run stadium:daegu:p1-operator-validate
npm run stadium:daegu:p1-operator-import
npm run stadium:daegu:p1-operator-readiness
```

P1은 batch 순서상 P0가 종료된 뒤 production write 대상이 된다.
이 명령은 `reports/stadium/daegu-p1-operator/` 아래에 P1 operator input, evidence crop 링크, checklist를 만든다.
현재 pre-approval 기준에서는 29건 모두 `PENDING`이고 `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`은 비어 있어야 한다.
`p1-operator-audit`는 이 상태를 고정하며, P1 candidate path는 참고자료일 뿐 운영자 승인 없이 production template으로 복사하지 않는다.
`p1-decision-packet`은 P1 29건 evidence crop을 검수 문서로 묶는 read-only 산출물이며, P0 batch가 닫히기 전에는 write-template으로 넘어가지 않는다.
`p1-operator-import`는 기본 dry-run이며, `src/data/daeguSeatData.ts`와 main template을 수정하지 않는다.
`p1-operator-readiness`는 P0 batch가 닫혔는지, P1 validation/import dry-run 결과가 서로 맞는지 확인하는 read-only gate다.
한 번에 실행하려면 `npm run stadium:daegu:p1-operator-prewrite-gate`를 사용한다.
P0 batch가 종료되고 운영자가 P1 input을 채운 뒤 main template에 옮길 때만 아래 명령을 사용한다.
`p1-operator-import:write-template`은 P1 input에 `draftOnly`, `stagingOnly`, `DRAFT_VALIDATION_ONLY` marker가 남아 있으면 차단한다.
P1 29건 중 `PENDING` row가 하나라도 남아 있으면 `WRITE_TEMPLATE_REQUIRES_NO_P1_PENDING_ROWS`로 차단한다.
P0 row가 아직 `PENDING`이거나 P0 `APPROVED` row가 main template에 남아 있으면 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED` 또는 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN`으로 차단한다.
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
operator package를 다시 생성해도 기존 `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json`의 운영자 editable field는 보존한다.
`p2-operator-import`는 기본 dry-run이며, `src/data/daeguSeatData.ts`와 main template을 수정하지 않는다.
`p2-operator-readiness`는 P0/P1 batch가 닫혔는지, P2 validation/import dry-run 결과가 서로 맞는지 확인하는 read-only gate다.
한 번에 실행하려면 `npm run stadium:daegu:p2-operator-prewrite-gate`를 사용한다.
운영자 입력 전에는 P2 row가 모두 `PENDING`이므로 readiness는 `P2_PENDING_ROWS_REMAIN`으로 blocked여야 정상이다.
P0/P1 batch가 종료되고 운영자가 현재 P2 input row를 모두 결정한 뒤 main template에 옮길 때만 아래 명령을 사용한다.
`p2-operator-import:write-template`은 P2 input에 `draftOnly`, `stagingOnly`, `DRAFT_VALIDATION_ONLY` marker가 남아 있으면 차단한다.
P2 input 중 `PENDING` row가 하나라도 남아 있으면 `WRITE_TEMPLATE_REQUIRES_NO_P2_PENDING_ROWS`로 차단한다.
P0/P1 row가 아직 `PENDING`이거나 `APPROVED` row가 main template에 남아 있으면 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED` 또는 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN`으로 차단한다.
`APPROVED` row는 `p2-operator-validate` 결과에서 `validForApproval=true`여야 한다.
`p2-operator-readiness`가 `readyForTemplateImport=true`를 출력한 경우에만 write-template 단계로 넘어간다.

```bash
npm run stadium:daegu:p2-operator-import:write-template
```

`p2-operator-import:write-template` 이후에도 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않는다.
그 명령은 handoff 기준으로 main template을 재생성하므로, import한 P2 운영자 결정을 `PENDING`으로 되돌릴 수 있다.
P2 import 이후 write 전 검증은 `npm run stadium:daegu:operator-corrections-write` 내부의 validate/preview/apply/write-smoke/batches/status/write-guard 순서를 사용한다.

6. 마지막 P3/P4 52건 운영자 패키지를 미리 갱신한다.

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
현재 pre-approval 기준에서는 52건 모두 `PENDING`이고 `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`은 비어 있어야 한다.
분포는 P3 3건, P4 49건, manual trace required 27건, corrected path required 25건, label/hit-area review 3건으로 고정한다.
`p3-p4-operator-audit`는 이 상태를 고정하며, P3/P4 candidate path는 참고자료일 뿐 운영자 승인 없이 production template으로 복사하지 않는다.
`p3-p4-decision-packet`은 P3/P4 52건 evidence crop을 검수 문서로 묶는 read-only 산출물이며, P0/P1/P2가 닫히기 전 write-template으로 넘어가지 않는다.
`p3-p4-operator-import`는 기본 dry-run이며, `src/data/daeguSeatData.ts`와 main template을 수정하지 않는다.
`p3-p4-operator-readiness`는 P0/P1/P2 batch가 닫혔는지, P3/P4 validation/import dry-run 결과가 서로 맞는지 확인하는 read-only gate다.
한 번에 실행하려면 `npm run stadium:daegu:p3-p4-operator-prewrite-gate`를 사용한다.
P0, P1, P2 batch가 모두 종료되고 운영자가 P3/P4 input을 채운 뒤 main template에 옮길 때만 아래 명령을 사용한다.
`p3-p4-operator-import:write-template`은 P3/P4 input에 `draftOnly`, `stagingOnly`, `DRAFT_VALIDATION_ONLY` marker가 남아 있으면 차단한다.
P3/P4 52건 중 `PENDING` row가 하나라도 남아 있으면 `WRITE_TEMPLATE_REQUIRES_NO_P3_P4_PENDING_ROWS`로 차단한다.
P0/P1/P2 row가 아직 `PENDING`이거나 `APPROVED` row가 main template에 남아 있으면 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED` 또는 `WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN`으로 차단한다.
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
| `P0_PENDING_ROWS_REMAIN` | P0 readiness에서 아직 미결 row가 발견됐다. | P0 3건을 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정하고 `p0-operator-prewrite-gate`를 다시 실행한다. |
| `P0_IMPORT_REPORT_NOT_DRY_RUN` | readiness가 write-template 이후 report를 보고 있다. | `npm run stadium:daegu:p0-operator-import`를 다시 실행해 dry-run report를 만든 뒤 readiness를 재실행한다. |
| `P1_REQUIRES_PRIOR_BATCH_CLOSED` | P1 readiness에서 P0 `PENDING` row가 남아 있다. | P0 batch를 먼저 `APPROVED`, `REJECTED`, `NEEDS_RETRACE`로 모두 결정한다. |
| `P1_REQUIRES_PRIOR_BATCH_WRITTEN` | P1 readiness에서 P0 `APPROVED` row가 아직 main template에 남아 있다. | P0 approved row를 guarded write로 먼저 반영하거나 승인 결정을 철회한다. |
| `P1_PENDING_ROWS_REMAIN` | P1 readiness에서 아직 미결 row가 발견됐다. | P1 29건을 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정하고 `p1-operator-prewrite-gate`를 다시 실행한다. |
| `P1_IMPORT_REPORT_NOT_DRY_RUN` | readiness가 write-template 이후 report를 보고 있다. | `npm run stadium:daegu:p1-operator-import`를 다시 실행해 dry-run report를 만든 뒤 readiness를 재실행한다. |
| `P2_REQUIRES_PRIOR_BATCH_CLOSED` | P2 readiness에서 P0/P1 `PENDING` row가 남아 있다. | P0/P1 batch를 먼저 `APPROVED`, `REJECTED`, `NEEDS_RETRACE`로 모두 결정한다. |
| `P2_REQUIRES_PRIOR_BATCH_WRITTEN` | P2 readiness에서 P0/P1 `APPROVED` row가 아직 main template에 남아 있다. | earlier batch approved row를 guarded write로 먼저 반영하거나 승인 결정을 철회한다. |
| `P2_PENDING_ROWS_REMAIN` | P2 readiness에서 아직 미결 row가 발견됐다. | 현재 P2 input row를 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정하고 `p2-operator-prewrite-gate`를 다시 실행한다. |
| `P2_IMPORT_REPORT_NOT_DRY_RUN` | readiness가 write-template 이후 report를 보고 있다. | `npm run stadium:daegu:p2-operator-import`를 다시 실행해 dry-run report를 만든 뒤 readiness를 재실행한다. |
| `P3_P4_REQUIRES_PRIOR_BATCH_CLOSED` | P3/P4 readiness에서 P0/P1/P2 `PENDING` row가 남아 있다. | earlier batch를 먼저 `APPROVED`, `REJECTED`, `NEEDS_RETRACE`로 모두 결정한다. |
| `P3_P4_REQUIRES_PRIOR_BATCH_WRITTEN` | P3/P4 readiness에서 P0/P1/P2 `APPROVED` row가 아직 main template에 남아 있다. | earlier batch approved row를 guarded write로 먼저 반영하거나 승인 결정을 철회한다. |
| `P3_P4_PENDING_ROWS_REMAIN` | P3/P4 readiness에서 아직 미결 row가 발견됐다. | P3/P4 52건을 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정하고 `p3-p4-operator-prewrite-gate`를 다시 실행한다. |
| `P3_P4_IMPORT_REPORT_NOT_DRY_RUN` | readiness가 write-template 이후 report를 보고 있다. | `npm run stadium:daegu:p3-p4-operator-import`를 다시 실행해 dry-run report를 만든 뒤 readiness를 재실행한다. |
| `WRITE_TEMPLATE_REQUIRES_NO_P0_PENDING_ROWS` | P0 input에 아직 `PENDING` row가 남아 있다. | P0 3건을 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정한다. |
| `WRITE_TEMPLATE_REQUIRES_NO_P1_PENDING_ROWS` | P1 input에 아직 `PENDING` row가 남아 있다. | P1 29건을 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정한다. |
| `WRITE_TEMPLATE_REQUIRES_NO_P2_PENDING_ROWS` | P2 input에 아직 `PENDING` row가 남아 있다. | 현재 P2 input row를 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정한다. |
| `WRITE_TEMPLATE_REQUIRES_NO_P3_P4_PENDING_ROWS` | P3/P4 input에 아직 `PENDING` row가 남아 있다. | P3/P4 52건을 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 모두 결정한다. |
| `APPROVED_ROWS_MUST_BE_SINGLE_BATCH` | 승인 row가 둘 이상의 batch에 섞여 있다. | 현재 batch의 승인 row만 남기고 나머지는 `PENDING`으로 되돌린다. |
| `APPROVED_ROWS_OUT_OF_PRIORITY_ORDER` | earlier batch가 열려 있는데 later batch에 승인 row가 있다. | `BATCH_1_P0`부터 순서대로 확정한다. |
| `BATCH_HAS_PENDING_ROWS` | 현재 batch 안에 아직 미결 row가 남아 있다. | row를 `APPROVED`, `REJECTED`, `NEEDS_RETRACE` 중 하나로 결정한다. |
| `WRITE_SMOKE_PRODUCTION_DATA_CHANGED` | smoke test가 production data를 건드렸다. | production write를 중단하고 smoke output을 먼저 조사한다. |

## Production Data Policy

- 외부 크롤링, 웹 검색, 추정 좌표로 대구 좌석 데이터를 보강하지 않는다.
- 공식 PNG 또는 운영자 corrected path 없이 좌표/path를 새로 확정하지 않는다.
- 운영자 승인 없이 어떤 블록도 `OFFICIAL_IMAGE_TRACED`로 승격하지 않는다.
- 실제 write는 `npm run stadium:daegu:operator-corrections-write`만 사용한다.
