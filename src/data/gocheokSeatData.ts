// Gocheok Sky Dome seat data. Keep this static: do not add runtime crawling or web-search data collection.

export type GocheokSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type GocheokFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type GocheokLevel = '1F' | '2F' | '3F' | '4F' | 'OUTFIELD';
export type GocheokSourceConfidence = 'OFFICIAL' | 'UNVERIFIED';
export type GocheokSeatMapAssetStatus = 'OFFICIAL' | 'MANUAL_BASEBALL_DATA_REQUIRED';

export interface GocheokImageGeometry {
  d: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
}

type GocheokImageGeometryDraft = Omit<GocheokImageGeometry, 'shortLabel'> & { shortLabel?: string };

export interface GocheokSeatMapImage {
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  imageSha256: string;
  sourceLabel: string;
  sourceUrl: string | null;
  assetStatus: GocheokSeatMapAssetStatus;
  requiredAssetFileName: string;
}

export interface GocheokOfficialReference {
  id: 'SEATMAP' | 'FACILITY';
  label: string;
  kind: 'SEATMAP' | 'FACILITY_GUIDE';
  sourceLabel: string;
  sourceUrl: string;
  imagePaths: string[];
}

export interface GocheokFacilityGuideImage {
  id: string;
  label: string;
  imagePath: string;
  requiredAssetFileName: string;
  alt: string;
}

export interface GocheokFacilityGuide {
  sourceLabel: string;
  sourceUrl: string;
  title: string;
  summary: string;
  usage: string;
  scale: string;
  totalSeats: number;
  parkingSpaces: number;
  ancillaryFacilities: string[];
  overviewImages: GocheokFacilityGuideImage[];
  entranceImages: GocheokFacilityGuideImage[];
  floorImages: GocheokFacilityGuideImage[];
  openLicenseLabel: string;
  implementationNote: string;
}

export interface GocheokBlock {
  id: string;
  level: GocheokLevel;
  category: string;
  name: string;
  block: string;
  officialBlocks: string[];
  side: GocheokSide;
  fanRole: GocheokFanRole;
  sourceConfidence: GocheokSourceConfidence;
  sourceNote: string;
  seatViewSections: string[];
  imageGeometry: GocheokImageGeometry;
  accessibilityNote?: string;
}

export interface GocheokCategory {
  label: string;
  light: string;
  dark: string;
  textLight: string;
  textDark: string;
}

export interface GocheokViewInfo {
  photos: number;
  rating: number | null;
  distance?: string;
  notes?: string;
  tags?: string[];
}

export interface GocheokCategoryGroup {
  id: string;
  label: string;
  cats: string[] | null;
}

export type GocheokTraceReviewPriority = 'DONE' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type GocheokTraceReviewMethod = 'OFFICIAL_IMAGE_PIXEL_TRACE' | 'MANUAL_REVIEW_REQUIRED';

export interface GocheokTraceReviewRegion {
  id: string;
  label: string;
  priority: GocheokTraceReviewPriority;
  method: GocheokTraceReviewMethod;
  blockIds: string[];
  note: string;
}

export interface GocheokOmittedOfficialBlock {
  block: string;
  reason: string;
  reviewNote: string;
}

interface GocheokBlockInput {
  block: string;
  category: string;
  level?: GocheokLevel;
  side?: GocheokSide;
  fanRole?: GocheokFanRole;
  sourceConfidence?: GocheokSourceConfidence;
  sourceNote?: string;
  aliases?: string[];
  accessibilityNote?: string;
}

const GOCHEOK_SISUL_SEATMAP_URL = 'https://www.sisul.or.kr/open_content/skydome/introduce/seat.jsp';
const GOCHEOK_SISUL_FACILITY_URL = 'https://www.sisul.or.kr/open_content/skydome/introduce/facility.jsp';

export const GOCHEOK_SEATMAP_IMAGE: GocheokSeatMapImage = {
  imagePath: 'src/assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.png',
  imageWidth: 653,
  imageHeight: 960,
  imageSha256: 'c3e44086682b21f23179cf438fab4f6bd9bcc9b92152bb572f0887b5f122f528',
  sourceLabel: '서울시설공단 공식 고척스카이돔 좌석배치도',
  sourceUrl: GOCHEOK_SISUL_SEATMAP_URL,
  assetStatus: 'OFFICIAL',
  requiredAssetFileName: 'gocheok-kiwoom-seatmap-official-2026.png',
};

export const GOCHEOK_SEATMAP_VIEW_BOX = `0 0 ${GOCHEOK_SEATMAP_IMAGE.imageWidth} ${GOCHEOK_SEATMAP_IMAGE.imageHeight}` as const;

// TODO: Add block ids here only when a 653x960 official PNG boundary cannot be verified confidently.
export const GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS: string[] = [];

export const GOCHEOK_OMITTED_OFFICIAL_BLOCKS: GocheokOmittedOfficialBlock[] = [
  {
    block: '335',
    reason: '공식 PNG 우측 상단 외야 crop에서 독립된 335 블록 경계와 라벨이 확인되지 않습니다.',
    reviewNote: '653x960 source image 기준으로 334/435/220 인접 영역을 재검수했으며, 합성 hit-area를 만들지 않습니다.',
  },
];

export const GOCHEOK_FACILITY_GUIDE: GocheokFacilityGuide = {
  sourceLabel: '서울시설공단 공식 고척스카이돔 시설현황',
  sourceUrl: GOCHEOK_SISUL_FACILITY_URL,
  title: '서울시설공단 공식 고척스카이돔 시설현황',
  summary: '서울시설공단 공식 시설안내는 고척스카이돔의 용도, 규모, 관람석, 주차면수와 주요 부대시설을 제공합니다.',
  usage: '문화 및 집회시설(관람장), 운동시설, 판매시설, 근린생활시설',
  scale: '지하2층, 지상4층, 연면적 83,623㎡(대지면적 58,992㎡, 건축면적 29,120㎡), 관람석 16,601석',
  totalSeats: 16601,
  parkingSpaces: 484,
  ancillaryFacilities: ['축구장 1면', '풋살장 2면', '보행광장', '간이무대', '전기차충전소'],
  overviewImages: [
    {
      id: 'overview',
      label: '시설 전체 안내',
      imagePath: 'src/assets/stadiums/kiwoom/gocheok-sisul-facility-overview.jpg',
      requiredAssetFileName: 'gocheok-sisul-facility-overview.jpg',
      alt: '서울시설공단 공식 고척스카이돔 시설 전체 안내 이미지',
    },
  ],
  entranceImages: [
    {
      id: 'infield-entrance',
      label: '내야 내부 출입구',
      imagePath: 'src/assets/stadiums/kiwoom/gocheok-sisul-facility-infield-entrance.jpg',
      requiredAssetFileName: 'gocheok-sisul-facility-infield-entrance.jpg',
      alt: '서울시설공단 공식 고척스카이돔 내야 내부 출입구 안내 이미지',
    },
    {
      id: 'outfield-entrance',
      label: '외야 내부 출입구',
      imagePath: 'src/assets/stadiums/kiwoom/gocheok-sisul-facility-outfield-entrance.jpg',
      requiredAssetFileName: 'gocheok-sisul-facility-outfield-entrance.jpg',
      alt: '서울시설공단 공식 고척스카이돔 외야 내부 출입구 안내 이미지',
    },
  ],
  floorImages: [
    {
      id: '4f-store',
      label: '4F 매점',
      imagePath: 'src/assets/stadiums/kiwoom/gocheok-sisul-facility-4f-store.jpg',
      requiredAssetFileName: 'gocheok-sisul-facility-4f-store.jpg',
      alt: '서울시설공단 공식 고척스카이돔 4층 매점 안내 이미지',
    },
    {
      id: '3f-skybox',
      label: '3F 스카이박스',
      imagePath: 'src/assets/stadiums/kiwoom/gocheok-sisul-facility-3f-skybox.jpg',
      requiredAssetFileName: 'gocheok-sisul-facility-3f-skybox.jpg',
      alt: '서울시설공단 공식 고척스카이돔 3층 스카이박스 안내 이미지',
    },
    {
      id: 'b2-pool-parking',
      label: 'B2 수영장/주차장',
      imagePath: 'src/assets/stadiums/kiwoom/gocheok-sisul-facility-b2-pool-parking.jpg',
      requiredAssetFileName: 'gocheok-sisul-facility-b2-pool-parking.jpg',
      alt: '서울시설공단 공식 고척스카이돔 지하2층 수영장과 주차장 안내 이미지',
    },
  ],
  openLicenseLabel: '공공누리 | 출처표시',
  implementationNote: '시설현황은 좌석 hit-area가 아닌 정적 공식 안내 자료입니다.',
};

export const GOCHEOK_OFFICIAL_REFERENCES: GocheokOfficialReference[] = [
  {
    id: 'SEATMAP',
    label: '공식 좌석도',
    kind: 'SEATMAP',
    sourceLabel: GOCHEOK_SEATMAP_IMAGE.sourceLabel,
    sourceUrl: GOCHEOK_SISUL_SEATMAP_URL,
    imagePaths: [GOCHEOK_SEATMAP_IMAGE.imagePath],
  },
  {
    id: 'FACILITY',
    label: '시설현황',
    kind: 'FACILITY_GUIDE',
    sourceLabel: GOCHEOK_FACILITY_GUIDE.sourceLabel,
    sourceUrl: GOCHEOK_SISUL_FACILITY_URL,
    imagePaths: [
      ...GOCHEOK_FACILITY_GUIDE.overviewImages,
      ...GOCHEOK_FACILITY_GUIDE.entranceImages,
      ...GOCHEOK_FACILITY_GUIDE.floorImages,
    ].map((image) => image.imagePath),
  },
];

