# 대구 좌석도 operator corrections archive

상태: historical only

이 문서는 대구 좌석도 정리 전의 operator-corrections, p0/p1/p2/p3-p4, missing-block, visual-match 단계별 workflow를 대체하지 않는다. 해당 스크립트와 package alias는 working tree에서 삭제되었고, 재실행이 필요하면 Git history에서 복구해 별도 branch에서 검토한다.

## 현재 canonical 진입점

현재 대구 좌석도 검수는 아래 public command만 사용한다.

- `npm run qa:stadium:daegu:mobile`
- `npm run qa:stadium:daegu:full`
- `npm run qa:stadium:daegu:release-lock`
- `npm run stadium:daegu:status`
- `npm run stadium:daegu:pixel-components`
- `npm run stadium:daegu:trace-manifest`
- `npm run stadium:daegu:alignment-audit`
- `npm run stadium:daegu:operator-handoff`
- `npm run stadium:daegu:handoff-evidence`
- `npm run stadium:daegu:source-baseline-audit`
- `npm run stadium:daegu:canonical-decision-table`
- `npm run stadium:daegu:qa-ownership-audit`
- `npm run stadium:daegu:canonical-block-decision-guard`
- `npm run stadium:daegu:canonical-official-only-retrace-workset`
- `npm run stadium:daegu:canonical-retrace-batch -- <batchKey>`
- `npm run stadium:daegu:canonical-retrace-gate -- <batchKey>`
- `npm run stadium:daegu:canonical-retrace-gate:require-approved -- <batchKey>`
- `npm run stadium:daegu:precision-audit`
- `npm run stadium:daegu:render-safety-audit`

## Retained source files

- `scripts/daegu-seatmap-ops.mjs`
- `scripts/daegu-seatmap-core-qa.mjs`
- `scripts/daegu-seatmap-source-baseline-audit.mjs`
- `scripts/daegu-seatmap-canonical-decision-table.mjs`
- `scripts/daegu-seatmap-qa-ownership-audit.mjs`
- `scripts/daegu-seatmap-canonical-block-decision-guard.mjs`
- `scripts/daegu-seatmap-canonical-official-only-retrace-workset.mjs`
- `scripts/daegu-seatmap-canonical-retrace-batch.mjs`
- `scripts/daegu-seatmap-precision-audit.mjs`
- `scripts/daegu-seatmap-render-safety-audit.mjs`

## Recovery policy

- 삭제된 historical 단계별 스크립트는 신규 운영 절차로 간주하지 않는다.
- 삭제된 산출물 재생성이 필요한 경우 먼저 Git history에서 해당 시점의 스크립트와 입력 파일을 확인한다.
- 복구 branch에서는 `package.json` public command로 바로 재노출하지 말고, canonical/runtime release 계약과 충돌 여부를 먼저 검토한다.
- 외부 야구 데이터 crawling, web search 기반 보강, 자동 좌표 합성은 금지한다.

## 권장 검증

- `npm run test:stadium:seatmaps`
- `npm run qa:stadium:daegu:mobile`
- `npm run qa:stadium:daegu:full`
- `npm run qa:stadium:daegu:release-lock`
