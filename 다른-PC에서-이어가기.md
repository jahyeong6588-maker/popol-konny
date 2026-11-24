# 다른 PC에서 꼭맞 작업 이어가기

기준일: 2026-11-24 (한국시간). 현재 앱은 저장소의 **`kkokmat/`**입니다. `baby-fit/`은 이전 버전입니다. Git에는 코드와 공개 상품 데이터가 있고, 로그인 비밀키·사용자 DB·브라우저 저장값·이 대화 기록은 포함되지 않습니다.

## 현재 작업 상태

- 저장소: https://github.com/jahyeong6588-maker/popol-konny — `main`.
- 최신 앱 변경: 입던 옷에서 보세 브랜드·상품 검색, 실측 미확인 상품 선택 시 키·체중 필수 입력과 참고 후보 경로. 실측 상품은 키·체중 선택 입력을 유지합니다. 커밋은 `git log -1`로 확인합니다.
- 현재 공개 사이트: https://little-fit-korea-20261116.energy-ax-re-1838.chatgpt.site/
- 마지막 사이트 배포: 버전 25. Sites 소스 커밋은 `d599e9c946e461ea0f889634ac66e7e072fb7d2f`. GitHub 커밋과 Sites 소스 커밋은 별도 저장소의 기록입니다.
- 마지막 앱 검증: 자동 테스트 125개 통과. 테스트 수는 상품 수가 아닙니다. 모바일 388×681 및 PC 1280×800에서 보세 입던 옷 검색→키·체중 입력→참고 후보와 화면 넘침을 확인했습니다.
- 사이즈표 캡처 기능을 기존 사이트에 배포했습니다. 원본 이미지와 OCR 원문은 브라우저에서만 처리하고, 확인한 숫자만 기존 비교·저장 흐름에서 사용합니다. 운영 DB와 비밀 설정은 변경하지 않았습니다.

### 구현된 동작

모나마켓 참고 후보 추가: 신체 가이드 54개 브랜드, 의류 목록 1,648개 중 옵션 확인 1,647개. 1단계에서 키·체중을 선택 입력하면 결과 하단 별도 영역에서 볼 수 있습니다. 실측 점수·품/기장 차이에는 합치지 않습니다. 입력이 없으면 기존 비교만 진행합니다. [갱신과 데이터 범위](kkokmat/MONAMARKET-REFERENCE.md).

2026-11-24 추가: 1단계 **사이즈표 캡처**에서 한국어/영어 이미지 인식 → 사이즈 선택 → 치수와 부위 수정 → 원본 확인 후 비교합니다. [실행·한계 안내](kkokmat/SIZE-CHART-CAPTURE.md). OCR 자원은 npm 의존성에서 생성하며 Git에 큰 모델 파일을 저장하지 않습니다.

- 가입 없이 비교 가능. 카카오·네이버 선택 로그인, 여러 자녀 등록/전환, 자녀별 옷장·저장한 비교·기록을 지원합니다. ChatGPT 로그인은 제거되어 있습니다.
- 아이가 등록되어 있으면 개인화 홈, 없으면 일반 비교 화면을 표시합니다. 저장한 옷을 선택하면 기준 정보 입력을 건너뛰고 2단계로 갑니다.
- 실측 비교 가능한 브랜드만 선택에 노출합니다. 원본 목록과 비교 가능 상품 수는 다릅니다.
- 세트 기준은 세트 및 상의·하의 단품과 비교합니다. 현재 실내복 세트/일반 상하 세트 기준은 각각 같은 세트 종류와 단품을 대상으로 합니다.
- 상의 기준은 상의와 두 종류의 세트, 하의 기준은 하의와 두 종류의 세트를 대상으로 합니다. 세트에서도 기준 옷에 해당하는 부분만 계산합니다. 상의와 하의를 직접 서로 비교하지 않습니다.
- 2단계의 전체·세트·상의·하의 필터가 브랜드 목록, 상품 검색과 실제 비교에 함께 적용됩니다. 비교할 수 없는 종류는 비활성화합니다. 브랜드 목록은 기본 접힘이며, 선택 후 제목에 브랜드를 표시하고 다시 접습니다.
- 결과도 전체·세트·상의·하의로 나눠 볼 수 있습니다. 같은 품번의 기준 옷 및 중복 상품을 제외합니다.
- 결과는 품·기장의 차이를 문장으로 먼저 표시합니다. 반복 설명 배지는 없애고, 숫자 표는 기본 접힘인 “치수 차이 자세히 보기”로 제공합니다. 설명문 14px, 상세 보기 13px, 버튼·배지는 기본 가운데 정렬입니다.
- 인심과 바지 총장, 일반 소매와 등 중심 소매 등 측정 기준을 구분합니다. 없는 값은 미확인/비교 안 함으로 두고 추정하지 않습니다.
- 모바일을 공통 디자인 기준으로 사용하며 PC에서는 상단 메뉴·2단 배치 등 레이아웃을 달리합니다.

## 1. 준비와 저장소 받기

