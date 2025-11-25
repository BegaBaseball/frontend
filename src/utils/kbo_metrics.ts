/**
 * KBO 리그의 세이버메트릭스 지표 계산을 위한 유틸리티 함수 및 클래스 모음.
 *
 * 이 모듈은 OPS, BABIP, wOBA, wRC+, WAR 등 야구의 고급 통계 지표를
 * 계산하는 함수를 제공합니다. 계산에 필요한 시즌별 가중치 및 상수는
 * LeagueContext 클래스를 통해 주입받습니다.
 *
 * Python 백엔드(`kbo_metrics.py`)의 로직을 TypeScript로 포팅한 버전입니다.
 */

export interface LeagueContext {
  wBB: number;
  wHBP: number;
  w1B: number;
  w2B: number;
  w3B: number;
  wHR: number;
  wOBA_scale: number;
  lg_wOBA: number;
  lg_R_per_PA: number;
  lg_OBP: number;
  lg_SLG: number;
  lg_ERA: number;
  lg_FIP: number;
  park_factor: number;
  runs_per_win: number;
  lg_ra9: number;
  fip_const: number;
}

export const defaultLeagueContext: LeagueContext = {
  wBB: 0.69,
  wHBP: 0.72,
  w1B: 0.88,
  w2B: 1.25,
  w3B: 1.6,
  wHR: 2.05,
  wOBA_scale: 1.2,
  lg_wOBA: 0.33,
  lg_R_per_PA: 0.115,
  lg_OBP: 0.330,
  lg_SLG: 0.400,
  lg_ERA: 4.10,
  lg_FIP: 4.20,
  park_factor: 1.0,
  runs_per_win: 10.0,
  lg_ra9: 4.5,
  fip_const: 3.1,
};

export function slg(H: number, _2B: number, _3B: number, HR: number, AB: number): number | null {
    if (AB <= 0) return null;
    const _1B = H - _2B - _3B - HR;
    const TB = _1B + 2 * _2B + 3 * _3B + 4 * HR;
    return TB / AB;
}

export function ops(
  H: number, BB: number, HBP: number, AB: number, SF: number,
  _2B: number, _3B: number, HR: number
): number | null {
  try {
    const obpDenominator = AB + BB + HBP + SF;
    const obp = obpDenominator > 0 ? (H + BB + HBP) / obpDenominator : 0.0;
    const slgVal = slg(H, _2B, _3B, HR, AB);
    if (slgVal === null) return null;
    return obp + slgVal;
  } catch (e) {
    return null;
  }
}

export function babip(
  H: number, AB: number, HR: number, K: number, SF: number
): number | null {
  const denominator = AB - K - HR + SF;
  if (denominator <= 0) {
    return null;
  }
  return (H - HR) / denominator;
}

export function woba(
  BB: number, IBB: number, HBP: number, H: number, _2B: number,
  _3B: number, HR: number, AB: number, SF: number, ctx: LeagueContext
): number | null {
  try {
    const uBB = BB - IBB;
    const _1B = H - _2B - _3B - HR;
    const numerator =
      ctx.wBB * uBB +
      ctx.wHBP * HBP +
      ctx.w1B * _1B +
      ctx.w2B * _2B +
      ctx.w3B * _3B +
      ctx.wHR * HR;
    const denominator = AB + uBB + SF + HBP;
    return denominator > 0 ? numerator / denominator : 0.0;
  } catch (e) {
    return null;
  }
}

export function wrcPlus(
  wobaVal: number, PA: number, ctx: LeagueContext
): number | null {
  if (ctx.wOBA_scale === 0 || ctx.lg_R_per_PA === 0) {
    return null;
  }
  const parkAdj = ctx.park_factor;
  try {
    return (
      100 *
      (((wobaVal - ctx.lg_wOBA) / ctx.wOBA_scale) + ctx.lg_R_per_PA) /
      (parkAdj * ctx.lg_R_per_PA)
    );
  } catch (e) {
    return null;
  }
}

