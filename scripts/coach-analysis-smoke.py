#!/usr/bin/env python3
"""
AI 코치 분석 다이얼로그 — 브라우저 스모크 (Playwright / Python)

C1 결과 본문이 빈/부분 데이터에서 깨지지 않고, 구형 UI 문자열이 노출되지 않으며,
review/preview 라벨·뷰포트·다크모드가 정상인지 검증한다.

런타임: node 에 playwright 가 없으므로 Python playwright 로 구동한다.
  실행:  COACH_SMOKE_PYTHON=/path/to/venv/bin/python3 npm run qa:coach:smoke
  또는:  pip install playwright && playwright install chromium && python3 scripts/coach-analysis-smoke.py

환경변수:
  COACH_SMOKE_BASE_URL   이미 떠 있는 dev server 에 attach (예: http://localhost:5176). 미설정 시 vite 자동 기동.
  COACH_SMOKE_PORT       자동 기동 포트 (기본 5199)
  COACH_SMOKE_HEADED     "1" 이면 headed

매트릭스: full(1280·light·review) / full(390·light) / full(1280·dark) /
          full-preview(1280·light) / insights0 / risks0 / winprob-null /
          insufficient(manual_data_required). 전 케이스에서 구형 문자열 미노출 단언.
실패 시 exit(1).
"""

import json
import os
import socket
import subprocess
import sys
import time
from contextlib import closing
from urllib.parse import urlparse

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.stderr.write(
        "playwright 미설치. COACH_SMOKE_PYTHON 으로 venv python 을 지정하거나\n"
        "  pip install playwright && playwright install chromium\n"
    )
    sys.exit(2)

GAME_ID = "20260527KTNC0"
FAKE_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ."
    "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
)
USER = {
    "id": 123,
    "email": "test@example.com",
    "name": "TestUser",
    "handle": "testuser",
    "favoriteTeam": "HH",
    "role": "ROLE_USER",
    "hasPassword": True,
    "profileImageUrl": None,
}

OLD_STRINGS = [
    "분석 기준 팀 선택",
    "분석 대상 팀 선택",
    "분석 집중 항목",
    "AI 코치 경기 리뷰 시작",
    "리뷰 결과 · 주의 변수",
]

GAME = {
    "gameId": GAME_ID,
    "gameDate": "2026-05-27",
    "homeTeam": "KT",
    "awayTeam": "NC",
    "stadium": "수원",
    "startTime": "18:30",
    "homeScore": 5,
    "awayScore": 8,
    "winner": "NC",
    "gameStatus": "FINAL",
    "seasonId": 2026,
    "leagueType": "REGULAR",
    "homePitcher": {"name": "배제성"},
    "awayPitcher": {"name": "라일리"},
}
GAME_DETAIL = {
    "gameId": GAME_ID,
    "gameDate": "2026-05-27",
    "homeTeam": "KT",
    "awayTeam": "NC",
    "stadiumName": "수원",
    "startTime": "18:30",
    "homeScore": 5,
    "awayScore": 8,
    "homePitcher": "배제성",
    "awayPitcher": "라일리",
    "gameStatus": "FINAL",
    "inningScores": [],
    "summary": [],
}

FULL_ANALYSIS = {
    "summary": "",
    "verdict": "KT는 **선발 조기 강판**이 패인.",
    "strengths": ["NC 불펜 ERA 1.80"],
    "weaknesses": ["KT 선발 ERA 5.40"],
    "risks": [
        {"area": "KT 선발 매치업", "level": 0, "description": "배제성 5회 조기 강판"},
        {"area": "날씨 변수", "level": 1, "description": "강풍 외야 플라이"},
        {"area": "NC 마무리 피로도", "level": 2, "description": "3연투 가능성"},
    ],
    "why_it_matters": [
        "선발 ERA 격차가 초반 흐름 결정",
        "불펜 깊이가 후반 우위로 직결",
    ],
    "swing_factors": ["7회초 역전 2점 홈런"],
    "watch_points": ["KT 마무리 등판 시점"],
    "uncertainty": ["강풍 영향 정량화 어려움"],
}