필요한 도구: Git, Node.js **22.13 이상**, npm. 아래 명령은 Windows PowerShell 기준입니다. 먼저 Node/Git 설치 후 새 터미널에서 `node -v`, `npm -v`, `git --version`을 확인합니다.

처음 받는 PC:

```powershell
git clone https://github.com/jahyeong6588-maker/popol-konny.git
cd popol-konny
git switch main
git pull --ff-only
cd kkokmat
npm ci
```

이미 받은 PC는 저장소 루트에서 `git status`로 로컬 수정을 먼저 확인한 뒤 `git pull --ff-only`합니다. 수정이 있다면 먼저 커밋하거나 따로 보관하고 충돌을 해결합니다. 최신 앱 작업 경로는 항상 `kkokmat/`입니다.

## 2. 화면만 빠르게 확인하기

```powershell
# kkokmat/에서 실행
npm run prepare:ocr
node server.mjs
```

http://127.0.0.1:4173/ 에서 비회원 비교와 UI를 확인합니다. 이 정적 서버는 로그인/API/계정 저장을 제공하지 않습니다. 계정까지 확인하려면 다음 절차를 사용합니다. 종료는 Ctrl+C입니다.

## 3. 로그인·저장까지 실행하기

### A. 로컬 빌드용 Site 정보 준비

실제 `.openai/hosting.json`은 Git 제외 파일이므로 새 PC에서 한 번 생성합니다. 기존 프로젝트 ID는 공개 식별자이며 비밀키가 아닙니다. 새 Site를 만들지 말고 아래 기존 ID를 유지합니다.

```powershell
# kkokmat/에서 실행
node -e "const fs=require('node:fs');const p=JSON.parse(fs.readFileSync('.openai/hosting.example.json','utf8'));p.project_id='appgprj_6afa9ea433448191940b4d7d26318d3e';fs.writeFileSync('.openai/hosting.json',JSON.stringify(p,null,2));"
npm run build
```

빌드는 `public/`, `worker/`, `drizzle/`로부터 `dist/client/`, `dist/server/`를 다시 만듭니다. 기존 서버를 종료하고 빌드하세요. 생성된 `dist` 안의 파일을 직접 고치지 않습니다.

### B. 새 로컬 DB에 마이그레이션 3개 적용

**해당 PC의 빈 로컬 DB를 처음 준비할 때만** 실행합니다. 아래 명령은 `--local`이며 운영 DB를 건드리지 않습니다. 시작 명령과 같은 `.wrangler/state`를 사용해야 합니다.

```powershell
Get-ChildItem -LiteralPath .\drizzle -Filter '*.sql' | Sort-Object Name | ForEach-Object {
  node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($_.Name)" }
}
```

순서는 `0000_dark_the_hand.sql` → `0001_clean_terrax.sql` → `0002_cooing_vargas.sql`입니다. 첫 파일만 적용하면 자녀 테이블·프로필 필드가 부족합니다. 이 실행 방식은 이미 적용한 SQL을 자동 건너뛰지 않으므로, 이후 일반 실행 때 반복하지 않습니다. 기존 DB에서 “already exists/duplicate column”이 나오면 데이터를 삭제하지 말고 적용 상태를 먼저 확인합니다.

### C. 로그인 환경 파일 준비

실제 값은 비공개로 전달받거나 기존 개발자 앱 관리 화면에서 확인합니다. 저장소의 빈 템플릿으로 시작하세요.

```powershell
Copy-Item .env.example .env.local
```

기존 `.env.local`이 있으면 복사하지 않고 그 파일을 사용합니다. `kkokmat/.env.local`에 필요한 여섯 변수와 콜백·오류 해결 방법은 [로그인 설정 안내](kkokmat/SOCIAL-LOGIN-SETUP.md)를 따릅니다. 실제 키는 커밋/채팅/클라이언트 코드에 넣지 않습니다.

### D. 두 터미널에서 실행

터미널 1, `kkokmat/`:

```powershell
$loginEnvPath = (Resolve-Path .env.local).Path
npm start -- --env-file "$loginEnvPath"
```

터미널 2, 동일한 `kkokmat/`:

```powershell
node scripts/local-account-preview.mjs
```

브라우저 주소는 **http://localhost:4180/** 입니다. 4178은 Worker, 4180은 기존 콜백 주소를 유지하는 로컬 프록시입니다. `localhost`와 `127.0.0.1`을 섞으면 출처·쿠키·콜백이 달라집니다. 두 프로세스 모두 실행해야 합니다. 종료는 각 터미널에서 Ctrl+C입니다.

Wrangler의 상대 환경 파일 경로는 설정 파일이 있는 `dist/server/`를 기준으로 해석됩니다. 위처럼 **절대 경로**를 전달해야 `kkokmat/.env.local`을 정확히 읽습니다. 빌드가 `dist/server/.dev.vars`를 지울 수 있으므로 새 PC에서는 키를 그곳에 보관하지 않습니다.

## 4. 로그인과 저장 확인