export function warBatter(
  wobaVal: number, PA: number, baserunningRuns: number, fieldingRuns: number,
  positionalRuns: number, leagueAdjRuns: number, ctx: LeagueContext
): number | null {
  if (ctx.wOBA_scale === 0 || ctx.runs_per_win === 0) {
    return null;
  }
  try {
    const wraa = ((wobaVal - ctx.lg_wOBA) / ctx.wOBA_scale) * PA;
    const replacementRuns = (20 / 600) * PA;
    const war =
      (wraa +
        baserunningRuns +
        fieldingRuns +
        positionalRuns +
        leagueAdjRuns +
        replacementRuns) /
      ctx.runs_per_win;
    return war;
  } catch (e) {
    return null;
  }
}

export function fip(
  HR: number, BB: number, HBP: number, K: number, IP: number, ctx: LeagueContext
): number | null {
  if (IP === 0) {
    return null;
  }
  const numerator = 13 * HR + 3 * (BB + HBP) - 2 * K;
  return numerator / IP + ctx.fip_const;
}

export function warPitcher(
  fipVal: number, IP: number, ctx: LeagueContext
): number | null {
  if (ctx.runs_per_win === 0) {
    return null;
  }
  try {
    const runsAboveReplacement =
      (ctx.lg_ra9 * ctx.park_factor - fipVal) * (IP / 9);
    return runsAboveReplacement / ctx.runs_per_win;
  } catch (e) {
    return null;
  }
}

/**
 * Korean descriptions & grading
 */
const METRIC_KO: Record<string, [string, string]> = {
  "ERA": ["평균자책점", "9이닝당 자책점, 낮을수록 좋음"],
  "WHIP": ["이닝당 출루 허용(WHIP)", "이닝당 볼넷+피안타, 낮을수록 좋음"],
  "OPS": ["OPS(출루+장타)", "출루율과 장타율의 합, 높을수록 좋음"],
  "BABIP": ["인플레이 타구 타율(BABIP)", "운/수비 영향, 평균 회귀 경향"],
  "wRC+": ["wRC+", "구장 보정 공격지표, 100이 리그 평균"],
  "WAR": ["대체선수 대비 승리기여(WAR)", "팀 승리에 기여한 승수"],
  "FIP": ["수비무관 평균자책(FIP)", "볼넷·사구·삼진·홈런 기반, 낮을수록 좋음"],
  "K/9": ["9이닝당 삼진(K/9)", "삼진 능력"],
  "BB/9": ["9이닝당 볼넷(BB/9)", "제구 안정성"],
  "ISO": ["순수 장타율(ISO)", "장타력을 나타내는 지표"],
  "K-BB%": ["K-BB%", "삼진과 볼넷의 차이를 백분율로 나타낸 지표"],
  "OPS+": ["OPS+", "리그 평균 대비 조정 OPS, 100이 평균"],
  "ERA-": ["ERA-", "리그 평균 대비 조정 ERA, 100이 평균, 낮을수록 좋음"],
  "FIP-": ["FIP-", "리그 평균 대비 조정 FIP, 100이 평균, 낮을수록 좋음"],
  "CSW%": ["CSW%", "콜+헛스윙 비율, 투수의 구위를 나타내는 지표"],
};

export interface LeagueGradeBoundaries {
  era_ace: number;
  era_top: number;
  era_avg: number;
  era_low: number;
  whip_excellent: number;
  whip_good: number;
  whip_avg: number;
  ops_elite: number;
  ops_top: number;
  ops_avg: number;
  wrc_plus_mvp: number;
  wrc_plus_elite: number;
  wrc_plus_top: number;
  wrc_plus_avg: number;
  wrc_plus_low: number;
  war_mvp: number;
  war_allstar: number;
  war_starter: number;
  war_role: number;
  fip_ace: number;
  fip_top: number;
  fip_avg: number;
  k_per_9_excellent: number;
  k_per_9_good: number;
  k_per_9_avg: number;
  bb_per_9_excellent: number;
  bb_per_9_good: number;
  bb_per_9_avg: number;
}

