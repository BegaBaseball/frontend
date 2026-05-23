import {
  pathToPoints,
  pointInPolygon,
  validateSeatMapPolygonPathIssues,
  type SeatMapPoint,
} from '../utils/seatMapPolygonValidator';
import type { SajikFanRole, SajikLevel, SajikSide } from './sajikSeatData';

export type SajikOperatorReferenceSourceId = 'OPERATOR_REFERENCE_2026';
export type SajikOperatorReferenceMapVersion = 'BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1';
export type SajikOperatorReferenceGeometryVersion = 'operator-reference-polygon-v1';
export type SajikOperatorReferenceTraceStatus = 'OPERATOR_APPROVED';
export type SajikOperatorReferenceMarkerType = 'WHEELCHAIR';
export type SajikOperatorReferenceMarkerInteractionStatus = 'DISPLAY_ONLY' | 'LINKED_SECTION_SELECTABLE';
export type SajikOperatorReferenceStageId = 'stage01' | 'stage02' | 'stage03' | 'stage04';
export type SajikOperatorReferencePoint = readonly [number, number];

export interface SajikOperatorReferenceImage {
  path: string;
  width: 1151;
  height: 1367;
  viewBox: '0 0 1151 1367';
  sha256: string;
  sourceStatus: 'OPERATOR_REFERENCE';
}

export interface SajikOperatorReferenceOperatorReview {
  reviewer: string;
  reviewedAt: string;
  notes: string;
}

interface SajikOperatorReferenceRawSection {
  sectionId: string;
  visualPath: string;
  hitPath: string;
  hitPathExpansionPx?: number;
  hitPathExpansionSource?: 'CENTROID_RADIAL_BUFFER_V1' | 'MANUAL_TOUCH_POLYGON_V1';
  labelPoint: SajikOperatorReferencePoint;
  geometryVersion: SajikOperatorReferenceGeometryVersion;
  traceStatus: SajikOperatorReferenceTraceStatus;
  stageId: SajikOperatorReferenceStageId;
  operatorReview: SajikOperatorReferenceOperatorReview;
}

export interface SajikOperatorReferenceDatasetSection extends SajikOperatorReferenceRawSection {
  visualPolygon: SeatMapPoint[];
  hitPolygon: SeatMapPoint[];
}

interface SajikOperatorReferenceRawMarker {
  markerId: string;
  markerType: SajikOperatorReferenceMarkerType;
  position: SajikOperatorReferencePoint;
  relatedSectionId: string;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  stageId: SajikOperatorReferenceStageId;
  source: 'IMAGE_ANALYSIS_COMPONENT';
  componentAreaPx: number;
  markerInteractionStatus: SajikOperatorReferenceMarkerInteractionStatus;
}

export interface SajikOperatorReferenceDatasetMarker extends SajikOperatorReferenceRawMarker {
  enabled: boolean;
}

export interface SajikOperatorReferenceSeatMapDataset {
  stadiumId: 'BUSAN_SAJIK';
  sourceId: SajikOperatorReferenceSourceId;
  mapVersion: SajikOperatorReferenceMapVersion;
  coordinateSystem: 'SVG_VIEW_BOX';
  runtimeSelectionEnabled: boolean;
  image: SajikOperatorReferenceImage;
  summary: {
    sections: number;
    markers: number;
    stageCount: number;
  };
  sections: SajikOperatorReferenceDatasetSection[];
  markers: SajikOperatorReferenceDatasetMarker[];
}

export interface SajikOperatorReferenceSectionMetadataOverride {
  sectionId: string;
  level: SajikLevel;
  category: string;
  name: string;
  side: SajikSide;
  fanRole: SajikFanRole;
  sourceNote: string;
}

export const SAJIK_OPERATOR_REFERENCE_RUNTIME_SELECTION_ENABLED = true;

export const SAJIK_OPERATOR_REFERENCE_SECTION_METADATA_OVERRIDES = [
  {
    "sectionId": "323",
    "level": "3F",
    "category": "INFIELD_UPPER_3A",
    "name": "3루 내야상단석A 323블록",
    "side": "THIRD_BASE",
    "fanRole": "HOME",
    "sourceNote": "Operator reference image에서만 확인되는 323블록입니다. 기존 롯데 공식 960x640 production 좌석도에는 독립 블록으로 렌더링하지 않습니다."
  },
  {
    "sectionId": "322",
    "level": "3F",
    "category": "INFIELD_UPPER_3A",
    "name": "3루 내야상단석A 322블록",
    "side": "THIRD_BASE",
    "fanRole": "HOME",
    "sourceNote": "Operator reference image에서만 확인되는 322블록입니다. 기존 롯데 공식 960x640 production 좌석도에는 독립 블록으로 렌더링하지 않습니다."
  },
  {
    "sectionId": "921",
    "level": "OUTFIELD",
    "category": "OUTFIELD_1B",
    "name": "1루 외야석 921블록",
    "side": "FIRST_BASE",
    "fanRole": "NEUTRAL",
    "sourceNote": "Operator reference image에서만 확인되는 921블록입니다. 기존 롯데 공식 960x640 production 좌석도에는 독립 블록으로 렌더링하지 않습니다."
  }
] as const satisfies readonly SajikOperatorReferenceSectionMetadataOverride[];

