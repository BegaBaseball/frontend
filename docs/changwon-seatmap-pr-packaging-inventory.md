# NC파크 좌석도 릴리즈 PR 패키징 인벤토리

작성일: 2026-05-12 KST

## 목적

NC파크 좌석도 release-lock 작업을 PR 가능한 단위로 분리하기 위한 변경 범위 인벤토리다.
현재 워크트리는 여러 구장 작업, 공통 seatmap shell 작업, 예측/SEO 작업이 함께 섞여 있으므로 그대로 한 PR에 올리면 리뷰 범위가 과도해진다.

## 현재 상태 요약

- `bega_frontend` git repo 기준으로 staged 변경과 unstaged 변경이 섞여 있다.
- `output/playwright/stadium-ux-audit.mjs`는 repo 밖 파일이므로 PR에 포함되지 않는다.
- QA audit 실행 진입점은 repo 내부 `scripts/stadium-ux-audit.mjs`로 승격했다.
- 외부 `../output/playwright/stadium-ux-audit.mjs` 참조는 `package.json`, `scripts`, `src`에서 제거했다.
- NC 좌표/polygon 데이터는 이번 패키징 단계에서 추가 변경하지 않았다.

## 추천 PR 구성

### PR A: NC release-lock + seatmap QA infra

이 PR을 우선 추천한다. NC release 상태와 브라우저 QA 재현성을 같이 고정한다.

| 경로 | 포함 판단 | 이유 |
| --- | --- | --- |
| `docs/changwon-seatmap-release-lock.md` | 포함 | 최종 release-lock 수치, QA source, 검증 결과 고정 |
| `docs/changwon-seatmap-release-candidate.md` | 포함 | release-lock의 근거가 되는 후보 문서 |
| `scripts/changwon-seatmap-ops.mjs trace-manifest` | 포함 | trace manifest, visual approval 산출물 생성 |
| `scripts/changwon-seatmap-ops.mjs ux-readiness` | 포함 | NC 검색/필터/특수구역 readiness report 생성 |
| `scripts/stadium-ux-audit.mjs` | 포함 | repo 내부 브라우저 QA 실행 원본 |
| `scripts/run-stadium-isolated-qa.mjs` | 포함 | isolated QA runner, port retry, internal audit script 경로 |
| `package.json` | 부분 포함 | Changwon scripts, attached QA internal path, seatmap test concurrency만 선별 필요 |
| `src/components/changwon/ChangwonSeatMap.tsx` | 포함 | NC 검색/필터/상세 패널 UX |
| `src/components/changwon/ChangwonBottomSheet.tsx` | 포함 | 모바일 선택 상태 노출 |
| `src/components/changwon/ChangwonSeatMapSvg.tsx` | 포함 | hit-area/render 계약 |
| `src/data/changwonSeatData.ts` | 포함 | NC release-lock 데이터와 helper 계약 |
| `src/data/changwonSeatData.test.ts` | 포함 | NC 좌표 fingerprint, search/filter/top-hit 계약 |
| `src/components/StadiumGuideRuntimeSeatMaps.test.ts` | 부분 포함 | Changwon release-lock, internal audit source, runner 계약 |
| `src/data/suwonSeatData.test.ts` | 포함 또는 PR A 보조 | audit script 경로가 repo 내부로 바뀐 cross-stadium 계약 |

주의: `package.json`과 `StadiumGuideRuntimeSeatMaps.test.ts`는 대구/대전/광주/사직 작업도 포함한 혼합 파일이다. PR A만 만들려면 `git add -p` 또는 별도 작업트리에서 선택 staging이 필요하다.

### PR B: 전체 seatmap gate 복구용 최소 보정

PR A 검증 중 드러난 기존 dirty-state blocker를 해소한 최소 변경이다. PR A에 포함해도 되지만, 리뷰 부담을 낮추려면 선행 또는 후속 PR로 분리할 수 있다.

| 경로 | 포함 판단 | 이유 |
| --- | --- | --- |
| `src/data/daeguSeatData.ts` | 포함 후보 | T3-2/T3-3/TC-2 top-hit 및 trace contract gate 복구 |
| `src/data/daejeonSeatData.test.ts` | 포함 후보 | anchor crop 계약이 `daejeon-seatmap-anchor-contract.mjs`로 분리된 구조 반영 |
| `src/data/sajikSeatData.ts` | 포함 후보 | 현재 polygon 기준 trace reference와 label top-hit gate 복구 |
| `scripts/daejeon-seatmap-anchor-contract.mjs` | 포함 후보 | 대전 anchor crop contract 원본 |
| `scripts/daejeon-seatmap-ops.mjs` | 포함 후보 | 대전 anchor crop 산출물 생성 |
| `scripts/daejeon-seatmap-ops.mjs` | 포함 후보 | 대전 manifest coordinate impact 계약 |

### PR C 이후: 구장별 운영자 패키지/재트레이싱 작업

