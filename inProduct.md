# Cloudflare Tunnel + Backend URL 설정 가이드

## 1. 적용 가능 여부 확인
- 현재 이 작업 환경에는 `cloudflared`가 설치되어 있지 않다.
- 따라서 여기서 터널을 직접 실행할 수는 없지만, 설치 후 바로 적용 가능한 설정 방식은 준비할 수 있다.
- 백엔드와 프런트의 현재 구조상 Cloudflare Tunnel 적용은 가능하다.

## 2. 백엔드에 필요한 설정 추가
- 백엔드는 CORS 허용 도메인을 환경변수 `CORS_ORIGINS`로 받도록 수정했다.
- 이 설정으로 로컬 개발용 주소와 GitHub Pages 주소, Cloudflare Tunnel 주소를 함께 허용할 수 있다.

## 3. Cloudflared 설치
- Windows 환경이면 Cloudflare 공식 사이트에서 `cloudflared`를 내려받아 설치한다.
- 설치 후 아래 명령이 동작해야 한다.

```bash
cloudflared --version
```

## 4. Cloudflare 로그인
- 아래 명령으로 Cloudflare 계정에 로그인한다.

```bash
cloudflared tunnel login
```

- 브라우저가 열리면 Cloudflare 계정으로 로그인하고 호스트명을 선택한다.

## 5. 터널 생성
- 아래 명령으로 새 터널을 만든다.

```bash
cloudflared tunnel create <터널이름>
```

- 실행 후 터널 UUID와 credentials 파일 경로가 생성된다.

## 6. 설정 파일 작성
- `backend/cloudflared.example.yml`을 참고해서 실제 `config.yml`을 만든다.
- 핵심 설정은 다음과 같다.
  - `tunnel`: 터널 UUID 또는 이름
  - `credentials-file`: 터널 credentials JSON 경로
  - `ingress`: 외부 도메인을 로컬 백엔드 `http://127.0.0.1:8000`으로 전달

## 7. DNS 연결
- 터널 도메인을 Cloudflare DNS에 연결한다.

```bash
cloudflared tunnel route dns <UUID 또는 이름> your-backend.example.com
```

- 이 명령은 해당 호스트명에 대한 CNAME 레코드를 생성한다.

## 8. 터널 실행
- 로컬 백엔드 서버가 켜진 상태에서 터널을 실행한다.

```bash
cloudflared tunnel run <UUID 또는 이름>
```

- 필요하면 서비스로 등록해서 상시 실행할 수 있다.

```bash
cloudflared.exe service install
```

## 9. 프런트에서 백엔드 URL 설정 및 연결 테스트
- 대시보드의 `백엔드 연결 설정` 카드에 터널로 노출된 백엔드 URL을 입력한다.
- 예시는 아래와 같다.

```text
https://your-backend.example.com
```

- `연결 테스트` 버튼을 누르면 `/health` 엔드포인트로 연결 여부를 확인한다.
- `저장 후 적용`을 누르면 해당 URL이 브라우저 저장소에 저장되고, 이후 API 호출에 사용된다.

## 추가로 필요한 것
- 백엔드 서버의 `CORS_ORIGINS`에 프런트 주소를 추가한다.
- 예시:

```bash
CORS_ORIGINS=http://localhost:5173,https://<your-pages-domain>
```

- 프런트는 GitHub Pages에서, 백엔드는 Cloudflare Tunnel을 통해 외부에 공개된 주소로 연결하면 된다.
