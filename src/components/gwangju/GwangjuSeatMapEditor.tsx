import { useMemo, useState } from 'react';

import {
  buildGwangjuSeatMapEditorDataset,
  buildGwangjuSeatMapEditorPatchPayload,
  formatGwangjuSeatMapEditorPatchTsFragment,
  geometrySnapshotForGwangjuSection,
  geometrySnapshotFromGwangjuPolygons,
  validateGwangjuSeatMapEditorDatasetIssues,
  type GwangjuSeatMapEditorPatchGeometry,
  type GwangjuSeatMapEditorSection,
} from '../../data/gwangjuSeatMapEditorDataset';
import type { SeatMapPoint } from '../../utils/seatMapPolygonValidator';

type EditablePathKind = 'visual' | 'hit';

const dataset = buildGwangjuSeatMapEditorDataset();
const officialImageUrl = new URL('../../assets/stadiums/kia/gwangju-kia-seatmap-official-2026.webp', import.meta.url).href;

function clonePolygons(polygons: SeatMapPoint[][]): SeatMapPoint[][] {
  return polygons.map((polygon) => polygon.map(([x, y]) => [x, y]));
}

function sectionSearchText(section: GwangjuSeatMapEditorSection): string {
  return [
    section.sectionId,
    section.sectionName,
    section.blockId,
    section.officialBlocks.join(' '),
    section.seatCategory,
    section.seatCategoryLabel,
    section.highRiskWorksetIds.join(' '),
  ].join(' ').toLowerCase();
}

function replacePolygonPoint(
  polygons: SeatMapPoint[][],
  polygonIndex: number,
  pointIndex: number,
  nextPoint: SeatMapPoint,
): SeatMapPoint[][] {
  return polygons.map((polygon, currentPolygonIndex) => (
    currentPolygonIndex === polygonIndex
      ? polygon.map((point, currentPointIndex) => (currentPointIndex === pointIndex ? nextPoint : point))
      : polygon
  ));
}

function insertPointAfter(polygons: SeatMapPoint[][], polygonIndex: number, pointIndex: number): SeatMapPoint[][] {
  return polygons.map((polygon, currentPolygonIndex) => {
    if (currentPolygonIndex !== polygonIndex || polygon.length < 2) {
      return polygon;
    }
    const point = polygon[pointIndex];
    const nextPoint = polygon[(pointIndex + 1) % polygon.length];
    const midpoint: SeatMapPoint = [
      Math.round((point[0] + nextPoint[0]) / 2),
      Math.round((point[1] + nextPoint[1]) / 2),
    ];
    const nextPolygon = [...polygon];
    nextPolygon.splice(pointIndex + 1, 0, midpoint);
    return nextPolygon;
  });
}

function removePoint(polygons: SeatMapPoint[][], polygonIndex: number, pointIndex: number): SeatMapPoint[][] {
  return polygons.map((polygon, currentPolygonIndex) => {
    if (currentPolygonIndex !== polygonIndex || polygon.length <= 3) {
      return polygon;
    }
    return polygon.filter((_, currentPointIndex) => currentPointIndex !== pointIndex);
  });
}

function patchGeometryFromDraft(draft: GwangjuSeatMapEditorPatchGeometry): GwangjuSeatMapEditorPatchGeometry {
  return geometrySnapshotFromGwangjuPolygons({
    visualPolygons: clonePolygons(draft.visualPolygons),
    hitPolygons: clonePolygons(draft.hitPolygons),
    labelPoint: [...draft.labelPoint],
  });
}

function copyToClipboard(value: string, setStatus: (status: string) => void) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    setStatus('Clipboard API unavailable. Select and copy the preview text.');
    return;
  }

  void navigator.clipboard.writeText(value).then(
    () => setStatus('Copied.'),
    () => setStatus('Copy failed. Select and copy the preview text.'),
  );
}

