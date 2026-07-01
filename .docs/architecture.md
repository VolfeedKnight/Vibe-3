# 공공직군 행정업무 슈퍼앱 아키텍처

## 1. 기술 스택

### Frontend

- TypeScript
- Vite
- React
- npm

### Backend

- Python
- uv
- FastAPI

### Database

- SQLite

## 2. 현재 개발환경 상태

### Frontend

- `frontend` 디렉터리에 npm 프로젝트가 생성되어 있다.
- React, React DOM, Vite, TypeScript 관련 모듈이 설치되어 있다.
- 아직 애플리케이션 소스 코드는 작성하지 않았다.

### Backend

- `backend` 디렉터리에 uv 프로젝트가 생성되어 있다.
- `backend/.venv` 가상환경이 생성되어 있다.
- FastAPI가 설치되어 있다.
- `UV_CACHE_DIR=..\.uv-cache` 사용을 권장한다.

### Database

- SQLite는 Python 표준 라이브러리의 `sqlite3` 모듈로 사용 가능하다.
- `sqlite3` CLI는 현재 설치되어 있지 않다.

## 3. 목표 프로젝트 구조

```text
Day3_RPA/
  .docs/
    PRD.md
    architecture.md
    operation.md
    index.html
  frontend/
    package.json
    package-lock.json
    node_modules/
    src/
      app/
      pages/
      features/
      shared/
  backend/
    pyproject.toml
    uv.lock
    .venv/
    app/
      main.py
      api/
      core/
      db/
      models/
      schemas/
      services/
      jobs/
      modules/
        schedules/
        excel/
        complaints/
        news/
    data/
      app.db
    uploads/
```

## 4. 시스템 구성

```text
Browser
  |
  | HTTP / JSON / File Upload
  v
React + Vite Frontend
  |
  | REST API
  v
FastAPI Backend
  |
  | SQL / File IO / Background Jobs
  v
SQLite + Local File Storage
```

## 5. Frontend 모듈 역할

### app

- 라우터, 전역 레이아웃, 전역 상태 초기화를 담당한다.

### pages

- 페이지 단위 화면을 담당한다.
- 예: 대시보드, 일정 관리, 엑셀 자동화, 민원 챗봇, 뉴스 수집

### features

- 기능 단위 UI와 로직을 담당한다.
- 예:
  - `features/schedules`
  - `features/excel`
  - `features/complaints`
  - `features/news`

### shared

- 공통 컴포넌트, API 클라이언트, 타입, 유틸리티를 담당한다.

## 6. Backend 모듈 역할

### app/main.py

- FastAPI 애플리케이션 진입점이다.
- 라우터 등록, 미들웨어 설정, 헬스체크 API를 담당한다.

### app/api

- REST API 라우터를 관리한다.

### app/core

- 환경변수, 설정, 보안, 로깅 등 공통 인프라 설정을 담당한다.

### app/db

- SQLite 연결, 세션 관리, 마이그레이션 전략을 담당한다.

### app/models

- 데이터베이스 모델을 정의한다.

### app/schemas

- API 요청/응답 스키마를 정의한다.

### app/services

- 비즈니스 로직을 담당한다.

### app/jobs

- 뉴스 수집, 대용량 엑셀 처리 등 백그라운드 작업을 담당한다.

### app/modules/schedules

- 팀원 일정 관리 기능을 담당한다.

### app/modules/excel

- 엑셀 분리, 병합, 파일 검증 기능을 담당한다.

### app/modules/complaints

- 민원 매뉴얼 업로드, 문서 검색, 답변 초안 생성 기능을 담당한다.

### app/modules/news

- 뉴스 키워드 관리, 기사 수집, 중복 제거 기능을 담당한다.

## 7. API 설계 초안

### 공통

- `GET /health`: 서버 상태 확인

### 일정

- `GET /api/schedules`: 일정 목록 조회
- `POST /api/schedules`: 일정 생성
- `GET /api/schedules/{schedule_id}`: 일정 상세 조회
- `PATCH /api/schedules/{schedule_id}`: 일정 수정
- `DELETE /api/schedules/{schedule_id}`: 일정 삭제

### 엑셀

- `POST /api/excel/split`: 엑셀 파일 분리
- `POST /api/excel/merge`: 엑셀 파일 병합
- `GET /api/excel/jobs/{job_id}`: 처리 상태 조회
- `GET /api/excel/jobs/{job_id}/download`: 결과 다운로드

### 민원 챗봇

- `POST /api/complaints/manuals`: 매뉴얼 업로드
- `GET /api/complaints/manuals`: 매뉴얼 목록 조회
- `POST /api/complaints/chat`: 민원 답변 초안 생성

### 뉴스

- `GET /api/news/articles`: 수집 기사 목록 조회
- `POST /api/news/collect`: 뉴스 수동 수집 실행
- `GET /api/news/keywords`: 키워드 목록 조회
- `POST /api/news/keywords`: 키워드 생성
- `DELETE /api/news/keywords/{keyword_id}`: 키워드 삭제

## 8. SQLite 사용 전략

- 초기 개발 단계에서는 SQLite 단일 파일 DB를 사용한다.
- DB 파일 기본 위치는 `backend/data/app.db`로 한다.
- 일정, 뉴스, 작업 이력 등 구조화 데이터는 SQLite에 저장한다.
- 업로드 원본 파일과 결과 파일은 파일 시스템에 저장하고, 메타데이터만 DB에 저장한다.

## 9. 파일 업로드 전략

- 업로드 파일은 `backend/uploads` 하위에 저장한다.
- 파일명 충돌 방지를 위해 서버에서 UUID 기반 파일명을 생성한다.
- 허용 확장자:
  - 엑셀: `.xlsx`
  - 민원 매뉴얼: `.pdf`, `.docx`, `.txt`, `.md`
- 파일 크기 제한을 설정한다.

## 10. 백그라운드 작업 전략

- MVP에서는 FastAPI의 `BackgroundTasks` 또는 단순 스케줄러를 사용한다.
- 뉴스 수집은 매일 아침 실행되도록 스케줄링한다.
- 대용량 엑셀 처리는 API 응답과 분리해 작업 상태를 조회하는 방식으로 확장할 수 있다.

## 11. 보안 고려사항

- 민원 데이터에는 개인정보가 포함될 수 있으므로 저장 최소화 원칙을 적용한다.
- 챗봇 응답은 자동 발송하지 않고 사용자 검토 후 사용한다.
- 업로드 파일의 확장자와 MIME 타입을 검증한다.
- 외부 API 키는 `.env` 또는 운영 환경변수로 관리한다.

## 12. 확장 방향

- SQLite에서 PostgreSQL로 전환 가능한 저장소 계층을 유지한다.
- 로컬 파일 저장소에서 S3 호환 저장소로 확장 가능한 구조를 고려한다.
- 챗봇 기능은 추후 RAG 구조로 확장한다.
- 뉴스 수집은 RSS, 검색 API, 크롤러 중 정책에 맞는 방식을 선택한다.
