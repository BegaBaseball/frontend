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
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E.svg?style=flat&logo=Supabase&logoColor=white)](https://supabase.com/)
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
| **Database & Storage** | Supabase (PostgreSQL) |
| **Container** | Docker |
| **CI/CD** | GitHub Actions |
| **Hosting** | AWS EC2 |

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
┌─────────────────┐ ┌───────────┐ ┌───────────────┐
│  Spring Boot    │ │  FastAPI  │ │   Supabase    │
│  Backend API    │ │ AI Server │ │  Storage/DB   │
└────────┬────────┘ └─────┬─────┘ └───────────────┘
         │                │
         ▼                ▼
┌─────────────────────────────────────────┐
│           PostgreSQL (Supabase)          │
└─────────────────────────────────────────┘
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

---

## ⚙️ 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수를 설정합니다:
```env
# API 서버
VITE_API_BASE_URL=http://localhost:8080/api

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI 챗봇 서버
VITE_AI_SERVER_URL=http://localhost:8000
```

| 변수명 | 설명 | 필수 |
|:---|:---|:---:|
| `VITE_API_BASE_URL` | Spring Boot 백엔드 API 주소 | ✅ |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Key | ✅ |
| `VITE_AI_SERVER_URL` | FastAPI AI 서버 주소 | ✅ |

---

## 🌐 배포

### Docker Compose 배포
```bash
docker-compose up -d --build
```

### 수동 배포

1. 프로덕션 빌드: `npm run build`
2. `dist` 폴더를 웹 서버에 배포
3. SPA 라우팅 설정 (모든 경로 → index.html)

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
| [Crawler](https://github.com/your-username/bega-crawler) | KBO 데이터 크롤러 | Python, Selenium |

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