export const defaultLeagueGradeBoundaries: LeagueGradeBoundaries = {
    era_ace: 2.50,
    era_top: 3.50,
    era_avg: 4.50,
    era_low: 5.00,
    whip_excellent: 1.10,
    whip_good: 1.30,
    whip_avg: 1.50,
    ops_elite: 0.900,
    ops_top: 0.800,
    ops_avg: 0.700,
    wrc_plus_mvp: 160,
    wrc_plus_elite: 140,
    wrc_plus_top: 120,
    wrc_plus_avg: 100,
    wrc_plus_low: 80,
    war_mvp: 6.0,
    war_allstar: 4.0,
    war_starter: 2.0,
    war_role: 0.0,
    fip_ace: 3.00,
    fip_top: 3.70,
    fip_avg: 4.30,
    k_per_9_excellent: 9.0,
    k_per_9_good: 7.0,
    k_per_9_avg: 5.0,
    bb_per_9_excellent: 2.0,
    bb_per_9_good: 3.0,
    bb_per_9_avg: 4.0,
};

export function gradeMetricKo(key: string, value: number | null, grades: LeagueGradeBoundaries = defaultLeagueGradeBoundaries): string {
  if (value == null) return "데이터 부족";
  const k = key.toUpperCase();
  const v = value;
  if (k === "ERA") {
    if (v <= grades.era_ace) return "에이스급";
    if (v <= grades.era_top) return "상위권";
    if (v <= grades.era_avg) return "평균권";
    if (v <= grades.era_low) return "하락세";
    return "재정비 필요";
  }
  if (k === "WHIP") {
    if (v <= grades.whip_excellent) return "출루 억제 우수";
    if (v <= grades.whip_good) return "양호";
    if (v <= grades.whip_avg) return "평균권";
    return "불안정";
  }
  if (k === "OPS") {
    if (v >= grades.ops_elite) return "엘리트";
    if (v >= grades.ops_top) return "상위권";
    if (v >= grades.ops_avg) return "보통";
    return "낮음";
  }
  if (k === "WRC+") {
    if (v >= grades.wrc_plus_mvp) return "MVP급";
    if (v >= grades.wrc_plus_elite) return "엘리트";
    if (v >= grades.wrc_plus_top) return "상위권";
    if (v >= grades.wrc_plus_avg) return "평균권";
    if (v >= grades.wrc_plus_low)  return "하락세";
    return "저조";
  }
  if (k === "WAR") {
    if (v >= grades.war_mvp) return "MVP 후보";
    if (v >= grades.war_allstar) return "올스타급";
    if (v >= grades.war_starter) return "선발 레귤러급";
    if (v >= grades.war_role) return "롤플레이어";
    return "대체선수 이하";
  }
  if (k === "FIP") {
    if (v <= grades.fip_ace) return "에이스급";
    if (v <= grades.fip_top) return "상위권";
    if (v <= grades.fip_avg) return "평균권";
    return "재정비 필요";
  }
  if (k === "K/9") {
    if (v >= grades.k_per_9_excellent) return "삼진 능력 탁월";
    if (v >= grades.k_per_9_good) return "양호";
    if (v >= grades.k_per_9_avg) return "평균권";
    return "낮음";
  }
  if (k === "BB/9") {
    if (v <= grades.bb_per_9_excellent) return "제구 매우 안정";
    if (v <= grades.bb_per_9_good) return "양호";
    if (v <= grades.bb_per_9_avg) return "평균권";
    return "불안정";
  }
  return "";
}

export function describeMetricKo(key: string, value: number | null, precision = 2, grades: LeagueGradeBoundaries = defaultLeagueGradeBoundaries): string {
  const [name, note] = METRIC_KO[key.toUpperCase()] ?? [key, ""];
  if (value == null) return `${name}: 데이터 부족`;
  const val = value.toFixed(precision);
  const grade = gradeMetricKo(key, value, grades);
  const extra = note ? ` — ${note}` : "";
  return grade ? `${name}: ${val} · ${grade}${extra}` : `${name}: ${val}${extra}`;
}

/**
 * IP Formatting Helpers
 */
export function ipToOuts(ip: number): number {
  const fullInnings = Math.floor(ip);
  const partialOuts = Math.round((ip - fullInnings) * 10);
  return (fullInnings * 3) + partialOuts;
}

export function outsToIpFloat(outs: number): number {
  return outs / 3.0;
}