export const SAJIK_OPERATOR_REFERENCE_IMAGE = {
  "path": "src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png",
  "width": 1151,
  "height": 1367,
  "viewBox": "0 0 1151 1367",
  "sha256": "b82d84a827c9b8aed64d8c0355e59e57fc00d54495d501e1fbd5a7866e304db0",
  "sourceStatus": "OPERATOR_REFERENCE"
} as const satisfies SajikOperatorReferenceImage;

const RAW_SECTIONS = [
  {
    "sectionId": "024",
    "visualPath": "M 396 1038 L 483 1069 L 473 1119 L 418 1103 L 381 1086 Z",
    "hitPath": "M 394.2 1035.6 L 485.9 1068.2 L 475.3 1120.9 L 416.4 1105.6 L 378 1086.2 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      432,
      1079
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "023",
    "visualPath": "M 486 1070 L 546 1082 L 580 1084 L 581 1131 L 527 1129 L 477 1120 Z",
    "hitPath": "M 483.5 1068.3 L 547.6 1079.5 L 582.8 1082.9 L 583.6 1132.5 L 526.4 1131.9 L 474.1 1120.9 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      530,
      1103
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "022",
    "visualPath": "M 679 1069 L 690 1120 L 639 1129 L 587 1131 L 588 1084 L 621 1082 Z",
    "hitPath": "M 681.4 1067.2 L 692.9 1120.9 L 639.6 1131.9 L 584.4 1132.6 L 585.2 1082.9 L 619.4 1079.5 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      637,
      1103
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "021",
    "visualPath": "M 769 1037 L 786 1085 L 733 1108 L 695 1118 L 684 1068 L 737 1052 L 767 1038 L 770 1040 Z",
    "hitPath": "M 771 1034 L 789 1087 L 734 1111 L 693 1121 L 681 1066 L 736 1049 L 766 1035 L 769 1035 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "MANUAL_TOUCH_POLYGON_V1",
    "labelPoint": [
      734,
      1078
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "044",
    "visualPath": "M 257 1087 L 292 1109 L 341 1140 L 409 1168 L 408 1183 L 338 1168 L 262 1141 L 236 1121 Z",
    "hitPath": "M 254.7 1085 L 290.1 1106.7 L 344 1140 L 411.9 1168.9 L 410.7 1184.3 L 339.7 1170.4 L 259 1141.1 L 233.1 1120.3 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      313,
      1139
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Stage01 precision patch: removed tiny extraction-noise vertices while preserving the 044 curved band outer boundary."
    }
  },
  {
    "sectionId": "034",
    "visualPath": "M 379 1093 L 430 1114 L 471 1125 L 461 1180 L 406 1164 L 364 1146 Z",
    "hitPath": "M 377 1090.8 L 431.3 1111.3 L 473.9 1124.3 L 463.1 1182.1 L 404.7 1166.7 L 361 1146.5 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      418,
      1138
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "033",
    "visualPath": "M 475 1127 L 531 1136 L 581 1138 L 582 1196 L 531 1193 L 466 1182 Z",
    "hitPath": "M 472.5 1125.3 L 531.4 1133 L 583.7 1136.8 L 584.5 1197.6 L 531.3 1196 L 463.1 1182.9 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      526,
      1162
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "032",
    "visualPath": "M 689 1126 L 693 1126 L 704 1181 L 639 1193 L 588 1195 L 587 1138 L 636 1136 Z",
    "hitPath": "M 691.4 1124.2 L 695.5 1124.3 L 706.7 1182.2 L 638.3 1195.9 L 585.5 1196.6 L 584.1 1137.1 L 634.5 1133.4 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      643,
      1162
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "031",
    "visualPath": "M 787 1091 L 805 1145 L 758 1165 L 708 1179 L 697 1125 L 761 1106 Z",
    "hitPath": "M 788.8 1088.6 L 807.9 1145.6 L 758.5 1168 L 705.9 1181.1 L 694 1124.5 L 761.8 1103.1 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      750,
      1136
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "041",
    "visualPath": "M 909 1082 L 932 1118 L 906 1139 L 832 1166 L 763 1183 L 761 1167 L 834 1137 L 882 1106 Z",
    "hitPath": "M 911.1 1079.9 L 934.9 1117.3 L 909 1139.1 L 830.3 1168.4 L 760.3 1184.4 L 758.1 1167.9 L 831 1137 L 884.1 1103.8 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      856,
      1137
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Stage01 precision patch: removed tiny extraction-noise vertices while preserving the 041 curved band outer boundary."
    }
  },
  {
    "sectionId": "057",
    "visualPath": "M 259 1145 L 373 1181 L 342 1276 L 296 1242 L 239 1185 Z",
    "hitPath": "M 257.3 1142.5 L 375.8 1180 L 343.5 1278.6 L 295.5 1245 L 236.2 1184.1 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      309,
      1203
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "056",
    "visualPath": "M 381 1183 L 492 1203 L 472 1342 L 423 1325 L 348 1282 Z",
    "hitPath": "M 379.7 1180.3 L 494.2 1201 L 473.6 1344.5 L 423 1328 L 345.1 1282.6 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      425,
      1257
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "055",
    "visualPath": "M 499 1203 L 552 1208 L 546 1357 L 480 1345 Z",
    "hitPath": "M 498.2 1200.1 L 553.3 1205.3 L 547 1359.8 L 478.5 1347.6 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      519,
      1281
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "054",
    "visualPath": "M 560 1208 L 612 1208 L 623 1358 L 553 1358 Z",
    "hitPath": "M 559 1205.2 L 612.9 1205.2 L 624.3 1360.7 L 551.8 1360.7 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      587,
      1286
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "053",
    "visualPath": "M 666 1203 L 674 1205 L 695 1344 L 630 1357 L 620 1208 Z",
    "hitPath": "M 666.4 1200 L 674.8 1202.1 L 696.3 1346.7 L 629.2 1359.9 L 618.3 1205.5 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      654,
      1281
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "052",
    "visualPath": "M 788 1181 L 824 1280 L 767 1316 L 702 1341 L 680 1202 Z",
    "hitPath": "M 789.2 1178.2 L 826.9 1280.7 L 767.8 1318.9 L 700.4 1343.5 L 677.7 1200 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      747,
      1256
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "051",
    "visualPath": "M 907 1142 L 930 1182 L 872 1242 L 830 1274 L 797 1179 L 858 1162 Z",
    "hitPath": "M 908.8 1139.6 L 932.9 1181.3 L 872.4 1245 L 828.7 1276.7 L 794.1 1178.2 L 857.4 1159.1 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      861,
      1200
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage01",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage01 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "127",
    "visualPath": "M 1037 448 L 1041 449 L 1048 475 L 1059 545 L 1016 550 L 1000 461 Z",
    "hitPath": "M 1037.3 445 L 1041.6 446.1 L 1050.2 473 L 1060.2 547.7 L 1015.2 552.9 L 997.7 459.1 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      1030,
      491
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Stage02 precision patch: wheelchair icon is handled by the marker layer, so 127 seat polygon traces the continuous seat block instead of cutting around the icon."
    }
  },
  {
    "sectionId": "137",
    "visualPath": "M 1094 428 L 1098 429 L 1103 445 L 1121 536 L 1067 543 L 1062 502 L 1048 445 Z",
    "hitPath": "M 1094.6 425.1 L 1098.8 426.1 L 1104.5 442.4 L 1122.5 538.6 L 1066.2 545.9 L 1060.1 504.3 L 1045.7 443.1 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      1088,
      494
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "116",
    "visualPath": "M 1002 528 L 1011 593 L 1009 650 L 921 643 L 968 550 Z",
    "hitPath": "M 1002.9 525.1 L 1014 593 L 1010.3 652.7 L 918.7 644.9 L 967.1 547.2 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      976,
      600
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "126",
    "visualPath": "M 1055 549 L 1060 549 L 1062 571 L 1060 653 L 1018 651 L 1016 555 Z",
    "hitPath": "M 1055.7 546.1 L 1061.1 546.2 L 1064.1 568.9 L 1060.7 655.9 L 1016.8 653.8 L 1014 552.8 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      1040,
      601
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "136",
    "visualPath": "M 1117 541 L 1123 542 L 1126 564 L 1129 660 L 1067 655 L 1068 548 Z",
    "hitPath": "M 1117.8 538.1 L 1124.2 539.2 L 1128.1 561.9 L 1129.9 662.9 L 1065.6 657.6 L 1065.9 545.9 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      1098,
      602
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "115",
    "visualPath": "M 918 646 L 1009 654 L 994 744 L 886 709 Z",
    "hitPath": "M 916.1 643.7 L 1011.6 652.5 L 995.8 746.4 L 883.1 709.9 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      954,
      690
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "125",
    "visualPath": "M 1017 655 L 1059 658 L 1040 759 L 1001 747 Z",
    "hitPath": "M 1016.3 652.1 L 1060.6 655.5 L 1040.6 761.9 L 999.3 749.5 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      1029,
      712
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "135",
    "visualPath": "M 1067 660 L 1129 665 L 1125 727 L 1116 783 L 1047 762 Z",
    "hitPath": "M 1065.7 657.3 L 1130.5 662.4 L 1127.9 727.8 L 1116.9 785.9 L 1044.7 764 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      1094,
      715
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "114",
    "visualPath": "M 883 713 L 992 748 L 981 786 L 961 831 L 877 780 L 894 747 L 873 734 Z",
    "hitPath": "M 881.1 710.7 L 994.9 747.4 L 983.8 787.1 L 962.5 833.6 L 874.2 781.1 L 891.4 745.6 L 870.4 732.5 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      933,
      768
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "124",
    "visualPath": "M 1000 752 L 1039 764 L 1005 857 L 969 837 Z",
    "hitPath": "M 999.8 749 L 1041 761.8 L 1005.1 860 L 966.9 839.1 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      1001,
      811
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "134",
    "visualPath": "M 1046 766 L 1114 788 L 1101 850 L 1084 905 L 1012 862 Z",
    "hitPath": "M 1045 763.2 L 1116 785.8 L 1103.6 851.4 L 1084.5 908 L 1009.3 863.3 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      1065,
      832
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "113",
    "visualPath": "M 874 784 L 959 835 L 910 914 L 819 836 L 833 810 L 855 823 Z",
    "hitPath": "M 873.9 781 L 962 835 L 911.2 916.8 L 816 836.1 L 830.4 808.5 L 852.4 821.6 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      892,
      846
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "123",
    "visualPath": "M 966 840 L 1002 863 L 971 918 L 946 948 L 929 902 Z",
    "hitPath": "M 966.2 837 L 1004.3 861.1 L 972 920.8 L 945.1 950.9 L 926.1 902.7 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      966,
      886
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Stage02 precision patch: wheelchair icon is handled by the marker layer, so 123 seat polygon traces the continuous seat block instead of cutting around the icon."
    }
  },
  {
    "sectionId": "133",
    "visualPath": "M 1009 866 L 1051 892 L 1023 944 L 992 988 L 955 952 L 982 916 Z",
    "hitPath": "M 1009.3 863 L 1053.5 890.3 L 1025.3 945.9 L 991.5 991 L 952.4 953.4 L 979.3 914.6 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      999,
      932
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "143",
    "visualPath": "M 1055 894 L 1081 908 L 1082 913 L 1052 989 L 1033 1024 L 997 990 L 1026 949 Z",
    "hitPath": "M 1055.4 891 L 1082.8 905.6 L 1084 910.8 L 1052.4 992 L 1032.4 1026.9 L 994.6 991.8 L 1023 948.5 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      1041,
      959
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "112",
    "visualPath": "M 817 840 L 906 917 L 849 977 L 792 891 Z",
    "hitPath": "M 816 837.2 L 909 917.5 L 849.3 980 L 789.1 890.1 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      844,
      908
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "122",
    "visualPath": "M 912 924 L 945 953 L 877 1023 L 853 984 Z",
    "hitPath": "M 912.9 921.1 L 947.8 952 L 875.9 1025.8 L 850.1 984.9 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      904,
      967
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Stage02 precision patch: wheelchair icon is handled by the marker layer, so 122 seat polygon traces the continuous seat block instead of cutting around the icon."
    }
  },
  {
    "sectionId": "132",
    "visualPath": "M 950 958 L 990 993 L 949 1040 L 910 1075 L 882 1029 L 931 982 Z",
    "hitPath": "M 950.8 955.1 L 992.8 992 L 950.3 1042.7 L 908.9 1077.8 L 879.1 1029.9 L 930.6 979 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      930,
      1019
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "111",
    "visualPath": "M 789 895 L 844 981 L 784 1020 L 756 957 Z",
    "hitPath": "M 788.8 892 L 846.8 982 L 783.5 1023 L 753 956.5 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      796,
      962
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "121",
    "visualPath": "M 848 988 L 874 1027 L 826 1062 L 789 1082 L 774 1035 L 813 1014 Z",
    "hitPath": "M 849.5 985.4 L 877 1026.6 L 826.6 1064.9 L 787.3 1084.5 L 771 1035 L 812 1011.2 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      822,
      1034
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "131",
    "visualPath": "M 877 1032 L 907 1079 L 868 1109 L 809 1143 L 792 1089 L 847 1057 Z",
    "hitPath": "M 878.4 1029.3 L 910 1078.7 L 869.8 1111.4 L 807.3 1145.5 L 789 1089.2 L 846.7 1054 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      847,
      1088
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "142",
    "visualPath": "M 993 996 L 1032 1030 L 985 1110 L 935 1174 L 915 1136 L 937 1117 L 913 1079 L 963 1032 Z",
    "hitPath": "M 994.1 993.2 L 1034.4 1028.2 L 987.1 1112.1 L 934.2 1176.9 L 913.1 1138.3 L 935.3 1119.5 L 910 1078.7 L 963.2 1029 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      968,
      1078
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage02",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage02 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "734",
    "visualPath": "M 397 49 L 418 108 L 379 123 L 329 150 L 301 97 L 346 71 Z",
    "hitPath": "M 398.7 46.5 L 421 108.4 L 380.8 125.4 L 327.4 152.5 L 298 96.9 L 344.6 68.4 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      361,
      98
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "724",
    "visualPath": "M 466 101 L 470 104 L 477 143 L 429 158 L 353 194 L 334 156 L 401 122 Z",
    "hitPath": "M 468.3 99.1 L 472.5 102.3 L 480 143.2 L 430.5 160.6 L 350.7 195.9 L 331.1 156.6 L 398.9 119.9 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      406,
      145
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "733",
    "visualPath": "M 296 100 L 325 153 L 270 193 L 210 252 L 170 211 L 230 150 Z",
    "hitPath": "M 297.5 97.4 L 327.9 152.1 L 272.3 194.9 L 208.6 254.6 L 167.2 212.2 L 228.2 147.6 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      248,
      175
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "723",
    "visualPath": "M 328 160 L 350 199 L 297 236 L 245 286 L 217 257 L 275 199 Z",
    "hitPath": "M 329.7 157.5 L 352.8 198 L 299 238.2 L 243.4 288.5 L 214.3 258.3 L 273.8 196.2 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      284,
      222
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "732",
    "visualPath": "M 166 217 L 208 257 L 182 288 L 148 340 L 98 311 L 132 258 Z",
    "hitPath": "M 166.5 214 L 210.8 255.9 L 184.8 289 L 147.6 343 L 95.4 312.5 L 129.7 256 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      153,
      279
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "722",
    "visualPath": "M 213 262 L 242 291 L 189 364 L 156 342 Z",
    "hitPath": "M 213.7 259.1 L 244.6 289.5 L 188.3 366.9 L 153.4 343.6 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      198,
      314
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "338",
    "visualPath": "M 96 315 L 147 344 L 124 388 L 104 443 L 52 426 L 64 383 Z",
    "hitPath": "M 95.9 312 L 149.3 342.1 L 127 388.5 L 104.3 446 L 49.8 428 L 61 383 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      97,
      380
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "721",
    "visualPath": "M 152 349 L 188 370 L 168 410 L 153 459 L 149 459 L 113 447 L 111 443 L 130 392 Z",
    "hitPath": "M 152.3 346 L 190 367.8 L 170.9 409.2 L 153.5 462 L 149.2 462 L 110.8 449.1 L 108.6 444.8 L 128.4 389.5 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      148,
      405
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "337",
    "visualPath": "M 50 430 L 102 447 L 90 496 L 84 546 L 28 539 Z",
    "hitPath": "M 49 427.2 L 103.7 444.5 L 92.9 496.7 L 84.7 548.9 L 26 541.2 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      63,
      490
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "327",
    "visualPath": "M 109 450 L 151 464 L 135 553 L 92 547 L 97 500 Z",
    "hitPath": "M 108.6 447 L 153 461.7 L 136 555.8 L 90.5 549.6 L 94 499.6 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      120,
      503
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "316",
    "visualPath": "M 147 531 L 182 549 L 233 644 L 144 652 L 142 579 Z",
    "hitPath": "M 145.9 528.2 L 182.8 546.1 L 235.3 645.9 L 142.8 654.8 L 139.2 577.8 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      175,
      602
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "326",
    "visualPath": "M 91 552 L 135 557 L 135 654 L 93 656 Z",
    "hitPath": "M 89.8 549.2 L 136.2 554.3 L 136.2 656.7 L 91.9 658.8 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      112,
      604
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "336",
    "visualPath": "M 27 544 L 83 550 L 85 658 L 23 663 L 22 604 Z",
    "hitPath": "M 26 541.2 L 84.6 547.5 L 86.7 660.5 L 21.8 665.8 L 19 604 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      52,
      604
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "315",
    "visualPath": "M 225 649 L 237 649 L 270 710 L 162 746 L 145 657 Z",
    "hitPath": "M 226.4 646.3 L 239 646.7 L 272.7 711.2 L 160.3 748.4 L 142.2 655.9 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      201,
      692
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "325",
    "visualPath": "M 131 658 L 137 658 L 154 750 L 116 762 L 95 662 Z",
    "hitPath": "M 131.3 655 L 137.8 655.1 L 155.4 752.7 L 115.5 765 L 93 659.7 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      126,
      716
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "335",
    "visualPath": "M 73 663 L 86 663 L 108 765 L 40 787 L 23 668 Z",
    "hitPath": "M 73.4 660 L 87.2 660.2 L 109.8 767.4 L 39 789.8 L 20.8 665.9 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      59,
      718
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "314",
    "visualPath": "M 271 714 L 285 739 L 268 749 L 284 780 L 197 833 L 164 751 Z",
    "hitPath": "M 272.5 711.4 L 287.6 737.6 L 270.7 747.6 L 286.7 781.3 L 195.3 835.5 L 161 750.6 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      225,
      769
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "324",
    "visualPath": "M 153 754 L 190 836 L 157 860 L 143 835 L 118 769 L 120 765 Z",
    "hitPath": "M 153.4 751 L 192.4 837.8 L 157.5 863 L 142.6 838 L 116.1 766.7 L 118.3 762.5 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      156,
      813
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Stage03 precision patch: wheelchair icon is handled by the marker layer, so 324 seat polygon traces the continuous seat block instead of cutting around the icon."
    }
  },
  {
    "sectionId": "334",
    "visualPath": "M 108 769 L 148 865 L 76 909 L 41 792 Z",
    "hitPath": "M 108.7 766.1 L 150.6 866.5 L 75.3 911.9 L 38.7 790.1 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      92,
      835
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "313",
    "visualPath": "M 286 783 L 301 811 L 321 800 L 341 837 L 252 916 L 200 838 Z",
    "hitPath": "M 286.2 780 L 303 808.8 L 323.3 798.1 L 344 837.3 L 251 918.8 L 197 838.3 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      269,
      846
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "323",
    "visualPath": "M 192 842 L 221 890 L 246 921 L 215 951 L 183 910 L 158 866 Z",
    "hitPath": "M 191.4 839.1 L 223.8 889 L 248.6 922.5 L 215.7 953.9 L 180.5 911.7 L 155.5 864.3 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      197,
      890
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "312",
    "visualPath": "M 342 841 L 370 893 L 315 979 L 256 919 Z",
    "hitPath": "M 342.9 838.1 L 372.9 892.1 L 314.8 982 L 253 919.5 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      317,
      910
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "333",
    "visualPath": "M 150 869 L 175 912 L 208 955 L 172 990 L 140 949 L 110 896 Z",
    "hitPath": "M 149.5 866 L 177.1 909.8 L 210.6 956.4 L 172.6 992.9 L 138 951.2 L 107.5 894.3 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      162,
      935
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "343",
    "visualPath": "M 104 897 L 138 955 L 166 993 L 131 1027 L 112 995 L 78 916 Z",
    "hitPath": "M 103.2 894.1 L 140.6 953.6 L 168.5 994.6 L 131.4 1030 L 111.1 997.9 L 76 913.8 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      120,
      962
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "322",
    "visualPath": "M 248 926 L 312 986 L 289 1025 L 267 1008 L 217 955 Z",
    "hitPath": "M 247 923.2 L 315 986.4 L 290.3 1027.7 L 267 1011 L 214.3 953.6 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      265,
      974
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "311",
    "visualPath": "M 372 896 L 408 958 L 380 1022 L 320 983 Z",
    "hitPath": "M 372.1 893 L 411 957.5 L 380.5 1025 L 317.2 984 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      367,
      964
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "332",
    "visualPath": "M 211 960 L 284 1031 L 257 1078 L 229 1056 L 173 996 Z",
    "hitPath": "M 210.1 957.1 L 287 1031.4 L 258.3 1080.7 L 228.8 1059 L 170.3 994.7 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      229,
      1018
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "321",
    "visualPath": "M 314 990 L 391 1036 L 378 1084 L 335 1061 L 292 1029 Z",
    "hitPath": "M 312.5 987.4 L 394 1035.8 L 379.9 1086.3 L 334.1 1063.8 L 289.1 1028.4 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      343,
      1037
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "342",
    "visualPath": "M 169 998 L 216 1050 L 253 1081 L 231 1119 L 253 1138 L 233 1177 L 182 1114 L 132 1033 Z",
    "hitPath": "M 167.8 995.3 L 216.6 1047.1 L 256 1080.5 L 232.8 1121.4 L 255 1140.2 L 233.8 1179.9 L 179.8 1116.1 L 129.6 1031.2 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      197,
      1081
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "331",
    "visualPath": "M 287 1035 L 333 1068 L 375 1091 L 360 1144 L 311 1118 L 259 1081 Z",
    "hitPath": "M 285.4 1032.5 L 334.5 1065.4 L 378 1091.1 L 361.8 1146.4 L 310 1120.8 L 256 1080.6 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      319,
      1090
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage03",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage03 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "925",
    "visualPath": "M 677 100 L 728 114 L 766 130 L 751 171 L 669 142 Z",
    "hitPath": "M 674.6 98.2 L 729.5 111.4 L 769 129.9 L 752.9 173.3 L 666.1 142.6 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      716,
      134
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage04",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage04 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "934",
    "visualPath": "M 798 70 L 842 94 L 892 130 L 861 178 L 822 151 L 775 126 Z",
    "hitPath": "M 796.4 67.4 L 843 91.2 L 895 130.3 L 862.4 180.6 L 821 153.8 L 772 126.1 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      832,
      123
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage04",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage04 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "924",
    "visualPath": "M 772 133 L 815 156 L 855 184 L 832 220 L 755 174 Z",
    "hitPath": "M 770.1 130.7 L 816.4 153.3 L 857.9 184.6 L 833.5 222.6 L 752 174 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      803,
      176
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage04",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage04 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "933",
    "visualPath": "M 895 134 L 927 160 L 975 211 L 937 251 L 864 182 Z",
    "hitPath": "M 893.7 131.3 L 927.8 157.1 L 977.8 212.2 L 937.8 253.9 L 861 181.7 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      919,
      192
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage04",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage04 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "923",
    "visualPath": "M 859 188 L 930 255 L 904 284 L 836 225 Z",
    "hitPath": "M 857.7 185.3 L 932.8 256 L 905.3 286.7 L 833.1 224.2 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      882,
      236
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage04",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Stage04 precision patch: 923 candidate followed text/label noise inside the small pink block, so the corrected polygon now traces only the outer seat-block boundary."
    }
  },
  {
    "sectionId": "932",
    "visualPath": "M 978 216 L 1012 257 L 1046 309 L 1001 338 L 940 257 Z",
    "hitPath": "M 977.2 213.1 L 1014 254.8 L 1048.5 310.7 L 1001.3 341 L 937.2 256.1 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      992,
      278
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage04",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage04 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "922",
    "visualPath": "M 932 261 L 952 282 L 992 340 L 960 362 L 906 289 Z",
    "hitPath": "M 931 258.2 L 952.4 279 L 994.4 341.8 L 960.6 364.9 L 903.2 287.8 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      948,
      312
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage04",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage04 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "931",
    "visualPath": "M 1048 315 L 1077 370 L 1096 423 L 1046 441 L 1030 397 L 1002 342 Z",
    "hitPath": "M 1047.9 312 L 1079.8 368.8 L 1098.2 425 L 1045.8 444 L 1027.6 398.9 L 999.7 340.1 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      1050,
      378
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage04",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage04 overlay crop. Production Sajik official map remains unchanged."
    }
  },
  {
    "sectionId": "921",
    "visualPath": "M 993 347 L 1019 391 L 1038 440 L 1035 445 L 1000 457 L 961 368 Z",
    "hitPath": "M 992.3 344.1 L 1020.7 388.5 L 1040.1 442.2 L 1036.8 447.4 L 999.5 460 L 958.7 366 Z",
    "hitPathExpansionPx": 3,
    "hitPathExpansionSource": "CENTROID_RADIAL_BUFFER_V1",
    "labelPoint": [
      1000,
      403
    ],
    "geometryVersion": "operator-reference-polygon-v1",
    "traceStatus": "OPERATOR_APPROVED",
    "stageId": "stage04",
    "operatorReview": {
      "reviewer": "CODEX_IMAGE_ANALYSIS",
      "reviewedAt": "2026-05-19T00:00:00.000+09:00",
      "notes": "Approved after visual comparison against stage04 overlay crop. Production Sajik official map remains unchanged."
    }
  }
] as const satisfies readonly SajikOperatorReferenceRawSection[];