def build_structured(analysis):
    return {
        "headline": "NC 다이노스 승리",
        "sentiment": "negative",
        "key_metrics": [
            {
                "label": "최종 스코어",
                "value": "NC 8 / KT 5",
                "status": "danger",
                "trend": "down",
                "is_critical": True,
            }
        ],
        "analysis": analysis,
        "detailed_markdown": "## 상세\n분석",
        "coach_note": "재정비 필요.",
    }


def sse_meta(meta: dict) -> str:
    return f"event: meta\ndata: {json.dumps(meta)}\n\ndata: [DONE]\n\n"


def make_sse(
    *,
    analysis=FULL_ANALYSIS,
    win_prob=0.38,
    completed=True,
    data_quality="grounded",
    manual=False,
) -> str:
    if manual:
        meta = {
            "request_mode": "manual_detail",
            "validation_status": "manual_data_required",
            "generation_mode": "evidence_fallback",
            "data_quality": "insufficient",
            "grounding_warnings": ["야구 데이터 준비가 필요합니다."],
            "manual_data_request": {
                "missing_items": [
                    {
                        "key": "game_id",
                        "label": "경기 ID",
                        "reason": "경기 row 부재",
                        "expected_format": "20260527KTNC0",
                    }
                ]
            },
        }
        return sse_meta(meta)
    meta = {
        "structured_response": build_structured(analysis),
        "request_mode": "manual_detail",
        "game_status_bucket": "COMPLETED" if completed else "SCHEDULED",
        "data_quality": data_quality,
        "verified": True,
        "supported_fact_count": 44,
        "used_evidence": ["home_pitcher", "away_lineup", "game_summary"],
    }
    if win_prob is not None:
        meta["win_probability_home"] = win_prob
    return sse_meta(meta)


# ── scenarios ────────────────────────────────────────────────
def scn_full():
    return make_sse()


def scn_full_preview():
    return make_sse(completed=False)


def scn_insights0():
    return make_sse(
        analysis={
            **FULL_ANALYSIS,
            "why_it_matters": [],
            "swing_factors": [],
            "watch_points": [],
            "uncertainty": [],
            "strengths": [],
            "weaknesses": [],
        }
    )


def scn_risks0():
    return make_sse(
        analysis={**FULL_ANALYSIS, "risks": [], "weaknesses": [], "uncertainty": []}
    )


def scn_winprob_null():
    return make_sse(win_prob=None)


def scn_manual():
    return make_sse(manual=True)


# scenario, sse, viewport(w), dark, checks
MATRIX = [
    (
        "full · 1280 · light · review",
        scn_full(),
        1280,
        False,
        dict(
            insights=True,
            risks=True,
            review="결과를 가른 이유",
            winprob_dashes=False,
            body=True,
        ),
    ),
    (
        "full · 390 · light",
        scn_full(),
        390,
        False,
        dict(insights=True, risks=True, body=True),
    ),
    (
        "full · 1280 · dark",
        scn_full(),
        1280,
        True,
        dict(insights=True, risks=True, body=True),
    ),
    (
        "full · 1280 · light · preview",
        scn_full_preview(),
        1280,
        False,
        dict(insights=True, risks=True, preview="왜 중요한가", body=True),
    ),
    (
        "insights=0 · 1280 · light",
        scn_insights0(),
        1280,
        False,
        dict(insights=False, risks=True, body=True),
    ),
    (
        "risks=0 · 1280 · light",
        scn_risks0(),
        1280,
        False,
        dict(insights=True, risks=False, body=True),
    ),
    (
        "winprob=null · 1280 · light",
        scn_winprob_null(),
        1280,
        False,
        dict(insights=True, risks=True, body=True),
    ),
    (
        "manual_data_required · 1280 · light",
        scn_manual(),
        1280,
        False,
        dict(body=False, notice=True),
    ),
]