export function formatIp(ip: number): string {
  if (ip == null) return "0.0";
  try {
    const outs = Math.round(ip * 3);
    const fullInnings = Math.floor(outs / 3);
    const partialOuts = outs % 3;
    return `${fullInnings}.${partialOuts}`;
  } catch (e) {
    return "0.0";
  }
}

/**
 * More batting/pitching metrics & helpers
 */
export function avg(H:number, AB:number): number | null {
  if (AB <= 0) return null;
  return H / AB;
}

export function iso(H:number, doubles:number, triples:number, HR:number, AB:number): number | null {
  const slgVal = slg(H, doubles, triples, HR, AB);
  const avgVal = avg(H, AB);
  if (slgVal == null || avgVal == null) return null;
  return slgVal - avgVal;
}

export function kPerNine(K:number, IP:number): number | null {
  if (IP <= 0) return null;
  return 9 * K / IP;
}

export function bbPerNine(BB:number, IP:number): number | null {
  if (IP <= 0) return null;
  return 9 * BB / IP;
}

export function kRate(K:number, PA:number): number | null {
  if (PA <= 0) return null;
  return K / PA;
}

export function bbRate(BB:number, PA:number): number | null {
  if (PA <= 0) return null;
  return BB / PA;
}

export function kMinusBbPct(K:number, BB:number, PA:number): number | null {
  const k = kRate(K, PA);
  const b = bbRate(BB, PA);
  if (k == null || b == null) return null;
  return 100 * (k - b);
}

export function opsPlus(OBP:number, SLG:number, ctx: LeagueContext): number | null {
  if (ctx.lg_OBP <= 0 || ctx.lg_SLG <= 0 || ctx.park_factor <= 0) return null;
  return 100 * ((OBP / ctx.lg_OBP + SLG / ctx.lg_SLG - 1) / ctx.park_factor);
}

export function eraMinus(ERA:number, ctx: LeagueContext): number | null {
  if (ctx.lg_ERA <= 0 || ctx.park_factor <= 0) return null;
  return 100 * (ERA / (ctx.lg_ERA * ctx.park_factor));
}

export function fipMinus(FIP:number, ctx: LeagueContext): number | null {
  if (ctx.lg_FIP <= 0 || ctx.park_factor <= 0) return null;
  return 100 * (FIP / (ctx.lg_FIP * ctx.park_factor));
}

export function cswRate(calledStrikes:number, swingingStrikes:number, totalPitches:number): number | null {
  if (totalPitches <= 0) return null;
  return (calledStrikes + swingingStrikes) / totalPitches;
}

export function safePct(x: number | null): number | null {
  return x == null ? null : 100 * x;
}

/**
 * Formatting helpers (game line + one-liner)
 */
export function classifyGameComment(a:number, b:number): string {
  const diff = Math.abs(a - b);
  const total = a + b;
  if (diff >= 5) return "완승";
  if (diff === 1) return "접전";
  if (total >= 12) return "타격전";
  if (total <= 3) return "투수전";
  if (Math.min(a, b) <= 2) return "상대 투수 공략 실패";
  return "균형 잡힌 경기";
}

export function formatGameLine(date:string, teamA:string, scoreA:number, teamB:string, scoreB:number, spA:string, spB:string, comment?:string): string {
  const c = comment ?? classifyGameComment(scoreA, scoreB);
  return `${date} ${teamA} ${scoreA}–${scoreB} ${teamB} — 선발: ${teamA} ${spA}, ${teamB} ${spB} · 한줄평: ${c}`;
}

export function pitcherRankScore(era_minus_v: number, fip_minus_v: number, kbb_pct: number, whip: number, ip: number): number {
    const base = 0.4*era_minus_v + 0.3*fip_minus_v + 0.2*(100 - kbb_pct) + 0.1*whip*100;
    const weight = 1 / (1 + Math.exp(-(ip - 60)/20));
    return base / Math.max(0.0001, weight);
}

export function scopeHeader(year:number, covered_teams:number, role:string, min_ip:number): string {
    const role_txt = role=="SP" ? "선발" : (role=="RP" ? "불펜" : "전체");
    return `범위: ${year} 정규시즌 · 커버 구단 ${covered_teams} · ${role_txt} · 최소 IP≥${min_ip}`;
}
