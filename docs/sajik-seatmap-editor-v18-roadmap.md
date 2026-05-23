# 사직 좌석도 editor v1.8 후속 계획

작성일: 2026-05-14 KST

## 목적

editor v1.8은 현재 `/internal/sajik-seatmap-editor` v1.7을 운영자가 실제 좌표 보정 PR에 더 안전하게 사용할 수 있도록 개선하는 후속 범위다.
이번 polygon v2+ release-lock PR에서는 v1.8을 구현하지 않고, 범위와 차단 조건만 고정한다.

## 현재 v1.7 기준

- DEV 전용 route: `/internal/sajik-seatmap-editor`
- 공식 PNG `960x640` viewBox 안에서 section overlay를 편집한다.
- `visualPath`, `hitPath`, `labelPoint` draft를 in-memory로 관리한다.
- vertex drag, step nudge, vertex add/delete, labelPoint edit mode를 지원한다.
- JSON/TS patch preview를 제공하지만 파일을 자동 수정하지 않는다.
- validation FAIL 상태에서는 JSON/TS copy/export를 막는다.
- hitPath 후보, wheelchair marker, alias-only section을 리스트/검색에서 구분한다.
- browser regression은 add/delete/drag/fail-lock/marker/alias 계약을 검증한다.

## v1.8 후보 기능

| 우선순위 | 기능 | 목적 | 이번 PR 처리 |
| --- | --- | --- | --- |
| P0 | before/after diff preview 강화 | 실제 좌표 변경점만 리뷰하기 쉽게 만든다 | 후속 PR |
| P0 | validator issue 상세 panel | `HIT_POLYGON_TOO_SMALL`, label outside, self-intersection 원인을 바로 확인한다 | 후속 PR |
| P0 | hitPath 후보 batch navigation | P0-A/P0-B/P0-C/P1-A/P1-B/P2-A 순서로 검수한다 | 후속 PR |
| P1 | marker transition view | 휠체어석 marker/section 호환 상태를 editor 안에서 확인한다 | 후속 PR |
| P1 | JSON/TS patch export UX 강화 | section별 patch를 더 안전하게 수동 적용한다 | 후속 PR |
| P2 | session draft import/export | 장시간 좌표 보정 작업을 브라우저 세션 밖으로 옮긴다 | 후속 PR |

## 계속 금지하는 범위

- editor가 `src/data/sajikSeatData.ts`를 직접 write하는 기능
- production 사용자 route 또는 navigation 노출
- 외부 검색, 크롤링, resized screenshot 기반 좌표 보정
- 승인되지 않은 실제 `hitPath` 확장 좌표 적용
- 완전 marker-only 데이터 모델 전환 및 기존 selectable block 제거

## v1.8 착수 전제

- `npm run stadium:sajik:hitpath-review`가 `expanded=1`, `approvedHitPathExpansionSectionIds=032`, `blockers=0`으로 통과해야 한다.
- `npm run stadium:sajik:marker-transition-review`가 `markerOnlyApplied=false`, `blockers=0`으로 통과해야 한다.
- `npm run stadium:sajik:editor-regression`이 v1.7 계약을 먼저 통과해야 한다.
- `npm run stadium:sajik:pr-scope-guard`가 v1.8 구현 파일을 이번 v2+ PR에 섞지 않아야 한다.

## 후속 PR 검증 기준

v1.8 구현 PR은 최소한 다음 검증을 별도 추가해야 한다.

- diff preview가 draft 변경 section만 보여준다.
- validator issue panel이 issue code, path kind, sectionId를 표시한다.
- batch navigation이 `docs/sajik-seatmap-hitpath-candidate-review.md`의 batch와 일치한다.
- marker transition view가 `reports/stadium/sajik-seatmap-marker-transition-review.json` 요약과 일치한다.
- 기존 v1.7 browser regression은 그대로 통과한다.

## 이번 PR 완료 기준

- v1.8 구현은 포함하지 않는다.
- v1.8 범위는 이 문서와 PR inventory에 후속 작업으로만 남긴다.
- release lock은 editor v1.7 동작과 review scripts를 현재 완료 기준으로 고정한다.