INSIGHT_HEADER = "판단 근거와 관전 포인트"  # SectionHeading subtitle (인사이트 전용)
RISK_HEADER = "리스크 회차 분포"
VERSUS_TOKEN = "에 불리"
EVIDENCE_CHIP = "분석에 반영한 정보"  # visible evidence disclosure summary


def free_port(default):
    try:
        with closing(socket.socket()) as s:
            s.bind(("127.0.0.1", 0))
            return s.getsockname()[1]
    except Exception:
        return default


def wait_http(url, timeout=40):
    import urllib.request

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def body_excerpt(page, limit=700):
    try:
        return " ".join(page.inner_text("body").split())[:limit]
    except Exception:
        return "<body unavailable>"


def is_app_api_url(url):
    path = urlparse(url).path
    return path.startswith("/api/") or path.startswith("/ai/")


def run_case(browser, base_url, label, sse, width, dark, checks):
    auth_state = json.dumps(
        {
            "state": {
                "user": USER,
                "isLoggedIn": True,
                "isAdmin": False,
                "isAuthLoading": False,
            },
            "version": 0,
        }
    )
    auth_meta = json.dumps(
        {"version": 1, "lastSuccessAt": int(time.time() * 1000), "lastFailureAt": None}
    )
    auth_profile = json.dumps({"success": True, "data": {**USER, "cheerPoints": 0}})
    init = (
        f"window.__BEGA_TEST_AUTH_PROFILE__ = {auth_profile};"
        f"localStorage.setItem('auth-storage', {json.dumps(auth_state)});"
        f"localStorage.setItem('accessToken', '{FAKE_TOKEN}');"
        "localStorage.setItem('auth-bootstrap-hint','1');"
        f"localStorage.setItem('auth-bootstrap-meta', {json.dumps(auth_meta)});"
        "localStorage.setItem('bega_has_visited','true');"
        "localStorage.setItem('bega_dont_show_guide','true');"
        "sessionStorage.setItem('cypress:skip-public-auth-bootstrap','1');"
    )
    ctx = browser.new_context(
        viewport={"width": width, "height": 1500},
        device_scale_factor=1,
        color_scheme="dark" if dark else "light",
    )
    ctx.add_init_script(init)
    if dark:
        ctx.add_init_script(
            "try{document.documentElement.classList.add('dark')}catch(e){}"
        )
    page = ctx.new_page()
    page.set_default_timeout(30000)
    errors = []
    console_errors = []
    api_requests = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "console",
        lambda msg: console_errors.append(msg.text)
        if msg.type == "error"
        else None,
    )
    page.on(
        "request",
        lambda request: api_requests.append(request.url)
        if is_app_api_url(request.url)
        else None,
    )

    def handler(route):
        u = route.request.url
        path = urlparse(u).path
        if not (path.startswith("/api/") or path.startswith("/ai/")):
            route.continue_()
            return
        if "/ai/coach/analyze" in path:
            route.fulfill(
                status=200, headers={"content-type": "text/event-stream"}, body=sse
            )
        elif f"/api/matches/{GAME_ID}" in path and "day" not in path and "bounds" not in path:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(GAME_DETAIL),
            )
        elif "/api/matches/day" in path:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(
                    {
                        "date": "2026-05-27",
                        "games": [GAME],
                        "prevDate": "2026-05-26",
                        "nextDate": "2026-05-28",
                        "hasPrev": True,
                        "hasNext": True,
                    }
                ),
            )
        elif "/api/matches/bounds" in path:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(
                    {
                        "hasData": True,
                        "earliestGameDate": "2026-01-01",
                        "latestGameDate": "2026-05-28",
                    }
                ),
            )
        elif f"/api/predictions/status/{GAME_ID}" in path:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(
                    {
                        "gameId": GAME_ID,
                        "homeVotes": 42,
                        "awayVotes": 58,
                        "userVote": None,
                        "totalVotes": 100,
                    }
                ),
            )
        elif "/api/auth/mypage" in path:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"success": True, "data": {**USER}}),
            )
        elif "/api/auth/reissue" in path:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"success": True, "data": {"accessToken": FAKE_TOKEN}}),
            )
        elif "/api/chat/my/unread-counts" in path:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"success": True, "data": 0}),
            )
        elif "/api/dm/rooms/my" in path:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"success": True, "data": []}),
            )
        elif "/api/notifications" in path:
            route.fulfill(status=200, content_type="application/json", body="[]")
        elif "/api/home" in path:
            route.fulfill(status=200, content_type="application/json", body="{}")
        elif "/api/kbo/rankings" in path or "/api/rankings" in path:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(
                    [
                        {
                            "teamId": "KT",
                            "teamName": "KT 위즈",
                            "rank": 5,
                            "wins": 50,
                            "losses": 45,
                            "draws": 2,
                            "winRate": "0.526",
                            "games": 97,
                            "gamesBehind": 3.0,
                        },
                        {
                            "teamId": "NC",
                            "teamName": "NC 다이노스",
                            "rank": 3,
                            "wins": 55,
                            "losses": 42,
                            "draws": 1,
                            "winRate": "0.567",
                            "games": 98,
                            "gamesBehind": 1.0,
                        },
                    ]
                ),
            )
        else:
            route.continue_()

    page.route("**/api/**", handler)
    page.route("**/ai/**", handler)

    failures = []
    try:
        page.goto(
            f"{base_url}/prediction?date=2026-05-27",
            wait_until="domcontentloaded",
            timeout=25000,
        )
        page.wait_for_timeout(2500)
        if dark:
            page.evaluate("document.documentElement.classList.add('dark')")
        entry_button = page.locator('[data-testid="prediction-match-enter-detail-btn"]').first
        try:
            entry_button.wait_for(state="visible", timeout=15000)
            entry_button.click()
        except Exception as e:
            failures.append(
                "상세 진입 버튼 미노출: "
                f"{type(e).__name__}: {str(e)[:140]} | "
                f"page_errors={errors[-3:]} | console_errors={console_errors[-3:]} | "
                f"api_requests={api_requests[-8:]} | body={body_excerpt(page)}"
            )
            return failures
        detail_region = page.locator('[data-testid="prediction-ai-coach-review"]').first
        briefing_card = page.locator('[data-testid="coach-briefing-card"]').first
        analysis_button = page.locator('[data-testid="coach-analysis-open"]').first
        try:
            detail_region.wait_for(state="visible", timeout=20000)
            briefing_card.wait_for(state="visible", timeout=20000)
            analysis_button.wait_for(state="visible", timeout=45000)
            analysis_button.click()
        except Exception as e:
            card_excerpt = ""
            if briefing_card.count():
                try:
                    card_excerpt = " ".join(briefing_card.inner_text().split())[:500]
                except Exception:
                    card_excerpt = "<card unavailable>"
            failures.append(
                "AI 코치 브리핑 런처 미노출: "
                f"{type(e).__name__}: {str(e)[:140]} | "
                f"page_errors={errors[-3:]} | console_errors={console_errors[-3:]} | "
                f"api_requests={api_requests[-10:]} | card={card_excerpt} | body={body_excerpt(page)}"
            )
            return failures
        page.locator("[data-testid='coach-analysis-dialog']").first.wait_for(
            state="visible",
            timeout=20000,
        )
        if checks.get("body") is True:
            page.locator("[role='article']").first.wait_for(
                state="visible",
                timeout=45000,
            )
        elif checks.get("notice"):
            page.locator(
                "[data-testid='coach-analysis-data-quality-note']"
            ).first.wait_for(state="visible", timeout=45000)

        body_text = page.inner_text("body")
        dialog = page.locator("[data-testid='coach-analysis-dialog']").first

        # 1. JS 에러 0
        if errors:
            failures.append(f"JS error: {errors[0][:120]}")

        # 2. 구형 문자열 미노출 (전 케이스 공통)
        for s in OLD_STRINGS:
            if s in body_text:
                failures.append(f"구형 문자열 노출: {s}")

        # 3. 결과 본문(versus hero / role=article) 유무
        has_body = (
            page.locator("[role='article']").count() > 0
            and page.locator("[role='article']").first.is_visible()
        )
        if checks.get("body") is True and not has_body:
            failures.append("결과 본문 미렌더(있어야 함)")
        if checks.get("body") is False and has_body:
            failures.append("결과 본문 렌더됨(없어야 함)")

        # notice (manual/insufficient)
        if checks.get("notice"):
            if (
                page.locator("[data-testid='coach-analysis-data-quality-note']").count()
                == 0
            ):
                failures.append("data-quality notice 미노출(있어야 함)")

        # 본문 있는 케이스의 섹션/라벨 단언
        if has_body:
            txt = dialog.inner_text() if dialog.count() else body_text
            # 근거 투명성 칩: 실데이터 기반 신호가 첫 시선 위치에 노출돼야 함
            if EVIDENCE_CHIP not in txt:
                failures.append("근거 투명성 칩 미노출(있어야 함)")
            if "insights" in checks:
                present = INSIGHT_HEADER in txt
                if checks["insights"] and not present:
                    failures.append("인사이트 섹션 미노출(있어야 함)")
                if not checks["insights"] and present:
                    failures.append("인사이트 섹션 노출(없어야 함)")
            if "risks" in checks:
                present = RISK_HEADER in txt or VERSUS_TOKEN in txt
                if checks["risks"] and not present:
                    failures.append("리스크 섹션 미노출(있어야 함)")
                if not checks["risks"] and present:
                    failures.append("리스크 섹션 노출(없어야 함)")
            if checks.get("review") and checks["review"] not in txt:
                failures.append(f"review 라벨 누락: {checks['review']}")
            if checks.get("preview") and checks["preview"] not in txt:
                failures.append(f"preview 라벨 누락: {checks['preview']}")

            # 4. 가로 오버플로우 0
            overflow = page.evaluate(
                "()=>{const a=document.querySelector(\"[role='article']\");"
                "return a?a.scrollWidth>a.clientWidth+2:false;}"
            )
            if overflow:
                failures.append("가로 오버플로우 발생")
    except Exception as e:
        failures.append(f"예외: {type(e).__name__}: {str(e)[:140]}")
    finally:
        ctx.close()

    return failures


