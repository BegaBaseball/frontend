# 대구 MySeatCheck reference intake

작성일: 2026-05-23 KST

## 목적

사용자가 제공한 MySeatCheck 대구 삼성 라이온즈파크 좌석 배치도 페이지를 대구 좌석도 보조 reference source로 등록한다. 이 reference는 기존 공식 PNG release lock을 대체하지 않으며, production selectable polygon source로 승격하지 않는다.

## Source

- source id: `MYSEATCHECK_REFERENCE_2026`
- source page: `https://myseatcheck.com/%EB%8C%80%EA%B5%AC-%EC%82%BC%EC%84%B1-%EB%9D%BC%EC%9D%B4%EC%98%A8%EC%A6%88%ED%8C%8C%ED%81%AC/`
- source label: `자리어때 / MySeatCheck 대구 삼성 라이온즈파크 26시즌 좌석 배치도`
- required local asset: `src/assets/stadiums/samsung/daegu-myseatcheck-reference-2026.webp`
- current asset status: `EXTERNAL_REFERENCE_PENDING_ASSET`
- current polygon status: `REFERENCE_ONLY_PENDING_ASSET`
- attribution required: `true`
- production canonical: `false`

## Fetch result

직접 fetch 결과는 실제 이미지가 아니라 Cloudflare challenge 또는 이미지 저장 방지 HTML이었다. 이 상태에서 우회 다운로드를 하지 않는다. 운영자가 사용 권한을 가진 이미지 파일을 직접 제공하면 해당 파일의 natural size와 SHA-256을 기록한 뒤 다음 단계로 진행한다.

## 적용 원칙

- `DAEGU_SEATMAP_IMAGE`와 `PASS_RELEASE_177` release lock은 변경하지 않는다.
- `DAEGU_BLOCKS` 좌표는 공식 PNG 또는 operator-approved 좌표만 반영한다.
- MySeatCheck reference는 공식 PNG와 비교 검수 또는 누락 블럭 식별용 보조 evidence로만 사용한다.
- reference image를 production selectable seat layer에 연결하려면 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, `reviewedAt`이 채워진 별도 row가 필요하다.
- 외부 이미지의 좌표를 자동 승격하거나 기존 official polygon을 덮어쓰지 않는다.

## 다음 단계

1. 운영자가 사용 권한이 확인된 `daegu-myseatcheck-reference-2026.webp` 파일을 제공한다.
2. 파일 크기, natural dimensions, SHA-256을 기록한다.
3. `MYSEATCHECK_REFERENCE_2026`의 `imageWidth`, `imageHeight`, `viewBox`, `imageSha256`, `assetStatus`를 갱신한다.
4. reference-only preview 또는 operator approval workflow를 별도로 추가한다.
5. 승인 좌표가 없는 상태에서는 `REFERENCE_ONLY_PENDING_ASSET`을 유지한다.
