import { useMemo, useState, type PointerEvent } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUp, Bug, CheckCircle2, ChevronDown, Copy, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';

import {
  buildSajikSeatMapSectionPatchPayload,
  buildSajikSeatMapDataset,
  formatSajikSeatMapSectionPatchTsFragment,
  geometrySnapshotForSection,
  geometrySnapshotFromPolygons,
  validateSajikSeatMapDatasetIssues,
  type SajikSeatMapSectionPatchGeometry,
  type SajikSeatMapDatasetSection,
  type SajikSeatMapDatasetValidationIssue,
} from '../../data/sajikSeatMapDataset';
import type { SeatMapPoint } from '../../utils/seatMapPolygonValidator';

const officialSeatMapImageUrl = new URL('../../assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.webp', import.meta.url).href;

type EditablePathKind = 'visualPath' | 'hitPath';
type EditableTarget = EditablePathKind | 'labelPoint';

interface ActiveVertex {
  sectionId: string;
  target: EditableTarget;
  vertexIndex?: number;
}

function matchesSection(section: SajikSeatMapDatasetSection, query: string) {
  if (!query.trim()) {
    return true;
  }

  const normalizedQuery = query.trim().toLowerCase();
  return [
    section.sectionId,
    section.sectionName,
    section.blockId,
    section.seatCategory,
    section.seatCategoryLabel,
    section.sectionKind,
    section.markerType ?? '',
    section.hitPathExpansionCandidate ? 'hit-candidate' : '',
    ...section.officialBlocks,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

function statusBadgeForSection(section: SajikSeatMapDatasetSection) {
  if (section.sectionKind === 'ALIAS_ONLY') {
    return 'alias-only';
  }
  if (section.markerType === 'WHEELCHAIR') {
    return 'wheelchair';
  }
  return section.enabled ? 'enabled' : 'disabled';
}

function clampCoordinate(value: number, limit: number): number {
  return Math.max(0, Math.min(limit, Math.round(value)));
}

function clonePoints(points: SeatMapPoint[]): SeatMapPoint[] {
  return points.map(([x, y]) => [x, y]);
}

function geometryEquals(left: SajikSeatMapSectionPatchGeometry, right: SajikSeatMapSectionPatchGeometry): boolean {
  return left.visualPath === right.visualPath
    && left.hitPath === right.hitPath
    && left.labelPoint[0] === right.labelPoint[0]
    && left.labelPoint[1] === right.labelPoint[1];
}

function updateGeometryVertex({
  geometry,
  target,
  vertexIndex,
  point,
  syncHitPath,
}: {
  geometry: SajikSeatMapSectionPatchGeometry;
  target: EditableTarget;
  vertexIndex: number;
  point: SeatMapPoint;
  syncHitPath: boolean;
}): SajikSeatMapSectionPatchGeometry {
  const visualPolygon = clonePoints(geometry.visualPolygon);
  const hitPolygon = clonePoints(geometry.hitPolygon);

  if (target === 'labelPoint') {
    return geometrySnapshotFromPolygons({
      visualPolygon,
      hitPolygon,
      labelPoint: point,
    });
  }

  if (target === 'visualPath') {
    visualPolygon[vertexIndex] = point;
    if (syncHitPath && vertexIndex < hitPolygon.length) {
      hitPolygon[vertexIndex] = point;
    }
  } else {
    hitPolygon[vertexIndex] = point;
  }

  return geometrySnapshotFromPolygons({
    visualPolygon,
    hitPolygon,
    labelPoint: geometry.labelPoint,
  });
}

function insertPointAfter(points: SeatMapPoint[], vertexIndex: number): { points: SeatMapPoint[]; insertedIndex: number } {
  const normalizedIndex = Math.max(0, Math.min(points.length - 1, vertexIndex));
  const current = points[normalizedIndex];
  const next = points[(normalizedIndex + 1) % points.length];
  const insertedPoint: SeatMapPoint = [
    Math.round((current[0] + next[0]) / 2),
    Math.round((current[1] + next[1]) / 2),
  ];
  const insertedIndex = normalizedIndex + 1;

  return {
    points: [
      ...points.slice(0, insertedIndex),
      insertedPoint,
      ...points.slice(insertedIndex),
    ],
    insertedIndex,
  };
}

function deletePointAt(points: SeatMapPoint[], vertexIndex: number): { points: SeatMapPoint[]; selectedIndex: number } {
  if (points.length <= 3) {
    return {
      points,
      selectedIndex: Math.max(0, Math.min(points.length - 1, vertexIndex)),
    };
  }

  const normalizedIndex = Math.max(0, Math.min(points.length - 1, vertexIndex));
  const nextPoints = points.filter((_, index) => index !== normalizedIndex);

  return {
    points: nextPoints,
    selectedIndex: Math.min(normalizedIndex, nextPoints.length - 1),
  };
}

function insertGeometryVertex({
  geometry,
  target,
  vertexIndex,
  syncHitPath,
}: {
  geometry: SajikSeatMapSectionPatchGeometry;
  target: EditablePathKind;
  vertexIndex: number;
  syncHitPath: boolean;
}): { geometry: SajikSeatMapSectionPatchGeometry; selectedIndex: number } {
  const visualPolygon = clonePoints(geometry.visualPolygon);
  const hitPolygon = clonePoints(geometry.hitPolygon);
  const syncHitTopology = target === 'visualPath' && syncHitPath && visualPolygon.length === hitPolygon.length;

  if (target === 'visualPath') {
    const insertedVisual = insertPointAfter(visualPolygon, vertexIndex);
    const nextHitPolygon = syncHitTopology ? insertPointAfter(hitPolygon, vertexIndex).points : hitPolygon;
    return {
      geometry: geometrySnapshotFromPolygons({
        visualPolygon: insertedVisual.points,
        hitPolygon: nextHitPolygon,
        labelPoint: geometry.labelPoint,
      }),
      selectedIndex: insertedVisual.insertedIndex,
    };
  }

  const insertedHit = insertPointAfter(hitPolygon, vertexIndex);
  return {
    geometry: geometrySnapshotFromPolygons({
      visualPolygon,
      hitPolygon: insertedHit.points,
      labelPoint: geometry.labelPoint,
    }),
    selectedIndex: insertedHit.insertedIndex,
  };
}

function deleteGeometryVertex({
  geometry,
  target,
  vertexIndex,
  syncHitPath,
}: {
  geometry: SajikSeatMapSectionPatchGeometry;
  target: EditablePathKind;
  vertexIndex: number;
  syncHitPath: boolean;
}): { geometry: SajikSeatMapSectionPatchGeometry; selectedIndex: number } {
  const visualPolygon = clonePoints(geometry.visualPolygon);
  const hitPolygon = clonePoints(geometry.hitPolygon);
  const syncHitTopology = target === 'visualPath' && syncHitPath && visualPolygon.length === hitPolygon.length;

  if (target === 'visualPath') {
    const deletedVisual = deletePointAt(visualPolygon, vertexIndex);
    const nextHitPolygon = syncHitTopology ? deletePointAt(hitPolygon, vertexIndex).points : hitPolygon;
    return {
      geometry: geometrySnapshotFromPolygons({
        visualPolygon: deletedVisual.points,
        hitPolygon: nextHitPolygon,
        labelPoint: geometry.labelPoint,
      }),
      selectedIndex: deletedVisual.selectedIndex,
    };
  }

  const deletedHit = deletePointAt(hitPolygon, vertexIndex);
  return {
    geometry: geometrySnapshotFromPolygons({
      visualPolygon,
      hitPolygon: deletedHit.points,
      labelPoint: geometry.labelPoint,
    }),
    selectedIndex: deletedHit.selectedIndex,
  };
}

function invalidHitPathFixture(
  geometry: SajikSeatMapSectionPatchGeometry,
  width: number,
  height: number,
): SajikSeatMapSectionPatchGeometry {
  const [x, y] = geometry.labelPoint;
  return geometrySnapshotFromPolygons({
    visualPolygon: clonePoints(geometry.visualPolygon),
    hitPolygon: [
      [clampCoordinate(x - 1, width), clampCoordinate(y - 1, height)],
      [clampCoordinate(x + 1, width), clampCoordinate(y - 1, height)],
      [clampCoordinate(x + 1, width), clampCoordinate(y + 1, height)],
      [clampCoordinate(x - 1, width), clampCoordinate(y + 1, height)],
    ],
    labelPoint: geometry.labelPoint,
  });
}

function dirtySectionIdsFromDrafts(
  drafts: Record<string, SajikSeatMapSectionPatchGeometry>,
  sections: SajikSeatMapDatasetSection[],
): string[] {
  return Object.entries(drafts)
    .filter(([sectionId, draftGeometry]) => {
      const section = sections.find((candidate) => candidate.sectionId === sectionId);
      return section ? !geometryEquals(geometrySnapshotForSection(section), draftGeometry) : false;
    })
    .map(([sectionId]) => sectionId)
    .sort((left, right) => left.localeCompare(right));
}

function PathValidationStatus({
  label,
  issues,
}: {
  label: string;
  issues: SajikSeatMapDatasetValidationIssue[];
}) {
  const passed = issues.length === 0;

  return (
    <div
      data-testid={`sajik-editor-${label.toLowerCase()}-validator-${passed ? 'pass' : 'fail'}`}
      className={`flex items-center justify-between border px-2 py-1 text-xs font-black ${
        passed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}
    >
      <span>{label}</span>
      <span>{passed ? 'PASS' : `${issues.length} ISSUES`}</span>
    </div>
  );
}

export default function SajikSeatMapEditor() {
  const dataset = useMemo(() => buildSajikSeatMapDataset(), []);
  const datasetIssues = useMemo(() => validateSajikSeatMapDatasetIssues(dataset), [dataset]);
  const [query, setQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('112');
  const [editingTarget, setEditingTarget] = useState<EditableTarget>('visualPath');
  const [syncHitPath, setSyncHitPath] = useState(true);
  const [nudgeStep, setNudgeStep] = useState(1);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'blocked' | 'failed'>('idle');
  const [selectedVertexIndex, setSelectedVertexIndex] = useState(0);
  const [activeVertex, setActiveVertex] = useState<ActiveVertex | null>(null);
  const [draftGeometries, setDraftGeometries] = useState<Record<string, SajikSeatMapSectionPatchGeometry>>({});
  const filteredSections = useMemo(
    () => dataset.sections.filter((section) => matchesSection(section, query)),
    [dataset.sections, query],
  );
  const selectedSection = (dataset.sections.find((section) => section.sectionId === selectedSectionId)
    ?? filteredSections[0]
    ?? dataset.sections[0]) as SajikSeatMapDatasetSection;
  const selectedBaseGeometry = useMemo(() => geometrySnapshotForSection(selectedSection), [selectedSection]);
  const selectedDraftGeometry = draftGeometries[selectedSection.sectionId] ?? selectedBaseGeometry;
  const selectedDraftChanged = !geometryEquals(selectedBaseGeometry, selectedDraftGeometry);
  const selectedPatchPayload = useMemo(
    () => buildSajikSeatMapSectionPatchPayload(selectedSection, dataset, selectedDraftGeometry),
    [dataset, selectedDraftGeometry, selectedSection],
  );
  const selectedIssues = selectedPatchPayload.validation.issues;
  const selectedVisualIssues = selectedPatchPayload.validation.issues.filter((issue) => issue.pathKind === 'visualPath');
  const selectedHitIssues = selectedPatchPayload.validation.issues.filter((issue) => issue.pathKind === 'hitPath');
  const dirtySectionIds = useMemo(() => dirtySectionIdsFromDrafts(draftGeometries, dataset.sections), [dataset.sections, draftGeometries]);
  const editingPathKind: EditablePathKind = editingTarget === 'labelPoint' ? 'visualPath' : editingTarget;
  const editablePoints = editingPathKind === 'visualPath' ? selectedDraftGeometry.visualPolygon : selectedDraftGeometry.hitPolygon;
  const normalizedVertexIndex = Math.min(selectedVertexIndex, Math.max(0, editablePoints.length - 1));
  const selectedEditablePoint: SeatMapPoint = editingTarget === 'labelPoint'
    ? selectedDraftGeometry.labelPoint
    : editablePoints[normalizedVertexIndex] ?? [0, 0];
  const selectedHitPathDiffers = selectedDraftGeometry.visualPath !== selectedDraftGeometry.hitPath;
  const selectedPatchChanged = !geometryEquals(selectedPatchPayload.before, selectedPatchPayload.after);
  const exportLocked = selectedPatchPayload.validation.status !== 'PASS';
  const datasetJson = useMemo(() => JSON.stringify(dataset, null, 2), [dataset]);
  const selectedSectionJson = useMemo(() => JSON.stringify(selectedSection, null, 2), [selectedSection]);
  const selectedPatchJson = useMemo(() => JSON.stringify(selectedPatchPayload, null, 2), [selectedPatchPayload]);
  const selectedPatchTs = useMemo(() => formatSajikSeatMapSectionPatchTsFragment(selectedPatchPayload), [selectedPatchPayload]);

  const handleSelectSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setSelectedVertexIndex(0);
    setActiveVertex(null);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    const firstMatch = dataset.sections.find((section) => matchesSection(section, value));
    if (firstMatch) {
      handleSelectSection(firstMatch.sectionId);
    }
  };

  const updateSelectedDraftGeometry = (
    updater: (currentGeometry: SajikSeatMapSectionPatchGeometry) => SajikSeatMapSectionPatchGeometry,
  ) => {
    setDraftGeometries((currentDrafts) => {
      const currentGeometry = currentDrafts[selectedSection.sectionId] ?? selectedBaseGeometry;
      return {
        ...currentDrafts,
        [selectedSection.sectionId]: updater(currentGeometry),
      };
    });
  };

  const updateSelectedDraftPoint = (target: EditableTarget, vertexIndex: number, point: SeatMapPoint) => {
    updateSelectedDraftGeometry((currentGeometry) => updateGeometryVertex({
      geometry: currentGeometry,
      target,
      vertexIndex,
      point,
      syncHitPath: target === 'visualPath' && syncHitPath,
    }));
  };

  const addVertexAfterSelected = () => {
    if (editingTarget === 'labelPoint') {
      return;
    }

    const inserted = insertGeometryVertex({
      geometry: selectedDraftGeometry,
      target: editingTarget,
      vertexIndex: normalizedVertexIndex,
      syncHitPath,
    });
    updateSelectedDraftGeometry(() => inserted.geometry);
    setSelectedVertexIndex(inserted.selectedIndex);
  };

  const deleteSelectedVertex = () => {
    if (editingTarget === 'labelPoint' || editablePoints.length <= 3) {
      return;
    }

    const deleted = deleteGeometryVertex({
      geometry: selectedDraftGeometry,
      target: editingTarget,
      vertexIndex: normalizedVertexIndex,
      syncHitPath,
    });
    updateSelectedDraftGeometry(() => deleted.geometry);
    setSelectedVertexIndex(deleted.selectedIndex);
  };

  const applyInvalidHitPathFixture = () => {
    updateSelectedDraftGeometry((currentGeometry) => invalidHitPathFixture(
      currentGeometry,
      dataset.image.width,
      dataset.image.height,
    ));
    setEditingTarget('hitPath');
    setSelectedVertexIndex(0);
  };

  const nudgeSelectedVertex = (deltaX: number, deltaY: number) => {
    updateSelectedDraftPoint(editingTarget, normalizedVertexIndex, [
      clampCoordinate(selectedEditablePoint[0] + (deltaX * nudgeStep), dataset.image.width),
      clampCoordinate(selectedEditablePoint[1] + (deltaY * nudgeStep), dataset.image.height),
    ]);
  };

  const resetSelectedDraft = () => {
    setDraftGeometries((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[selectedSection.sectionId];
      return nextDrafts;
    });
    setActiveVertex(null);
    setSelectedVertexIndex(0);
  };

  const resetAllDrafts = () => {
    setDraftGeometries({});
    setActiveVertex(null);
    setSelectedVertexIndex(0);
  };

  const copyExportPreview = async (value: string) => {
    if (exportLocked) {
      setCopyStatus('blocked');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus('copied');
    } catch (_error) {
      setCopyStatus('failed');
    }
  };

  const pointerToSeatMapPoint = (event: PointerEvent<SVGSVGElement>): SeatMapPoint => {
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const screenMatrix = svg.getScreenCTM();
    if (!screenMatrix) {
      return selectedEditablePoint;
    }

    const mappedPoint = point.matrixTransform(screenMatrix.inverse());
    return [
      clampCoordinate(mappedPoint.x, dataset.image.width),
      clampCoordinate(mappedPoint.y, dataset.image.height),
    ];
  };

  const handleSvgPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!activeVertex || activeVertex.sectionId !== selectedSection.sectionId) {
      return;
    }

    event.preventDefault();
    updateSelectedDraftPoint(activeVertex.target, activeVertex.vertexIndex ?? 0, pointerToSeatMapPoint(event));
  };

  const handleVertexPointerDown = (
    event: PointerEvent<SVGCircleElement>,
    target: EditableTarget,
    vertexIndex = 0,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setEditingTarget(target);
    setSelectedVertexIndex(vertexIndex);
    setActiveVertex({
      sectionId: selectedSection.sectionId,
      target,
      vertexIndex,
    });
  };

  return (
    <main
      data-testid="sajik-seatmap-editor"
      data-summary-total-sections={dataset.summary.totalSections}
      data-summary-enabled-sections={dataset.summary.enabledSections}
      data-summary-alias-only-sections={dataset.summary.aliasOnlySections}
      data-summary-markers={dataset.summary.markers}
      className="min-h-screen bg-zinc-50 text-zinc-950"
    >
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-4 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">Internal seatmap editor v1.7</div>
            <h1 className="text-xl font-black text-zinc-950">사직 좌석도 polygon editor</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-600">
            <span className="rounded border border-zinc-200 bg-white px-2 py-1">{dataset.mapVersion}</span>
            <span className="rounded border border-zinc-200 bg-white px-2 py-1">{dataset.image.viewBox}</span>
            <span className="rounded border border-zinc-200 bg-white px-2 py-1">{dataset.image.width}x{dataset.image.height}</span>
          </div>
        </header>

        <section className="grid min-h-[calc(100vh-110px)] gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0">
            <div className="overflow-hidden border border-zinc-200 bg-white shadow-sm">
              <svg
                data-testid="sajik-editor-svg"
                viewBox={dataset.image.viewBox}
                className="block aspect-[3/2] w-full bg-white"
                role="img"
                aria-label="사직 좌석도 editor overlay"
                onPointerMove={handleSvgPointerMove}
                onPointerUp={() => setActiveVertex(null)}
                onPointerLeave={() => setActiveVertex(null)}
                style={{ touchAction: 'none' }}
              >
                <image
                  href={officialSeatMapImageUrl}
                  width={dataset.image.width}
                  height={dataset.image.height}
                  preserveAspectRatio="xMidYMid meet"
                  data-testid="sajik-editor-official-image"
                />
                <g data-layer="visual-polygons">
                  {dataset.sections.map((section) => {
                    const isSelected = section.sectionId === selectedSection?.sectionId;
                    const isFiltered = matchesSection(section, query);
                    const draftGeometry = draftGeometries[section.sectionId];
                    const visualPath = draftGeometry?.visualPath ?? section.visualPath;
                    return (
                      <path
                        key={section.blockId}
                        d={visualPath}
                        data-testid={`sajik-editor-section-${section.sectionId}`}
                        data-section-id={section.sectionId}
                        data-section-kind={section.sectionKind}
                        data-enabled={section.enabled}
                        fill={section.color}
                        fillOpacity={isSelected ? 0.42 : isFiltered ? 0.16 : 0.03}
                        stroke={isSelected ? '#0f172a' : section.enabled ? section.color : '#71717a'}
                        strokeWidth={isSelected ? 3 : 1.4}
                        strokeDasharray={section.enabled ? undefined : '5 4'}
                        vectorEffect="non-scaling-stroke"
                        onClick={() => handleSelectSection(section.sectionId)}
                        onMouseEnter={() => {
                          if (!activeVertex) {
                            handleSelectSection(section.sectionId);
                          }
                        }}
                        className="cursor-pointer transition-opacity"
                      />
                    );
                  })}
                </g>
                <g data-layer="labels" pointerEvents="none">
                  {dataset.sections.map((section) => {
                    const isSelected = section.sectionId === selectedSection?.sectionId;
                    const draftGeometry = draftGeometries[section.sectionId];
                    const [x, y] = draftGeometry?.labelPoint ?? section.labelPoint;
                    return (
                      <text
                        key={`label-${section.blockId}`}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={isSelected ? '#000000' : '#334155'}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 4 : 3}
                        paintOrder="stroke"
                        fontSize={isSelected ? 12 : 8}
                        fontWeight={900}
                      >
                        {section.sectionId}
                      </text>
                    );
                  })}
                </g>
                <g data-layer="selected-vertices">
                  {editingTarget !== 'labelPoint' && editablePoints.map(([x, y], index) => (
                    <circle
                      key={`${editingPathKind}-${index}`}
                      cx={x}
                      cy={y}
                      r={index === normalizedVertexIndex ? 6 : 4.5}
                      fill={index === normalizedVertexIndex ? '#f97316' : '#ffffff'}
                      stroke={editingPathKind === 'visualPath' ? '#0f172a' : '#0f766e'}
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      data-testid={`sajik-editor-vertex-handle-${editingPathKind}-${index}`}
                      data-vertex-index={index}
                      onPointerDown={(event) => handleVertexPointerDown(event, editingPathKind, index)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedVertexIndex(index);
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    />
                  ))}
                  {editingTarget === 'labelPoint' && (
                    <circle
                      cx={selectedDraftGeometry.labelPoint[0]}
                      cy={selectedDraftGeometry.labelPoint[1]}
                      r={7}
                      fill="#f97316"
                      stroke="#ffffff"
                      strokeWidth={2.5}
                      vectorEffect="non-scaling-stroke"
                      data-testid="sajik-editor-labelpoint-handle"
                      onPointerDown={(event) => handleVertexPointerDown(event, 'labelPoint')}
                      className="cursor-grab active:cursor-grabbing"
                    />
                  )}
                </g>
                <g data-layer="markers" pointerEvents="none">
                  {dataset.markers.map((marker) => {
                    const [x, y] = marker.position;
                    return (
                      <circle
                        key={marker.markerId}
                        cx={x}
                        cy={y}
                        r={7}
                        fill="#0f766e"
                        stroke="#ffffff"
                        strokeWidth={2}
                        data-testid={`sajik-editor-marker-${marker.relatedSectionId}`}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col gap-3">
            <section className="border border-zinc-200 bg-white p-3 shadow-sm">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
                <input
                  data-testid="sajik-editor-section-search"
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  className="h-10 w-full border border-zinc-300 bg-white pl-9 pr-3 text-sm font-semibold outline-none ring-cyan-500 focus:ring-2"
                  placeholder="sectionId, category, marker"
                />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-black">
                <div className="border border-zinc-200 bg-zinc-50 px-2 py-2">
                  <div data-testid="sajik-editor-total-sections">{dataset.summary.totalSections}</div>
                  <div className="text-[10px] uppercase text-zinc-500">sections</div>
                </div>
                <div className="border border-zinc-200 bg-zinc-50 px-2 py-2">
                  <div>{dataset.summary.enabledSections}</div>
                  <div className="text-[10px] uppercase text-zinc-500">enabled</div>
                </div>
                <div className="border border-zinc-200 bg-zinc-50 px-2 py-2">
                  <div>{dataset.summary.aliasOnlySections}</div>
                  <div className="text-[10px] uppercase text-zinc-500">alias</div>
                </div>
                <div className="border border-zinc-200 bg-zinc-50 px-2 py-2">
                  <div data-testid="sajik-editor-marker-count">{dataset.summary.markers}</div>
                  <div className="text-[10px] uppercase text-zinc-500">markers</div>
                </div>
              </div>
            </section>

            <section className="max-h-52 overflow-auto border border-zinc-200 bg-white shadow-sm" data-testid="sajik-editor-section-list">
              {filteredSections.map((section) => (
                <button
                  key={section.blockId}
                  type="button"
                  onClick={() => handleSelectSection(section.sectionId)}
                  className={`flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 text-left text-sm ${
                    section.sectionId === selectedSection?.sectionId ? 'bg-cyan-50 text-cyan-950' : 'bg-white text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  <span className="font-black">{section.sectionId}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{section.seatCategoryLabel}</span>
                  {dirtySectionIds.includes(section.sectionId) && (
                    <span
                      data-testid={`sajik-editor-section-dirty-${section.sectionId}`}
                      className="shrink-0 border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-700"
                    >
                      dirty
                    </span>
                  )}
                  {section.hitPathExpansionCandidate && (
                    <span
                      data-testid={`sajik-editor-section-hit-candidate-${section.sectionId}`}
                      className="shrink-0 border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-teal-700"
                    >
                      hit
                    </span>
                  )}
                  <span
                    data-testid={`sajik-editor-section-status-${section.sectionId}`}
                    className="shrink-0 border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-black uppercase text-zinc-500"
                  >
                    {statusBadgeForSection(section)}
                  </span>
                </button>
              ))}
            </section>

            <section className="border border-zinc-200 bg-white p-3 shadow-sm" data-testid="sajik-editor-selected-section">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase text-zinc-500">selected section</div>
                  <h2 className="text-lg font-black text-zinc-950">{selectedSection.sectionId}</h2>
                </div>
                <span className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-black text-zinc-600">
                  {selectedSection.enabled ? 'MAP_SELECTABLE' : 'ALIAS_ONLY'}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="font-black uppercase text-zinc-500">category</dt>
                  <dd className="font-semibold text-zinc-900">{selectedSection.seatCategoryLabel}</dd>
                </div>
                <div>
                  <dt className="font-black uppercase text-zinc-500">label point</dt>
                  <dd className="font-semibold text-zinc-900">{selectedSection.labelPoint.join(', ')}</dd>
                </div>
                <div>
                  <dt className="font-black uppercase text-zinc-500">visual points</dt>
                  <dd className="font-semibold text-zinc-900">{selectedSection.visualPolygon.length}</dd>
                </div>
                <div>
                  <dt className="font-black uppercase text-zinc-500">hit points</dt>
                  <dd className="font-semibold text-zinc-900">{selectedSection.hitPolygon.length}</dd>
                </div>
              </dl>
            </section>

            <section className="border border-zinc-200 bg-white p-3 shadow-sm" data-testid="sajik-editor-draft-controls">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase text-zinc-500">draft geometry</div>
                  <div
                    data-testid="sajik-editor-draft-status"
                    className={`text-sm font-black ${selectedDraftChanged ? 'text-amber-700' : 'text-emerald-700'}`}
                  >
                    {selectedDraftChanged ? 'draft dirty' : 'draft clean'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid="sajik-editor-reset-draft"
                    onClick={resetSelectedDraft}
                    className="inline-flex h-9 w-9 items-center justify-center border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!selectedDraftChanged}
                    aria-label="Reset selected section draft"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    data-testid="sajik-editor-reset-all-drafts"
                    onClick={resetAllDrafts}
                    className="h-9 border border-zinc-300 bg-white px-2 text-[11px] font-black uppercase text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={dirtySectionIds.length === 0}
                  >
                    all
                  </button>
                </div>
              </div>

              <div className="mt-2 text-xs font-semibold text-zinc-600" data-testid="sajik-editor-dirty-section-summary">
                dirty sections: {dirtySectionIds.length ? dirtySectionIds.join(', ') : 'none'}
              </div>
              <div
                data-testid="sajik-editor-hitpath-diff-status"
                className={`mt-2 border px-2 py-1 text-xs font-bold ${
                  selectedHitPathDiffers ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                }`}
              >
                hitPath {selectedHitPathDiffers ? 'differs from visualPath' : 'matches visualPath'}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2" data-testid="sajik-editor-path-kind-toggle">
                {(['visualPath', 'hitPath', 'labelPoint'] as const).map((target) => (
                  <button
                    key={target}
                    type="button"
                    data-testid={`sajik-editor-path-kind-${target}`}
                    onClick={() => {
                      setEditingTarget(target);
                      setSelectedVertexIndex(0);
                    }}
                    className={`border px-2 py-2 text-xs font-black ${
                      editingTarget === target
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-900'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {target}
                  </button>
                ))}
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs font-bold text-zinc-700">
                <input
                  data-testid="sajik-editor-sync-hitpath"
                  type="checkbox"
                  checked={syncHitPath}
                  onChange={(event) => setSyncHitPath(event.target.checked)}
                  className="h-4 w-4 accent-cyan-700"
                />
                visualPath edit syncs hitPath
              </label>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <label className="col-span-2 font-bold text-zinc-700">
                  vertex index
                  <input
                    data-testid="sajik-editor-vertex-index-input"
                    type="number"
                    min={0}
                    max={Math.max(0, editablePoints.length - 1)}
                    value={normalizedVertexIndex}
                    disabled={editingTarget === 'labelPoint'}
                    onChange={(event) => {
                      const nextIndex = Number(event.target.value);
                      if (Number.isFinite(nextIndex)) {
                        setSelectedVertexIndex(Math.max(0, Math.min(editablePoints.length - 1, Math.round(nextIndex))));
                      }
                    }}
                    className="mt-1 h-8 w-full border border-zinc-300 px-2 font-mono text-xs disabled:bg-zinc-100"
                  />
                </label>
                <label className="font-bold text-zinc-700">
                  step
                  <select
                    data-testid="sajik-editor-nudge-step"
                    value={nudgeStep}
                    onChange={(event) => setNudgeStep(Number(event.target.value))}
                    className="mt-1 h-8 w-full border border-zinc-300 bg-white px-2 font-mono text-xs"
                  >
                    <option value={1}>1px</option>
                    <option value={5}>5px</option>
                    <option value={10}>10px</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="text-xs font-semibold text-zinc-700" data-testid="sajik-editor-selected-vertex">
                  {editingTarget === 'labelPoint' ? 'labelPoint' : `vertex ${normalizedVertexIndex}`}: {selectedEditablePoint[0]}, {selectedEditablePoint[1]}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span />
                  <button
                    type="button"
                    data-testid="sajik-editor-nudge-y-minus"
                    onClick={() => nudgeSelectedVertex(0, -1)}
                    className="inline-flex h-8 w-8 items-center justify-center border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                    aria-label="Nudge selected vertex up"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span />
                  <button
                    type="button"
                    data-testid="sajik-editor-nudge-x-minus"
                    onClick={() => nudgeSelectedVertex(-1, 0)}
                    className="inline-flex h-8 w-8 items-center justify-center border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                    aria-label="Nudge selected vertex left"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    data-testid="sajik-editor-nudge-y-plus"
                    onClick={() => nudgeSelectedVertex(0, 1)}
                    className="inline-flex h-8 w-8 items-center justify-center border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                    aria-label="Nudge selected vertex down"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    data-testid="sajik-editor-nudge-x-plus"
                    onClick={() => nudgeSelectedVertex(1, 0)}
                    className="inline-flex h-8 w-8 items-center justify-center border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                    aria-label="Nudge selected vertex right"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  data-testid="sajik-editor-add-vertex-after"
                  onClick={addVertexAfterSelected}
                  disabled={editingTarget === 'labelPoint'}
                  className="inline-flex h-8 items-center justify-center gap-1 border border-zinc-300 bg-white px-2 text-[11px] font-black uppercase text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  add
                </button>
                <button
                  type="button"
                  data-testid="sajik-editor-delete-vertex"
                  onClick={deleteSelectedVertex}
                  disabled={editingTarget === 'labelPoint' || editablePoints.length <= 3}
                  className="inline-flex h-8 items-center justify-center gap-1 border border-zinc-300 bg-white px-2 text-[11px] font-black uppercase text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  delete
                </button>
                <button
                  type="button"
                  data-testid="sajik-editor-invalid-hitpath-fixture"
                  onClick={applyInvalidHitPathFixture}
                  className="inline-flex h-8 items-center justify-center gap-1 border border-amber-300 bg-amber-50 px-2 text-[11px] font-black uppercase text-amber-800 hover:bg-amber-100"
                >
                  <Bug className="h-3.5 w-3.5" aria-hidden="true" />
                  fail
                </button>
              </div>
            </section>

            <section className="border border-zinc-200 bg-white p-3 shadow-sm">
              <div
                data-testid={datasetIssues.length === 0 ? 'sajik-editor-validator-pass' : 'sajik-editor-validator-fail'}
                className={`flex items-center gap-2 text-sm font-black ${datasetIssues.length === 0 ? 'text-emerald-700' : 'text-amber-700'}`}
              >
                {datasetIssues.length === 0 ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                <span>{datasetIssues.length === 0 ? 'VALIDATOR PASS' : `VALIDATOR ISSUES ${datasetIssues.length}`}</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-zinc-600" data-testid="sajik-editor-selected-issue-count">
                selected issues: {selectedIssues.length}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <PathValidationStatus label="visualPath" issues={selectedVisualIssues} />
                <PathValidationStatus label="hitPath" issues={selectedHitIssues} />
              </div>
              {datasetIssues.length > 0 && (
                <ul className="mt-2 max-h-28 overflow-auto text-xs font-semibold text-zinc-700">
                  {datasetIssues.slice(0, 20).map((issue, index) => (
                    <li key={`${issue.code}-${issue.sectionId ?? issue.markerId}-${index}`} className="border-t border-zinc-100 py-1">
                      {issue.sectionId ?? issue.markerId}: {issue.pathKind ? `${issue.pathKind} ` : ''}{issue.code}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(90px,0.75fr)_minmax(90px,0.75fr)_minmax(110px,1fr)_minmax(110px,1fr)] gap-2 border border-zinc-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase text-zinc-500">export preview</div>
                  <div className="text-[11px] font-bold text-zinc-500" data-testid="sajik-editor-copy-status">
                    copy: {copyStatus}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    data-testid="sajik-editor-before-after-status"
                    className={`border px-2 py-1 text-[11px] font-black ${
                      selectedPatchChanged ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                    }`}
                  >
                    {selectedPatchChanged ? 'before != after' : 'before = after'}
                  </div>
                  <div
                    data-testid={`sajik-editor-patch-status-${selectedPatchPayload.validation.status.toLowerCase()}`}
                    className={`border px-2 py-1 text-[11px] font-black ${
                      selectedPatchPayload.validation.status === 'PASS'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    PATCH {selectedPatchPayload.validation.status}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="sajik-editor-copy-json"
                  onClick={() => copyExportPreview(selectedPatchJson)}
                  disabled={exportLocked}
                  className="inline-flex h-8 items-center justify-center gap-1 border border-zinc-300 bg-white px-2 text-xs font-black uppercase text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  JSON
                </button>
                <button
                  type="button"
                  data-testid="sajik-editor-copy-ts"
                  onClick={() => copyExportPreview(selectedPatchTs)}
                  disabled={exportLocked}
                  className="inline-flex h-8 items-center justify-center gap-1 border border-zinc-300 bg-white px-2 text-xs font-black uppercase text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  TS
                </button>
              </div>
              <pre
                data-testid="sajik-editor-patch-json"
                className="overflow-auto bg-slate-950 p-3 text-[11px] leading-relaxed text-emerald-50"
              >
                {selectedPatchJson}
              </pre>
              <pre
                data-testid="sajik-editor-ts-patch"
                className="overflow-auto bg-zinc-900 p-3 text-[11px] leading-relaxed text-amber-50"
              >
                {selectedPatchTs}
              </pre>
              <pre
                data-testid="sajik-editor-selected-json"
                className="overflow-auto bg-zinc-950 p-3 text-[11px] leading-relaxed text-cyan-50"
              >
                {selectedSectionJson}
              </pre>
              <textarea
                data-testid="sajik-editor-dataset-json"
                readOnly
                value={datasetJson}
                className="min-h-0 resize-none border border-zinc-300 bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed text-zinc-900"
              />
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
