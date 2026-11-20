# popol-konny

국내 영유아복 사이즈 비교 모바일 웹 **꼭맞(KKOKMAT)** 프로젝트입니다.

- 현재 운영 소스: [`kkokmat/`](kkokmat/)
- 공개 사이트: https://little-fit-korea-20261116.energy-ax-re-1838.chatgpt.site/
- 초기 포트폴리오 자료와 이전 앱: `baby-fit/`, `research/`, `시안/`

## 최신 앱 실행

Node.js 22.13 이상에서 다음 명령을 실행합니다.

```sh
cd kkokmat
npm ci
# .openai/hosting.example.json을 .openai/hosting.json으로 복사하고 본인의 Sites 프로젝트 ID 설정
npm test
npm run build
npm start
```

계정 저장 기능의 로컬 D1 설정은 [ACCOUNT-FEATURES.md](kkokmat/ACCOUNT-FEATURES.md), 카카오·네이버 로그인 연결은 [SOCIAL-LOGIN-SETUP.md](kkokmat/SOCIAL-LOGIN-SETUP.md)를 참고하세요. 실제 비밀키·사용자 데이터베이스·로컬 실행 상태는 포함하지 않습니다.

`baby-fit/`은 이전 버전으로 보존하며 최신 수정은 `kkokmat/`에 반영합니다.