const SOURCE_NOTE = '서울시설공단 공식 고척스카이돔 좌석배치도에서 확인한 블록/구역입니다.';

export const GOCHEOK_CATEGORIES: Record<string, GocheokCategory> = {
  DIAMOND: { label: '다이아몬드석', light: '#D9468A', dark: '#E76AA1', textLight: '#831843', textDark: '#FCE7F3' },
  TABLE: { label: '테이블석', light: '#14275E', dark: '#35508E', textLight: '#172554', textDark: '#DBEAFE' },
  SKY_BLUE: { label: '스카이블루석', light: '#1C8D98', dark: '#36A7B2', textLight: '#164E63', textDark: '#CCFBF1' },
  BURGUNDY: { label: '버건디석', light: '#820024', dark: '#A61B3E', textLight: '#881337', textDark: '#FFE4E6' },
  GOLD: { label: '골드 내야석', light: '#F0B71A', dark: '#F5C84C', textLight: '#713F12', textDark: '#FEF3C7' },
  OUTFIELD: { label: '외야 지정석', light: '#8DC63F', dark: '#A3D65A', textLight: '#365314', textDark: '#ECFCCB' },
  ACCESSIBLE: { label: '휠체어석', light: '#64748B', dark: '#94A3B8', textLight: '#334155', textDark: '#E2E8F0' },
};

export const GOCHEOK_CATEGORY_GROUPS: GocheokCategoryGroup[] = [
  { id: 'all', label: '전체', cats: null },
  { id: 'premium', label: '프리미엄/테이블', cats: ['DIAMOND', 'TABLE'] },
  { id: 'infield', label: '내야석', cats: ['SKY_BLUE', 'BURGUNDY', 'GOLD'] },
  { id: 'cheer', label: '응원석', cats: ['BURGUNDY'] },
  { id: 'outfield', label: '외야석', cats: ['OUTFIELD'] },
  { id: 'accessible', label: '휠체어석', cats: ['ACCESSIBLE'] },
];

export const GOCHEOK_VIEW_INFO: Record<string, GocheokViewInfo> = {
  default: { photos: 0, rating: null },
};

