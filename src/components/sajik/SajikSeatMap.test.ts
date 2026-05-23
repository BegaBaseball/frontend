import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import SajikSeatMap from './SajikSeatMap';
import SajikSeatMapEditor from './SajikSeatMapEditor';
import SajikSeatMapSvg from './SajikSeatMapSvg';
import { SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET } from '../../data/sajikOperatorReferenceSeatMapDataset';

test('SajikSeatMap은 1151x1367 기준 좌석도를 기본 source로 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SajikSeatMap)));
  const componentSource = readFileSync(resolve(process.cwd(), 'src/components/sajik/SajikSeatMap.tsx'), 'utf8');
  const previewBlockMatches = html.match(/<path[^>]+data-testid="sajik-operator-reference-preview-block-/g) ?? [];
  const previewMarkerMatches = html.match(/<circle[^>]+data-testid="sajik-operator-reference-preview-marker-/g) ?? [];

  assert.match(html, /data-testid="stadium-seat-map"/);
  assert.match(html, /부산 사직야구장/);
  assert.match(html, /사직 기준 좌석도/);
  assert.match(html, /data-testid="sajik-seatmap-source-tabs"/);
  assert.match(html, /data-testid="sajik-seatmap-source-OPERATOR_REFERENCE_2026"/);
  assert.match(html, /data-testid="sajik-seatmap-source-LOTTE_OFFICIAL_2026"/);
  assert.match(html, /data-source-kind="REFERENCE_IMAGE"/);
  assert.match(html, /data-polygon-status="PRODUCTION_INTERACTIVE"/);
  assert.match(html, /data-testid="sajik-reference-seatmap-panel"/);
  assert.match(html, /data-reference-interactive-preview="true"/);
  assert.match(html, /data-testid="sajik-reference-seatmap-svg"/);
  assert.match(html, /viewBox="0 0 1151 1367"/);
  assert.match(html, /sajik-seatmap-operator-reference-2026\.png/);
  assert.match(html, /data-testid="sajik-operator-reference-preview-layer"/);
  assert.equal(previewBlockMatches.length, SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.sections);
  assert.equal(previewMarkerMatches.length, SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.markers);
  assert.match(html, /기준 좌석도 선택 레이어입니다\. 78개 구역이 사직 메타데이터와 연결되어 있고 0개 구역은 메타데이터 보강이 필요합니다\. 접근성 원형 마커 8개는 관련 구역 선택으로 연결됩니다\./);
  assert.doesNotMatch(html, /처음 사직 가이드/);
  assert.doesNotMatch(html, /블록\/좌석 검색/);
  assert.doesNotMatch(html, /data-testid="sajik-seat-block-/);
  assert.doesNotMatch(html, /data-testid="sajik-accessibility-marker-/);
  assert.doesNotMatch(html, /<svg[^>]+viewBox="0 0 960 640"/);
  assert.match(html, /롯데자이언츠 공식 좌석안내 2026 시즌/);
  assert.doesNotMatch(html, /외부 시야 참고/);
  assert.doesNotMatch(html, /sajik-myseatcheck-link/);
  assert.doesNotMatch(html, /sajik-myseatcheck-section-link-/);
  assert.doesNotMatch(html, /자리어때 시야 보기/);
  assert.match(componentSource, /setZoom\(MIN_ZOOM\)/);
  assert.match(componentSource, /setPan\(\{ x: 0, y: 0 \}\)/);
  assert.match(componentSource, /setSelected\(null\)/);
  assert.match(componentSource, /setHover\(null\)/);
  assert.match(componentSource, /다이어리에서 시야 사진을 공유|다이어리에서 시야 사진 공유하기/);
  assert.doesNotMatch(html, /data-testid="sajik-official-seatmap-required"/);
  assert.doesNotMatch(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.doesNotMatch(html, /SAJIK SEAT VIEW/);
  assert.doesNotMatch(html, /사진은 데모 상태/);
});

test('SajikSeatMapSvg는 secondary 공식 source에서 기존 960x640 polygon layer를 유지한다', () => {
  const html = renderToStaticMarkup(createElement(SajikSeatMapSvg, {
    mode: 'light',
    seatMapSourceId: 'LOTTE_OFFICIAL_2026',
    onSeatMapSourceChange: () => undefined,
    selected: null,
    setSelected: () => undefined,
    hover: null,
    setHover: () => undefined,
    filterCats: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    onPanChange: () => undefined,
    onZoom: () => undefined,
    minZoom: 1,
    maxZoom: 2.5,
    zoomStep: 0.25,
  }));
  const svgSource = readFileSync(resolve(process.cwd(), 'src/components/sajik/SajikSeatMapSvg.tsx'), 'utf8');
  const seatPathMatches = html.match(/data-testid="sajik-seat-block-/g) ?? [];
  const accessibilityMarkerMatches = html.match(/data-testid="sajik-accessibility-marker-/g) ?? [];

  assert.match(html, /data-seat-path-count="84"/);
  assert.match(html, /<svg[^>]+viewBox="0 0 960 640"/);
  assert.match(html, /<image[^>]+href="[^"]*sajik-lotte-seatmap-official-2026\.png"/);
  assert.match(html, /<image[^>]+width="960"[^>]+height="640"/);
  assert.doesNotMatch(html, /<img[^>]+src="[^"]*sajik-lotte-seatmap-official-2026\.png"/);
  assert.match(html, /data-section-kind="ACCESSIBILITY_MARKER"/);
  assert.match(html, /data-marker-type="WHEELCHAIR"/);
  assert.match(html, /data-testid="sajik-seat-section-layer"/);
  assert.match(html, /data-layer="seat-sections"/);
  assert.match(html, /data-testid="sajik-accessibility-markers-layer"/);
  assert.match(html, /data-layer="accessibility-markers"/);
  assert.match(html, /data-marker-count="3"/);
  assert.equal(seatPathMatches.length, 84);
  assert.equal(accessibilityMarkerMatches.length, 3);
  assert.match(html, /<path[^>]*data-section-kind="ACCESSIBILITY_MARKER"/);
  assert.doesNotMatch(html, /<circle[^>]*data-testid="sajik-accessibility-marker-/);
  assert.match(html, /data-visual-path=/);
  assert.match(html, /data-hit-path=/);
  assert.doesNotMatch(html, /sajik-seat-block-sajik-avenuel-011/);
  assert.doesNotMatch(html, /sajik-seat-block-sajik-everytime-903/);
  assert.doesNotMatch(html, /sajik-accessibility-marker-sajik-avenuel-011/);
  assert.doesNotMatch(html, /sajik-accessibility-marker-sajik-everytime-903/);
  assert.match(svgSource, /SAJIK_SEATMAP_IMAGE\.renderImagePath \?\? SAJIK_SEATMAP_IMAGE\.imagePath/);
  assert.doesNotMatch(svgSource, /\?\? block\.imageGeometry\.d/);
  assert.match(html, /sajik-lotte-seatmap-official-2026\.png/);
  assert.doesNotMatch(html, /data-testid="sajik-official-seatmap-required"/);
  assert.doesNotMatch(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.doesNotMatch(html, /SAJIK SEAT VIEW/);
  assert.doesNotMatch(html, /사진은 데모 상태/);
});

test('SajikSeatMapSvg는 operator reference source에서 공개 선택 미리보기 layer를 기본 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(SajikSeatMapSvg, {
    mode: 'light',
    seatMapSourceId: 'OPERATOR_REFERENCE_2026',
    onSeatMapSourceChange: () => undefined,
    selected: null,
    setSelected: () => undefined,
    hover: null,
    setHover: () => undefined,
    filterCats: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    onPanChange: () => undefined,
    onZoom: () => undefined,
    minZoom: 1,
    maxZoom: 2.5,
    zoomStep: 0.25,
  }));
  const previewBlockMatches = html.match(/<path[^>]+data-testid="sajik-operator-reference-preview-block-/g) ?? [];
  const previewMarkerMatches = html.match(/<circle[^>]+data-testid="sajik-operator-reference-preview-marker-/g) ?? [];

  assert.match(html, /data-testid="sajik-reference-seatmap-panel"/);
  assert.match(html, /data-source-id="OPERATOR_REFERENCE_2026"/);
  assert.match(html, /data-source-kind="REFERENCE_IMAGE"/);
  assert.match(html, /data-polygon-status="PRODUCTION_INTERACTIVE"/);
  assert.match(html, /data-testid="sajik-reference-seatmap-image"/);
  assert.match(html, /data-testid="sajik-reference-seatmap-svg"/);
  assert.match(html, /viewBox="0 0 1151 1367"/);
  assert.match(html, /sajik-seatmap-operator-reference-2026\.png/);
  assert.match(html, /data-testid="sajik-operator-reference-preview-layer"/);
  assert.match(html, /data-runtime-selection-enabled="reference-preview"/);
  assert.equal(previewBlockMatches.length, SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.sections);
  assert.equal(previewMarkerMatches.length, SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.markers);
  assert.doesNotMatch(html, /data-testid="sajik-seat-block-/);
  assert.doesNotMatch(html, /data-testid="sajik-accessibility-marker-/);
  assert.doesNotMatch(html, /data-testid="sajik-operator-reference-block-/);
  assert.doesNotMatch(html, /data-testid="sajik-operator-reference-marker-/);
  assert.doesNotMatch(html, /data-testid="sajik-seatmap-zoom-in"/);
  assert.doesNotMatch(html, /<svg[^>]+viewBox="0 0 960 640"/);
});

test('SajikSeatMapSvg는 operator reference debug overlay에서 approved polygon을 선택 불가 레이어로 표시한다', () => {
  const html = renderToStaticMarkup(createElement(SajikSeatMapSvg, {
    mode: 'light',
    seatMapSourceId: 'OPERATOR_REFERENCE_2026',
    onSeatMapSourceChange: () => undefined,
    selected: null,
    setSelected: () => undefined,
    hover: null,
    setHover: () => undefined,
    filterCats: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    onPanChange: () => undefined,
    onZoom: () => undefined,
    minZoom: 1,
    maxZoom: 2.5,
    zoomStep: 0.25,
    showOperatorReferenceDebugOverlay: true,
  }));
  const operatorBlockMatches = html.match(/<path[^>]+data-testid="sajik-operator-reference-block-/g) ?? [];
  const operatorMarkerMatches = html.match(/<circle[^>]+data-testid="sajik-operator-reference-marker-[^"]+"[^>]*>/g) ?? [];

  assert.match(html, /data-testid="sajik-operator-reference-debug-overlay"/);
  assert.match(html, /data-overlay-kind="operator-reference-approved-polygons"/);
  assert.match(html, /data-runtime-selection-enabled="false"/);
  assert.match(html, /data-testid="sajik-operator-reference-section-layer"/);
  assert.match(html, /data-testid="sajik-operator-reference-marker-layer"/);
  assert.match(html, /pointer-events="none"/);
  assert.match(html, /data-testid="sajik-operator-reference-marker-stage03-wheelchair-05"[^>]+data-marker-interaction-status="LINKED_SECTION_SELECTABLE"[^>]+data-related-section-id="323"/);
  assert.equal(operatorBlockMatches.length, SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.sections);
  assert.equal(operatorMarkerMatches.length, SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.markers);
  assert.doesNotMatch(html, /data-testid="sajik-seat-block-/);
  assert.doesNotMatch(html, /data-testid="sajik-accessibility-marker-/);
  assert.equal(operatorMarkerMatches.filter((markerTag) => /role="button"/.test(markerTag)).length, 0);
});

test('SajikSeatMapSvg는 operator reference interactive preview를 reference-preview runtime 계약으로 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(SajikSeatMapSvg, {
    mode: 'light',
    seatMapSourceId: 'OPERATOR_REFERENCE_2026',
    onSeatMapSourceChange: () => undefined,
    selected: null,
    setSelected: () => undefined,
    hover: null,
    setHover: () => undefined,
    filterCats: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    onPanChange: () => undefined,
    onZoom: () => undefined,
    minZoom: 1,
    maxZoom: 2.5,
    zoomStep: 0.25,
    enableOperatorReferenceInteractivePreview: true,
  }));
  const previewBlockMatches = html.match(/<path[^>]+data-testid="sajik-operator-reference-preview-block-/g) ?? [];
  const previewMarkerMatches = html.match(/<circle[^>]+data-testid="sajik-operator-reference-preview-marker-[^"]+"[^>]*>/g) ?? [];
  const linkedRoleMatches = html.match(/<path[^>]+role="button"[^>]+data-testid="sajik-operator-reference-preview-block-/g) ?? [];
  const linkedMarkerRoleMatches = previewMarkerMatches.filter((markerTag) => /role="button"/.test(markerTag));

  assert.match(html, /data-testid="sajik-reference-seatmap-panel"/);
  assert.match(html, /data-reference-interactive-preview="true"/);
  assert.match(html, /data-testid="sajik-operator-reference-preview-layer"/);
  assert.match(html, /data-overlay-kind="operator-reference-interactive-preview"/);
  assert.match(html, /data-runtime-selection-enabled="reference-preview"/);
  assert.match(html, /data-linked-section-count="78"/);
  assert.match(html, /data-metadata-missing-count="0"/);
  assert.match(html, /data-marker-policy="display-only-with-linked-section-markers"/);
  assert.match(html, /data-testid="sajik-operator-reference-preview-marker-layer"[^>]+data-runtime-selection-enabled="linked-section-selectable"[^>]+data-linked-marker-count="8"/);
  assert.match(html, /role="button"[^>]+aria-label="1루 내야상단석 137블록 137 접근성 marker"[^>]+data-testid="sajik-operator-reference-preview-marker-stage02-wheelchair-01"[^>]+data-marker-interaction-status="LINKED_SECTION_SELECTABLE"[^>]+data-related-section-id="137"/);
  assert.match(html, /role="button"[^>]+aria-label="1루 내야상단석 125블록 125 접근성 marker"[^>]+data-testid="sajik-operator-reference-preview-marker-stage02-wheelchair-03"[^>]+data-marker-interaction-status="LINKED_SECTION_SELECTABLE"[^>]+data-related-section-id="125"/);
  assert.match(html, /role="button"[^>]+aria-label="1루 내야상단석 135블록 135 접근성 marker"[^>]+data-testid="sajik-operator-reference-preview-marker-stage02-wheelchair-04"[^>]+data-marker-interaction-status="LINKED_SECTION_SELECTABLE"[^>]+data-related-section-id="135"/);
  assert.match(html, /role="button"[^>]+aria-label="1루 내야상단석 132블록 132 접근성 marker"[^>]+data-testid="sajik-operator-reference-preview-marker-stage02-wheelchair-09"[^>]+data-marker-interaction-status="LINKED_SECTION_SELECTABLE"[^>]+data-related-section-id="132"/);
  assert.match(html, /role="button"[^>]+aria-label="3루 내야필드석A 325블록 325 접근성 marker"[^>]+data-testid="sajik-operator-reference-preview-marker-stage03-wheelchair-01"[^>]+data-marker-interaction-status="LINKED_SECTION_SELECTABLE"[^>]+data-related-section-id="325"/);
  assert.match(html, /role="button"[^>]+aria-label="3루 내야상단석A 335블록 335 접근성 marker"[^>]+data-testid="sajik-operator-reference-preview-marker-stage03-wheelchair-02"[^>]+data-marker-interaction-status="LINKED_SECTION_SELECTABLE"[^>]+data-related-section-id="335"/);
  assert.match(html, /role="button"[^>]+aria-label="3루 내야상단석A 333블록 333 접근성 marker"[^>]+data-testid="sajik-operator-reference-preview-marker-stage03-wheelchair-04"[^>]+data-marker-interaction-status="LINKED_SECTION_SELECTABLE"[^>]+data-related-section-id="333"/);
  assert.match(html, /role="button"[^>]+aria-label="3루 내야상단석A 323블록 323 접근성 marker"[^>]+data-testid="sajik-operator-reference-preview-marker-stage03-wheelchair-05"[^>]+data-marker-interaction-status="LINKED_SECTION_SELECTABLE"[^>]+data-related-section-id="323"/);
  assert.match(html, /data-testid="sajik-operator-reference-preview-marker-stage02-wheelchair-01"[^>]+data-hit-target-radius="26"[^>]+data-visual-radius="14"/);
  assert.match(html, /data-testid="sajik-operator-reference-preview-marker-stage02-wheelchair-03"[^>]+data-hit-target-radius="26"[^>]+data-visual-radius="14"/);
  assert.match(html, /data-testid="sajik-operator-reference-preview-marker-stage03-wheelchair-01"[^>]+data-hit-target-radius="26"[^>]+data-visual-radius="14"/);
  assert.match(html, /data-testid="sajik-operator-reference-linked-marker-visual-stage02-wheelchair-01"[^>]+pointer-events="none"/);
  assert.match(html, /data-testid="sajik-operator-reference-linked-marker-visual-stage02-wheelchair-03"[^>]+pointer-events="none"/);
  assert.match(html, /data-testid="sajik-operator-reference-linked-marker-visual-stage03-wheelchair-01"[^>]+pointer-events="none"/);
  assert.match(html, /data-testid="sajik-operator-reference-preview-marker-stage02-wheelchair-02"[^>]+data-marker-interaction-status="DISPLAY_ONLY"[^>]+data-related-section-id="127"/);
  assert.equal(previewBlockMatches.length, SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.sections);
  assert.equal(previewMarkerMatches.length, SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.markers);
  assert.equal(linkedRoleMatches.length, 78);
  assert.equal(linkedMarkerRoleMatches.length, 8);
  assert.match(html, /data-testid="sajik-operator-reference-preview-block-021"[^>]+data-metadata-status="linked"/);
  assert.match(html, /data-testid="sajik-operator-reference-preview-block-323"[^>]+data-metadata-status="linked"/);
  assert.match(html, /3루 내야상단석A 323블록 323 reference preview/);
  assert.match(html, /data-testid="sajik-operator-reference-preview-block-921"[^>]+data-metadata-status="linked"/);
  assert.match(html, /기준 좌석도 선택 레이어입니다\. 78개 구역이 사직 메타데이터와 연결되어 있고 0개 구역은 메타데이터 보강이 필요합니다\. 접근성 원형 마커 8개는 관련 구역 선택으로 연결됩니다\./);
  assert.doesNotMatch(html, /data-testid="sajik-seat-block-/);
  assert.doesNotMatch(html, /data-testid="sajik-accessibility-marker-/);
  assert.doesNotMatch(html, /role="button"[^>]+data-testid="sajik-operator-reference-preview-marker-stage02-wheelchair-02"/);
});

test('SajikSeatMapEditor는 dev-only editor/export shell 계약을 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(SajikSeatMapEditor));

  assert.match(html, /data-testid="sajik-seatmap-editor"/);
  assert.match(html, /Internal seatmap editor v1.7/);
  assert.match(html, /data-summary-total-sections="89"/);
  assert.match(html, /data-summary-enabled-sections="87"/);
  assert.match(html, /data-summary-alias-only-sections="2"/);
  assert.match(html, /data-summary-markers="3"/);
  assert.match(html, /data-testid="sajik-editor-svg"/);
  assert.match(html, /viewBox="0 0 960 640"/);
  assert.match(html, /data-testid="sajik-editor-official-image"/);
  assert.match(html, /data-testid="sajik-editor-section-112"/);
  assert.match(html, /data-testid="sajik-editor-marker-/);
  assert.match(html, /data-testid="sajik-editor-draft-controls"/);
  assert.match(html, /data-testid="sajik-editor-draft-status"/);
  assert.match(html, /draft clean/);
  assert.match(html, /data-testid="sajik-editor-dirty-section-summary"/);
  assert.match(html, /dirty sections: none/);
  assert.match(html, /data-testid="sajik-editor-hitpath-diff-status"/);
  assert.match(html, /hitPath matches visualPath/);
  assert.match(html, /data-testid="sajik-editor-path-kind-visualPath"/);
  assert.match(html, /data-testid="sajik-editor-path-kind-hitPath"/);
  assert.match(html, /data-testid="sajik-editor-path-kind-labelPoint"/);
  assert.match(html, /data-testid="sajik-editor-sync-hitpath"/);
  assert.match(html, /data-testid="sajik-editor-vertex-index-input"/);
  assert.match(html, /data-testid="sajik-editor-nudge-step"/);
  assert.match(html, /data-testid="sajik-editor-selected-vertex"/);
  assert.match(html, /data-testid="sajik-editor-nudge-x-plus"/);
  assert.match(html, /data-testid="sajik-editor-add-vertex-after"/);
  assert.match(html, /data-testid="sajik-editor-delete-vertex"/);
  assert.match(html, /data-testid="sajik-editor-invalid-hitpath-fixture"/);
  assert.match(html, /data-testid="sajik-editor-reset-draft"/);
  assert.match(html, /data-testid="sajik-editor-reset-all-drafts"/);
  assert.match(html, /data-testid="sajik-editor-vertex-handle-visualPath-0"/);
  assert.match(html, /data-testid="sajik-editor-validator-pass"/);
  assert.match(html, /VALIDATOR PASS/);
  assert.match(html, /data-testid="sajik-editor-visualpath-validator-pass"/);
  assert.match(html, /data-testid="sajik-editor-hitpath-validator-pass"/);
  assert.match(html, /data-testid="sajik-editor-section-status-112"/);
  assert.match(html, />enabled</);
  assert.match(html, /data-testid="sajik-editor-section-status-011"/);
  assert.match(html, />alias-only</);
  assert.match(html, />wheelchair</);
  assert.match(html, /data-testid="sajik-editor-section-hit-candidate-021"/);
  assert.match(html, />hit</);
  assert.match(html, /data-testid="sajik-editor-before-after-status"/);
  assert.match(html, /before = after/);
  assert.match(html, /data-testid="sajik-editor-copy-status"/);
  assert.match(html, /copy: idle/);
  assert.match(html, /data-testid="sajik-editor-copy-json"/);
  assert.match(html, /data-testid="sajik-editor-copy-ts"/);
  assert.match(html, /data-testid="sajik-editor-patch-status-pass"/);
  assert.match(html, /PATCH PASS/);
  assert.match(html, /data-testid="sajik-editor-patch-json"/);
  assert.match(html, /SAJIK_SECTION_GEOMETRY_PATCH_PREVIEW/);
  assert.match(html, /&quot;before&quot;/);
  assert.match(html, /&quot;after&quot;/);
  assert.match(html, /&quot;validation&quot;/);
  assert.match(html, /&quot;status&quot;: &quot;PASS&quot;/);
  assert.match(html, /data-testid="sajik-editor-ts-patch"/);
  assert.match(html, /geometry patch preview/);
  assert.match(html, /data-testid="sajik-editor-selected-json"/);
  assert.match(html, /&quot;sectionId&quot;: &quot;112&quot;/);
  assert.match(html, /data-testid="sajik-editor-dataset-json"/);
  assert.match(html, /BUSAN_SAJIK_2026_MANUAL_POLYGON_V2/);
});

test('SajikSeatMapEditor route는 production navigation에 노출되지 않는 dev-only 내부 route다', () => {
  const appRoutesSource = readFileSync(resolve(process.cwd(), 'src/components/AppRoutes.tsx'), 'utf8');
  const publicNavSource = readFileSync(resolve(process.cwd(), 'src/components/publicNavbarNavItems.ts'), 'utf8');

  assert.match(appRoutesSource, /const SajikSeatMapEditor = import\.meta\.env\.DEV/);
  assert.match(appRoutesSource, /path="\/internal\/sajik-seatmap-editor"/);
  assert.match(appRoutesSource, /import\.meta\.env\.DEV && SajikSeatMapEditor/);
  assert.doesNotMatch(publicNavSource, /sajik-seatmap-editor/);
});