export default function GwangjuSeatMapEditor() {
  const [selectedSectionId, setSelectedSectionId] = useState(dataset.sections[0]?.sectionId ?? '');
  const [query, setQuery] = useState('');
  const [editablePathKind, setEditablePathKind] = useState<EditablePathKind>('visual');
  const [selectedPolygonIndex, setSelectedPolygonIndex] = useState(0);
  const [selectedPointIndex, setSelectedPointIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState('');
  const [draftsBySectionId, setDraftsBySectionId] = useState<Record<string, GwangjuSeatMapEditorPatchGeometry>>({});

  const datasetIssues = useMemo(() => validateGwangjuSeatMapEditorDatasetIssues(dataset), []);
  const selectedSection = dataset.sections.find((section) => section.sectionId === selectedSectionId) ?? dataset.sections[0];
  const selectedDraft = draftsBySectionId[selectedSection.sectionId] ?? geometrySnapshotForGwangjuSection(selectedSection);
  const selectedDraftSnapshot = patchGeometryFromDraft(selectedDraft);
  const selectedPayload = buildGwangjuSeatMapEditorPatchPayload(selectedSection, dataset, selectedDraftSnapshot);
  const selectedPatchJson = JSON.stringify(selectedPayload, null, 2);
  const selectedPatchTs = formatGwangjuSeatMapEditorPatchTsFragment(selectedPayload);
  const visibleSections = dataset.sections.filter((section) => (
    query.trim().length === 0 || sectionSearchText(section).includes(query.trim().toLowerCase())
  ));
  const editablePolygons = editablePathKind === 'visual'
    ? selectedDraft.visualPolygons
    : selectedDraft.hitPolygons;
  const selectedPolygon = editablePolygons[selectedPolygonIndex] ?? editablePolygons[0] ?? [];
  const selectedPoint = selectedPolygon[selectedPointIndex] ?? selectedPolygon[0] ?? [0, 0];
  const validationStatus = datasetIssues.length === 0 ? 'PASS' : 'FAIL';

  const updateSelectedDraft = (updater: (draft: GwangjuSeatMapEditorPatchGeometry) => GwangjuSeatMapEditorPatchGeometry) => {
    setDraftsBySectionId((current) => {
      const baseDraft = current[selectedSection.sectionId] ?? geometrySnapshotForGwangjuSection(selectedSection);
      return {
        ...current,
        [selectedSection.sectionId]: updater(patchGeometryFromDraft(baseDraft)),
      };
    });
  };

  const updateSelectedPoint = (nextPoint: SeatMapPoint) => {
    updateSelectedDraft((draft) => {
      const nextPolygons = replacePolygonPoint(
        editablePathKind === 'visual' ? draft.visualPolygons : draft.hitPolygons,
        selectedPolygonIndex,
        selectedPointIndex,
        nextPoint,
      );

      return geometrySnapshotFromGwangjuPolygons({
        visualPolygons: editablePathKind === 'visual' ? nextPolygons : draft.visualPolygons,
        hitPolygons: editablePathKind === 'hit' ? nextPolygons : draft.hitPolygons,
        labelPoint: draft.labelPoint,
      });
    });
  };

  const nudgeSelectedPoint = (dx: number, dy: number) => {
    updateSelectedPoint([selectedPoint[0] + dx, selectedPoint[1] + dy]);
  };

  const nudgeLabelPoint = (dx: number, dy: number) => {
    updateSelectedDraft((draft) => geometrySnapshotFromGwangjuPolygons({
      visualPolygons: draft.visualPolygons,
      hitPolygons: draft.hitPolygons,
      labelPoint: [draft.labelPoint[0] + dx, draft.labelPoint[1] + dy],
    }));
  };

  const addVertex = () => {
    updateSelectedDraft((draft) => {
      const nextPolygons = insertPointAfter(
        editablePathKind === 'visual' ? draft.visualPolygons : draft.hitPolygons,
        selectedPolygonIndex,
        selectedPointIndex,
      );

      return geometrySnapshotFromGwangjuPolygons({
        visualPolygons: editablePathKind === 'visual' ? nextPolygons : draft.visualPolygons,
        hitPolygons: editablePathKind === 'hit' ? nextPolygons : draft.hitPolygons,
        labelPoint: draft.labelPoint,
      });
    });
    setSelectedPointIndex((pointIndex) => pointIndex + 1);
  };

  const deleteVertex = () => {
    updateSelectedDraft((draft) => {
      const nextPolygons = removePoint(
        editablePathKind === 'visual' ? draft.visualPolygons : draft.hitPolygons,
        selectedPolygonIndex,
        selectedPointIndex,
      );

      return geometrySnapshotFromGwangjuPolygons({
        visualPolygons: editablePathKind === 'visual' ? nextPolygons : draft.visualPolygons,
        hitPolygons: editablePathKind === 'hit' ? nextPolygons : draft.hitPolygons,
        labelPoint: draft.labelPoint,
      });
    });
    setSelectedPointIndex((pointIndex) => Math.max(0, pointIndex - 1));
  };

  const syncHitToVisual = () => {
    updateSelectedDraft((draft) => geometrySnapshotFromGwangjuPolygons({
      visualPolygons: draft.visualPolygons,
      hitPolygons: clonePolygons(draft.visualPolygons),
      labelPoint: draft.labelPoint,
    }));
  };

  const resetSelectedDraft = () => {
    setDraftsBySectionId((current) => {
      const next = { ...current };
      delete next[selectedSection.sectionId];
      return next;
    });
    setSelectedPolygonIndex(0);
    setSelectedPointIndex(0);
  };

  return (
    <div
      data-testid="gwangju-seatmap-editor"
      data-summary-total-sections={dataset.summary.totalSections}
      data-summary-enabled-sections={dataset.summary.enabledSections}
      data-summary-high-risk-sections={dataset.summary.highRiskSections}
      data-summary-derived-aggregate-sections={dataset.summary.derivedAggregateSections}
      className="min-h-screen bg-slate-950 text-slate-100"
    >
      <header className="border-b border-slate-800 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Internal Gwangju seatmap editor</p>
            <h1 className="mt-1 text-2xl font-black">gwangju-precision-v1</h1>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Official image natural coordinates · {dataset.image.viewBox} · file-write disabled
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
            <div className="rounded-md border border-slate-700 px-3 py-2">
              <div className="text-slate-400">sections</div>
              <div className="text-lg text-white">{dataset.summary.totalSections}</div>
            </div>
            <div className="rounded-md border border-slate-700 px-3 py-2">
              <div className="text-slate-400">active</div>
              <div className="text-lg text-white">{dataset.summary.enabledSections}</div>
            </div>
            <div className="rounded-md border border-slate-700 px-3 py-2">
              <div className="text-slate-400">risk</div>
              <div className="text-lg text-white">{dataset.summary.highRiskSections}</div>
            </div>
            <div className="rounded-md border border-slate-700 px-3 py-2">
              <div className="text-slate-400">validator</div>
              <div data-testid={validationStatus === 'PASS' ? 'gwangju-editor-validator-pass' : 'gwangju-editor-validator-fail'} className="text-lg text-white">
                {validationStatus}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)_420px]">
        <aside className="border-b border-slate-800 p-4 lg:border-b-0 lg:border-r">
          <label className="text-xs font-black uppercase text-slate-400" htmlFor="gwangju-editor-search">
            section search
          </label>
          <input
            id="gwangju-editor-search"
            data-testid="gwangju-editor-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-sky-400"
            placeholder="121, L, S-329, five-table..."
          />
          <div className="mt-4 max-h-[calc(100vh-180px)] space-y-1 overflow-auto pr-1">
            {visibleSections.map((section) => (
              <button
                key={section.sectionId}
                type="button"
                data-testid={`gwangju-editor-section-${section.sectionId}`}
                onClick={() => {
                  setSelectedSectionId(section.sectionId);
                  setSelectedPolygonIndex(0);
                  setSelectedPointIndex(0);
                  setCopyStatus('');
                }}
                className={`w-full rounded-md border px-3 py-2 text-left text-xs font-bold transition ${
                  section.sectionId === selectedSection.sectionId
                    ? 'border-sky-400 bg-sky-500/20 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{section.sectionName}</span>
                  <span className="text-slate-500">{section.blockId}</span>
                </div>
                <div className="mt-1 truncate text-[11px] text-slate-500">{section.sectionId}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-h-[680px] bg-slate-900 p-4">
          <svg
            data-testid="gwangju-editor-svg"
            viewBox={dataset.image.viewBox}
            className="h-full max-h-[calc(100vh-120px)] min-h-[640px] w-full rounded-md bg-white"
            role="img"
            aria-label="Gwangju precision v1 editor overlay"
          >
            <image
              data-testid="gwangju-editor-official-image"
              href={officialImageUrl}
              x={0}
              y={0}
              width={dataset.image.width}
              height={dataset.image.height}
              preserveAspectRatio="xMidYMid meet"
            />
            <g opacity={0.2}>
              {dataset.sections.map((section) => (
                <path
                  key={section.sectionId}
                  d={section.visualPath}
                  fill={section.color}
                  stroke="#0f172a"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              ))}
            </g>
            <path
              d={selectedDraft.visualPath}
              fill="rgba(59, 130, 246, 0.22)"
              stroke="#2563eb"
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={selectedDraft.hitPath}
              fill="transparent"
              stroke="#f97316"
              strokeDasharray="9 6"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
            {editablePolygons.map((polygon, polygonIndex) => (
              <g key={`${editablePathKind}-${polygonIndex}`}>
                {polygon.map(([x, y], pointIndex) => (
                  <circle
                    key={`${polygonIndex}-${pointIndex}`}
                    data-testid={`gwangju-editor-vertex-${polygonIndex}-${pointIndex}`}
                    cx={x}
                    cy={y}
                    r={pointIndex === selectedPointIndex && polygonIndex === selectedPolygonIndex ? 8 : 5}
                    fill={editablePathKind === 'visual' ? '#2563eb' : '#f97316'}
                    stroke="#ffffff"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    onPointerDown={() => {
                      setSelectedPolygonIndex(polygonIndex);
                      setSelectedPointIndex(pointIndex);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </g>
            ))}
            <circle
              data-testid="gwangju-editor-label-point"
              cx={selectedDraft.labelPoint[0]}
              cy={selectedDraft.labelPoint[1]}
              r={9}
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </section>

        <aside className="border-t border-slate-800 p-4 lg:border-l lg:border-t-0">
          <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">{selectedSection.sectionName}</h2>
                <p className="text-xs font-bold text-slate-400">{selectedSection.sectionId} · {selectedSection.blockId}</p>
              </div>
              <span
                data-testid={selectedPayload.validation.status === 'PASS' ? 'gwangju-editor-patch-status-pass' : 'gwangju-editor-patch-status-fail'}
                className="rounded bg-slate-800 px-2 py-1 text-xs font-black"
              >
                PATCH {selectedPayload.validation.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-300">
              {selectedSection.highRiskWorksetIds.length > 0
                ? selectedSection.highRiskWorksetIds.map((worksetId) => (
                  <span key={worksetId} className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-amber-200">
                    {worksetId}
                  </span>
                ))
                : <span className="rounded border border-slate-700 px-2 py-1">standard</span>}
            </div>
          </div>

          <div data-testid="gwangju-editor-draft-controls" className="mt-4 rounded-md border border-slate-800 bg-slate-900 p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditablePathKind('visual')}
                className={`rounded-md px-3 py-2 text-xs font-black ${editablePathKind === 'visual' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                visual
              </button>
              <button
                type="button"
                onClick={() => setEditablePathKind('hit')}
                className={`rounded-md px-3 py-2 text-xs font-black ${editablePathKind === 'hit' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                hit
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-300">
              <label>
                subpath
                <input
                  value={selectedPolygonIndex}
                  min={0}
                  max={Math.max(0, editablePolygons.length - 1)}
                  type="number"
                  onChange={(event) => {
                    setSelectedPolygonIndex(Math.max(0, Math.min(editablePolygons.length - 1, Number(event.target.value) || 0)));
                    setSelectedPointIndex(0);
                  }}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1"
                />
              </label>
              <label>
                vertex
                <input
                  value={selectedPointIndex}
                  min={0}
                  max={Math.max(0, selectedPolygon.length - 1)}
                  type="number"
                  onChange={(event) => setSelectedPointIndex(Math.max(0, Math.min(selectedPolygon.length - 1, Number(event.target.value) || 0)))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => nudgeSelectedPoint(0, -1)} className="rounded-md bg-slate-800 px-3 py-2 text-xs font-black">up</button>
              <button type="button" onClick={() => nudgeSelectedPoint(-1, 0)} className="rounded-md bg-slate-800 px-3 py-2 text-xs font-black">left</button>
              <button type="button" onClick={() => nudgeSelectedPoint(1, 0)} className="rounded-md bg-slate-800 px-3 py-2 text-xs font-black">right</button>
              <button type="button" onClick={() => nudgeSelectedPoint(0, 1)} className="rounded-md bg-slate-800 px-3 py-2 text-xs font-black">down</button>
              <button type="button" onClick={addVertex} className="rounded-md bg-blue-600 px-3 py-2 text-xs font-black">add</button>
              <button type="button" onClick={deleteVertex} className="rounded-md bg-rose-600 px-3 py-2 text-xs font-black">delete</button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={syncHitToVisual} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-black">sync hit to visual</button>
              <button type="button" onClick={resetSelectedDraft} className="rounded-md bg-slate-800 px-3 py-2 text-xs font-black">reset section</button>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              <button type="button" onClick={() => nudgeLabelPoint(0, -1)} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-black">label up</button>
              <button type="button" onClick={() => nudgeLabelPoint(-1, 0)} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-black">label left</button>
              <button type="button" onClick={() => nudgeLabelPoint(1, 0)} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-black">label right</button>
              <button type="button" onClick={() => nudgeLabelPoint(0, 1)} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-black">label down</button>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-slate-800 bg-slate-900 p-4">
            <div className="flex gap-2">
              <button type="button" onClick={() => copyToClipboard(selectedPatchJson, setCopyStatus)} className="rounded-md bg-sky-600 px-3 py-2 text-xs font-black">
                copy JSON patch
              </button>
              <button type="button" onClick={() => copyToClipboard(selectedPatchTs, setCopyStatus)} className="rounded-md bg-violet-600 px-3 py-2 text-xs font-black">
                copy TS patch
              </button>
            </div>
            <p className="mt-2 min-h-4 text-xs font-bold text-slate-400">{copyStatus}</p>
            <pre data-testid="gwangju-editor-dataset-json" className="mt-3 max-h-52 overflow-auto rounded-md bg-slate-950 p-3 text-[11px] text-slate-300">
              {selectedPatchJson}
            </pre>
            <pre data-testid="gwangju-editor-ts-patch" className="mt-3 max-h-52 overflow-auto rounded-md bg-slate-950 p-3 text-[11px] text-slate-300">
              {selectedPatchTs}
            </pre>
          </div>

          <div data-testid="gwangju-editor-issue-panel" className="mt-4 rounded-md border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-sm font-black">Validation Issues</h3>
            {selectedPayload.validation.issues.length === 0 ? (
              <p className="mt-2 text-xs font-bold text-emerald-300">Selected patch is clean.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs font-bold text-amber-200">
                {selectedPayload.validation.issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>{issue.sectionId}:{issue.pathKind}:{issue.code}</li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