const RAW_MARKERS = [
  {
    "markerId": "stage02-wheelchair-01",
    "markerType": "WHEELCHAIR",
    "position": [
      1072,
      458
    ],
    "relatedSectionId": "137",
    "bounds": {
      "minX": 1059,
      "minY": 446,
      "maxX": 1085,
      "maxY": 471
    },
    "stageId": "stage02",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 551,
    "markerInteractionStatus": "LINKED_SECTION_SELECTABLE"
  },
  {
    "markerId": "stage02-wheelchair-02",
    "markerType": "WHEELCHAIR",
    "position": [
      1032,
      527
    ],
    "relatedSectionId": "127",
    "bounds": {
      "minX": 1019,
      "minY": 514,
      "maxX": 1045,
      "maxY": 540
    },
    "stageId": "stage02",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 563,
    "markerInteractionStatus": "DISPLAY_ONLY"
  },
  {
    "markerId": "stage02-wheelchair-03",
    "markerType": "WHEELCHAIR",
    "position": [
      1035,
      678
    ],
    "relatedSectionId": "125",
    "bounds": {
      "minX": 1022,
      "minY": 665,
      "maxX": 1048,
      "maxY": 691
    },
    "stageId": "stage02",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 564,
    "markerInteractionStatus": "LINKED_SECTION_SELECTABLE"
  },
  {
    "markerId": "stage02-wheelchair-04",
    "markerType": "WHEELCHAIR",
    "position": [
      1074,
      745
    ],
    "relatedSectionId": "135",
    "bounds": {
      "minX": 1061,
      "minY": 732,
      "maxX": 1086,
      "maxY": 758
    },
    "stageId": "stage02",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 554,
    "markerInteractionStatus": "LINKED_SECTION_SELECTABLE"
  },
  {
    "markerId": "stage02-wheelchair-05",
    "markerType": "WHEELCHAIR",
    "position": [
      1013,
      775
    ],
    "relatedSectionId": "124",
    "bounds": {
      "minX": 1001,
      "minY": 762,
      "maxX": 1026,
      "maxY": 788
    },
    "stageId": "stage02",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 557,
    "markerInteractionStatus": "DISPLAY_ONLY"
  },
  {
    "markerId": "stage02-wheelchair-06",
    "markerType": "WHEELCHAIR",
    "position": [
      1020,
      897
    ],
    "relatedSectionId": "133",
    "bounds": {
      "minX": 1007,
      "minY": 884,
      "maxX": 1032,
      "maxY": 909
    },
    "stageId": "stage02",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 545,
    "markerInteractionStatus": "DISPLAY_ONLY"
  },
  {
    "markerId": "stage02-wheelchair-07",
    "markerType": "WHEELCHAIR",
    "position": [
      940,
      917
    ],
    "relatedSectionId": "123",
    "bounds": {
      "minX": 928,
      "minY": 904,
      "maxX": 953,
      "maxY": 930
    },
    "stageId": "stage02",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 554,
    "markerInteractionStatus": "DISPLAY_ONLY"
  },
  {
    "markerId": "stage02-wheelchair-08",
    "markerType": "WHEELCHAIR",
    "position": [
      877,
      989
    ],
    "relatedSectionId": "122",
    "bounds": {
      "minX": 864,
      "minY": 976,
      "maxX": 890,
      "maxY": 1001
    },
    "stageId": "stage02",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 558,
    "markerInteractionStatus": "DISPLAY_ONLY"
  },
  {
    "markerId": "stage02-wheelchair-09",
    "markerType": "WHEELCHAIR",
    "position": [
      954,
      991
    ],
    "relatedSectionId": "132",
    "bounds": {
      "minX": 941,
      "minY": 978,
      "maxX": 967,
      "maxY": 1004
    },
    "stageId": "stage02",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 557,
    "markerInteractionStatus": "LINKED_SECTION_SELECTABLE"
  },
  {
    "markerId": "stage03-wheelchair-01",
    "markerType": "WHEELCHAIR",
    "position": [
      118,
      681
    ],
    "relatedSectionId": "325",
    "bounds": {
      "minX": 105,
      "minY": 667,
      "maxX": 131,
      "maxY": 694
    },
    "stageId": "stage03",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 579,
    "markerInteractionStatus": "LINKED_SECTION_SELECTABLE"
  },
  {
    "markerId": "stage03-wheelchair-02",
    "markerType": "WHEELCHAIR",
    "position": [
      82,
      750
    ],
    "relatedSectionId": "335",
    "bounds": {
      "minX": 69,
      "minY": 737,
      "maxX": 94,
      "maxY": 763
    },
    "stageId": "stage03",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 563,
    "markerInteractionStatus": "LINKED_SECTION_SELECTABLE"
  },
  {
    "markerId": "stage03-wheelchair-03",
    "markerType": "WHEELCHAIR",
    "position": [
      142,
      779
    ],
    "relatedSectionId": "324",
    "bounds": {
      "minX": 128,
      "minY": 767,
      "maxX": 155,
      "maxY": 793
    },
    "stageId": "stage03",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 579,
    "markerInteractionStatus": "DISPLAY_ONLY"
  },
  {
    "markerId": "stage03-wheelchair-04",
    "markerType": "WHEELCHAIR",
    "position": [
      140,
      902
    ],
    "relatedSectionId": "333",
    "bounds": {
      "minX": 127,
      "minY": 889,
      "maxX": 153,
      "maxY": 915
    },
    "stageId": "stage03",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 576,
    "markerInteractionStatus": "LINKED_SECTION_SELECTABLE"
  },
  {
    "markerId": "stage03-wheelchair-05",
    "markerType": "WHEELCHAIR",
    "position": [
      216,
      919
    ],
    "relatedSectionId": "323",
    "bounds": {
      "minX": 203,
      "minY": 906,
      "maxX": 229,
      "maxY": 932
    },
    "stageId": "stage03",
    "source": "IMAGE_ANALYSIS_COMPONENT",
    "componentAreaPx": 579,
    "markerInteractionStatus": "LINKED_SECTION_SELECTABLE"
  }
] as const satisfies readonly SajikOperatorReferenceRawMarker[];

