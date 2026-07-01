# Backend 실행 가이드

## 1. 원인

`uv run fastapi dev app/main.py` 실행 시 아래 오류가 발생하면 FastAPI CLI 실행용 표준 의존성이 빠진 상태다.

```text
To use the fastapi command, please install "fastapi[standard]"
```

현재 프로젝트는 `uv`를 사용하므로 `pip install`이 아니라 `uv add`로 의존성을 관리한다.

## 2. 해결한 내용

다음 명령으로 백엔드 의존성을 보강했다.

```powershell
uv --cache-dir ..\.uv-cache add "fastapi[standard]"
```

그 결과 `backend/pyproject.toml`의 의존성은 다음처럼 변경되었다.

```toml
dependencies = [
    "fastapi[standard]>=0.138.2",
]
```

## 3. 권장 실행 명령

PowerShell에서 백엔드를 실행한다.

```powershell
cd C:\Users\admin\Desktop\VibeCodingClass\Day3_RPA\backend
$env:PYTHONUTF8="1"
uv --cache-dir ..\.uv-cache run fastapi dev app/main.py
```

## 4. 대체 실행 명령

Windows 콘솔 인코딩 문제를 피하려면 `uvicorn`으로 실행해도 된다.

```powershell
cd C:\Users\admin\Desktop\VibeCodingClass\Day3_RPA\backend
uv --cache-dir ..\.uv-cache run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## 5. 정상 실행 확인

브라우저에서 다음 URL을 확인한다.

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/docs
```

`/health` 응답 예시는 다음과 같다.

```json
{
  "status": "ok",
  "service": "backend",
  "message": "FastAPI 서버가 응답합니다."
}
```

## 6. 추가 참고

PowerShell 기본 인코딩이 `cp949`인 환경에서는 FastAPI CLI가 유니코드 문자를 출력하다가 `UnicodeEncodeError`를 낼 수 있다.
이 경우 `$env:PYTHONUTF8="1"`을 먼저 설정한 뒤 실행한다.
