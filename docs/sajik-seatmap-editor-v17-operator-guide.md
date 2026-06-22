# 사직 좌석도 editor v1.7 운영 가이드

작성일: 2026-05-14 KST

## 목적

`/internal/sajik-seatmap-editor`는 사직 공식 2026 PNG 기준 `manual-polygon-v2` 좌표를 검수하고 patch payload를 만드는 개발자용 내부 도구다.
production 사용자 UI가 아니며, 파일을 자동으로 수정하지 않는다.

## 접근 조건

- route: `/internal/sajik-seatmap-editor`
- 노출 조건: `import.meta.env.DEV`
- 기준 이미지: `src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.webp`
- 좌표계: `viewBox="0 0 960 640"`
- mapVersion: `BUSAN_SAJIK_2026_MANUAL_POLYGON_V2`

## 기본 사용 흐름

1. 검색창에서 `sectionId`, 좌석 카테고리, `WHEELCHAIR`, `hit-candidate`, `011` 같은 키워드로 섹션을 찾는다.
2. `visualPath`, `hitPath`, `labelPoint` 중 편집 대상을 선택한다.
3. vertex handle을 drag하거나, `1px/5px/10px` step nudge로 좌표를 보정한다.
4. 필요한 경우 `add`로 현재 vertex 뒤에 중간점을 추가하고, `delete`로 현재 vertex를 제거한다.
5. `PATCH PASS`와 `before != after` 상태를 확인한다.
6. JSON 또는 TS preview를 copy해서 사람이 `SAJIK_BLOCKS` 변경에 반영한다.
7. 반영 후 현재 public release gate인 `npm run qa:stadium:sajik:release-lock`를 실행한다.

## 편집 규칙

- `visualPath`는 공식 이미지 경계에 맞춘 실제 표시 polygon이다.
- `hitPath`는 터치/클릭 hit-area다. 현재 release lock에서는 승인된 별도 확장 좌표가 없으므로 기본값은 `visualPath`와 같다.
- `visualPath edit syncs hitPath`가 켜져 있고 두 path의 point count가 같으면, `visualPath` vertex 이동/add/delete가 `hitPath`에도 동기화된다.
- `labelPoint`는 라벨 및 keyboard/list selection 기준점이므로 polygon 내부 또는 1px 경계 허용 범위 안에 있어야 한다.
- vertex delete는 3점 미만 polygon을 만들 수 없다.

## validation FAIL fixture

`fail` 버튼은 선택 섹션의 `hitPath`를 의도적으로 작게 만들어 `HIT_POLYGON_TOO_SMALL`을 발생시키는 테스트 fixture다.
목적은 validator와 copy/export lock을 확인하는 것이다.

FAIL 상태에서는 다음이 유지되어야 한다.

- `PATCH FAIL` 표시
- `HIT_POLYGON_TOO_SMALL` issue 표시
- JSON copy 비활성화
- TS copy 비활성화
- reset current/all로 PASS 상태 복구 가능

## 산출물

editor regression은 다음 report를 재생성한다.

- `reports/stadium/sajik-seatmap-editor-regression.json`
- `reports/stadium/sajik-seatmap-editor-regression.md`

이 report는 PR 설명 근거로 사용하되, 기본적으로 재생성 가능한 산출물로 취급한다.

## 제한 사항

- editor는 파일 write를 하지 않는다.
- 좌표 자동 추출이나 외부 이미지/웹 검색 기반 보정은 하지 않는다.
- `011/903`은 alias-only 정책을 유지하며 지도 hit-area로 만들지 않는다.
- 휠체어석은 runtime accessibility marker layer로 렌더링하되 기존 selectable block 상세/검색 호환성을 유지한다. 완전 marker-only 데이터 모델 전환은 후속 PR로 분리한다.
- editor v1.8 구현은 후속 PR이며, 범위는 `docs/sajik-seatmap-editor-v18-roadmap.md`에서만 관리한다.

## 필수 검증

```bash
node scripts/stadium-seatmap-ops.mjs sajik editor-regression
npm run qa:stadium:sajik:polygon-v2
```