아래 변경들은 NC release-lock과 직접 묶지 않는 것이 좋다.

| 범위 | 대표 파일 | 권장 처리 |
| --- | --- | --- |
| Daegu operator workflow | `scripts/daegu-seatmap-*`, `docs/daegu-*`, `src/components/daegu/*`, `src/data/daegu*` | 별도 Daegu PR |
| Daejeon release gate/operator approval | `scripts/daejeon-*`, `docs/daejeon-seatmap-release-lock.md`, `src/data/daejeon*` | 별도 Daejeon PR |
| Gwangju operator workflow | `scripts/gwangju-*`, `docs/gwangju-*`, `src/components/gwangju/*`, `src/data/gwangju*` | 별도 Gwangju PR |
| Sajik advisory/release lock | `scripts/sajik-*`, `docs/sajik-seatmap-release-lock.md`, `src/components/sajik/*`, `src/data/sajik*` | 별도 Sajik PR |
| Common seatmap shell migration | `src/components/stadiumSeatMap/*`, `src/components/stadiumSeatMapRegistry.tsx`, deleted `src/components/ui/stadiumSeatMapModel*` | 별도 infra PR |
| Prediction/schedule changes | `src/components/prediction/*`, `src/hooks/usePredictionSchedule.ts`, `src/api/prediction*` | 별도 feature PR |
| SEO/favicon/build guard changes | `index.html`, `public/favicon.png`, `src/seo/SeoHead.tsx`, `scripts/bundle-guard.mjs` | 별도 SEO/build PR |

## 산출물 포함 기준

| 산출물 | 권장 |
| --- | --- |
| `reports/stadium/changwon-*` | release evidence로 필요할 때만 force-add 검토. 기본은 재생성 가능한 산출물로 취급 |
| `reports/bundle-guard-report.json` | build report가 repo에서 추적 중이면 build PR에 포함. NC PR에는 보통 제외 |
| `reports/dist-assets-report.json` | build report가 repo에서 추적 중이면 build PR에 포함. NC PR에는 보통 제외 |
| `output/playwright/*` | repo 밖/미추적 검증 산출물. PR에는 포함하지 않고 결과 경로만 PR 설명에 기록 |
| `dist/*` | build output. PR 포함 대상 아님 |

## 혼합 파일 분리 메모

- `package.json`
  - PR A 포함: `stadium:changwon:*`, `qa:stadium:changwon:*`, `qa:stadium:mobile:attached`, `qa:stadium:mobile:smoke:attached`, `test:stadium:seatmaps` concurrency.
  - 분리 권장: Daegu/Daejeon/Gwangju/Sajik operator scripts.
- `scripts/run-stadium-isolated-qa.mjs`
  - staged 신규 파일이며, unstaged로 internal audit path와 retry/summary clean 보강이 추가되어 있다.
  - PR A에서 이 runner를 소유하는 것이 가장 깔끔하다.
- `src/components/StadiumGuideRuntimeSeatMaps.test.ts`
  - PR A 포함: Changwon release-lock, internal audit script, runner/attached QA source 계약.
  - 분리 권장: Daejeon, Daegu, Gwangju, Sajik release/operator 계약.
- `src/data/*SeatData.test.ts`
  - PR A 포함 필요: `changwonSeatData.test.ts`, `suwonSeatData.test.ts`의 audit path contract.
  - PR B 포함 후보: `daejeonSeatData.test.ts`, `sajikSeatData.ts`, `daeguSeatData.ts`.

## 최신 검증 상태

- `node --check scripts/stadium-ux-audit.mjs`: PASS
- `node --check scripts/run-stadium-isolated-qa.mjs`: PASS
- `node --import tsx --test src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS, 30/30
- `node --import tsx --test src/data/sajikSeatData.test.ts`: PASS, 17/17
- `npm run test:stadium:seatmaps`: PASS, 219/219
- `npm run qa:stadium:changwon:trace-review`: PASS, `CHANGWON:mobile passed after 232s port=5199`
- `npm run build`: PASS

기존 Vite warning:

- `src/utils/clientErrorReporter.ts`가 dynamic import와 static import 양쪽에서 참조된다는 warning은 남아 있다.
- 현재 release-lock 기준에서는 exit code 0이면 차단 조건으로 보지 않는다.

## 다음 실행 순서

1. PR A 범위를 확정한다.
2. `package.json`, `StadiumGuideRuntimeSeatMaps.test.ts`는 선택 staging으로 NC/QA infra 부분만 분리한다.
3. PR B를 같은 PR에 포함할지 별도 PR로 분리할지 결정한다.
4. PR A 범위만 남긴 상태에서 `npm run test:stadium:seatmaps`, `npm run qa:stadium:changwon:trace-review`, `npm run build`를 재실행한다.
5. PR 설명에는 NC 좌표 변경 없음, internal QA script 승격, release-lock 수치, 최신 검증 결과를 기록한다.
