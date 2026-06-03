# 사직 좌석도 휠체어석 marker-only 전환 설계

작성일: 2026-05-14 KST

## 2026-05-25 canonical 갱신

canonical runtime에서는 휠체어석 기존 공식 PNG pseudo-block 3개를 seat polygon으로 렌더링하지 않는다. `휠체어석-3루`, `휠체어석-중앙`, `휠체어석-1루`은 `CANONICAL_ACCESSIBILITY_MARKER_ALIAS`로만 유지하며 `runtimePolygon=false`다.

- canonical source: `SAJIK_CANONICAL_2026`
- runtime seat sections: `78`
- operator accessibility markers: `14`
- linked selectable markers: `8`
- official wheelchair marker aliases: `3`
- active polygon source per block guard: `npm run stadium:sajik:block-source-duplication-audit`

아래 기존 marker-only 전환 설계는 historical v2 설계 배경으로 보존한다. 새 작업에서는 canonical marker alias가 seat polygon으로 되돌아가지 않는지와, linked operator marker가 관련 seat section 선택을 과도하게 가로채지 않는지를 우선 검증한다.

## 현재 상태

사직 휠체어석 3개는 기존 선택 동작을 깨지 않기 위해 selectable block 호환성을 유지한다.
현재 runtime에서는 일반 seat polygon layer와 accessibility marker layer를 분리했으며, 완전 marker-only 데이터 모델 전환은 후속 PR로 남긴다.
다만 다음 metadata를 이미 가진다.

- `markerType: 'WHEELCHAIR'`
- `sectionKind: 'ACCESSIBILITY_MARKER'`
- dataset `markers[].relatedSectionId`

현재 목표는 layer 분리와 전환 준비다. 기존 상세 패널/검색/선택 호환성은 유지하고, 휠체어석을 `SEAT_SECTION` path layer에서 제거한 상태를 고정한다.

자동 리포트:

- JSON: `reports/stadium/sajik-seatmap-marker-transition-review.json`
- Markdown: `reports/stadium/sajik-seatmap-marker-transition-review.md`
- command: `node scripts/stadium-seatmap-ops.mjs sajik marker-transition-review`

현재 자동 리포트 기준:

- status: `passed`
- wheelchair markers: `3`
- wheelchair sections: `3`
- runtime seat path sections: `84`
- runtime accessibility markers: `3`
- runtime alias-only targets: `0`
- marker position/labelPoint lock: `3`
- selectable compatibility sections: `3`
- production layer split applied: `true`
- production selection contract changed: `false`
- marker-only applied: `false`
- blockers: `0`

## 전환 목표

현재 layer 분리 후에도 후속 marker-only 전환에서는 휠체어석을 데이터 모델 차원에서 일반 좌석 polygon과 더 분리한다.

- 지도 시각 요소: point marker
- 검색/리스트: 기존 휠체어석 alias 유지
- 상세 패널: marker 선택 시 관련 section 정보 표시
- keyboard 접근성: marker도 리스트와 keyboard selection으로 접근 가능
- 데이터셋: `sections`와 `markers` 관계 유지

## 유지해야 하는 계약

- 휠체어석 3개는 검색에서 계속 노출되어야 한다.
- `relatedSectionId`는 끊기면 안 된다.
- marker `position`은 관련 section의 `labelPoint`와 일치해야 한다.
- marker-only 데이터 모델 전환 전까지 휠체어석 3개는 `MAP_SELECTABLE` 상태를 유지해야 한다.
- 일반 seat path layer는 `SEAT_SECTION` 84개만 렌더링해야 한다.
- accessibility marker layer는 `ACCESSIBILITY_MARKER` 3개만 렌더링해야 한다.
- alias-only section은 runtime hit-area/marker로 렌더링하지 않아야 한다.
- marker-only 전환 후에도 tooltip/detail panel에는 구역명과 접근성 정보가 표시되어야 한다.
- marker가 일반 seat section polygon의 click/hover를 과도하게 가로채면 안 된다.
- 모바일에서 marker hit-area는 충분히 커야 하지만, 인접 좌석 섹션 선택을 방해하면 안 된다.

## 예상 구현 방향

1. 완료: `SajikSeatMapSvg`에서 `sectionKind === 'ACCESSIBILITY_MARKER'`를 일반 seat polygon render set에서 분리한다.
2. 완료: `markers` layer를 pointer event 가능 상태로 전환한다.
3. 완료: marker click/keyboard selection이 기존 `selectSection(section)` 흐름과 같은 상세 패널을 열도록 연결한다.
4. 완료: marker hit radius를 viewBox 좌표 기준으로 고정하고, CSS scale에 의존하지 않는다.
5. 후속: browser QA에 adjacent polygon non-interference 검사를 더 촘촘하게 추가한다.

## 후속 QA 항목

- 휠체어석 3개 marker가 화면에 표시된다.
- marker click으로 상세 패널이 열린다.
- 리스트 검색 `WHEELCHAIR` 또는 `휠체어`가 3개 항목을 찾는다.
- marker keyboard selection이 가능하다.
- 인접 일반 좌석 섹션 label click top-hit이 회귀하지 않는다.
- `npm run qa:stadium:sajik:polygon-v2`가 통과한다.

## 이번 PR에서 하지 않는 것

- 완전 marker-only 데이터 모델 전환
- 휠체어석 기존 selectable block 제거
- 좌석 상세 API 계약 변경
- marker 전용 스타일/애니메이션 추가