def main():
    base_url = os.environ.get("COACH_SMOKE_BASE_URL", "").rstrip("/")
    proc = None
    if not base_url:
        port = int(os.environ.get("COACH_SMOKE_PORT") or free_port(5199))
        base_url = f"http://localhost:{port}"
        here = os.path.dirname(os.path.abspath(__file__))
        frontend = os.path.dirname(here)
        print(f"[smoke] vite dev server 기동 :{port}")
        proc = subprocess.Popen(
            ["npx", "vite", "--port", str(port), "--strictPort"],
            cwd=frontend,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if not wait_http(f"{base_url}/", timeout=60):
            if proc:
                proc.terminate()
            sys.stderr.write("[smoke] dev server 기동 실패\n")
            sys.exit(2)
    else:
        print(f"[smoke] attach: {base_url}")

    headed = os.environ.get("COACH_SMOKE_HEADED") == "1"
    total_fail = 0
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=not headed, args=["--no-sandbox"])
            for label, sse, width, dark, checks in MATRIX:
                fails = run_case(browser, base_url, label, sse, width, dark, checks)
                if fails:
                    total_fail += 1
                    print(f"  ❌ {label}")
                    for f in fails:
                        print(f"       - {f}")
                else:
                    print(f"  ✅ {label}")
            browser.close()
    finally:
        if proc:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except Exception:
                proc.kill()

    print(f"\n[smoke] {len(MATRIX) - total_fail}/{len(MATRIX)} passed")
    sys.exit(1 if total_fail else 0)


if __name__ == "__main__":
    main()
