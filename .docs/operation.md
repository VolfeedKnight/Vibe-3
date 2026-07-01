# 공공직군 행정업무 슈퍼앱 운영 문서

## 1. 문서 목적

이 문서는 개발자가 로컬 환경에서 프로젝트를 실행하고, 자주 발생하는 문제를 해결하며, 운영 시 필요한 기본 절차를 확인하기 위한 문서이다.

현재 프로젝트는 구현 전 준비 단계이며, FE와 BE 필수 패키지 설치까지만 완료되어 있다.

## 2. 사전 요구사항

### 필수 도구

- Node.js
- npm
- uv
- Git

### 권장 확인 명령

```powershell
node --version
npm --version
uv --version
git --version
```

### Python 실행 방식

시스템 PATH의 `python` 명령은 잡히지 않을 수 있다. 이 프로젝트에서는 uv를 기준으로 Python을 실행한다.

```powershell
cd backend
$env:UV_CACHE_DIR='..\.uv-cache'
uv run python --version
```

## 3. Frontend 설치 상태 확인

```powershell
cd frontend
npm install
```

현재 설치된 주요 패키지:

- `react`
- `react-dom`
- `vite`
- `typescript`
- `@vitejs/plugin-react`
- `@types/react`
- `@types/react-dom`

## 4. Backend 설치 상태 확인

```powershell
cd backend
$env:UV_CACHE_DIR='..\.uv-cache'
uv sync
uv pip list
```

현재 설치된 주요 패키지:

- `fastapi`
- `pydantic`
- `starlette`
- `anyio`

## 5. 가상환경 활성화

PowerShell에서 uv 가상환경을 직접 활성화하려면 다음 명령을 사용한다.

```powershell
cd backend
.\.venv\Scripts\activate
```

다만 이 프로젝트에서는 직접 활성화보다 `uv run` 사용을 권장한다.

```powershell
cd backend
$env:UV_CACHE_DIR='..\.uv-cache'
uv run python
```

## 6. 실행 방법

현재는 실제 앱 소스가 없으므로 실행 명령은 향후 구현 후 확정한다.

예상 실행 방식은 다음과 같다.

### Frontend

```powershell
cd frontend
npm run dev
```

### Backend

```powershell
cd backend
$env:UV_CACHE_DIR='..\.uv-cache'
uv run fastapi dev app/main.py
```

또는 Uvicorn을 별도 의존성으로 추가한 경우:

```powershell
cd backend
$env:UV_CACHE_DIR='..\.uv-cache'
uv run uvicorn app.main:app --reload
```

## 7. 환경변수

초기 개발 단계에서 고려할 환경변수는 다음과 같다.

```text
DATABASE_URL=sqlite:///./data/app.db
UPLOAD_DIR=./uploads
NEWS_COLLECT_HOUR=8
```

외부 AI API 또는 뉴스 API를 사용하는 경우 API Key는 코드에 직접 작성하지 않고 환경변수로 관리한다.

## 8. SQLite 운영

### 기본 방침

- DB 파일은 `backend/data/app.db`에 둔다.
- 백업은 DB 파일 복사 방식으로 시작한다.
- 운영 중 DB 파일 삭제를 금지한다.

### sqlite3 CLI 관련

현재 로컬 환경에는 `sqlite3` CLI가 설치되어 있지 않다. 앱에서는 Python 내장 `sqlite3` 모듈을 사용할 수 있으므로 개발은 가능하다.

CLI가 필요하면 별도 설치가 필요하다.

## 9. 파일 업로드 운영

### 저장 위치

```text
backend/uploads/
```

### 운영 원칙

- 업로드 파일은 UUID 기반 파일명으로 저장한다.
- 원본 파일명은 DB 메타데이터에만 저장한다.
- 허용되지 않은 확장자는 거부한다.
- 민원 관련 파일은 개인정보 포함 가능성을 고려해 접근 권한을 제한한다.

## 10. 자주 발생하는 에러

### python 명령을 찾을 수 없음

증상:

```text
Python was not found
```

해결:

```powershell
cd backend
$env:UV_CACHE_DIR='..\.uv-cache'
uv run python --version
```

### uv cache 접근 거부

증상:

```text
Failed to initialize cache
Access is denied
```

해결:

```powershell
$env:UV_CACHE_DIR='..\.uv-cache'
```

이후 uv 명령을 다시 실행한다.

### npm 패키지 설치 실패

증상:

```text
cache mode is 'only-if-cached'
```

해결:

```powershell
cd frontend
npm install --cache .npm-cache --prefer-online
```

### sqlite3 명령을 찾을 수 없음

증상:

```text
sqlite3 is not recognized
```

해결:

- Python 앱에서는 내장 `sqlite3` 모듈을 사용한다.
- CLI가 필요하면 SQLite CLI를 별도 설치한다.

## 11. 기능별 사용 흐름

### 팀원 스케쥴 관리

1. 팀원 목록을 확인한다.
2. 캘린더에서 날짜를 선택한다.
3. 휴가, 근무, 출장 중 일정 유형을 선택한다.
4. 일정 정보를 입력하고 저장한다.
5. 팀원 또는 유형별로 일정을 필터링한다.

### 엑셀 업무 자동화

1. 엑셀 파일을 업로드한다.
2. 분리 또는 병합 작업을 선택한다.
3. 분리 작업의 경우 기준 컬럼을 선택한다.
4. 처리 결과를 확인한다.
5. 결과 파일을 다운로드한다.

### 민원 대응 챗봇

1. 민원 매뉴얼을 업로드한다.
2. 민원 내용을 입력한다.
3. 챗봇이 대응 방향과 답변 초안을 생성한다.
4. 담당자가 내용을 검토하고 수정한다.
5. 최종 답변은 담당자가 직접 사용한다.

### 뉴스 기사 수집

1. 수집 키워드를 등록한다.
2. 수동 또는 예약 방식으로 뉴스 수집을 실행한다.
3. 수집된 기사 목록을 확인한다.
4. 키워드, 날짜, 언론사 기준으로 필터링한다.
5. 필요한 기사 원문을 확인한다.

## 12. 운영 체크리스트

- FE 패키지 설치 상태 확인
- BE uv 가상환경 확인
- FastAPI 의존성 확인
- SQLite DB 파일 백업 여부 확인
- 업로드 디렉터리 권한 확인
- 민원 매뉴얼 파일 접근 권한 확인
- 뉴스 수집 실패 로그 확인
- 외부 API Key 노출 여부 확인