export const GOCHEOK_IMAGE_GEOMETRY_DRAFTS: Record<string, GocheokImageGeometryDraft> = {
  'gocheok-d07': { d: 'M 239 623 L 241 621 L 248 616 L 249 616 L 250 617 L 253 621 L 257 627 L 258 629 L 258 631 L 249 637 L 248 637 L 247 636 L 244 632 L 240 625 Z', labelX: 248.9, labelY: 626.5, labelFontSize: 9, shortLabel: 'D07' },
  'gocheok-d06': { d: 'M 247 640 L 257 633 L 259 632 L 260 632 L 278 649 L 278 651 L 276 655 L 273 660 L 271 663 L 269 663 L 263 659 L 258 655 L 253 650 L 249 645 L 247 642 Z', labelX: 262.8, labelY: 647.5, labelFontSize: 9, shortLabel: 'D06' },
  'gocheok-d05': { d: 'M 276 651 L 305 651 L 305 666 L 276 666 Z', labelX: 290.5, labelY: 658.5, labelFontSize: 9, shortLabel: 'D05' },
  'gocheok-d04': { d: 'M 305 651 L 335 651 L 335 666 L 305 666 Z', labelX: 320, labelY: 658.5, labelFontSize: 9, shortLabel: 'D04' },
  'gocheok-d03': { d: 'M 335 651 L 364 651 L 364 666 L 335 666 Z', labelX: 349.5, labelY: 658.5, labelFontSize: 9, shortLabel: 'D03' },
  'gocheok-d02': { d: 'M 362 649 L 363 648 L 380 632 L 381 632 L 383 633 L 393 640 L 393 642 L 392 644 L 390 647 L 380 657 L 375 661 L 371 663 L 369 663 L 368 662 L 363 653 L 362 651 Z', labelX: 377.1, labelY: 647.6, labelFontSize: 9, shortLabel: 'D02' },
  'gocheok-d01': { d: 'M 382 629 L 387 621 L 389 618 L 391 616 L 392 616 L 397 620 L 398 621 L 398 622 L 395 633 L 393 636 L 392 637 L 391 637 L 385 633 L 382 630 Z', labelX: 390.8, labelY: 626.4, labelFontSize: 9, shortLabel: 'D01' },
  'gocheok-t07': { d: 'M 179 586 L 181 584 L 186 581 L 189 580 L 190 581 L 198 592 L 214 615 L 218 621 L 218 622 L 217 623 L 210 628 L 207 630 L 206 630 L 205 629 L 200 622 L 186 602 L 184 599 L 183 597 L 179 588 Z', labelX: 198.1, labelY: 605.4, labelFontSize: 9, shortLabel: 'T07' },
  'gocheok-t06': { d: 'M 212 632 L 213 631 L 219 627 L 222 627 L 223 628 L 228 635 L 240 652 L 242 655 L 242 656 L 237 662 L 234 665 L 232 664 L 230 662 L 226 657 L 214 641 L 212 633 Z', labelX: 226.4, labelY: 645.6, labelFontSize: 9, shortLabel: 'T06' },
  'gocheok-t05': { d: 'M 238 669 L 246 661 L 248 660 L 281 674 L 283 675 L 284 676 L 284 677 L 283 687 L 280 688 L 261 682 L 252 679 L 239 671 L 238 670 Z', labelX: 261.9, labelY: 674.5, labelFontSize: 9, shortLabel: 'T05' },
  'gocheok-t04': { d: 'M 291 676 L 349 676 L 349 689 L 291 689 Z', labelX: 319.8, labelY: 682.4, labelFontSize: 9, shortLabel: 'T04' },
  'gocheok-t03': { d: 'M 357 675 L 359 674 L 392 660 L 394 660 L 395 661 L 402 669 L 402 670 L 401 671 L 398 673 L 388 679 L 373 684 L 360 688 L 358 687 L 357 685 Z', labelX: 378.3, labelY: 674.4, labelFontSize: 9, shortLabel: 'T03' },
  'gocheok-t02': { d: 'M 398 655 L 405 645 L 417 628 L 418 627 L 420 626 L 423 628 L 427 631 L 428 632 L 428 634 L 426 641 L 424 644 L 411 661 L 407 666 L 404 663 L 398 656 Z', labelX: 413.4, labelY: 645.5, labelFontSize: 9, shortLabel: 'T02' },
  'gocheok-t01': { d: 'M 422 621 L 424 618 L 445 588 L 450 581 L 451 580 L 453 580 L 462 586 L 457 597 L 456 599 L 454 602 L 445 615 L 438 625 L 435 629 L 434 630 L 433 630 L 430 628 L 423 623 L 422 622 Z', labelX: 442, labelY: 605.3, labelFontSize: 9, shortLabel: 'T01' },
  'gocheok-t17': { d: 'M 160 603 L 169 597 L 170 597 L 177 602 L 179 604 L 182 608 L 198 631 L 198 632 L 196 634 L 189 639 L 186 641 L 184 639 L 161 606 L 160 604 Z', labelX: 179.1, labelY: 618.5, labelFontSize: 9, shortLabel: 'T17' },
  'gocheok-t16': { d: 'M 193 650 L 194 649 L 200 645 L 202 644 L 204 644 L 207 645 L 211 649 L 221 662 L 224 666 L 226 669 L 220 676 L 216 680 L 215 680 L 213 679 L 210 676 L 205 669 L 198 659 L 194 653 L 193 651 Z', labelX: 209.3, labelY: 661.1, labelFontSize: 9, shortLabel: 'T16' },
  'gocheok-t15': { d: 'M 225 687 L 229 682 L 233 678 L 235 678 L 268 693 L 270 694 L 270 705 L 268 705 L 247 703 L 245 702 L 238 697 L 227 689 Z', labelX: 247.6, labelY: 692.3, labelFontSize: 9, shortLabel: 'T15' },
  'gocheok-t13': { d: 'M 370 694 L 372 693 L 405 678 L 407 678 L 411 682 L 415 687 L 413 689 L 409 692 L 395 702 L 393 703 L 370 706 Z', labelX: 392.1, labelY: 692.3, labelFontSize: 9, shortLabel: 'T13' },
  'gocheok-t12': { d: 'M 414 669 L 426 653 L 430 648 L 432 646 L 438 644 L 439 644 L 446 649 L 447 650 L 447 651 L 445 655 L 431 675 L 427 679 L 425 680 L 424 680 L 420 676 Z', labelX: 430.5, labelY: 661.3, labelFontSize: 9, shortLabel: 'T12' },
  'gocheok-t11': { d: 'M 442 632 L 443 630 L 445 627 L 456 611 L 461 604 L 463 602 L 471 597 L 480 603 L 480 604 L 479 606 L 477 609 L 456 639 L 454 641 L 447 636 L 443 633 Z', labelX: 460.8, labelY: 618.5, labelFontSize: 9, shortLabel: 'T11' },
  'gocheok-s17': { d: 'M 117 597 L 139 593 L 147 606 L 123 616 L 113 607 Z', labelX: 130, labelY: 605, labelFontSize: 8, shortLabel: 'S17' },
  'gocheok-s16': { d: 'M 115 608 L 145 600 L 169 639 L 158 649 L 129 640 Z', labelX: 143, labelY: 625, labelFontSize: 8, shortLabel: 'S16' },
  'gocheok-s15': { d: 'M 156 648 L 170 638 L 172 637 L 173 637 L 175 639 L 179 645 L 179 647 L 163 659 L 162 659 L 157 652 L 156 650 Z', labelX: 167.3, labelY: 647.6, labelFontSize: 8, shortLabel: 'S15' },
  'gocheok-s14': { d: 'M 164 661 L 165 660 L 180 649 L 181 649 L 185 653 L 187 656 L 187 659 L 185 661 L 180 665 L 172 671 L 171 671 L 167 666 L 165 663 Z', labelX: 176, labelY: 659.8, labelFontSize: 8, shortLabel: 'S14' },
  'gocheok-s13': { d: 'M 173 673 L 174 672 L 183 665 L 187 662 L 189 661 L 191 662 L 196 669 L 196 671 L 185 680 L 180 684 L 179 683 L 176 679 L 173 674 Z', labelX: 184.4, labelY: 672.1, labelFontSize: 8, shortLabel: 'S13' },
  'gocheok-s12': { d: 'M 182 686 L 185 683 L 197 673 L 198 673 L 201 676 L 205 682 L 197 690 L 191 695 L 189 696 L 186 693 L 182 687 Z', labelX: 193.3, labelY: 684.3, labelFontSize: 8, shortLabel: 'S12' },
  'gocheok-s11': { d: 'M 191 698 L 193 696 L 207 684 L 208 684 L 210 685 L 214 688 L 217 691 L 217 692 L 215 694 L 203 705 L 201 706 L 199 705 L 195 702 Z', labelX: 204.2, labelY: 694.9, labelFontSize: 8, shortLabel: 'S11' },
  'gocheok-s10': { d: 'M 204 707 L 208 703 L 219 693 L 222 694 L 228 698 L 229 699 L 229 700 L 219 711 L 215 715 L 212 715 L 208 712 L 204 708 Z', labelX: 216.1, labelY: 704.3, labelFontSize: 8, shortLabel: 'S10' },
  'gocheok-s09': { d: 'M 216 717 L 221 712 L 232 716 L 234 717 L 228 724 L 226 725 L 224 724 L 216 718 Z', labelX: 224.4, labelY: 718.8, labelFontSize: 8, shortLabel: 'S09' },
  'gocheok-s08': { d: 'M 399 706 L 418 702 L 427 711 L 419 720 L 402 717 Z', labelX: 411, labelY: 712, labelFontSize: 8, shortLabel: 'S08' },
  'gocheok-s07': { d: 'M 412 695 L 433 690 L 443 700 L 435 709 L 417 707 Z', labelX: 425, labelY: 701, labelFontSize: 8, shortLabel: 'S07' },
  'gocheok-s06': { d: 'M 423 684 L 445 680 L 454 690 L 445 699 L 428 696 Z', labelX: 437, labelY: 690, labelFontSize: 8, shortLabel: 'S06' },
  'gocheok-s05': { d: 'M 434 674 L 455 670 L 464 680 L 455 689 L 439 686 Z', labelX: 448, labelY: 680, labelFontSize: 8, shortLabel: 'S05' },
  'gocheok-s04': { d: 'M 443 664 L 466 660 L 475 671 L 465 680 L 448 676 Z', labelX: 459, labelY: 670, labelFontSize: 8, shortLabel: 'S04' },
  'gocheok-s03': { d: 'M 451 654 L 473 650 L 483 661 L 472 670 L 456 666 Z', labelX: 465, labelY: 660, labelFontSize: 8, shortLabel: 'S03' },
  'gocheok-s02': { d: 'M 458 643 L 481 639 L 492 650 L 481 660 L 465 656 Z', labelX: 474, labelY: 650, labelFontSize: 8, shortLabel: 'S02' },
  'gocheok-s01': { d: 'M 466 626 L 492 622 L 506 646 L 491 658 L 474 650 Z', labelX: 486, labelY: 641, labelFontSize: 8, shortLabel: 'S01' },
  'gocheok-114': { d: 'M 77 434 L 78 420 L 80 398 L 81 395 L 94 408 L 112 432 L 110 433 L 87 439 L 79 441 L 78 441 L 77 440 Z', labelX: 89.3, labelY: 422.2, labelFontSize: 9, shortLabel: '114' },
  'gocheok-113': { d: 'M 79 448 L 80 447 L 83 446 L 93 443 L 122 435 L 124 437 L 127 441 L 125 443 L 96 464 L 93 466 L 91 465 L 90 464 L 85 457 Z', labelX: 101.6, labelY: 449.2, labelFontSize: 9, shortLabel: '113' },
  'gocheok-112': { d: 'M 95 471 L 98 468 L 102 465 L 113 457 L 127 447 L 129 446 L 130 446 L 132 448 L 135 452 L 139 458 L 139 459 L 136 462 L 122 472 L 112 479 L 106 483 L 104 484 L 99 477 Z', labelX: 117.2, labelY: 464.7, labelFontSize: 9, shortLabel: '112' },
  'gocheok-111': { d: 'M 108 488 L 112 485 L 133 470 L 134 470 L 136 472 L 139 476 L 147 488 L 145 490 L 134 498 L 127 503 L 124 505 L 120 507 L 117 503 L 109 491 L 108 489 Z', labelX: 127.2, labelY: 488.4, labelFontSize: 9, shortLabel: '111' },
  'gocheok-110': { d: 'M 124 511 L 125 510 L 133 504 L 144 496 L 147 494 L 149 493 L 150 493 L 152 495 L 164 512 L 162 514 L 158 517 L 144 527 L 141 529 L 137 531 L 136 530 L 127 517 L 125 514 L 124 512 Z', labelX: 143.4, labelY: 511.8, labelFontSize: 9, shortLabel: '110' },
  'gocheok-109': { d: 'M 142 536 L 173 514 L 175 513 L 176 513 L 179 517 L 182 522 L 182 535 L 177 540 L 173 543 L 162 551 L 159 553 L 157 553 L 153 552 L 152 551 Z', labelX: 164.4, labelY: 533.5, labelFontSize: 9, shortLabel: '109' },
  'gocheok-108': { d: 'M 161 560 L 165 557 L 175 550 L 181 546 L 182 547 L 183 550 L 185 569 L 185 570 L 184 573 L 183 574 L 179 577 L 174 580 L 173 580 L 171 578 L 162 565 L 161 561 Z', labelX: 174.7, labelY: 563.6, labelFontSize: 9, shortLabel: '108' },
  'gocheok-210': { d: 'M 66 496 L 70 450 L 71 450 L 72 451 L 96 485 L 96 486 L 83 499 L 79 502 L 72 507 L 70 507 L 67 503 L 66 501 Z', labelX: 77.3, labelY: 481.2, labelFontSize: 9, shortLabel: '210' },
  'gocheok-209': { d: 'M 74 511 L 78 508 L 85 503 L 102 495 L 104 497 L 107 501 L 114 511 L 114 512 L 113 513 L 95 526 L 88 531 L 87 531 L 84 527 L 77 517 L 75 514 L 74 512 Z', labelX: 93.6, labelY: 512.6, labelFontSize: 9, shortLabel: '209' },
  'gocheok-208': { d: 'M 90 535 L 94 532 L 115 517 L 118 517 L 119 518 L 129 533 L 114 548 L 106 554 L 104 555 L 101 551 L 91 537 Z', labelX: 109.4, labelY: 535.2, labelFontSize: 9, shortLabel: '208' },
  'gocheok-207': { d: 'M 109 560 L 110 558 L 119 552 L 134 545 L 136 546 L 139 549 L 145 558 L 146 560 L 146 562 L 137 569 L 127 576 L 123 578 L 122 578 L 120 576 L 113 567 Z', labelX: 127.2, labelY: 561.4, labelFontSize: 9, shortLabel: '207' },
  'gocheok-206': { d: 'M 127 585 L 129 583 L 137 577 L 147 570 L 150 568 L 151 568 L 153 569 L 156 573 L 162 582 L 162 585 L 151 597 L 131 592 L 127 586 Z', labelX: 147.4, labelY: 581.8, labelFontSize: 9, shortLabel: '206' },
  'gocheok-107': { d: 'M 457 547 L 459 546 L 471 554 L 479 560 L 480 561 L 480 562 L 478 565 L 471 575 L 468 579 L 458 575 L 457 572 Z', labelX: 465, labelY: 563.1, labelFontSize: 9, shortLabel: '107' },
  'gocheok-106': { d: 'M 458 522 L 464 513 L 465 513 L 470 516 L 484 526 L 488 529 L 497 536 L 497 538 L 495 541 L 486 554 L 485 555 L 484 555 L 467 543 L 459 537 L 458 535 Z', labelX: 475.2, labelY: 533.8, labelFontSize: 9, shortLabel: '106' },
  'gocheok-105': { d: 'M 476 512 L 483 502 L 488 495 L 490 493 L 491 493 L 493 494 L 496 496 L 514 509 L 516 511 L 516 512 L 515 514 L 511 520 L 504 530 L 503 531 L 502 531 L 496 527 L 482 517 L 478 514 Z', labelX: 496.4, labelY: 511.9, labelFontSize: 9, shortLabel: '105' },
  'gocheok-104': { d: 'M 493 488 L 495 485 L 504 472 L 506 470 L 507 470 L 517 477 L 528 485 L 532 488 L 532 490 L 523 503 L 520 507 L 519 507 L 513 503 L 506 498 L 495 490 Z', labelX: 512.8, labelY: 488.5, labelFontSize: 9, shortLabel: '104' },
  'gocheok-103': { d: 'M 501 458 L 503 455 L 509 447 L 511 446 L 513 447 L 523 454 L 537 464 L 542 468 L 545 471 L 537 483 L 536 484 L 534 483 L 528 479 L 504 462 L 501 459 Z', labelX: 522.6, labelY: 464.7, labelFontSize: 9, shortLabel: '103' },
  'gocheok-102': { d: 'M 514 440 L 516 437 L 518 435 L 522 436 L 557 446 L 561 448 L 560 450 L 551 463 L 549 465 L 547 466 L 544 464 L 522 448 L 514 442 Z', labelX: 538.2, labelY: 449.2, labelFontSize: 9, shortLabel: '102' },
  'gocheok-101': { d: 'M 529 431 L 547 407 L 558 396 L 559 396 L 560 400 L 561 410 L 563 432 L 563 440 L 562 441 L 561 441 L 557 440 L 538 435 L 531 433 L 529 432 Z', labelX: 550.5, labelY: 422.3, labelFontSize: 9, shortLabel: '101' },
  'gocheok-205': { d: 'M 477 584 L 478 582 L 480 579 L 488 568 L 491 569 L 502 576 L 512 584 L 513 585 L 513 586 L 509 592 L 489 598 L 477 585 Z', labelX: 491.9, labelY: 582.3, labelFontSize: 9, shortLabel: '205' },
  'gocheok-204': { d: 'M 493 561 L 494 559 L 504 545 L 505 544 L 521 552 L 529 557 L 531 559 L 531 560 L 519 578 L 517 579 L 515 578 L 507 572 L 494 562 Z', labelX: 512.6, labelY: 561.2, labelFontSize: 9, shortLabel: '204' },
  'gocheok-203': { d: 'M 512 531 L 522 517 L 523 516 L 525 517 L 542 529 L 550 535 L 549 537 L 540 550 L 537 554 L 536 555 L 530 551 L 526 548 L 512 534 Z', labelX: 530.4, labelY: 535.3, labelFontSize: 9, shortLabel: '203' },
  'gocheok-202': { d: 'M 526 511 L 536 497 L 537 496 L 540 496 L 555 503 L 565 510 L 566 511 L 566 512 L 565 514 L 563 517 L 554 530 L 551 530 L 541 523 L 527 513 L 526 512 Z', labelX: 546.2, labelY: 512.5, labelFontSize: 9, shortLabel: '202' },
  'gocheok-201': { d: 'M 544 486 L 545 484 L 549 478 L 568 451 L 569 450 L 570 450 L 571 460 L 574 495 L 574 501 L 572 504 L 569 507 L 567 506 L 564 504 L 557 499 Z', labelX: 562.8, labelY: 481, labelFontSize: 9, shortLabel: '201' },
  'gocheok-301': { d: 'M 571 549 L 572 547 L 578 538 L 584 530 L 585 529 L 587 529 L 593 533 L 597 536 L 597 537 L 593 543 L 584 556 L 582 557 L 580 557 L 572 551 L 571 550 Z', labelX: 583.8, labelY: 543.1, labelFontSize: 8, shortLabel: '301' },
  'gocheok-302': { d: 'M 554 573 L 560 564 L 567 554 L 569 554 L 577 560 L 579 562 L 579 563 L 568 579 L 565 583 L 564 583 L 559 580 L 555 577 L 554 576 Z', labelX: 566.1, labelY: 568.3, labelFontSize: 8, shortLabel: '302' },
  'gocheok-303': { d: 'M 532 605 L 534 601 L 538 595 L 545 585 L 549 580 L 550 579 L 552 580 L 560 586 L 561 587 L 561 588 L 560 590 L 546 610 L 543 614 L 541 613 L 534 608 L 532 606 Z', labelX: 546.3, labelY: 596.4, labelFontSize: 8, shortLabel: '303' },
  'gocheok-304': { d: 'M 511 637 L 512 632 L 527 611 L 528 610 L 530 610 L 538 616 L 540 618 L 539 620 L 537 623 L 526 639 L 521 644 L 520 644 Z', labelX: 525, labelY: 626.9, labelFontSize: 8, shortLabel: '304' },
  'gocheok-305': { d: 'M 491 663 L 494 658 L 496 655 L 505 642 L 507 640 L 509 641 L 517 647 L 518 648 L 518 650 L 507 666 L 504 670 L 503 671 L 500 671 L 492 665 L 491 664 Z', labelX: 504.4, labelY: 655.9, labelFontSize: 8, shortLabel: '305' },
  'gocheok-306': { d: 'M 472 690 L 473 688 L 484 672 L 487 668 L 489 668 L 495 672 L 499 676 L 499 677 L 488 693 L 485 697 L 483 699 L 482 699 L 474 693 L 472 691 Z', labelX: 485.4, labelY: 683.4, labelFontSize: 8, shortLabel: '306' },
  'gocheok-307': { d: 'M 454 712 L 458 707 L 467 696 L 469 695 L 471 696 L 479 702 L 480 703 L 479 705 L 468 719 L 465 722 L 464 722 L 458 717 L 454 713 Z', labelX: 466.3, labelY: 708.4, labelFontSize: 8, shortLabel: '307' },
  'gocheok-308': { d: 'M 437 733 L 440 729 L 450 717 L 452 717 L 460 725 L 461 727 L 460 729 L 449 742 L 446 745 L 438 737 L 437 735 Z', labelX: 448.5, labelY: 730.6, labelFontSize: 8, shortLabel: '308' },
  'gocheok-309': { d: 'M 402 757 L 403 756 L 409 752 L 430 739 L 432 738 L 433 738 L 439 744 L 442 748 L 442 749 L 440 751 L 414 767 L 408 770 L 407 770 L 406 769 L 402 761 Z', labelX: 421, labelY: 753.7, labelFontSize: 8, shortLabel: '309' },
  'gocheok-310': { d: 'M 354 768 L 355 767 L 365 765 L 381 762 L 392 760 L 396 760 L 398 762 L 399 764 L 401 769 L 402 772 L 400 774 L 397 775 L 375 779 L 357 782 L 355 782 L 354 781 Z', labelX: 376.7, labelY: 770.8, labelFontSize: 8, shortLabel: '310' },
  'gocheok-311': { d: 'M 322 777 L 326 768 L 348 768 L 349 769 L 349 783 L 322 783 Z', labelX: 336.3, labelY: 775.9, labelFontSize: 8, shortLabel: '311' },
  'gocheok-312': { d: 'M 291 776 L 292 768 L 314 768 L 318 777 L 318 782 L 317 783 L 291 783 Z', labelX: 303.8, labelY: 775.9, labelFontSize: 8, shortLabel: '312' },
  'gocheok-313': { d: 'M 238 772 L 240 767 L 243 760 L 249 760 L 270 764 L 285 767 L 287 768 L 287 774 L 286 781 L 285 782 L 283 782 L 277 781 L 244 775 L 240 774 L 238 773 Z', labelX: 263.5, labelY: 770.8, labelFontSize: 8, shortLabel: '313' },
  'gocheok-314': { d: 'M 198 748 L 203 742 L 207 738 L 208 738 L 210 739 L 215 742 L 236 755 L 239 758 L 239 759 L 235 768 L 234 770 L 232 770 L 226 767 L 200 751 L 198 749 Z', labelX: 219.1, labelY: 753.7, labelFontSize: 8, shortLabel: '314' },
  'gocheok-315': { d: 'M 180 725 L 184 721 L 189 717 L 190 717 L 191 718 L 196 724 L 203 733 L 203 736 L 195 745 L 194 745 L 192 743 L 182 731 L 180 728 Z', labelX: 191.5, labelY: 730.7, labelFontSize: 8, shortLabel: '315' },
  'gocheok-316': { d: 'M 160 703 L 169 696 L 172 696 L 177 701 L 185 710 L 186 712 L 185 714 L 181 718 L 176 722 L 175 722 L 172 719 L 160 704 Z', labelX: 173, labelY: 708.5, labelFontSize: 8, shortLabel: '316' },
  'gocheok-317': { d: 'M 142 675 L 144 673 L 148 670 L 151 668 L 152 668 L 155 671 L 158 675 L 165 685 L 167 688 L 168 690 L 168 691 L 167 693 L 158 699 L 157 699 L 156 698 L 150 690 L 142 678 Z', labelX: 154.7, labelY: 683.4, labelFontSize: 8, shortLabel: '317' },
  'gocheok-318': { d: 'M 122 648 L 124 646 L 132 640 L 133 640 L 135 642 L 149 662 L 149 664 L 148 665 L 140 671 L 137 671 L 131 663 L 123 651 L 122 649 Z', labelX: 135.5, labelY: 655.7, labelFontSize: 8, shortLabel: '318' },
  'gocheok-319': { d: 'M 100 618 L 102 616 L 106 613 L 109 611 L 111 610 L 112 610 L 113 611 L 118 618 L 130 635 L 130 636 L 127 639 L 121 643 L 119 644 L 118 644 L 114 639 Z', labelX: 115.1, labelY: 627.1, labelFontSize: 8, shortLabel: '319' },
  'gocheok-320': { d: 'M 79 587 L 80 586 L 88 580 L 91 580 L 92 581 L 95 585 L 106 601 L 108 604 L 108 606 L 106 608 L 100 612 L 98 613 L 96 613 L 84 596 L 80 590 Z', labelX: 93.7, labelY: 596.4, labelFontSize: 8, shortLabel: '320' },
  'gocheok-321': { d: 'M 61 562 L 63 560 L 70 555 L 72 554 L 74 555 L 83 568 L 87 574 L 87 575 L 85 577 L 81 580 L 78 582 L 76 583 L 74 581 L 70 576 L 62 564 Z', labelX: 74.1, labelY: 568.5, labelFontSize: 8, shortLabel: '321' },
  'gocheok-401': { d: 'M 572 584 L 573 581 L 592 553 L 600 542 L 602 540 L 603 540 L 609 544 L 614 548 L 617 551 L 616 559 L 613 578 L 611 589 L 609 599 L 607 607 L 606 610 L 605 612 L 603 612 L 601 611 L 594 606 L 582 597 Z', labelX: 597.7, labelY: 576.2, labelFontSize: 8, shortLabel: '401' },
  'gocheok-402': { d: 'M 548 617 L 554 608 L 563 595 L 564 594 L 566 594 L 584 603 L 594 610 L 602 616 L 603 617 L 603 622 L 602 626 L 599 636 L 595 648 L 594 650 L 593 651 L 587 647 L 554 623 L 550 620 L 549 619 Z', labelX: 577.9, labelY: 620.9, labelFontSize: 8, shortLabel: '402' },
  'gocheok-403': { d: 'M 529 644 L 538 631 L 543 624 L 545 622 L 546 622 L 548 623 L 554 627 L 575 642 L 591 654 L 591 659 L 589 665 L 582 682 L 579 686 L 578 686 L 576 685 L 573 683 L 562 675 L 542 660 L 539 657 L 529 646 Z', labelX: 561.4, labelY: 653.6, labelFontSize: 8, shortLabel: '403' },
  'gocheok-404': { d: 'M 508 674 L 520 657 L 522 655 L 525 656 L 537 661 L 543 665 L 569 684 L 574 688 L 576 690 L 576 693 L 574 698 L 567 712 L 565 715 L 564 716 L 563 716 L 561 715 L 558 713 L 544 703 L 526 690 L 515 682 L 511 679 L 508 676 Z', labelX: 543.4, labelY: 684.7, labelFontSize: 8, shortLabel: '404' },
  'gocheok-405': { d: 'M 491 698 L 501 684 L 504 680 L 507 680 L 551 712 L 559 718 L 561 720 L 561 722 L 559 726 L 549 741 L 546 744 L 545 744 L 543 743 L 537 739 L 502 714 L 491 701 Z', labelX: 526, labelY: 712.2, labelFontSize: 8, shortLabel: '405' },
  'gocheok-406': { d: 'M 469 727 L 470 725 L 472 722 L 482 710 L 483 709 L 485 709 L 502 718 L 505 720 L 533 740 L 541 746 L 543 748 L 543 749 L 539 755 L 536 759 L 532 764 L 525 772 L 522 775 L 518 772 L 512 767 L 475 733 Z', labelX: 506.6, labelY: 740.9, labelFontSize: 8, shortLabel: '406' },
  'gocheok-407': { d: 'M 453 746 L 459 738 L 465 731 L 467 731 L 471 734 L 478 740 L 511 770 L 518 777 L 518 779 L 517 781 L 502 796 L 495 802 L 488 795 L 462 765 L 453 749 Z', labelX: 484.7, labelY: 766.7, labelFontSize: 8, shortLabel: '407' },
  'gocheok-408': { d: 'M 430 764 L 432 762 L 442 756 L 445 756 L 457 765 L 463 771 L 483 794 L 489 801 L 491 804 L 491 805 L 487 809 L 471 821 L 468 823 L 466 823 L 464 821 L 454 805 L 432 769 L 430 765 Z', labelX: 460.4, labelY: 789.6, labelFontSize: 8, shortLabel: '408' },
  'gocheok-409': { d: 'M 412 776 L 419 770 L 422 768 L 424 767 L 427 767 L 462 824 L 462 826 L 460 828 L 454 832 L 447 836 L 437 841 L 435 841 L 434 840 L 416 796 L 415 793 L 412 777 Z', labelX: 435.1, labelY: 806.1, labelFontSize: 8, shortLabel: '409' },
  'gocheok-410': { d: 'M 382 786 L 383 784 L 387 783 L 392 782 L 398 781 L 401 781 L 403 783 L 412 795 L 419 812 L 428 834 L 431 842 L 431 844 L 425 847 L 418 850 L 410 853 L 401 856 L 400 856 L 398 855 L 396 847 L 384 795 Z', labelX: 404.9, labelY: 819.3, labelFontSize: 8, shortLabel: '410' },
  'gocheok-411': { d: 'M 356 805 L 358 789 L 359 788 L 370 786 L 376 785 L 377 785 L 378 786 L 379 788 L 383 805 L 393 849 L 394 854 L 394 858 L 385 861 L 367 865 L 360 865 L 359 856 L 358 845 L 356 815 Z', labelX: 372.4, labelY: 827.8, labelFontSize: 8, shortLabel: '411' },
  'gocheok-412': { d: 'M 321 791 L 322 790 L 338 789 L 346 789 L 347 790 L 351 805 L 352 809 L 353 819 L 356 864 L 355 866 L 353 867 L 332 869 L 323 869 L 322 868 Z', labelX: 337.2, labelY: 830.5, labelFontSize: 8, shortLabel: '412' },
  'gocheok-413': { d: 'M 284 859 L 288 807 L 293 790 L 294 789 L 299 789 L 318 790 L 319 791 L 319 866 L 318 868 L 316 869 L 312 869 L 298 868 L 288 867 L 285 866 L 284 865 Z', labelX: 302.6, labelY: 830.6, labelFontSize: 8, shortLabel: '413' },
  'gocheok-414': { d: 'M 246 854 L 250 836 L 260 792 L 262 786 L 270 786 L 281 788 L 282 789 L 284 805 L 284 814 L 283 831 L 281 858 L 280 864 L 279 865 L 274 865 L 264 863 L 255 861 L 248 859 L 246 858 Z', labelX: 267.6, labelY: 827.9, labelFontSize: 8, shortLabel: '414' },
  'gocheok-415': { d: 'M 209 842 L 211 837 L 226 800 L 229 794 L 238 781 L 239 781 L 248 782 L 253 783 L 257 784 L 258 785 L 258 786 L 257 791 L 243 852 L 242 855 L 241 856 L 240 856 L 236 855 L 227 852 L 222 850 L 211 845 L 210 844 Z', labelX: 235.3, labelY: 819.4, labelFontSize: 8, shortLabel: '415' },
  'gocheok-416': { d: 'M 178 824 L 208 775 L 214 767 L 216 767 L 218 768 L 223 771 L 227 774 L 228 775 L 228 778 L 225 793 L 223 799 L 209 833 L 205 841 L 203 841 L 193 836 L 183 830 L 180 828 L 178 826 Z', labelX: 205.1, labelY: 805.7, labelFontSize: 8, shortLabel: '416' },
  'gocheok-417': { d: 'M 149 804 L 153 799 L 164 786 L 179 769 L 182 766 L 195 756 L 198 756 L 208 762 L 209 763 L 209 767 L 185 807 L 175 823 L 173 823 L 169 821 L 160 815 L 151 807 L 150 806 Z', labelX: 179.6, labelY: 789.6, labelFontSize: 8, shortLabel: '417' },
  'gocheok-418': { d: 'M 123 780 L 124 775 L 128 771 L 150 751 L 171 732 L 173 731 L 177 733 L 178 734 L 182 739 L 188 747 L 188 748 L 180 763 L 152 795 L 145 802 L 140 798 L 123 781 Z', labelX: 155.6, labelY: 766.6, labelFontSize: 8, shortLabel: '418' },
  'gocheok-419': { d: 'M 98 747 L 99 746 L 112 736 L 138 718 L 141 716 L 155 709 L 157 709 L 159 711 L 168 722 L 171 726 L 171 727 L 163 735 L 140 756 L 123 771 L 118 775 L 116 773 L 109 765 L 98 751 Z', labelX: 133.5, labelY: 740.8, labelFontSize: 8, shortLabel: '419' },
  'gocheok-420': { d: 'M 79 720 L 81 718 L 85 715 L 125 686 L 132 681 L 134 680 L 136 680 L 137 681 L 143 689 L 149 698 L 149 701 L 139 712 L 135 716 L 124 724 L 100 741 L 97 743 L 93 743 L 91 741 L 87 735 L 82 727 L 81 725 Z', labelX: 114.1, labelY: 712, labelFontSize: 8, shortLabel: '420' },
  'gocheok-421': { d: 'M 64 690 L 67 687 L 71 684 L 96 666 L 102 662 L 114 657 L 117 656 L 119 656 L 121 658 L 132 674 L 132 676 L 129 679 L 125 682 L 114 690 L 78 716 L 76 716 L 75 715 L 70 706 L 64 694 Z', labelX: 96.6, labelY: 684.7, labelFontSize: 8, shortLabel: '421' },
  'gocheok-422': { d: 'M 48 656 L 49 654 L 93 622 L 95 622 L 98 625 L 105 635 L 111 644 L 111 646 L 100 659 L 78 675 L 68 682 L 62 686 L 60 686 L 55 674 L 49 659 Z', labelX: 78.7, labelY: 653.5, labelFontSize: 8, shortLabel: '422' },
  'gocheok-423': { d: 'M 37 617 L 38 616 L 46 610 L 60 600 L 74 594 L 76 594 L 79 598 L 86 608 L 92 617 L 92 618 L 90 620 L 86 623 L 64 639 L 50 649 L 47 651 L 46 650 L 44 645 L 40 633 L 38 626 L 37 622 Z', labelX: 62, labelY: 620.8, labelFontSize: 8, shortLabel: '423' },
  'gocheok-424': { d: 'M 24 550 L 26 548 L 30 545 L 38 540 L 40 542 L 53 560 L 66 579 L 67 581 L 68 584 L 57 598 L 46 606 L 39 611 L 36 613 L 35 613 L 34 610 L 32 602 L 30 593 L 28 583 L 24 559 Z', labelX: 42.4, labelY: 576.2, labelFontSize: 8, shortLabel: '424' },
  'gocheok-115': { d: 'M 107 293 L 108 290 L 109 288 L 119 288 L 121 291 L 121 292 L 117 299 L 114 303 L 110 303 L 107 298 Z', labelX: 113.3, labelY: 295.3, labelFontSize: 8, shortLabel: '115' },
  'gocheok-116': { d: 'M 113 277 L 119 271 L 131 272 L 133 279 L 127 286 L 115 285 Z', labelX: 123, labelY: 279, labelFontSize: 8, shortLabel: '116' },
  'gocheok-117': { d: 'M 117 267 L 126 258 L 134 254 L 141 257 L 145 267 L 140 276 L 130 282 L 118 276 Z', labelX: 130, labelY: 267, labelFontSize: 8, shortLabel: '117' },
  'gocheok-118': { d: 'M 130 246 L 137 240 L 154 239 L 161 248 L 157 257 L 145 263 L 131 256 Z', labelX: 144, labelY: 249, labelFontSize: 8, shortLabel: '118' },
  'gocheok-119': { d: 'M 145 233 L 157 224 L 176 224 L 183 232 L 179 242 L 164 250 L 153 248 L 144 240 Z', labelX: 160, labelY: 236, labelFontSize: 8, shortLabel: '119' },
  'gocheok-120': { d: 'M 182 219 L 185 216 L 189 213 L 196 212 L 201 212 L 203 214 L 204 216 L 204 219 L 202 225 L 191 231 L 188 231 Z', labelX: 193.4, labelY: 220.1, labelFontSize: 8, shortLabel: '120' },
  'gocheok-121': { d: 'M 206 203 L 212 198 L 231 193 L 236 195 L 238 205 L 235 214 L 214 222 L 207 217 Z', labelX: 222.3, labelY: 206.5, labelFontSize: 8, shortLabel: '121' },
  'gocheok-122': { d: 'M 236 190 L 237 189 L 256 187 L 260 190 L 261 192 L 261 195 L 260 199 L 251 205 L 242 205 L 240 204 L 237 196 L 236 193 Z', labelX: 248.3, labelY: 195.8, labelFontSize: 8, shortLabel: '122' },
  'gocheok-123': { d: 'M 266 196 L 268 182 L 269 181 L 274 180 L 281 179 L 287 179 L 289 192 L 289 197 L 269 201 L 268 201 L 267 200 L 266 197 Z', labelX: 277.5, labelY: 188.5, labelFontSize: 8, shortLabel: '123' },
  'gocheok-124': { d: 'M 352 181 L 362 180 L 363 180 L 372 181 L 375 182 L 376 183 L 376 186 L 371 200 L 368 200 L 356 198 L 355 197 L 354 195 L 352 190 Z', labelX: 363.1, labelY: 188.6, labelFontSize: 8, shortLabel: '124' },
  'gocheok-125': { d: 'M 378 197 L 379 192 L 385 187 L 391 186 L 393 186 L 403 189 L 404 190 L 404 192 L 403 196 L 399 203 L 389 203 L 378 201 Z', labelX: 390.7, labelY: 194.8, labelFontSize: 8, shortLabel: '125' },
  'gocheok-126': { d: 'M 404 207 L 405 203 L 406 200 L 409 192 L 412 192 L 414 193 L 431 202 L 431 207 L 426 213 L 412 213 L 405 210 L 404 209 Z', labelX: 416.4, labelY: 204.9, labelFontSize: 8, shortLabel: '126' },
  'gocheok-127': { d: 'M 431 217 L 432 213 L 433 211 L 440 208 L 447 208 L 455 216 L 455 217 L 453 223 L 452 225 L 450 227 L 445 226 L 434 223 L 432 221 L 431 218 Z', labelX: 442.9, labelY: 217.2, labelFontSize: 8, shortLabel: '127' },
  'gocheok-128': { d: 'M 460 224 L 464 218 L 465 218 L 484 235 L 482 239 L 479 244 L 477 246 L 470 245 L 461 239 L 460 238 Z', labelX: 470, labelY: 233.9, labelFontSize: 8, shortLabel: '128' },
  'gocheok-129': { d: 'M 480 249 L 486 240 L 495 240 L 495 259 L 493 260 L 490 261 L 487 259 L 482 255 L 480 252 Z', labelX: 488.3, labelY: 249.7, labelFontSize: 8, shortLabel: '129' },
  'gocheok-130': { d: 'M 500 268 L 504 257 L 506 254 L 511 256 L 514 258 L 521 269 L 510 280 L 508 280 L 506 278 L 500 271 Z', labelX: 509.4, labelY: 266.7, labelFontSize: 8, shortLabel: '130' },
  'gocheok-131': { d: 'M 512 276 L 529 270 L 537 278 L 534 286 L 523 292 L 509 287 L 506 281 Z', labelX: 522, labelY: 282, labelFontSize: 8, shortLabel: '131' },
  'gocheok-132': { d: 'M 522 290 L 538 289 L 542 300 L 543 318 L 540 324 L 533 318 L 527 307 L 520 296 Z', labelX: 534, labelY: 298, labelFontSize: 8, shortLabel: '132' },
  'gocheok-211': { d: 'M 128 232 L 132 216 L 136 213 L 138 216 L 142 223 L 139 232 L 131 239 L 128 239 Z', labelX: 134.8, labelY: 226.1, labelFontSize: 8, shortLabel: '211' },
  'gocheok-212': { d: 'M 138 208 L 150 199 L 160 192 L 163 192 L 164 194 L 168 207 L 167 209 L 156 219 L 153 221 L 152 221 L 146 220 L 144 218 L 138 209 Z', labelX: 154.2, labelY: 207, labelFontSize: 8, shortLabel: '212' },
  'gocheok-213': { d: 'M 167 189 L 171 186 L 174 184 L 188 177 L 189 177 L 195 181 L 197 187 L 196 190 L 194 193 L 193 194 L 182 202 L 180 203 L 176 202 L 167 191 Z', labelX: 182.5, labelY: 189.4, labelFontSize: 8, shortLabel: '213' },
  'gocheok-214': { d: 'M 197 176 L 199 172 L 208 168 L 218 164 L 220 164 L 223 166 L 224 168 L 223 175 L 221 183 L 220 184 L 204 191 L 198 179 Z', labelX: 211.7, labelY: 176, labelFontSize: 8, shortLabel: '214' },
  'gocheok-215': { d: 'M 228 162 L 230 160 L 241 157 L 245 156 L 251 155 L 253 155 L 254 157 L 256 165 L 256 166 L 255 170 L 253 173 L 252 174 L 249 175 L 238 178 L 236 178 L 230 172 L 228 166 Z', labelX: 243, labelY: 166.1, labelFontSize: 8, shortLabel: '215' },
  'gocheok-216': { d: 'M 260 160 L 262 152 L 272 150 L 282 150 L 283 162 L 283 163 L 279 169 L 267 171 L 264 171 L 260 164 Z', labelX: 271.4, labelY: 160.3, labelFontSize: 8, shortLabel: '216' },
  'gocheok-217': { d: 'M 355 152 L 379 156 L 381 157 L 381 158 L 377 169 L 375 171 L 374 171 L 368 170 L 363 169 L 360 168 L 355 154 Z', labelX: 369.1, labelY: 162.1, labelFontSize: 8, shortLabel: '217' },
  'gocheok-218': { d: 'M 384 165 L 385 160 L 386 158 L 388 158 L 397 160 L 407 163 L 410 164 L 412 165 L 411 168 L 406 174 L 405 175 L 391 175 L 388 174 L 384 166 Z', labelX: 397.2, labelY: 166.9, labelFontSize: 8, shortLabel: '218' },
  'gocheok-219': { d: 'M 413 176 L 416 166 L 443 176 L 442 179 L 440 183 L 436 187 L 433 189 L 429 188 L 425 186 L 413 177 Z', labelX: 427.3, labelY: 178.5, labelFontSize: 8, shortLabel: '219' },
  'gocheok-220': { d: 'M 442 189 L 446 179 L 447 177 L 448 176 L 450 176 L 452 177 L 471 187 L 473 189 L 471 195 L 467 203 L 465 205 L 464 205 L 456 201 L 443 194 Z', labelX: 456.5, labelY: 190.2, labelFontSize: 8, shortLabel: '220' },
  'gocheok-221': { d: 'M 474 204 L 475 196 L 477 192 L 479 192 L 487 197 L 496 203 L 500 207 L 497 216 L 496 218 L 494 221 L 491 220 L 489 219 L 477 211 L 476 210 Z', labelX: 486.4, labelY: 206.8, labelFontSize: 8, shortLabel: '221' },
  'gocheok-222': { d: 'M 500 227 L 502 216 L 503 214 L 505 212 L 506 212 L 507 213 L 508 217 L 511 230 L 511 236 L 509 239 L 500 230 Z', labelX: 505.8, labelY: 225.3, labelFontSize: 8, shortLabel: '222' },
  'gocheok-323': { d: 'M 145 163 L 181 148 L 195 151 L 191 163 L 156 176 L 146 171 Z', labelX: 164, labelY: 162, labelFontSize: 8, shortLabel: '323' },
  'gocheok-324': { d: 'M 198 144 L 199 143 L 209 139 L 215 137 L 218 137 L 219 139 L 220 142 L 220 145 L 219 146 L 217 147 L 203 152 L 201 152 L 200 151 L 198 145 Z', labelX: 209.1, labelY: 144.3, labelFontSize: 8, shortLabel: '324' },
  'gocheok-325': { d: 'M 222 135 L 231 132 L 238 130 L 243 130 L 244 132 L 245 137 L 245 138 L 244 139 L 241 140 L 225 144 L 224 144 L 222 137 Z', labelX: 233.4, labelY: 136.5, labelFontSize: 8, shortLabel: '325' },
  'gocheok-326': { d: 'M 225 128 L 252 122 L 267 124 L 269 133 L 243 139 L 224 136 Z', labelX: 245, labelY: 130, labelFontSize: 8, shortLabel: '326' },
  'gocheok-327': { d: 'M 268 122 L 300 120 L 302 131 L 273 134 L 267 131 Z', labelX: 284, labelY: 126, labelFontSize: 8, shortLabel: '327' },
  'gocheok-328': { d: 'M 296 122 L 321 121 L 324 131 L 301 134 L 295 129 Z', labelX: 308, labelY: 126, labelFontSize: 8, shortLabel: '328' },
  'gocheok-329': { d: 'M 321 122 L 346 122 L 348 132 L 326 135 L 320 130 Z', labelX: 333, labelY: 126, labelFontSize: 8, shortLabel: '329' },
  'gocheok-330': { d: 'M 347 123 L 371 124 L 373 134 L 352 136 L 346 131 Z', labelX: 357, labelY: 128, labelFontSize: 8, shortLabel: '330' },
  'gocheok-331': { d: 'M 372 128 L 393 129 L 395 138 L 378 140 L 371 134 Z', labelX: 381, labelY: 132, labelFontSize: 8, shortLabel: '331' },
  'gocheok-332': { d: 'M 395 136 L 396 132 L 397 130 L 401 130 L 409 132 L 418 135 L 418 137 L 417 141 L 416 143 L 415 144 L 411 143 L 400 140 L 397 139 L 395 138 Z', labelX: 406.4, labelY: 136.6, labelFontSize: 8, shortLabel: '332' },
  'gocheok-333': { d: 'M 420 142 L 421 139 L 422 137 L 425 137 L 437 141 L 441 143 L 442 144 L 442 145 L 440 151 L 439 152 L 437 152 L 420 146 Z', labelX: 430.6, labelY: 144.3, labelFontSize: 8, shortLabel: '333' },
  'gocheok-334': { d: 'M 443 153 L 444 150 L 446 146 L 449 146 L 458 150 L 475 158 L 486 165 L 488 167 L 485 173 L 483 175 L 443 154 Z', labelX: 465.2, labelY: 159.6, labelFontSize: 8, shortLabel: '334' },
  'gocheok-425': { d: 'M 148 145 L 160 132 L 161 131 L 170 123 L 177 120 L 183 119 L 185 119 L 186 124 L 185 143 L 153 156 L 150 155 L 148 154 Z', labelX: 168.8, labelY: 137.3, labelFontSize: 8, shortLabel: '425' },
  'gocheok-426': { d: 'M 187 114 L 188 109 L 189 108 L 198 102 L 202 100 L 207 100 L 211 111 L 212 115 L 212 129 L 209 133 L 200 133 L 196 131 L 192 127 L 189 121 Z', labelX: 200.6, labelY: 117.3, labelFontSize: 8, shortLabel: '426' },
  'gocheok-427': { d: 'M 213 103 L 214 96 L 216 92 L 228 86 L 231 85 L 234 88 L 235 90 L 239 108 L 239 123 L 238 124 L 235 125 L 231 126 L 223 126 L 219 125 L 214 109 Z', labelX: 226.8, labelY: 106.6, labelFontSize: 8, shortLabel: '427' },
  'gocheok-428': { d: 'M 240 81 L 243 80 L 256 76 L 261 78 L 262 80 L 263 85 L 266 108 L 267 117 L 265 119 L 258 119 L 253 118 L 249 115 L 246 111 L 240 97 Z', labelX: 253.3, labelY: 97.3, labelFontSize: 8, shortLabel: '428' },
  'gocheok-429': { d: 'M 268 79 L 269 76 L 272 74 L 273 74 L 274 75 L 275 77 L 289 110 L 289 113 L 287 115 L 279 115 L 274 114 L 272 111 L 269 95 Z', labelX: 275.1, labelY: 96.9, labelFontSize: 8, shortLabel: '429' },
  'gocheok-430': { d: 'M 299 108 L 300 106 L 312 105 L 336 105 L 338 106 L 338 114 L 306 114 L 300 111 L 299 110 Z', labelX: 318.6, labelY: 110.1, labelFontSize: 8, shortLabel: '430' },
  'gocheok-431': { d: 'M 350 107 L 363 73 L 364 71 L 365 71 L 373 73 L 375 74 L 375 77 L 370 112 L 369 117 L 362 117 L 353 116 L 350 115 Z', labelX: 364.8, labelY: 96.2, labelFontSize: 8, shortLabel: '431' },
  'gocheok-432': { d: 'M 373 115 L 375 102 L 376 96 L 380 79 L 382 76 L 383 76 L 388 77 L 397 80 L 402 82 L 402 86 L 399 102 L 394 111 L 391 115 L 390 116 L 385 120 L 384 120 L 375 119 L 373 117 Z', labelX: 387, labelY: 97.8, labelFontSize: 8, shortLabel: '432' },
  'gocheok-433': { d: 'M 402 105 L 406 86 L 411 86 L 414 87 L 427 96 L 428 100 L 428 101 L 425 112 L 424 115 L 419 127 L 416 127 L 406 123 L 402 120 Z', labelX: 413.7, labelY: 105.6, labelFontSize: 8, shortLabel: '433' },
  'gocheok-434': { d: 'M 431 105 L 432 100 L 436 99 L 438 100 L 446 105 L 449 107 L 451 120 L 451 121 L 449 126 L 441 123 L 434 119 L 432 114 L 431 106 Z', labelX: 441, labelY: 111.6, labelFontSize: 8, shortLabel: '434' },
  'gocheok-435': { d: 'M 453 131 L 455 120 L 456 117 L 457 116 L 460 117 L 465 119 L 469 122 L 476 128 L 479 131 L 495 148 L 495 151 L 494 153 L 492 155 L 487 159 L 456 143 L 453 135 Z', labelX: 471.8, labelY: 138.2, labelFontSize: 8, shortLabel: '435' },
};

