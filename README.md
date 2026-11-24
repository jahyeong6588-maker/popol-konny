# popol-konny

국내 영유아복 사이즈 비교 모바일 웹 **꼭맞(KKOKMAT)** 프로젝트입니다.

- 현재 운영 소스: [`kkokmat/`](kkokmat/)
- 공개 사이트: https://little-fit-korea-20261116.energy-ax-re-1838.chatgpt.site/
- 초기 포트폴리오 자료와 이전 앱: `baby-fit/`, `research/`, `시안/`

## 다른 PC에서 이어가기

**[현재 작업 상태·설치·실행 인수인계](다른-PC에서-이어가기.md)**를 먼저 읽으세요. 최초 로컬 Site 정보 생성, DB 마이그레이션 3개, 두 서버 실행과 최신 UI 동작을 포함합니다.

- 화면만 확인: `cd kkokmat` → `node server.mjs` → http://127.0.0.1:4173/
- 로그인·저장까지: [인수인계의 실행 순서](다른-PC에서-이어가기.md#3-로그인저장까지-실행하기)와 [로그인 설정](kkokmat/SOCIAL-LOGIN-SETUP.md)을 따릅니다.
- Node.js 22.13 이상. 현재 앱 코드는 `kkokmat/`, 초기 포트폴리오 자료는 `baby-fit/`입니다.

실제 비밀키·사용자 데이터베이스·로컬 실행 상태와 Codex 대화 기록은 저장소에 포함하지 않습니다. GitHub push는 Sites 자동 배포를 의미하지 않습니다.

## 사이즈표 캡처로 비교 (2026-11-24)

사이즈표 이미지에서 치수를 읽고, 입는 사이즈·부위·단위·숫자를 확인/수정해 비교할 수 있습니다. [사용·실행 안내](kkokmat/SIZE-CHART-CAPTURE.md). 새 PC의 정적 미리보기에서 이 기능을 쓰려면 `kkokmat/`에서 `npm ci`와 `npm run prepare:ocr`를 먼저 실행하세요. `npm run build`에는 준비 과정이 포함됩니다. 별도 API 키는 필요 없습니다.