1. 비회원 상태에서 기준 옷과 2단계 종류 필터를 사용해 비교합니다.
2. 결과에서 저장을 선택하고 카카오 또는 네이버 로그인을 직접 완료합니다.
3. 자녀를 등록하고 새로고침 후 정보가 유지되는지 확인합니다.
4. 옷장에 옷 저장 → 저장한 옷으로 비교 → 2단계 바로 진입을 확인합니다.
5. 다른 자녀 등록/전환 시 옷장·기록이 섞이지 않는지 확인합니다.
6. 로그아웃 후 **같은 제공자·같은 계정**으로 로그인해 저장 내용을 다시 확인합니다.

새 PC의 로컬 DB는 빈 상태로 시작합니다. 운영 사이트에 저장한 자료가 로컬에 보이지 않는 것은 DB가 서로 다르기 때문입니다. 같은 운영 사이트에서는 같은 소셜 계정으로 로그인하면 서버 저장 자료를 조회합니다. 비회원 브라우저 저장은 브라우저/주소별로 다르며 Git으로 옮겨지지 않습니다. 카카오와 네이버 계정은 자동 합치지 않습니다.

## 5. 수정할 파일과 검증

| 작업 | 원본 위치 (kkokmat/ 기준) |
| --- | --- |
| 화면·2단계/결과 필터 | public/mobile-app.js, public/comparison-ui.js |
| 비교 계산·부위 범위 | public/engine.js, public/mobile-engine.js |
| 공통 디자인·보완 CSS | public/mobile-design.css, public/review-refinements.css, public/figma-home.css |
| PC 배치 | public/desktop-layout.css |
| 로그인·자녀·옷장 UI | public/account.js, public/account-children.js, public/wardrobe-form.js |
| 서버/API·OAuth | worker/index.js, worker/children.js, worker/social-auth.js |
| 상품 실측/목록 | public/data.json, public/catalog.json, public/measurements.csv |
| 출처·판독 자료 | research/ |
| DB 스키마·SQL | db/schema.ts, drizzle/ |
| 회귀 검증 | tests/ |

`engine.js`와 `mobile-engine.js`의 공통 비교 로직은 함께 수정합니다. 후자에는 브랜드·사이즈 중간 치수용 추가 함수가 있으므로 파일 전체를 덮어써 없애지 않습니다. 실제 진입점은 `responsive-app.js` → `mobile-app.js`이며 `app.js`는 보관용입니다. 데이터 재생성 전에는 추가 판독 자료와 해당 적용 스크립트를 확인해 기존 보완을 보존합니다.

검증:

```powershell
npm test
# 서버 종료 후
npm run build
```

앱 수정 후 위 로컬 서버를 다시 실행해 확인합니다. 정적 서버는 소스를 바로 제공하므로 브라우저 새로고침으로 확인할 수 있고, Worker 미리보기는 다시 빌드해야 변경된 원본이 반영됩니다. 테스트의 OAuth 응답은 모의 응답이므로 실제 카카오·네이버 로그인은 별도로 확인합니다.

## 6. 커밋·다음 PC로 이동·배포

저장소 루트에서 `git status`와 `git diff`를 확인하고, 수정한 파일을 이름으로 골라 `git add <파일...>`, `git commit`, `git push origin main`합니다. `.env.local`, `.dev.vars`, `.wrangler/`, 사용자 DB와 `node_modules/`는 Git 제외 대상입니다. 다음 PC에서는 다시 `git pull --ff-only`하고 의존성이 바뀌었으면 `npm ci`합니다.

GitHub push만으로 Sites 사이트가 자동 재배포되지는 않습니다. 사이트 반영 시 기존 프로젝트 `appgprj_6afa9ea433448191940b4d7d26318d3e`와 공개 주소를 재사용하고, 기존 D1 바인딩과 비밀 환경 변수를 유지합니다. Sites 연결 도구에 접근 가능한 계정/워크스페이스에서 소스 동기화 → 빌드·버전 저장 → 배포 순서로 진행합니다. 현재 체크아웃에 `.openai/hosting.json`이 없다는 이유로 새 Site를 생성하지 않습니다.

## 7. 새 작업 대화에 붙여넣을 내용

> 이 저장소는 꼭맞(KKOKMAT)입니다. 먼저 루트의 ‘다른-PC에서-이어가기.md’와 kkokmat/SOCIAL-LOGIN-SETUP.md를 읽고 git status를 확인해 주세요. 현재 앱은 kkokmat/이며 baby-fit/은 이전 버전입니다. 단품↔세트 비교에서는 해당 부위만 계산하고, 2단계 종류 필터 및 기본 접힘 브랜드 선택이 구현되어 있습니다. 모바일 디자인을 공통 기준으로 쓰고 PC는 레이아웃만 다릅니다. 기존 Site/DB/비밀 설정과 로컬 수정을 보존하고, 실제 비밀키는 출력하거나 커밋하지 마세요. 다음으로 할 작업은: [여기에 요청 입력].

이 문서는 새 작업자의 출발점입니다. 원래 대화 전체가 Git에 복제되는 것은 아니므로 다음 요청의 목표도 함께 전달하세요.