function toSeatMapPoint(point: SajikOperatorReferencePoint): SeatMapPoint {
  return [point[0], point[1]];
}

export const SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET: SajikOperatorReferenceSeatMapDataset = {
  stadiumId: 'BUSAN_SAJIK',
  sourceId: 'OPERATOR_REFERENCE_2026',
  mapVersion: 'BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1',
  coordinateSystem: 'SVG_VIEW_BOX',
  runtimeSelectionEnabled: SAJIK_OPERATOR_REFERENCE_RUNTIME_SELECTION_ENABLED,
  image: SAJIK_OPERATOR_REFERENCE_IMAGE,
  summary: {
    sections: RAW_SECTIONS.length,
    markers: RAW_MARKERS.length,
    stageCount: 4,
  },
  sections: RAW_SECTIONS.map((section) => ({
    ...section,
    visualPolygon: pathToPoints(section.visualPath),
    hitPolygon: pathToPoints(section.hitPath),
  })),
  markers: RAW_MARKERS.map((marker) => ({
    ...marker,
    enabled: marker.markerInteractionStatus === 'LINKED_SECTION_SELECTABLE',
  })),
};

export function validateSajikOperatorReferenceSeatMapDataset(
  dataset: SajikOperatorReferenceSeatMapDataset = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET,
): string[] {
  const issues: string[] = [];
  const sectionIds = new Set<string>();

  dataset.sections.forEach((section) => {
    if (sectionIds.has(section.sectionId)) {
      issues.push(`${section.sectionId}:DUPLICATE_SECTION_ID`);
    }
    sectionIds.add(section.sectionId);

    const labelPoint = toSeatMapPoint(section.labelPoint);
    validateSeatMapPolygonPathIssues({
      pathData: section.visualPath,
      width: dataset.image.width,
      height: dataset.image.height,
      labelPoint,
      sectionId: section.sectionId,
      pathKind: 'visualPath',
    }).forEach((issue) => issues.push(`${section.sectionId}:visualPath:${issue.code}`));
    validateSeatMapPolygonPathIssues({
      pathData: section.hitPath,
      width: dataset.image.width,
      height: dataset.image.height,
      labelPoint,
      sectionId: section.sectionId,
      pathKind: 'hitPath',
    }).forEach((issue) => issues.push(`${section.sectionId}:hitPath:${issue.code}`));
    if (section.visualPath !== section.hitPath) {
      const isKnownHitPathExpansionSource = section.hitPathExpansionSource === 'CENTROID_RADIAL_BUFFER_V1'
        || section.hitPathExpansionSource === 'MANUAL_TOUCH_POLYGON_V1';
      if (section.hitPathExpansionPx !== 3 || !isKnownHitPathExpansionSource) {
        issues.push(`${section.sectionId}:HITPATH_EXPANSION_METADATA_REQUIRED`);
      }
    } else if (section.hitPathExpansionPx !== undefined || section.hitPathExpansionSource !== undefined) {
      issues.push(`${section.sectionId}:UNUSED_HITPATH_EXPANSION_METADATA`);
    }
  });

  dataset.markers.forEach((marker) => {
    const [x, y] = marker.position;
    if (x < 0 || x > dataset.image.width || y < 0 || y > dataset.image.height) {
      issues.push(`${marker.markerId}:MARKER_OUT_OF_BOUNDS`);
    }
    if (!sectionIds.has(marker.relatedSectionId)) {
      issues.push(`${marker.markerId}:RELATED_SECTION_NOT_FOUND`);
    }
    const containingSections = dataset.sections.filter((section) => pointInPolygon([x, y], section.visualPolygon));
    if (containingSections.length !== 1) {
      issues.push(`${marker.markerId}:MARKER_OWNER_COUNT_${containingSections.length}`);
    } else if (containingSections[0].sectionId !== marker.relatedSectionId) {
      issues.push(`${marker.markerId}:RELATED_SECTION_MISMATCH:${containingSections[0].sectionId}`);
    }
    if (marker.markerInteractionStatus === 'DISPLAY_ONLY' && marker.enabled !== false) {
      issues.push(`${marker.markerId}:DISPLAY_ONLY_MARKER_MUST_NOT_BE_RUNTIME_ENABLED`);
    }
    if (marker.markerInteractionStatus === 'LINKED_SECTION_SELECTABLE' && marker.enabled !== true) {
      issues.push(`${marker.markerId}:LINKED_MARKER_MUST_BE_RUNTIME_ENABLED`);
    }
  });

  if (dataset.runtimeSelectionEnabled !== true) {
    issues.push('dataset:RUNTIME_SELECTION_MUST_BE_ENABLED_FOR_REFERENCE_PREVIEW');
  }

  return issues;
}
