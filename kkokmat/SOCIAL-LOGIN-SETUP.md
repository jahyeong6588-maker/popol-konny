# 카카오·네이버 로그인 설정

2026-11-23 기준. 현재 코드의 OAuth 경로와 로컬 실행 설정을 따릅니다. **이 문서와 저장소에는 실제 비밀키가 없습니다.** 전체 최초 설치·DB 준비는 [다른 PC에서 이어가기](../다른-PC에서-이어가기.md)를 먼저 진행하세요.

## 1. 기존 개발자 앱 사용

이미 등록한 카카오·네이버 앱의 키를 관리 화면 또는 비공개 보관소에서 확인합니다. 같은 사용자 자료를 유지하려면 기존 앱을 사용합니다. 별도의 새 앱/다른 로그인 제공자에서는 동일 사용자라고 자동 연결하지 않습니다.

- [카카오 개발자 콘솔](https://developers.kakao.com/): 카카오 로그인 활성화, REST API 키 및 Client Secret을 확인합니다. JavaScript 키를 KAKAO_CLIENT_ID에 넣지 않습니다.
- [네이버 개발자 애플리케이션](https://developers.naver.com/apps/): 해당 앱의 Client ID, Client Secret과 네이버 로그인 웹 서비스·Callback 설정을 확인합니다.

실제 키는 개인이 직접 로컬 비공개 파일에 입력합니다. ChatGPT 로그인과 플랫폼 식별 헤더 인증은 현재 사용하지 않습니다.

## 2. 출처와 콜백 주소

| 환경 | AUTH_ORIGIN / 접속 주소 | 카카오 Callback | 네이버 Callback |
| --- | --- | --- | --- |
| 로컬 | http://localhost:4180 | http://localhost:4180/api/auth/kakao/callback | http://localhost:4180/api/auth/naver/callback |
| 운영 | https://little-fit-korea-20261116.energy-ax-re-1838.chatgpt.site | https://little-fit-korea-20261116.energy-ax-re-1838.chatgpt.site/api/auth/kakao/callback | https://little-fit-korea-20261116.energy-ax-re-1838.chatgpt.site/api/auth/naver/callback |

개발자 앱의 해당 플랫폼 도메인/웹 서비스 URL 설정과 Redirect URI/Callback 목록에 실제 사용할 값을 등록합니다. 로컬 주소도 운영 주소도 유지해야 각 환경에서 로그인할 수 있습니다. AUTH_ORIGIN에는 경로와 마지막 슬래시 없이 origin만 넣습니다. 브라우저 접속 주소·AUTH_ORIGIN·등록된 콜백의 프로토콜/호스트/포트가 일치해야 합니다. 로컬 로그인은 `127.0.0.1`이나 4173/4178 주소 대신 `localhost:4180`에서 시작하세요.

## 3. 로컬 키 파일: kkokmat/.env.local

`kkokmat/`에서 처음 한 번만:

```powershell
Copy-Item .env.example .env.local
```

기존 파일은 덮어쓰지 않습니다. 아래는 **변수 이름과 빈 값만 있는 예시**입니다. 실제 값은 로컬 파일에서 채웁니다.

```ini
AUTH_ORIGIN=http://localhost:4180
AUTH_SESSION_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

| 변수 | 입력할 값 |
| --- | --- |
| AUTH_SESSION_SECRET | 로컬 세션 서명용 무작위 문자열, 32자 이상. 생성 후 고정해 사용 |
| KAKAO_CLIENT_ID | 기존 카카오 앱의 REST API 키 |
| KAKAO_CLIENT_SECRET | 같은 카카오 앱의 Client Secret |
| NAVER_CLIENT_ID | 기존 네이버 앱의 Client ID |
| NAVER_CLIENT_SECRET | 같은 네이버 앱의 Client Secret |

세션 서명용 문자열 생성이 필요하면 개인 터미널에서 `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`를 실행해 결과를 AUTH_SESSION_SECRET에 넣습니다. 생성한 결과는 채팅이나 Git에 붙이지 않습니다. 이 값이 바뀌면 기존 로그인 세션은 무효화되지만 DB에 저장된 자녀/옷장 자료가 삭제되는 것은 아닙니다. 로컬과 운영 비밀 설정은 별도입니다.

## 4. 실행과 확인

먼저 [인수인계 문서](../다른-PC에서-이어가기.md)의 빌드 및 로컬 DB 초기화를 마칩니다. 다음은 두 개의 터미널에서 각각 실행합니다.

터미널 1, `kkokmat/`:

```powershell
$loginEnvPath = (Resolve-Path .env.local).Path
npm start -- --env-file "$loginEnvPath"
```

터미널 2, 같은 폴더:

```powershell
node scripts/local-account-preview.mjs
```

http://localhost:4180/ 에 접속합니다. Worker는 4178에서 실행되고 프록시는 4180 요청의 Host 헤더를 유지해 Worker에 전달합니다. 환경 파일은 `dist` 밖에 있으므로 재빌드로 지워지지 않습니다. `--env-file`에는 절대 경로를 사용합니다. Wrangler가 상대 경로를 해석하는 기준은 `dist/server/wrangler.json`의 폴더입니다. 파일 수정 후 Worker를 재시작하세요.

기존의 `dist/server/.dev.vars` 방식도 서버에서 읽을 수 있지만 빌드가 해당 파일을 지우므로 새 PC에서는 위 방식을 권장합니다. 환경변수 값은 클라이언트 JS, public/, hosting.json, 공유 문서에 넣지 않습니다.

키를 노출하지 않고 연결 상태만 확인하려면 브라우저에서 http://localhost:4180/api/session 을 엽니다. 비로그인 상태의 user는 null이고, 설정이 갖춰진 공급자는 providers의 available이 true입니다. 이것은 설정 인식 여부이며 실제 로그인 성공 검증을 대신하지 않습니다.

두 서비스 각각 실제 로그인 → 자녀 등록 → 새로고침 → 옷 저장 → 로그아웃 → 같은 제공자로 다시 로그인해 유지 여부를 확인합니다. 로그인 화면의 계정 입력과 동의는 사용자가 직접 진행합니다.

## 5. 오류별 확인

| 증상 | 확인할 내용 |
| --- | --- |
| 카카오 KOE006 | 실제 요청의 redirect_uri와 개발자 앱에 등록된 Redirect URI가 완전히 같은지 확인. 로컬/운영, 포트, 카카오 앱 키가 같은 앱인지 점검 |
| 로그인 버튼을 사용할 수 없음 / 로그인 준비 중 | 환경 파일 절대 경로, 여섯 변수, 32자 이상 세션 키, AUTH_ORIGIN 일치 여부 및 Worker 재시작 확인 |
| 4180 접속 시 502 | 4178 Worker가 먼저 실행되어 있는지 확인 |
| 로그인 완료 실패 / invalid_state | 기존 로그인 탭을 닫고 같은 origin에서 다시 시작. localhost와 127.0.0.1, 다른 포트를 섞지 않았는지 확인 |
| 로그인 완료 실패 / provider | Worker의 SOCIAL_LOGIN_FAILURE에 표시된 stage·code 확인. 키/비밀키 조합과 콜백을 확인하되 토큰·키·인증 코드는 공유하지 않음 |
| no such table / missing column | 새 DB에 drizzle SQL 3개를 순서대로 적용했는지, 실행과 초기화가 같은 persist-to를 사용하는지 확인 |
| 로그인은 됐는데 자녀가 없음 | 로컬/운영 DB가 다르거나, 다른 제공자·다른 계정·다른 개발자 앱인지 확인. 비회원 브라우저 저장도 서버 자료와 별개 |

## 6. 운영 설정과 배포

운영은 Sites의 기존 비밀 환경 변수에 같은 이름을 설정하고 AUTH_ORIGIN은 위 공개 HTTPS origin을 사용합니다. Git clone/push는 이 값을 복사하지 않습니다. 현재 운영 설정을 확인하지 않고 로컬 값이나 새 세션 키로 덮어쓰지 않습니다. 기존 Site ID와 D1 바인딩을 유지합니다. GitHub push와 Sites 배포는 별도입니다.

자동 테스트의 공급자 응답은 모의 응답입니다. 이 문서 작성 과정에서는 실제 키를 읽거나 다른 PC의 로그인 성공을 검증하지 않았습니다. 현재 앱의 검증 이력은 인수인계 문서를 참고하고, 새 PC에서는 본인의 실제 계정으로 위 흐름을 확인하세요.
