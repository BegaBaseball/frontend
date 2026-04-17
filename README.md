<div id="top">

<div align="center">

# ⚾ BEGA (Baseball Guide)

<em>야구 팬을 위한 올인원 가이드 애플리케이션</em>

<br>

<!-- PROJECT LOGO or SCREENSHOT -->
<!-- 스크린샷이 있다면 추가 -->
<!-- <img src="./docs/screenshot.png" alt="BEGA Screenshot" width="800"> -->

<br>

<!-- BADGES -->
[![React](https://img.shields.io/badge/React-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat&logo=TypeScript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF.svg?style=flat&logo=Vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4.svg?style=flat&logo=Tailwind-CSS&logoColor=white)](https://tailwindcss.com/)
[![OCI](https://img.shields.io/badge/OCI-Object%20Storage-1F2A44.svg?style=flat&logo=oracle&logoColor=white)](https://www.oracle.com/cloud/)
[![Docker](https://img.shields.io/badge/Docker-2496ED.svg?style=flat&logo=Docker&logoColor=white)](https://www.docker.com/)

<br>

<em>사용된 기술 스택:</em>

[![React Query](https://img.shields.io/badge/React%20Query-FF4154.svg?style=flat&logo=React-Query&logoColor=white)](https://tanstack.com/query)
[![React Hook Form](https://img.shields.io/badge/React%20Hook%20Form-EC5990.svg?style=flat&logo=React-Hook-Form&logoColor=white)](https://react-hook-form.com/)
[![Zustand](https://img.shields.io/badge/Zustand-000000.svg?style=flat&logo=React&logoColor=white)](https://zustand-demo.pmnd.rs/)
[![React Router](https://img.shields.io/badge/React%20Router-CA4245.svg?style=flat&logo=React-Router&logoColor=white)](https://reactrouter.com/)

</div>

<br>

---

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [스크린샷](#-스크린샷)
- [기술 스택](#-기술-스택)
- [아키텍처](#-아키텍처)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [QA](#-qa)
- [환경 변수](#-환경-변수)
- [배포](#-배포)
- [관련 저장소](#-관련-저장소)
- [팀원](#-팀원)
- [라이선스](#-라이선스)

---

## 🎯 프로젝트 소개

**BEGA (Baseball Guide)** 는 KBO 야구 팬들을 위한 종합 가이드 애플리케이션입니다.

직관 기록부터 구장 정보, 같이가요 메이트 매칭, AI 챗봇까지 야구 팬에게 필요한 모든 기능을 한 곳에서 제공합니다.

### ✨ 왜 BEGA인가요?

> 🎫 **혼자 가는 직관이 아쉬웠던 적 있으신가요?**
> 
> BEGA는 같은 경기를 보러 가는 팬들을 연결해주고, 직관의 추억을 기록하며, AI 챗봇으로 궁금한 경기 정보를 바로 확인할 수 있습니다.

---

## 🚀 주요 기능

### 📝 직관 다이어리
경기 관람 기록을 사진, 감정, 경기 결과와 함께 저장하세요.
- 📅 주간/월간 캘린더 뷰
- 📸 최대 6장 사진 업로드
- 😊 감정 태그 및 메모 작성
- 📊 개인 직관 통계 분석

### 👥 같이가요 (메이트 매칭)
함께 직관할 메이트를 찾아보세요.
- 🎯 경기별 메이트 모집 게시판
- 🔍 팀/날짜/구장별 필터 검색
- 💬 실시간 참가 신청 및 수락
- 👤 프로필 기반 매칭

### 🏟️ 구장 가이드
전국 KBO 10개 구장의 상세 정보를 확인하세요.
- 🗺️ 구장별 좌석 배치도
- 🍔 먹거리 및 편의시설 안내
- 🚗 교통 정보 및 주차 안내
- 📍 주변 맛집 추천

### 🤖 AI 챗봇
KBO 리그에 대한 모든 궁금증을 해결하세요.
- 🎙️ 음성 인식 지원 (STT)
- 📈 선수 통계 및 경기 기록 조회
- 💡 자연어 기반 질의응답
- ⚡ 실시간 경기 정보

### 📊 통계 대시보드
나만의 직관 데이터를 분석해보세요.
- 🏆 팀별 직관 승률
- 📆 월별 직관 횟수 추이
- 🏟️ 구장별 방문 통계
- 🎯 직관 목표 달성률

---

## 📸 스크린샷

<div align="center">

| 홈 화면 | 직관 다이어리 | 같이가요 |
|:---:|:---:|:---:|
| ![Home](./docs/screenshots/home.png) | ![Diary](./docs/screenshots/diary.png) | ![Mate](./docs/screenshots/mate.png) |

| 구장 가이드 | AI 챗봇 | 통계 |
|:---:|:---:|:---:|
| ![Stadium](./docs/screenshots/stadium.png) | ![Chatbot](./docs/screenshots/chatbot.png) | ![Stats](./docs/screenshots/stats.png) |

</div>

---

## 🛠️ 기술 스택

### Frontend

| 분류 | 기술 |
|:---|:---|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State Management** | Zustand |
| **Server State** | TanStack Query (React Query) |
| **Form** | React Hook Form + Zod |
| **Routing** | React Router v6 |
| **HTTP Client** | Axios |

### Infrastructure

| 분류 | 기술 |
|:---|:---|
| **Database & Storage** | OCI Autonomous Database + OCI Object Storage |
| **Container** | Docker |
| **CI/CD** | GitHub Actions |
| **Hosting** | Cloudflare Workers Static Assets + CDN |

---

## 🏗️ 아키텍처
```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                   (React + TypeScript)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌───────────┐ ┌──────────────────────┐
│  Spring Boot    │ │  FastAPI  │ │   OCI Object Storage │
│  Backend API    │ │ AI Server │ │      (Images)        │
└────────┬────────┘ └─────┬─────┘ └──────────────────────┘
         │                │
         ▼                ▼
┌───────────────────────────────────────────┐
│        OCI Autonomous Database (Oracle)   │
└───────────────────────────────────────────┘
```

---

## 📁 프로젝트 구조
```
src/
├── assets/              # 정적 파일 (이미지, 폰트 등)
├── components/          # 재사용 가능한 UI 컴포넌트
│   ├── ui/             # 기본 UI 컴포넌트 (Button, Input, Modal 등)
│   ├── layout/         # 레이아웃 컴포넌트 (Header, Footer, Sidebar)
│   ├── diary/          # 다이어리 관련 컴포넌트
│   ├── mate/           # 같이가요 관련 컴포넌트
│   └── chatbot/        # AI 챗봇 관련 컴포넌트
├── pages/              # 페이지 컴포넌트
├── hooks/              # 커스텀 훅
├── stores/             # Zustand 스토어
├── services/           # API 서비스 레이어
├── types/              # TypeScript 타입 정의
├── utils/              # 유틸리티 함수
├── constants/          # 상수 정의
└── lib/                # 외부 라이브러리 설정
```

---

## 🚀 시작하기

### 사전 요구사항

- **Node.js** v18.0.0 이상
- **npm** v9.0.0 이상
- **Docker** (선택) 컨테이너 실행 시

### 설치 및 실행
```bash
# 1. 저장소 클론
git clone https://github.com/your-username/bega-frontend.git

# 2. 디렉토리 이동
cd bega-frontend

# 3. 의존성 설치
npm install

# 4. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 필요한 값 입력

# 5. 개발 서버 실행
npm run dev
```

### Docker로 실행
```bash
# 이미지 빌드 및 실행
docker build -t bega-frontend .
docker run -p 5173:5173 bega-frontend

# 또는 docker-compose 사용
docker-compose up -d
```

### Stadium E2E 표준 실행
```bash
# 1순위(로컬 서버 기동 상태): self-heal 경로
npm run cy:run:heal -- --spec cypress/e2e/stadium.cy.ts --config baseUrl=http://127.0.0.1:5176

# 기본 대체 경로(서버 미기동/포트 바인딩 실패 포함): rescue 경로
npm run test:e2e:rescue -- --spec cypress/e2e/stadium.cy.ts
```

### Diary / Admin / AI E2E 실행
```bash
# 개별 deterministic spec
npm run test:e2e:diary:dev
npm run test:e2e:admin:dev
npm run test:e2e:ai:dev

# 커버리지 확장 묶음 실행
npm run test:e2e:coverage:dev
```

### Mate CI / E2E 실행
```bash
# 빠른 로컬 smoke
npm run test:mate:smoke
VITE_SITE_URL=http://localhost:5173 VITE_API_BASE_URL=http://localhost:8080 npm run build
npm run test:e2e:mate:smoke

# 전체 mate regression
npm run test:e2e:mate:full

# 변경 파일 기준 full regression 라벨 적용 여부 로컬 확인
npm run qa:mate:regression:label -- bega_frontend/src/components/MateDetail.tsx
```

- `Frontend Mate` workflow는 mate 관련 경로와 공용 의존성 변경 PR에서 smoke를 자동 실행합니다.
- 같은 `Frontend Mate` workflow는 매일 03:00 KST에 regression을 실행하고, 수동 실행도 가능합니다.
- mate 핵심 경로 변경 PR에는 `full-mate-regression` 라벨이 자동으로 붙고, 필요하면 수동으로도 추가해 workflow를 실행할 수 있습니다.
- 수동 실행 시 `suite_scope`로 `all / route / create / extended`를 고를 수 있고, `upload_visual_artifacts`로 `mate-visual` 스크린샷 업로드를 요청할 수 있습니다.
- 이 workflow는 `reports/mate-ci/*.json`과 raw log를 artifact로 올려 machine-readable 결과를 남깁니다.
- pull request에서는 이 workflow가 sticky comment를 업데이트해서 stage별 결과와 artifact 이름을 바로 보여줍니다.
- `npm run qa:mate:regression:label -- <changed-file...>` 로 auto-label 기준을 로컬에서 미리 확인할 수 있습니다.

### Real AI 챗봇 smoke 실행
```bash
# 필수: 실제 백엔드 기준 URL
BACKEND_BASE_URL=http://localhost:8080 npm run test:e2e:ai:real

# 선택: 기존 계정을 그대로 사용할 때
BACKEND_BASE_URL=http://localhost:8080 \
SMOKE_LOGIN_EMAIL=qa@example.com \
SMOKE_LOGIN_PASSWORD=Test1234! \
npm run test:e2e:ai:real
```

### DM authenticated smoke 실행
```bash
BASE_URL=http://127.0.0.1:18080 \
CLIENT_ORIGIN=https://www.begabaseball.xyz \
DM_SENDER_EMAIL=sender@example.com \
DM_SENDER_PASSWORD='***' \
DM_TARGET_EMAIL=target@example.com \
DM_TARGET_PASSWORD='***' \
DM_TARGET_HANDLE=@target \
./scripts/dm_authenticated_smoke.sh
```

- `BASE_URL`가 `:18080`이면 script는 `CLIENT_ORIGIN`이 비어 있을 때 자동으로 `https://www.begabaseball.xyz`를 사용합니다.
- credential fallback 순서는 `DM_* -> SMOKE_LOGIN_* / SMOKE_TARGET_* -> repo-local .env TEST_*` 입니다.
- GitHub Actions에서는 [frontend-postdeploy-smoke.yml](/Users/mac/project/KBO_platform/.github/workflows/frontend-postdeploy-smoke.yml)을 `suite=dm`으로 `workflow_dispatch` 실행하면 되고, 아래 secrets가 필요합니다.
  - sender: `FRONTEND_REAL_SMOKE_LOGIN_EMAIL`, `FRONTEND_REAL_SMOKE_LOGIN_PASSWORD`
  - target: `FRONTEND_REAL_DM_TARGET_EMAIL`, `FRONTEND_REAL_DM_TARGET_PASSWORD`, `FRONTEND_REAL_DM_TARGET_HANDLE`
- 같은 [frontend-postdeploy-smoke.yml](/Users/mac/project/KBO_platform/.github/workflows/frontend-postdeploy-smoke.yml)에서 `suite=real`, `run_dm_smoke=true`로 실행하면 같은 sender/target secrets를 사용해 DM smoke까지 이어서 수행합니다.
- [frontend-postdeploy-smoke.yml](/Users/mac/project/KBO_platform/.github/workflows/frontend-postdeploy-smoke.yml)은 `suite=auth`, `run_dm_smoke=true`도 지원하므로, auth 공개 smoke와 DM smoke를 한 번에 돌릴 수 있습니다.

---

## 🧪 QA

### 모바일 fallback smoke
```bash
# Cypress가 막힌 로컬의 기본 대체 경로
npm run qa:mobile:smoke

# 이미 떠 있는 127.0.0.1:5176 프론트에만 명시적으로 attach
npm run qa:mobile:smoke:attached

# 다른 포트 프론트에 attach
AUDIT_BASE_URL=http://127.0.0.1:4273 npm run qa:mobile:smoke:attached
```

- `qa:mobile:smoke`는 prediction smoke와 mate smoke를 순서대로 실행합니다.
- 기본적으로 로컬 `127.0.0.1:5176` 프론트가 이미 떠 있으면 재사용하고, 없으면 각 runner가 필요한 dev server를 자체 기동합니다.
- `qa:mobile:smoke:attached`는 두 smoke 모두 attach-only로 실행합니다.
- combined 결과 요약은 `/Users/mac/project/KBO_platform/output/playwright/mobile-playwright-smoke-summary.md`에 저장됩니다.
- GitHub Actions에서 같은 흐름을 수동 실행하려면 [frontend-mobile-qa.yml](/Users/mac/project/KBO_platform/.github/workflows/frontend-mobile-qa.yml)을 `suite=combined`로 `workflow_dispatch` 실행하면 됩니다.

### Prediction 모바일 회귀
```bash
# 팀 기본 smoke
npm run qa:prediction:mobile:smoke

# 전체 상태 회귀
npm run qa:prediction:mobile

# 이미 떠 있는 127.0.0.1:5176 프론트에만 명시적으로 attach
npm run qa:prediction:mobile:smoke:attached

# 다른 포트 프론트에 attach
AUDIT_BASE_URL=http://127.0.0.1:4273 npm run qa:prediction:mobile:smoke:attached
```

- `smoke`는 `match`, `ranking`, `ranking-save-dialog`, `ranking-saved`, `detail-error`를 대상으로 PR 검증용으로 사용합니다.
- `smoke`는 로컬 `127.0.0.1:5176` 프론트가 이미 떠 있으면 그 서버를 재사용하고, 없으면 자체 dev server를 띄웁니다. prediction 검증의 팀 기본 명령으로 사용합니다.
- `full`은 `ranking-ready`, `ranking-ended`, `empty`까지 포함한 8개 상태를 검증합니다.
- `attached`는 기존 Vite 서버만 사용하고 새 dev server를 띄우지 않습니다. 다른 포트에 붙이거나 attach-only 동작이 필요할 때만 사용합니다.
- 결과 요약은 `/Users/mac/project/KBO_platform/output/playwright/prediction-mobile-regression-summary.md`에, 상세 캡처는 `/Users/mac/project/KBO_platform/output/playwright/prediction-mobile/`에 저장됩니다.
- GitHub Actions smoke workflow는 [frontend-mobile-qa.yml](/Users/mac/project/KBO_platform/.github/workflows/frontend-mobile-qa.yml)을 `suite=prediction`으로 사용합니다.

### Mate 모바일 회귀
```bash
# 팀 기본 smoke
npm run qa:mate:mobile:smoke

# 전체 mate 모바일 회귀
npm run qa:mate:mobile

# 이미 떠 있는 127.0.0.1:5176 프론트에만 명시적으로 attach
npm run qa:mate:mobile:smoke:attached

# 다른 포트 프론트에 attach
AUDIT_BASE_URL=http://127.0.0.1:4273 npm run qa:mate:mobile:smoke:attached
```

- `smoke`는 로컬 `127.0.0.1:5176` 프론트가 이미 떠 있으면 그 서버를 재사용하고, 없으면 자체 dev server를 띄웁니다. mate 검증의 기본 명령으로 사용합니다.
- `attached`는 기존 Vite 서버만 사용하고 새 dev server를 띄우지 않습니다. 다른 포트에 붙이거나 attach-only 동작이 필요할 때만 사용합니다.
- 결과 요약은 `/Users/mac/project/KBO_platform/output/playwright/mate-mobile-regression-summary.md`에 저장됩니다.

---

## ⚙️ 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수를 설정합니다:
```env
# 로컬 same-origin / Vite proxy
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:8080

# 공개 빌드/배포
# API origin만 지정하세요. 런타임이 `${origin}/api`로 정규화합니다.
# VITE_API_BASE_URL=https://api.begabaseball.xyz

# 카카오 지도
VITE_KAKAO_MAP_KEY=your_kakao_map_key

# SEO canonical/sitemap 기준 URL (필수)
VITE_SITE_URL=https://www.begabaseball.xyz

# SEO 권장(운영 환경)
# strict gate는 placeholder 값을 실패로 처리합니다.
# VITE_GA4_MEASUREMENT_ID=G-REPLACE_WITH_REAL_MEASUREMENT_ID
# VITE_GOOGLE_SITE_VERIFICATION=replace-with-real-google-site-verification
# VITE_NAVER_SITE_VERIFICATION=replace-with-real-naver-site-verification
```

| 변수명 | 설명 | 필수 |
|:---|:---|:---:|
| `VITE_API_BASE_URL` | 로컬은 `/api`, 공개 빌드는 `https://api...` 형태의 API origin | ✅ |
| `VITE_PROXY_TARGET` | 로컬 `npm run dev`에서 `/api` 프록시가 바라볼 백엔드 origin | 로컬 권장 |
| `VITE_KAKAO_MAP_KEY` | 카카오 지도 JavaScript 키 | ✅ |
| `VITE_SITE_URL` | canonical/sitemap 기준 URL | ✅ |
| `VITE_GA4_MEASUREMENT_ID` | GA4 측정 ID | 운영 릴리즈 필수 |
| `VITE_GOOGLE_SITE_VERIFICATION` | Google Search Console 검증 메타 | 운영 릴리즈 필수 |
| `VITE_NAVER_SITE_VERIFICATION` | 네이버 서치어드바이저 검증 메타 | 운영 릴리즈 필수 |

---

## 🌐 배포

### Docker Compose 로컬 스모크
```bash
docker-compose up -d --build
```

이 경로는 로컬 확인용입니다. 운영 배포는 Cloudflare `wrangler deploy` 기준이며, worker 번들과 client asset은 `npm run build`에서 함께 생성됩니다.

### Cloudflare Worker 배포

1. 기본 env 점검: `VITE_SITE_URL=https://www.begabaseball.xyz VITE_API_BASE_URL=https://api.begabaseball.xyz npm run seo:env:check`
2. 릴리즈 직전 strict 점검: `VITE_SITE_URL=... VITE_API_BASE_URL=... VITE_GA4_MEASUREMENT_ID=... VITE_GOOGLE_SITE_VERIFICATION=... VITE_NAVER_SITE_VERIFICATION=... npm run seo:env:check:strict`
3. Cloudflare 로컬 확인: `npm run preview:cloudflare`
4. 운영 배포: `CLOUDFLARE_API_TOKEN=... npm run deploy:cloudflare`
5. 배포 후 `https://begabaseball.xyz`가 `https://www.begabaseball.xyz`로 `301` 되는지, `*.pages.dev`가 `404`로 차단되는지, `/api/*`가 SPA로 떨어지지 않는지, `x-vercel-*` 응답 헤더가 사라졌는지, OAuth2 스모크가 통과하는지 확인

핵심 구성:

- canonical redirect / SPA fallback worker: [worker/index.ts](/Users/mac/project/KBO_platform/bega_frontend/worker/index.ts)
- Cloudflare 배포 설정: [wrangler.jsonc](/Users/mac/project/KBO_platform/bega_frontend/wrangler.jsonc)

### 수동 배포

1. 기본 env 점검: `VITE_SITE_URL=https://www.begabaseball.xyz VITE_API_BASE_URL=https://api.begabaseball.xyz npm run seo:env:check`
2. 릴리즈 직전 strict 점검: `VITE_SITE_URL=... VITE_API_BASE_URL=... VITE_GA4_MEASUREMENT_ID=... VITE_GOOGLE_SITE_VERIFICATION=... VITE_NAVER_SITE_VERIFICATION=... npm run seo:env:check:strict`
3. 최종 배포 artifact 생성: `npm run build`
4. SEO 감사까지 포함한 게이트: `npm run seo:gate`
5. Cloudflare를 사용하지 않는 예외 경로에서만 최종 `dist/` 산출물을 별도 호스팅/CDN에 배포
6. 정적 파일 우선 서빙 후 SPA fallback이 동작하도록 라우팅 설정 (`robots.txt`, `sitemap.xml`, prerendered route HTML 보존)
7. SEO 점검 및 문제 해결 가이드: `/Users/mac/project/KBO_platform/task/operations/seo-checklist.md` 참조

### Nginx 설정 예시
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/bega/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔗 관련 저장소

| 저장소 | 설명 | 기술 스택 |
|:---|:---|:---|
| [Backend](https://github.com/your-username/bega-backend) | REST API 서버 | Spring Boot, JPA |
| [AI Server](https://github.com/your-username/bega-ai) | AI 챗봇 서버 | FastAPI, LangChain |

---

## 👥 팀원

<div align="center">

| 이름 | 역할 | GitHub |
|:---:|:---:|:---:|
| **홍길동** | Frontend Lead | [@username](https://github.com/username) |
| **김철수** | Backend Lead | [@username](https://github.com/username) |
| **이영희** | AI/ML | [@username](https://github.com/username) |

</div>

---

## 📝 라이선스

이 프로젝트는 [MIT 라이선스](./LICENSE)를 따릅니다.

---

<div align="center">

<br>

**⚾ BEGA와 함께 더 즐거운 야구 직관 라이프를! ⚾**

<br>

[![GitHub Stars](https://img.shields.io/github/stars/your-username/bega-frontend?style=social)](https://github.com/your-username/bega-frontend)

</div>

<div align="right">

<a href="#top">⬆️ 맨 위로</a>

</div>