const GOCHEOK_IMAGE_GEOMETRY: Record<string, GocheokImageGeometry> = Object.fromEntries(
  Object.entries(GOCHEOK_IMAGE_GEOMETRY_DRAFTS).map(([id, geometry]) => [
    id,
    {
      ...geometry,
      labelFontSize: geometry.labelFontSize ?? 10,
      shortLabel: geometry.shortLabel ?? id.replace('gocheok-', '').toUpperCase(),
    },
  ]),
) as Record<string, GocheokImageGeometry>;

function numberedBlocks(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function toId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sideFromX(x: number, fallback: GocheokSide = 'CENTER'): GocheokSide {
  if (x < 270) return 'THIRD_BASE';
  if (x > 383) return 'FIRST_BASE';
  return fallback;
}

function fanRoleFromSide(side: GocheokSide): GocheokFanRole {
  if (side === 'FIRST_BASE') return 'HOME';
  if (side === 'THIRD_BASE') return 'AWAY';
  return 'NEUTRAL';
}

function levelFromCategory(category: string, y: number): GocheokLevel {
  if (category === 'OUTFIELD') return 'OUTFIELD';
  if (category === 'GOLD') return y > 720 ? '4F' : '3F';
  if (category === 'BURGUNDY') return y > 500 ? '2F' : '1F';
  return '1F';
}

function alias(name: string, block: string, categoryLabel: string, extra: string[] = []): string[] {
  return Array.from(new Set([
    block,
    `${block}블록`,
    `고척 ${block}`,
    `고척 ${block}블록`,
    `키움 ${block}`,
    name,
    categoryLabel,
    ...extra,
  ]));
}

function createGocheokBlock(input: GocheokBlockInput): GocheokBlock {
  const category = GOCHEOK_CATEGORIES[input.category];
  if (!category) {
    throw new Error(`Unknown Gocheok category: ${input.category}`);
  }

  const id = `gocheok-${toId(input.block)}`;
  const imageGeometry = GOCHEOK_IMAGE_GEOMETRY[id];
  if (!imageGeometry) {
    throw new Error(`Missing Gocheok image geometry for ${id}`);
  }

  const side = input.side ?? (input.category === 'OUTFIELD' ? 'OUTFIELD' : sideFromX(imageGeometry.labelX));
  const fanRole = input.fanRole ?? fanRoleFromSide(side);
  const name = `${input.block} ${category.label}`;

  return {
    id,
    level: input.level ?? levelFromCategory(input.category, imageGeometry.labelY),
    category: input.category,
    name,
    block: input.block,
    officialBlocks: [input.block],
    side,
    fanRole,
    sourceConfidence: input.sourceConfidence ?? 'OFFICIAL',
    sourceNote: input.sourceNote ?? SOURCE_NOTE,
    seatViewSections: alias(name, input.block, category.label, input.aliases),
    imageGeometry,
    accessibilityNote: input.accessibilityNote,
  };
}

function blockGroup(blocks: string[], category: string, options: Omit<GocheokBlockInput, 'block' | 'category'> = {}): GocheokBlock[] {
  return blocks.map((block) => createGocheokBlock({ block, category, ...options }));
}

const DIAMOND_BLOCKS = blockGroup(['D07', 'D06', 'D05', 'D04', 'D03', 'D02', 'D01'], 'DIAMOND', {
  level: '1F',
  aliases: ['다이아몬드 클럽', '포수 후면'],
});

const TABLE_BLOCKS = [
  ...blockGroup(['T07', 'T06', 'T05'], 'TABLE', { level: '1F', aliases: ['테이블석'] }),
  ...blockGroup(['T04', 'T03', 'T02', 'T01'], 'TABLE', { level: '1F', aliases: ['테이블석'] }),
  ...blockGroup(['T17', 'T16', 'T15'], 'TABLE', { level: '1F', aliases: ['테이블석', '파란 테이블석'] }),
  ...blockGroup(['T13', 'T12', 'T11'], 'TABLE', { level: '1F', aliases: ['테이블석', '파란 테이블석'] }),
];

const SKY_BLUE_BLOCKS = [
  ...blockGroup(['S17', 'S16', 'S15', 'S14', 'S13', 'S12', 'S11', 'S10', 'S09'], 'SKY_BLUE', {
    level: '1F',
    aliases: ['스카이블루석', '내야 하단석'],
  }),
  ...blockGroup(['S08', 'S07', 'S06', 'S05', 'S04', 'S03', 'S02', 'S01'], 'SKY_BLUE', {
    level: '1F',
    aliases: ['스카이블루석', '내야 하단석'],
  }),
];

const BURGUNDY_BLOCKS = [
  ...blockGroup(['114', '113', '112', '111', '110', '109', '108'], 'BURGUNDY', {
    level: '1F',
    aliases: ['버건디석', '3루 버건디석'],
  }),
  ...blockGroup(['210', '209', '208', '207', '206'], 'BURGUNDY', {
    level: '2F',
    aliases: ['버건디석', '3루 버건디석'],
  }),
  ...blockGroup(['107', '106', '105', '104', '103', '102', '101'], 'BURGUNDY', {
    level: '1F',
    aliases: ['버건디석', '1루 버건디석'],
  }),
  ...blockGroup(['205', '204', '203', '202', '201'], 'BURGUNDY', {
    level: '2F',
    aliases: ['버건디석', '1루 버건디석'],
  }),
];

const GOLD_BLOCKS = [
  ...blockGroup(numberedBlocks(301, 321), 'GOLD', {
    level: '3F',
    aliases: ['골드 내야석', '내야석'],
  }),
  ...blockGroup(numberedBlocks(401, 424), 'GOLD', {
    level: '4F',
    aliases: ['골드 내야석', '내야 상단석'],
  }),
];

const OUTFIELD_BLOCKS = [
  ...blockGroup(numberedBlocks(115, 132), 'OUTFIELD', {
    level: 'OUTFIELD',
    aliases: ['외야 지정석', '외야 하단석'],
  }),
  ...blockGroup(numberedBlocks(211, 222), 'OUTFIELD', {
    level: 'OUTFIELD',
    aliases: ['외야 지정석', '외야 2층'],
  }),
  ...blockGroup(numberedBlocks(323, 334), 'OUTFIELD', {
    level: 'OUTFIELD',
    aliases: ['외야 지정석', '외야 3층'],
  }),
  ...blockGroup(numberedBlocks(425, 435), 'OUTFIELD', {
    level: 'OUTFIELD',
    aliases: ['외야 지정석', '외야 상단석'],
  }),
];

export const GOCHEOK_BLOCKS: GocheokBlock[] = [
  ...DIAMOND_BLOCKS,
  ...TABLE_BLOCKS,
  ...SKY_BLUE_BLOCKS,
  ...BURGUNDY_BLOCKS,
  ...GOLD_BLOCKS,
  ...OUTFIELD_BLOCKS,
];

export const GOCHEOK_TRACE_REVIEWED_BLOCK_IDS: string[] = [
  ...TABLE_BLOCKS.map((block) => block.id),
  ...DIAMOND_BLOCKS.map((block) => block.id),
  ...SKY_BLUE_BLOCKS.map((block) => block.id),
  ...BURGUNDY_BLOCKS.map((block) => block.id),
  ...GOLD_BLOCKS.map((block) => block.id),
  ...OUTFIELD_BLOCKS
    .filter((block) => !GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS.includes(block.id))
    .map((block) => block.id),
];

export const GOCHEOK_TRACE_REVIEW_REGIONS: GocheokTraceReviewRegion[] = [
  {
    id: 'table',
    label: 'T 테이블석',
    priority: 'DONE',
    method: 'OFFICIAL_IMAGE_PIXEL_TRACE',
    blockIds: TABLE_BLOCKS.map((block) => block.id),
    note: '공식 PNG 테이블석 색상 경계에서 추출한 hull을 수동 승인한 기준 그룹입니다.',
  },
  {
    id: 'diamond',
    label: 'D 다이아몬드석',
    priority: 'DONE',
    method: 'OFFICIAL_IMAGE_PIXEL_TRACE',
    blockIds: DIAMOND_BLOCKS.map((block) => block.id),
    note: '공식 PNG 분홍색 좌석 픽셀과 기존 path overlap을 확인해 승인한 포수 후면 기준 그룹입니다.',
  },
  {
    id: 'sky-blue',
    label: 'S 스카이블루석',
    priority: 'DONE',
    method: 'OFFICIAL_IMAGE_PIXEL_TRACE',
    blockIds: SKY_BLUE_BLOCKS.map((block) => block.id),
    note: 'S15-S09는 공식 PNG 청록색 컴포넌트 hull로 보정했고, 나머지는 overlap 기준 통과 후 승인했습니다.',
  },
  {
    id: 'burgundy',
    label: '101-114/201-210 버건디석',
    priority: 'DONE',
    method: 'OFFICIAL_IMAGE_PIXEL_TRACE',
    blockIds: BURGUNDY_BLOCKS.map((block) => block.id),
    note: '좌우 내야 버건디 블록은 밝은 안티앨리어싱을 포함한 공식 PNG 색상 overlap 기준으로 승인했습니다.',
  },
  {
    id: 'gold',
    label: '301-321/401-424 골드 내야석',
    priority: 'DONE',
    method: 'OFFICIAL_IMAGE_PIXEL_TRACE',
    blockIds: GOLD_BLOCKS.map((block) => block.id),
    note: '3층 오렌지/4층 노랑 계열 내야 블록은 현재 path가 공식 PNG 색상 overlap 기준을 통과해 승인했습니다.',
  },
  {
    id: 'outfield',
    label: '115-435 외야 지정석',
    priority: 'P5',
    method: 'MANUAL_REVIEW_REQUIRED',
    blockIds: OUTFIELD_BLOCKS.map((block) => block.id),
    note: '공식 PNG에 보이는 외야 블록만 유지하고 색상 overlap 기준을 통과한 경계를 reviewed로 고정했습니다.',
  },
];

export function getGocheokSideLabel(side: GocheokSide): string {
  const labels: Record<GocheokSide, string> = {
    FIRST_BASE: '1루',
    THIRD_BASE: '3루',
    CENTER: '중앙',
    OUTFIELD: '외야',
  };
  return labels[side];
}

export function getGocheokFanRoleLabel(role: GocheokFanRole): string {
  const labels: Record<GocheokFanRole, string> = {
    HOME: '홈',
    AWAY: '원정',
    NEUTRAL: '중립',
  };
  return labels[role];
}

export function getGocheokSourceLabel(confidence: GocheokSourceConfidence): string {
  return confidence === 'OFFICIAL' ? '공식 좌석도 기준' : '운영자 확인 필요';
}
