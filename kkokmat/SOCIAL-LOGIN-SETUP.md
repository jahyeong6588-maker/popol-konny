# 카카오·네이버 로그인 연결

카카오·네이버 개발자 앱을 등록했고, 로컬 서버에서 실제 계정으로 두 서비스의 로그인 성공을 확인했습니다. 운영 서버에는 아래 비밀 환경 변수와 공개 도메인의 콜백 주소를 별도로 설정해야 합니다. 로컬과 운영 환경의 저장 데이터는 공유하지 않습니다.

## 개발자 앱 등록

- 카카오: https://developers.kakao.com/ 에서 앱 생성 → 카카오 로그인 활성화 → REST API 키와 Client Secret 확인.
- 네이버: https://developers.naver.com/apps/ 에서 네이버 로그인 앱 생성 → 웹 서비스 URL과 Callback URL 등록. 공개 서비스 사용 가능 여부와 검수 조건도 확인.
- 이메일·성별 등은 로그인 식별에 사용하지 않습니다. 서비스별 사용자 ID로 계정을 구분합니다. 서로 다른 제공자의 계정을 자동 합치지 않습니다.

## 콜백 주소

로컬 개발 시 등록할 주소:

- 카카오: `http://localhost:4180/api/auth/kakao/callback`
- 네이버: `http://localhost:4180/api/auth/naver/callback`

배포 시에는 승인된 공개 도메인으로 별도 등록해야 합니다:

- `https://little-fit-korea-20261116.energy-ax-re-1838.chatgpt.site/api/auth/kakao/callback`
- `https://little-fit-korea-20261116.energy-ax-re-1838.chatgpt.site/api/auth/naver/callback`

## 서버 비밀 설정

`.env.example`은 이름 안내용입니다. 실제 키를 이 파일이나 채팅에 입력하지 마세요. 로컬 Wrangler는 `dist/server/.dev.vars`에 실제 값을 설정하고 재시작합니다. 이 파일은 Git에서 제외되며 전체 빌드가 지울 수 있으므로 안전한 별도 비밀 저장소에서 관리하세요.

```
AUTH_ORIGIN=http://localhost:4180
AUTH_SESSION_SECRET=<암호학적으로 무작위인 32자 이상 값>
KAKAO_CLIENT_ID=<REST API 키>
KAKAO_CLIENT_SECRET=<Client Secret>
NAVER_CLIENT_ID=<Client ID>
NAVER_CLIENT_SECRET=<Client Secret>
```

운영 환경에는 Sites 비밀 환경 변수로 설정하고 `AUTH_ORIGIN`을 공개 HTTPS 주소로 지정합니다. 실제 값을 클라이언트 JS 또는 hosting.json에 넣지 않습니다. 플랫폼의 기본 인증 경로와는 별개의 소셜 로그인입니다. 기존 ChatGPT 계정의 저장 데이터는 삭제하지 않으며 별도 이관 없이는 새 소셜 계정에 연결되지 않습니다.

## 검증

두 서비스 각각 로그인 성공·취소·실패, 로그아웃, 다른 계정 접근 차단, 로그인 전 비교 결과 복원과 저장을 확인합니다. 자동 테스트의 공급자 응답은 모의 응답이며 실제 로그인 성공을 의미하지 않습니다. 로컬의 실제 로그인 확인과 별개로 운영 도메인에서의 로그인 완료·저장은 배포 후 실제 계정으로 확인해야 합니다.
