<div id="top">

<div align="center">

# ⚾ BEGA (Baseball Guide)

<em>야구 팬을 위한 올인원 가이드 애플리케이션</em>

<br>

<!-- BADGES -->
<img src="https://img.shields.io/badge/React-61DAFB.svg?style=flat&logo=React&logoColor=black" alt="React">
<img src="https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat&logo=TypeScript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Vite-646CFF.svg?style=flat&logo=Vite&logoColor=white" alt="Vite">
<img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4.svg?style=flat&logo=Tailwind-CSS&logoColor=white" alt="Tailwind CSS">
<img src="https://img.shields.io/badge/Supabase-3FCF8E.svg?style=flat&logo=Supabase&logoColor=white" alt="Supabase">
<img src="https://img.shields.io/badge/Docker-2496ED.svg?style=flat&logo=Docker&logoColor=white" alt="Docker">

<br>

<em>사용된 기술 스택:</em>

<img src="https://img.shields.io/badge/React%20Query-FF4154.svg?style=flat&logo=React-Query&logoColor=white" alt="React Query">
<img src="https://img.shields.io/badge/React%20Hook%20Form-EC5990.svg?style=flat&logo=React-Hook-Form&logoColor=white" alt="React Hook Form">
<img src="https://img.shields.io/badge/Zustand-000000.svg?style=flat&logo=React&logoColor=white" alt="Zustand">
<img src="https://img.shields.io/badge/React%20Router-CA4245.svg?style=flat&logo=React-Router&logoColor=white" alt="React Router">
<img src="https://img.shields.io/badge/Axios-5A29E4.svg?style=flat&logo=Axios&logoColor=white" alt="Axios">
<img src="https://img.shields.io/badge/npm-CB3837.svg?style=flat&logo=npm&logoColor=white" alt="npm">

</div>

<br>

---

## 📋 목차

- [프로젝트 소개](#프로젝트-소개)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
    - [사전 요구사항](#사전-요구사항)
    - [설치](#설치)
    - [환경 변수 설정](#환경-변수-설정)
    - [실행](#실행)
- [배포](#배포)
- [관련 저장소](#관련-저장소)

---

## 프로젝트 소개

**BEGA (Baseball Guide)**는 KBO 야구 팬들을 위한 종합 가이드 애플리케이션입니다. 직관 기록부터 구장 정보, AI 챗봇까지 야구 팬에게 필요한 모든 기능을 제공합니다.

### 왜 BEGA인가요?

- ⚾ **직관 다이어리:** 경기 관람 기록을 사진, 감정, 경기 결과와 함께 저장
- 🏟️ **구장 가이드:** 전국 KBO 구장 정보 및 좌석 안내
- 🤖 **AI 챗봇:** KBO 리그 통계 및 선수 정보 질문 응답
- 📊 **통계 대시보드:** 나만의 직관 통계 및 승률 분석
- 👥 **커뮤니티:** 팬들과 함께하는 응원 게시판

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 🔐 **회원 인증** | JWT 기반 로그인/회원가입, 소셜 로그인 지원 |
| 📝 **직관 다이어리** | 경기 기록 작성, 사진 업로드, 감정 태그 |
| 📅 **캘린더 뷰** | 주간/월간 직관 기록 캘린더 |
| 🏟️ **구장 정보** | 구장별 상세 정보 및 좌석 가이드 |
| 🤖 **AI 챗봇** | 음성 인식 지원, KBO 통계 질의응답 |
| 📊 **통계 분석** | 직관 횟수, 승률, 팀별 기록 시각화 |
| 📱 **반응형 디자인** | 모바일/태블릿/데스크톱 최적화 |

---

## 기술 스택

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Data Fetching:** React Query (TanStack Query)
- **Form:** React Hook Form + Zod
- **Routing:** React Router v6

### Infrastructure
- **Database & Storage:** Supabase
- **Container:** Docker
- **CI/CD:** GitHub Actions

---

## 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 UI 컴포넌트
│   ├── ui/             # 기본 UI 컴포넌트 (Button, Input, Modal 등)
│   ├── layout/         # 레이아웃 컴포넌트
│   └── features/       # 기능별 컴포넌트
├── pages/              # 페이지 컴포넌트
├── hooks/              # 커스텀 훅
├── stores/             # Zustand 스토어
├── services/           # API 서비스
├── types/              # TypeScript 타입 정의
├── utils/              # 유틸리티 함수
├── constants/          # 상수 정의
└── assets/             # 정적 파일 (이미지, 폰트 등)
```

---

## 시작하기

### 사전 요구사항

- **Node.js:** v18.0.0 이상
- **npm:** v9.0.0 이상
- **Docker:** (선택사항) 컨테이너 실행 시 필요

### 설치

1. **저장소 클론:**

```bash
git clone https://github.com/737genie/frontend.git
```

2. **프로젝트 디렉토리로 이동:**

```bash
cd frontend
```

3. **의존성 설치:**

```bash
npm install
```

### 환경 변수 설정

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

### 실행

**개발 서버 실행:**

```bash
npm run dev
```

**Docker로 실행:**

```bash
# 이미지 빌드
docker build -t bega-frontend .

# 컨테이너 실행
docker run -p 5173:5173 bega-frontend
```

**프로덕션 빌드:**

```bash
npm run build
```

**빌드 미리보기:**

```bash
npm run preview
```

---

## 배포

### Docker Compose를 이용한 배포

```bash
docker-compose up -d
```

### 수동 배포

1. 프로덕션 빌드 생성: `npm run build`
2. `dist` 폴더를 웹 서버에 배포
3. SPA 라우팅을 위한 서버 설정 (모든 경로를 index.html로 리다이렉트)

---

## 관련 저장소

| 저장소 | 설명 |
|--------|------|
| [Backend](https://github.com/737genie/backend) | Spring Boot 백엔드 서버 |
| [AI Server](https://github.com/737genie/ai-server) | FastAPI AI 챗봇 서버 |

---

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

<div align="center">

**⚾ BEGA와 함께 더 즐거운 야구 직관 라이프를! ⚾**

</div>

<div align="left"><a href="#top">⬆ 맨 위로</a></div>

---
