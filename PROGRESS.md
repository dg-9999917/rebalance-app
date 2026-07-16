# 구현 진행 상황

## v3 5단계 — GitHub 원버튼 배포 + 드라이브 미리보기 (v3.html) — 2026-07-16
- [x] **시작 전 origin 병합**: 로컬 저장소에 remote가 전혀 없어(git remote -v 빈 결과) `https://github.com/dg-9999917/rebalance-app.git`을 origin으로 신규 등록 → fetch로 GitHub 쪽만 먼저 확인 → **origin/main과 로컬 master는 공통 조상이 없는 완전 별개 히스토리**(origin은 "Add files via upload" + GitHub 웹 UI에서의 "Update index.html/sw.js" 13개 커밋)임을 발견. 파일 단위 diff로 origin 고유 콘텐츠가 있는지 전수 확인한 결과 **0줄**(index.html은 로컬이 상위호환, sw.js는 origin이 v38로 구버전, manifest.json·아이콘은 byte-identical) — 사용자 확인 받은 후 `git merge origin/main --allow-unrelated-histories` 진행, index.html/sw.js add/add 충돌은 로컬(ours) 버전으로 해결(양쪽 히스토리 모두 보존, force push 없이 fast-forward push 성공)
- [x] 작업1: 설정 > 고급에 GitHub 원버튼 배포 추가
  — 토큰 입력(type=password)+[토큰 저장]/[삭제], 별도 localStorage 키 `rebalance_v3_gh_token`(appData=`rebalance_app_v3`와 완전 분리) — "토큰 저장됨 ●●●" 상태 표시
  — [GitHub로 배포] 버튼은 토큰 미저장 시 disabled, 클릭 시 확인 모달(버전·메모·종목수) → GitHub Contents API GET(sha 조회)→PUT(dg-9999917/rebalance-app, 브랜치 `main`—fetch로 확인한 실제 기본 브랜치) → 성공 시 appliedRecoVersion 갱신(관리자 본인 배너 재노출 방지)
  — base64는 `btoa(String.fromCharCode(...new TextEncoder().encode(jsonStr)))`로 UTF-8 안전 인코딩(한글 메모 보존, round-trip 검증 통과)
  — 401/403 "토큰이 유효하지 않습니다", GET 404는 sha 없이 신규 생성으로 진행(에러 아님), 기타 상태코드는 코드와 함께 표시
  — 기존 [배포용 JSON 복사]는 payload 생성 로직을 `buildDeployPayload()`로 공통 추출해 그대로 예비 수단 유지
  — **토큰이 백업 파일에 안 들어가는지 직접 확인(요청 핵심)**: Node vm으로 실제 앱 코드를 로드해 `JSON.stringify(appData,null,2)`(=드라이브 백업이 업로드하는 바로 그 문자열)와 `buildDeployPayload()`(=weights.json 내용) 양쪽에 대해 토큰 문자열·토큰 관련 키 이름 모두 `indexOf === -1` 확인, PUT 요청의 body(JSON.parse 후)에도 토큰 없음(Authorization 헤더에만 존재) 확인 — 전부 PASS
- [x] 작업2: 드라이브 불러오기 미리보기 — 목록 클릭 시 `previewDriveFile()`이 파일을 내려받아 파싱만 하고, `showDrivePreviewModal()`이 저장시각(파일명 기준)·계좌별 이름+종목수(CASH 제외)·종합계좌(멤버수) 표시, [이 백업으로 복원]을 눌러야만 기존 `restoreFromDrive()`(무수정) 실행, [뒤로]는 재요청 없이 직전 파일목록(`lastDriveFileList`) 재표시, JSON 파싱 실패 시 "읽을 수 없는 백업"+복원 버튼 disabled
- [x] Node vm으로 v3.html 인라인 스크립트 로드해 전 시나리오 검증: 토큰 저장/삭제, 백업·weights.json 토큰 미포함(핵심), 배포 성공(기존파일 sha 포함 PUT)/401 오류/404 신규생성, 드라이브 미리보기 정상·파싱실패 케이스 — 전부 PASS
- [x] 계산 함수 6개(git HEAD 대비) + `restoreFromDrive()`(직전 커밋 대비) byte-for-byte 무수정 재검증, index.html 무수정 확인
- [x] sw.js CACHE_NAME rebalance-v53 → rebalance-v54
- [ ] (미수행) 실제 GitHub 토큰으로 브라우저에서 배포 버튼을 눌러 GitHub 커밋 발생 확인, 배포 후 다른 계좌/브라우저에서 배너 노출 확인 — 로컬 Node 시뮬레이션까지만 수행

## v3 수정 4차 — 현금 행 레이아웃 + ₩/$ 스위치 (v3.html) — 2026-07-16
- [x] 작업1: CASH 행 현재가·평단가·보유수량 3칸을 `colspan="3"`으로 병합, 자동계산 현금액을 가운데 정렬로 표시(콤마 포맷, 기존 title 툴팁·음수 빨강 유지) — 일반 종목 행은 기존 3개 개별 td 그대로(무변경, 8열 구조 동일 확인)
- [x] 현금 그룹 헤더 행("현금" 초록 배경)도 병합 셀과 같은 위치에 "보유" 라벨(colspan=3, 작은 글씨·보조색) 추가, US/KR 그룹 헤더는 기존 colspan=8 단일 셀 그대로
- [x] 작업2: 평가금액 열 머리글의 클릭식 텍스트 전환 → index.html의 `.ccy-switch`(배정금액 ₩/$ 스위치) CSS·마크업을 그대로 이식한 슬라이드 스위치로 교체, 동작(toggleEvalCurrency)·÷fxN 환산·그룹합계 전환·localStorage(`v3_evalCurrency`) 유지 로직은 무수정
- [x] **종합계좌 현금 합산(대화 중 범위 확인 후 진행)**: 기존에 종합계좌 뷰는 `buildConsolidatedData`가 CASH를 집계 대상에서 아예 제외해 현금 행이 전혀 표시되지 않았음 — 이번에 신규로 "종합 현금 = 각 멤버 계좌의 자동계산 현금 합"을 추가(`computeCashAmount()`를 전역 `state`만 잠시 멤버 계좌로 바꿔 재사용하는 방식이라 기존 US/KR 집계 코드·검증된 계산 함수는 한 줄도 수정하지 않음, 호출 후 `state` 원상복구 확인됨), 종합 뷰에도 동일한 병합 레이아웃의 현금 행 추가, 현재비중 합계 계산에도 현금을 포함하도록 가산 라인만 추가
  — 검증: ① 종합 현금(4,000,000) = 계좌1 자동현금(1,000,000) + 계좌2 자동현금(3,000,000) 일치 확인
  — 검증: ② 종합 현재비중 합계 = (계좌1+계좌2 평가액 합 9,600,000 + 현금 4,000,000) ÷ 합산 per1(150,000) = 90.6667% → 화면 표시 "90.7%"로 정확히 일치 확인
  — 알려진 한계: 멤버 계좌 전부가 비현금 종목 0개인 극단적 케이스는 `!data.stocks.length` 조기 반환에 걸려 현금 행이 안 보일 수 있음(이번 요청 범위 밖이라 미수정)
- [x] Node vm으로 v3.html 인라인 스크립트 로드해 재검증: 현금 병합 셀 마크업·"보유" 라벨·음수 빨강·필요매매/현재비중 무변경·₩/$ 스위치 클래스 토글·종합 현금 합산 수치 일치 — 전부 PASS
- [x] 계산 함수 6개(git HEAD 대비) + `computeCashAmount()`(직전 커밋 대비) byte-for-byte 무수정 재검증
- [x] sw.js CACHE_NAME rebalance-v52 → rebalance-v53
- [ ] (미수행) 실제 브라우저·GitHub Pages 배포 후 라이브 확인

## v3 4단계 — 계산기 개선 (v3.html) — 2026-07-16
- [x] 작업1(버그): 계좌 전환 렌더 버그 — `addAccountV3()`(설정 탭 [+ 계좌 추가])가 `activateAccount()` 후 `renderSettingsTab()`+`renderAccountDropdown()`만 호출하고 계산기 뷰(표·기준 영역)는 재렌더하지 않아, 계산기 탭 이동 시 이전 계좌 데이터가 남아있던 것이 원인 — `renderAll()` 호출로 교체
  — 방어적으로 [계산기] 탭 버튼 클릭 시에도 `renderAll()`을 호출하도록 탭 전환 핸들러 보강(기존엔 `settings` 탭 진입 시에만 재렌더 호출, `calc` 탭 복귀 시엔 없었음)
  — `deleteAccountV3`/`onAccountChange`/종합계좌 전환 계열 함수들은 이미 `renderAll()`을 호출하고 있어 문제 없음을 grep 전수 확인(`activateAccount(` / `activeAccountId =` / `activeConsolidatedId =` 전체 호출부 검토)
- [x] 작업2(핵심): 현금 자동 계산 — 신규 함수 `computeCashAmount()`/`syncCashAmount()` 추가(기존 6개 계산 함수 getBasePrice/calcUnit/priceKRW/avgKRW/evalVal/currWeight는 무수정, git HEAD와 byte-for-byte 동일 재검증 통과)
  — `현금 = p0 − Σ(avgKRW(s)×q)` (CASH 제외), 계산 결과를 CASH 행의 `s.q`에 반영 → 기존 evalVal/currWeight가 그대로 올바른 값을 내도록 함(계산 함수 흐름 재사용)
  — `renderTable()`/`updateRows()` 시작 시 `syncCashAmount()` 호출로 p0·평단가·수량 변경마다 즉시 갱신
  — 현금 행 보유수량 칸: 읽기전용 텍스트(콤마 포맷, title="자동 계산: 전체 자금 − 매수 원가 합계"), 음수면 `val-neg`(빨강) 클래스, 평가금액 칸도 동일 값·색상 반영
  — 현금 필요매매(원화): `(adjR × per1) − 현금`, `+`/`-` 부호 + 콤마 + "원" 포맷(예: `-500,000원`) — 주식 행 부호 방향과 동일
  — **CASH 행 다중 존재 예외 처리**(사용자 확인 후 결정): 계좌당 CASH는 1개 전제, `addStockFromForm()`에 시장=CASH 중복 추가 차단(alert) 추가 — 단 기존 CASH 행 삭제 후에는 재추가 허용(구조상 차단이 아니라 "이미 있으면" 조건이므로 자동 해제됨). 혹시 있을 구계정의 CASH 2개 이상 케이스는 배열상 첫 번째 행만 자동계산(`isAutoCash`), 나머지는 기존처럼 수동 입력 유지
  — 종합계좌 뷰(`buildConsolidatedData`)는 CASH를 애초에 집계 대상에서 제외하고 있어(기존 3단계 구현) 현금 행 자체가 표시되지 않음 — 이번 작업으로 개별 계좌 현금 계산이 달라져도 종합 뷰에는 영향 없음(현 상태 그대로, 별도 요청 없어 미변경)
- [x] 작업3: 평가금액 ₩/$ 토글 — `toggleEvalCurrency()` + `localStorage['v3_evalCurrency']`(index.html 배정금액 토글의 localStorage+재렌더 패턴 참고), 평가금액 열 머리글 클릭으로 전환, 머리글에 "평가금액 (₩)"/"평가금액 ($)" 표시, $ 모드는 원화 평가금액÷fxN(소수 2자리) — 스펙 문구대로 시장 구분 없이 전체 열(US/KR/CASH)에 동일 적용(index.html 원본의 "US 종목만 환산"과는 다른 규칙임에 유의), 그룹 합계 행도 함께 전환, fxN 미입력 시 '—'
- [x] Node vm 컨텍스트로 v3.html 인라인 스크립트를 로드해 시나리오 검증(jsdom 미설치 환경) — 검산 예시(원금 1000만/평단 10만×90주→현금 100만, adjR 5%→필요매매 -500,000원, 수량 95로 변경 시 현금 500,000 즉시 갱신), 원가초과 음수+빨강, ₩/$ 토글 양방향, 주식 행 currWeight/evalVal 무변경, 새 계좌 생성 후 즉시 재렌더, CASH 중복 차단+삭제후 재추가 — 전부 PASS
- [x] 계산 함수 6개 git HEAD(fa3fcd8) 버전과 byte-for-byte 동일 재검증(자동 diff 스크립트)
- [x] sw.js CACHE_NAME rebalance-v51 → rebalance-v52
- [ ] (미수행) 실제 브라우저·GitHub Pages 배포 후 라이브 확인 — 이번 세션은 Node vm 시뮬레이션까지만 수행

## v3 3단계 — 설정 탭 (v3.html) — 2026-07-15
- [x] ① 계좌 관리: 목록(이름·종목수)+전환/이름변경/삭제(확인모달, 최소1개 보호), 새 계좌 추가(이름만 입력 → 종목 없음·p0=0로 시작해 추천 배너로 채우는 흐름 유도)
- [x] ② 종합계좌: appData.consolidated[] 그대로 사용(history 필드는 v3에 없어 제외) — 생성/편집/삭제/전환, 계좌 드롭다운에 구분선+📁 접두어 표시, 계산기 탭에서 종합 선택 시 읽기 전용 8열 뷰(설정비율·필요매매는 '—', 입력칸·±·×·드래그 전부 제거) — buildConsolidatedData는 index.html 로직 참고해 이식(realized 필드는 v3에 없어 제외), 전체자금 입력 readOnly 전환, 현재비중합계=합산평가÷합산per1, 시세새로고침은 계속 동작(단 "마지막으로 선택했던 개별 계좌 기준" 안내문 추가 — index.html cons-actions와 동일한 제약)
- [x] ③ 구글 드라이브: GDRIVE 상수·GIS/gapi 스크립트 태그·initGoogleDrive 폴링·connect/disconnect/ensureToken/getOrCreateFolder/saveToDrive/loadFromDrive/showDriveFileList/restoreFromDrive/buildGdriveUI/updateGdriveUI — index.html에서 거의 그대로 이식(저장 대상만 v3 appData/rebalance_app_v3), restoreFromDrive는 sanitizeLoadedAppData()로 migrateAccountFromV2 재사용해 옛 v2 백업의 이력·스냅샷 필드를 걸러내고 저장
- [x] ④ 추천 비중: "적용된 추천: {appliedRecoVersion|없음}" 표시 + [지금 확인] 버튼(캐시 우회 fetch, 최신이면 안내, 새 버전이면 배너 재평가)
- [x] ⑤ 고급(기본 접힘, ▸/▾ 토글): 메모 입력 + [배포용 JSON 복사] — 활성 계좌 종목의 r=adjR로 weights.json 형식 생성, version은 YYYY-MM-DD-N 자동증가(appliedRecoVersion·현재 recoData.version과 안 겹치게), 클립보드 복사 후 안내문
- [x] ⑥ 초기화: 현재 계좌 초기화(종목·수량·원금 비움, 확인모달) / 전체 초기화(2중 확인, rebalance_app_v3만 삭제 후 새로고침) — 두 경우 모두 rebalance_app_v2 미접촉
- [x] jsdom으로 전체 시나리오 실행 검증: 계좌 추가/삭제(최소1개 보호 alert 확인)/종합계좌 생성·전환(읽기전용 뷰+p0 readOnly+드롭다운 📁 표시)/복귀 시 readOnly 해제/배포JSON 클립보드 내용(버전 형식·r=adjR)/현재계좌 초기화 — 전부 기대대로 동작, 에러 없음
- [x] 계산 함수 6개 index.html과 byte-for-byte 동일 재검증, index.html 무수정 확인(git diff 없음)
- [x] sw.js CACHE_NAME rebalance-v50 → rebalance-v51
- [ ] (미수행) 구글 드라이브 실제 OAuth 연동·GitHub Pages 배포 후 브라우저 라이브 확인 — 이번 세션은 코드 이식과 jsdom 시뮬레이션까지만 수행

## v3 수정 3차 — 표 위 빈 행 제거 + 헤더 고정 복구 (v3.html) — 2026-07-15
- [x] jsdom으로 DOM 실측: 정적 HTML·스크립트 실행 후 모두 reco-banner가 `#tbl-wrap` 앞의 정상 형제 요소이고(`<table>` 안에 포이스터링된 적 없음), 그룹헤더 tbody가 첫 tbody로 NVDA 행보다 먼저 옴을 확인 — 마크업 중첩 문제 아님을 배제
- [x] 원인 특정: `.tbl-wrap { overflow-x: auto }` (fix2에서 남아있던 v3.html 150줄) — CSS 스펙상 overflow-x가 auto/scroll/hidden이고 overflow-y가 명시 안 되면 overflow-y도 auto로 강제 계산됨 → `.tbl-wrap`이 의도치 않게 스크롤 컨테이너가 되어 `thead th`의 `position:sticky`가 페이지가 아닌 이 컨테이너 기준으로 고정 컨텍스트를 잡음 → 헤더 고정 실패 + 빈 행 렌더링 아티팩트로 이어짐
- [x] grep으로 파일 전체 overflow 선언 전수 확인 — tbl-wrap 외에는 reco-modal(별도 fixed 오버레이, 무관)뿐임을 확인
- [x] `.tbl-wrap`의 overflow-x:auto 제거(가로 스크롤 대응은 데스크톱 기준이라 이번엔 생략), jsdom으로 tbl-wrap computed overflow-x/y가 visible로 바뀐 것과 thead th가 top:46px로 sticky 유지되는 것 재확인
- [x] thead th top은 46px 유지(0이 아님) — #app-header 자체가 top:0·z-index:200 sticky라 top:0으로 두면 종목 헤더 행이 앱 헤더 뒤에 가려짐, 46px(앱 헤더 높이)로 그 아래 고정되어야 실제 요구사항("화면 상단에 고정되고 뒤 글자 비침 없이") 충족
- [x] 계산 함수 6개 index.html과 byte-for-byte 동일 재검증, index.html 무수정 확인(git diff 없음)
- [x] sw.js CACHE_NAME rebalance-v49 → rebalance-v50

## v3 수정 2차 — 내부 스크롤 제거 + 전체 확대 (v3.html) — 2026-07-15
- [x] 원인: `.tbl-wrap { overflow-y: auto; max-height: calc(100vh - 230px); }` (v3.html 150~151줄, fix1에서 헤더 비침 수정 시 함께 남아있던 고정 높이 스크롤 컨테이너) — grep(`max-height|overflow-y`)으로 특정 후 두 속성만 제거, `overflow-x: auto`는 유지
- [x] thead 고정 방식을 tbl-wrap 자체 스크롤 기준(top:0)에서 페이지 스크롤 기준으로 전환: `thead th { top: 46px }` (앱 헤더 높이만큼 오프셋 — index.html과 동일 컨벤션), 기존 z-index:50·불투명 배경·::after 마감선은 그대로 유지되어 페이지 스크롤에서도 헤더 비침 없음
- [x] 전체 확대: table 15→16px, thead th 14→15px, tbody td padding 7px→10px(세로), 기준영역 값 표시 3곳(1%금액/현재비중합계/현재환율) 14→15px
- [x] 앱 컨테이너 max-width 제한: 검색 결과 없음(해당 없음, 추가 조치 불필요)
- [x] 계산 함수 6개 index.html과 byte-for-byte 동일 재검증, index.html 무수정 확인(git diff 없음)
- [x] sw.js CACHE_NAME rebalance-v48 → rebalance-v49

## v3 2단계 — 추천 비중 배포 시스템 (weights.json) — 2026-07-15
- [x] weights.json 레포 루트 신규 생성 — 초기값은 v3 "기본 계좌"(DEFAULT_STOCKS_V3) 전 종목의 name/ticker/market/adjR을 그대로 이전, version "2026-07-15-1"
- [x] v3.html: 앱 로드 시 `fetch('./weights.json?ts='+Date.now(), {cache:'no-store'})` 1회 조회(checkRecoWeights), 실패 시 조용히 무시
- [x] state.meta.appliedRecoVersion(계좌별) vs localStorage dismissedRecoVersion(기기별) 비교해 배너 표시 여부 판정(evaluateRecoBanner), 계좌 전환(onAccountChange) 시에도 재판정
- [x] 배너: reco-banner 자리 사용, "📢 {date} 추천 비중 도착 — {memo}" + [적용하기][×], 연한 파랑 배경(라이트/다크)
- [x] 적용 확인 모달(reco-modal-overlay): 새로 추가/비중 변경/추천 제외 목록 표시(buildRecoDiff, 매칭 키 ticker+market) + 개인조정 초기화 안내 문구
- [x] 적용 로직(confirmApplyReco): 기존 종목 r=adjR=추천r, 신규 종목 추가(q=0/avg=0/price=0, market 그룹 순서 유지해 삽입), 추천에 없는 기존 종목은 행 삭제 없이 r=adjR=0, appliedRecoVersion 저장 후 재렌더, 신규 종목 있으면 안내 메시지 1회(showFetchResult 재사용)
- [x] sw.js: fetch 핸들러에 `url.pathname.includes('weights.json')` 시 respondWith 없이 return — 캐시 완전 우회, 기존 index.html 캐싱 흐름엔 영향 없음
- [x] sw.js CACHE_NAME rebalance-v47 → rebalance-v48
- [x] 계산 함수 6개 index.html과 byte-for-byte 동일 재검증, index.html 무수정 확인(git diff 없음)
- [x] Node 시뮬레이션으로 buildRecoDiff/confirmApplyReco 검증(신규/변경/제외/그룹순서 삽입 전부 기대값과 일치) — 실제 브라우저·GitHub Pages 배포 후 라이브 확인은 미수행

## v3 수정 1차 — 상단 레이아웃 정리 (v3.html) — 2026-07-15
- [x] 헤더: "리밸런싱 계산기" 제목 삭제, [계산기][설정] 탭 좌측으로, 계좌 드롭다운 우측으로 이동
- [x] 기준 영역 한 줄 통합: 전체 자금 · 1%금액 · 현재 비중 합계 · 현재 환율 · [시세 새로고침] — [+ 종목 추가] 버튼 삭제(테이블 하단 폼과 중복), 별도 요약 바(summary-bar) 제거하고 renderSummary()가 인라인 span(#disp-wtsum/#disp-fxn) 직접 갱신하도록 변경, 현재비중 100 초과/미만 색상 규칙 그대로 유지
- [x] 미사용된 focusAddForm()·`.pf-summary*` CSS 정리
- [x] 종목 셀 flex 컨테이너화 + 삭제(✕) 버튼 margin-left:auto — 모든 행 ✕ 위치 세로 정렬
- [x] 표 헤더 스크롤 비침 수정: thead th z-index 20→50, tbl-wrap에 isolation:isolate, thead th::after 마감선(2px) 추가로 border-collapse 이음매 비침 차단
- [x] 계산 함수 6개(getBasePrice/calcUnit/priceKRW/avgKRW/evalVal/currWeight) index.html과 byte-for-byte 동일 재검증 통과, index.html 무수정 확인(git diff 없음)
- [x] sw.js CACHE_NAME rebalance-v46 → rebalance-v47

## v3 1단계 — 비중 계산기 새로 짓기 (v3.html) — 2026-07-15
- [x] v3.html 신규 생성 (index.html은 무수정 — git diff 없음 확인)
- [x] 헤더: 앱 제목 + 계좌 전환 드롭다운(appData.accounts만, 전환 전용) + 탭[계산기]/[설정](준비 중)
- [x] 기준 영역: 전체 자금(p0) 입력 + "1% = ₩○○○" 자동표시 + [🔄 시세 새로고침][＋ 종목 추가]
- [x] reco-banner 자리만 (display:none, 2단계용)
- [x] 요약 바 2개: 현재 비중 합계(100 기준 초록/빨강) + 현재 환율
- [x] 표 8열: 종목(☰드래그+이름+티커+뱃지+삭제) / 현재가 / 평단가 / 보유수량 / 설정비율±(adjR) / 현재비중 / 필요매매 / 평가금액
- [x] 그룹 헤더(US/KR/CASH) + 종목당 합계행, SortableJS 1.15.6 드래그 유지
- [x] 계산 함수 6개(getBasePrice/calcUnit/priceKRW/avgKRW/evalVal/currWeight) index.html과 byte-for-byte 동일 — 자동 검증 스크립트로 확인
- [x] 입력 핸들러(onPriceInput/onAvgInput/onQtyInput/onAdjRChange/onAdjRInput), 유틸(fmtNum/fmtDec/parseNum/esc/commaFocus/commaBlur/commaBlurQty), 시세연동(getPriceServerUrl/fetchPrices/showFetchResult), addStockFromForm/deleteStock/initSortable — 원본 그대로 복사, 렌더 호출부만 v3 구조(단일 표)에 맞게 조정
- [x] localStorage: 신규 키 `rebalance_app_v3`, 기존 `rebalance_app_v2`는 읽기 전용 1회 마이그레이션(스냅샷/이력 제외, meta+stocks 핵심 필드만 이전)
- [x] sw.js CACHE_NAME rebalance-v45 → rebalance-v46
- [x] 검산: index.html calcUnit 최초 복사 시 실수 발견(환율 처리 분기 누락) → 자동 diff 스크립트로 잡아내 수정 후 byte-for-byte 일치 확인. currWeight/필요매매/평가금액 수치 계산 결과 index.html 함수 원본 실행 결과와 일치

## v2 — 디자인 개선 2차 — 2026-07-08
- [x] index_before_design2.html 복사본 생성
- [x] 행 구분선 진하게: #b0b5c0 (라이트) / #3a3f4a (다크)
- [x] 행 패딩 7px → 10px
- [x] 줄무늬 진하게: #edf0f5 (라이트) / #22262e (다크)
- [x] 마우스 호버: #dbeafe !important (라이트) / #1e3a5a !important (다크)
- [x] --text-sub #4b→#37 (라이트) / #9a→#a0 (다크)
- [x] --text-muted #6b→#4b (라이트) / #7a→#88 (다크)
- [x] tbody td.num font-weight: 500
- [x] thead th font-weight: 800, color: var(--text)
- [x] 그룹 헤더 색 진하게 + border-left: 4px solid 컬러 바 (US/KR/CASH, 라이트+다크)
- [x] 기준설정 colgroup: 종목 auto, 나머지 55/110/95/100/95/90/40/40px, width:100%
- [x] 간단 보기 colgroup: 종목 auto, 나머지 95/95/75/65/65/80/110px, width:100%
- [x] 상세 보기 colgroup: 종목 auto, 나머지 82/82/72/55/100/60/72/90/78/85/75px, width:100%
- [x] sw.js CACHE_NAME rebalance-v42 → rebalance-v43

## v2 — 디자인 개선 (가독성·색 구분·입력 편의) — 2026-07-08
- [x] index_before_design.html 복사본 생성
- [x] 라이트 모드: --text #1a→#11, --text-sub #6b→#4b, --text-muted #9c→#6b
- [x] 다크 모드: --text #dd→#e8, --text-sub #7a→#9a, --text-muted #4a→#7a
- [x] val-dim: opacity: 0.85 추가
- [x] 그룹 헤더 시장별 배경색 CSS (group-us/kr/cash, 라이트+다크)
- [x] 행 교차 줄무늬 CSS (짝수 행, group-hdr/subtotal-row 제외)
- [x] renderSettingsTable/renderPortfolioTable/renderConsolidatedPortfolio 그룹 헤더에 groupClass 추가
- [x] 기준설정 그룹 헤더 중앙 퍼센트 텍스트 color: inherit으로 수정
- [x] commaFocus: setTimeout(el.select, 0) 추가 — 클릭 시 전체 선택
- [x] sw.js CACHE_NAME rebalance-v41 → rebalance-v42

## v2 — SortableJS 드래그앤드롭 — 2026-07-08
- [x] SortableJS CDN 스크립트 추가 (Sortable 1.15.6)
- [x] 기존 HTML5 initDragReorder IIFE + touchstart/move/end 전부 제거
- [x] drag-over-top/drag-over-bottom CSS 제거
- [x] renderSettingsTable: 그룹 헤더 별도 tbody, 종목 tbody.sortable-group[data-market]으로 분리
- [x] <tr data-stock-id> 추가, draggable/data-market 속성 td에서 제거
- [x] sortableInstances + initSortable() — renderSettingsTable 끝에서 호출
- [x] onEnd: tr[data-stock-id] 순서 읽어 state.stocks 재배열 → saveState + renderSettingsTable + renderPortfolioTable
- [x] 현금(CASH) sortable-group 제외 (market=CASH는 Sortable 미등록)
- [x] CSS: sortable-chosen/ghost/drag 시각 피드백
- [x] sw.js CACHE_NAME rebalance-v40 → rebalance-v41

## v2 — 종목 드래그앤드롭 순서 변경 — 2026-07-08
- [x] ▲▼ 버튼 제거, ☰ 드래그 핸들로 교체 (td.drag-handle, draggable="true")
- [x] HTML5 dragstart/dragover/dragleave/drop/dragend 이벤트 위임 (#settings-tbl-wrap)
- [x] 같은 market 그룹 내에서만 이동 허용
- [x] 드래그 중 시각 피드백 (반투명 0.4 + 드롭 위치 파란 선 drag-over-top/bottom)
- [x] 모바일 터치 이벤트 대응 (touchstart/touchmove/touchend)
- [x] 현금(CASH) 드래그 불가 (빈 td, drag-handle 클래스 없음)
- [x] doReorder() 공통 함수 → saveState + renderSettingsTable + renderPortfolioTable
- [x] isFirst/isLast/sameMarket 변수 제거 (불필요)
- [x] sw.js CACHE_NAME rebalance-v39 → rebalance-v40

## v2 — 동기화 자동화 + 종목 순서 변경 — 2026-07-08
- [x] 기준설정 변경 함수들(onRatioChange, onRatioInput, onMetaInput, addStockFromForm, deleteStock, setPriceMode)에 renderPortfolioTable() 추가
- [x] 동기화 버튼 + sync-msg 메시지 HTML 삭제 (syncSettingsToPortfolio 함수는 유지)
- [x] 기준설정 표에 순서(▲▼) 열 추가 — colgroup/thead/행/colspan=9
- [x] moveStock() 함수 — 같은 market 내에서 swap
- [x] 현금(CASH)은 순서 버튼 없음
- [x] 그룹 헤더 colspan 8 → 9
- [x] sw.js CACHE_NAME rebalance-v38 → rebalance-v39

## v2 — 간단 보기 input 스타일 통일 — 2026-07-07
- [x] CSS: .inp-pf를 .inp-price/.inp-avg/.inp-qty와 동일한 규칙에 추가
- [x] SpaceX 현재가 input: inp-price → inp-pf, font-size:inherit 제거
- [x] 평단가 input: font-size:inherit 제거, id="pf-in-avg-${s.id}" 추가
- [x] 보유수량 input: font-size:inherit 제거, id="pf-in-q-${s.id}" 추가
- [x] 핸들러: onAvgInput/onQtyInput (상세 보기와 동일) 유지
- [x] sw.js CACHE_NAME rebalance-v37 → rebalance-v38

## v2 — 계좌설정 박스 크기 + 간단 보기 편집 — 2026-07-06
- [x] 계좌설정: space-evenly 삭제, flex:0 1→flex:1, gap:24px→20px로 화면 채움
- [x] 간단 보기: 평단가 input으로 변경 (onAvgInput, CASH는 텍스트 유지)
- [x] 간단 보기: 보유수량 input으로 변경 (onQtyInput, CASH는 텍스트 유지)
- [x] 현재가·설정비율·현재비중·필요매매·평가금액 읽기 전용 유지
- [x] sw.js CACHE_NAME rebalance-v36 → rebalance-v37

## v2 — 간단 보기 8열 재정리 + 계좌설정 균등배치 — 2026-07-06
- [x] 간단 보기: 현재가 독립 열로 분리 (종목 셀 합치기 완전 제거)
- [x] 간단 보기: 8열 모두 고정 너비 (width:auto 제거, 160/95/95/80/70/70/80/110px)
- [x] 간단 보기: 현재가 price>0 텍스트, price=0 input, CASH —
- [x] 간단 보기: 필요매매 포함 8열 +/- 색상
- [x] 간단 보기: thead font-weight:800 유지
- [x] 간단 보기: colgroup/group-hdr colspan 8/합계행 colspan 4 동기화
- [x] 계좌설정: justify-content:space-evenly + flex:0 1로 3컬럼 균등배치
- [x] sw.js CACHE_NAME rebalance-v35 → rebalance-v36

## v2 — 간단 보기 재수정 + 계좌설정 배치 — 2026-07-06
- [x] 간단 보기: 현재가를 종목 셀 같은 줄 오른쪽에 배치 (아래줄 → 우측 inline)
- [x] 간단 보기: price=0 종목만 현재가 input, 나머지 읽기 전용 텍스트
- [x] 간단 보기: 필요매매 열 추가 (6열 → 7열)
- [x] 간단 보기: thead font-weight:800, letter-spacing:0.03em (크기 유지)
- [x] 간단 보기: colgroup/group-hdr colspan/합계행 7열 동기화
- [x] 계좌설정: 2컬럼 → 3컬럼 (개별계좌 | 종합계좌 | 구글 드라이브)
- [x] sw.js CACHE_NAME rebalance-v34 → rebalance-v35

## v2 — 간단 보기 현재가 위치 + 계좌설정 배치 — 2026-07-06
- [x] 간단 보기: 현재가를 종목 셀 내 텍스트로 이동 (읽기 전용)
- [x] 간단 보기: 2열 → 평단가 (읽기 전용 텍스트)
- [x] 간단 보기: 보유수량 읽기 전용 텍스트 (input 제거)
- [x] 간단 보기: colgroup 너비 200/100/100/90/90/130 조정
- [x] 상세 보기 변경 없음
- [x] 계좌설정: 구글 드라이브를 오른쪽 컬럼(종합계좌 아래)으로 이동
- [x] sw.js CACHE_NAME rebalance-v33 → rebalance-v34

## v2 — 드라이브 날짜별 백업 — 2026-07-06
- [x] saveToDrive: 덮어쓰기 → 날짜별 새 파일 생성 (backup_YYYY-MM-DD_HH-MM-SS.json)
- [x] loadFromDrive: 파일 목록 조회 → 선택 모달 표시
- [x] showDriveFileList: 최신 뱃지·날짜·용량 표시 모달
- [x] restoreFromDrive: 선택한 파일 복원
- [x] 기존 rebalance_backup.json 호환 유지 (목록에 표시됨)
- [x] sw.js CACHE_NAME rebalance-v32 → rebalance-v33

## v2 — 구글 드라이브 스크립트 로딩 수정 — 2026-07-06
- [x] initGoogleDrive를 폴링 방식으로 변경 (500ms × 20회 = 최대 10초 대기)
- [x] connectGoogleDrive에서 토큰 클라이언트 재시도 로직 추가
- [x] sw.js CACHE_NAME rebalance-v31 → rebalance-v32

## v2 — 구글 드라이브 백업 연동 — 2026-07-06
- [x] head에 GIS + gapi 스크립트 추가 (async defer)
- [x] 클라이언트 ID 상수 선언 + 상태 변수 (gdriveTokenClient 등)
- [x] initGoogleDrive() — GIS 라이브러리 로드 확인 후 TokenClient 초기화
- [x] connectGoogleDrive() / onGdriveTokenResponse() / disconnectGoogleDrive()
- [x] ensureGdriveToken() — 토큰 유효성 확인 + 자동 재인증
- [x] getOrCreateDriveFolder() — 리밸런싱앱_백업 폴더 검색/생성
- [x] saveToDrive() — rebalance_backup.json multipart 업로드 (신규/덮어쓰기)
- [x] loadFromDrive() — 파일 다운로드 → appData 복원
- [x] manualDriveBackup() — 수동 백업 버튼 핸들러
- [x] buildGdriveUI() / updateGdriveUI() — 미연결/연결됨 상태 UI
- [x] commitTrades에 자동 백업 훅 (비동기 fire-and-forget, localStorage 저장과 독립)
- [x] renderAccountsTab에 ☁️ 구글 드라이브 백업 영역 추가
- [x] sw.js 외부 도메인 캐시 제외 확인 (기존 origin 체크로 이미 적용됨)
- [x] sw.js CACHE_NAME rebalance-v30 → rebalance-v31

## v2 — 간단 보기 열 변경 — 2026-07-06
- [x] 실현손익 → 설정비율로 교체 (val-dim 읽기전용, border-left)
- [x] 평가손익 → 평가금액으로 교체 (evalVal, pf-eval-${id}, border-left)
- [x] _updatePortfolioRows에 evalEl 실시간 갱신 추가
- [x] 합계행: 설정비율% + 현재비중 + 평가금액 원 구조로 재구성
- [x] sw.js CACHE_NAME rebalance-v29 → rebalance-v30

## v2 — 토글 스위치 UI 변경 — 2026-07-06
- [x] 간단/상세 버튼 → 슬라이드 스위치로 교체 (.view-switch CSS + div HTML)
- [x] 포트폴리오 탭에서만 스위치 표시 (다른 탭·종합계좌에서 숨김)
- [x] 탭 클릭 이벤트에 updateViewModeButton() 추가
- [x] sw.js CACHE_NAME rebalance-v28 → rebalance-v29

## v2 — 간단/상세 보기 토글 — 2026-07-06
- [x] 상단 헤더에 토글 버튼 추가 (계좌 드롭다운 왼쪽)
- [x] localStorage에 모드 저장 (pf_view_mode, 기본값: simple)
- [x] 간단 보기: 표 6열 + 요약 바 4개 + 글씨 큼 (15px/14px)
- [x] 상세 보기: 표 12열 복원 + 요약 바 8개 + 글씨 작음 (13px/11.5px)
- [x] 상세 보기에서 삭제됐던 4열 복원 (설정비율·1%당주식수·배정금액·필요매매)
- [x] 배정금액 ₩/$ 토글 복원 (toggleAllocCurrency 재연결)
- [x] _updatePortfolioRows 모드 분기 (needEl null-safe 복원)
- [x] 종합계좌에서 토글 버튼 숨김 (updateViewModeButton)
- [x] 열 구분선 (간단 3곳: 현재가·현재비중·평가손익, 상세 4곳: 현재가·설정비율·1%당·평가손익)
- [x] sw.js CACHE_NAME rebalance-v27 → rebalance-v28

## v2 지시문 3 보완 (동시선택 + 시세버튼 + 열축소) — 2026-07-06
- [x] 문제1: 종합계좌 활성 시 개별 계좌 "현재" 표시 안 되도록 isActive 조건 수정
- [x] 문제2: 종합 포트폴리오에 시세 새로고침 버튼 표시 (별도 영역 cons-actions)
- [x] 문제3: 종합 요약 바 gap 28px, padding 14px 20px으로 넓힘
- [x] 문제4: 개별 포트폴리오 12열→8열 축소 (설정비율·1%당주식수·배정금액·필요매매 제거)
- [x] 문제4: thead 13px, table 14px 유지
- [x] 문제4: 열 그룹 구분선 8열 기준 (현재가·조정비율·평가손익에 border-left)
- [x] 문제4: colspan·합계행·_updatePortfolioRows 동기화
- [x] sw.js CACHE_NAME rebalance-v26 → rebalance-v27

## v2 지시문 3/3 (종합계좌 — 뷰·모니터링·이력) — 2026-07-06
- [x] renderConsolidatedPortfolio: 합산 읽기전용 표 (7열), 요약 바, 하단 버튼 숨김
- [x] renderPortfolioTable에서 개별 모드 복귀 시 pf-actions 재표시
- [x] renderConsolidatedMonitor: 종합 history 기준 라인차트·도넛차트
- [x] commitTrades에 saveConsolidatedSnapshots 훅 추가
- [x] saveConsolidatedSnapshots: 멤버 계좌 확정 시 종합 스냅샷 자동 저장
- [x] renderConsolidatedHistory: 종합 스냅샷 목록 + 거래로그 서브탭
- [x] 종합 모드에서 시세새로고침·미리보기·확정저장·되돌리기 숨김
- [x] 개별↔종합 전환 시 탭·버튼 표시 정상
- [x] sw.js CACHE_NAME rebalance-v25 → rebalance-v26

## v2 지시문 2 보완 (계좌설정 탭 좌우 배치) — 2026-07-06
- [x] 계좌 목록(왼쪽) + 종합계좌(오른쪽) 좌우 배치
- [x] 점선 구분선 삭제
- [x] 좁은 화면에서 자동 상하 전환 (flex-wrap:wrap)
- [x] sw.js CACHE_NAME rebalance-v24 → rebalance-v25

## v2 지시문 2/3 (종합계좌 — 구조·생성·삭제) — 2026-07-06
- [x] appData에 consolidated 배열 + activeConsolidatedId 추가
- [x] loadState에서 기존 데이터 호환 (consolidated 없으면 기본값)
- [x] buildConsolidatedData 합산 로직 (수량, 가중평균 평단, 실현손익)
- [x] 계좌설정 탭에 종합계좌 만들기 박스 (이름 + 체크박스)
- [x] 계좌 목록에 종합계좌 표시 (📁, 구분선, 전환/편집/삭제)
- [x] 드롭다운에 종합계좌 표시 (📁, 구분선)
- [x] onAccountChange에서 종합계좌 전환 분기
- [x] render()에서 종합 모드 시 탭 숨김/placeholder
- [x] 기존 개별 계좌 기능 정상 동작 확인
- [x] sw.js CACHE_NAME rebalance-v23 → rebalance-v24

## v2 지시문 1 보완 (시세버튼 복원 + 단일 선택) — 2026-07-06
- [x] 기준설정 탭에 시세 새로고침 버튼 복원 (URL 입력칸 없이)
- [x] 행 선택을 단일 선택으로 변경 (기존 다중 → 하나만)
- [x] sw.js CACHE_NAME rebalance-v22 → rebalance-v23

## v2 지시문 1/3 (가격 서버 하드코딩 + UI 가독성) — 2026-07-06
- [x] A: 가격 서버 URL 하드코딩, 입력칸 삭제, 버튼 항상 활성화
- [x] B: 표 글씨 크기 키움 (th 12.5px, td 14px), 포트폴리오 열 그룹 구분선
- [x] C: 종목 행 클릭 시 배경색 토글 (시각 표시만, 기능 없음)
- [x] sw.js CACHE_NAME rebalance-v21 → rebalance-v22

## 수정 (이력 탭 하단 빈 공간 제거) — 2026-07-03
- [x] 거래로그 max-height 210px → 110px (46헤더+55서브탭+9여유=110, 표가 화면 끝까지 채움)
- [x] 스냅샷 목록 max-height 210px → 110px (동일)
- [x] sw.js CACHE_NAME rebalance-v20 → rebalance-v21

## 수정 (이력 탭 거래로그 헤더 고정 위치) — 2026-07-03
- [x] #tab-history thead th { top: 0 } 오버라이드 추가 (글로벌 46px → 0px)
- [x] 거래로그 헤더가 스크롤 컨테이너 최상단에 고정됨 (기존: 46px 아래)
- [x] 기준설정·포트폴리오 탭 헤더 고정 영향 없음
- [x] sw.js CACHE_NAME rebalance-v19 → rebalance-v20

## 수정 (포폴 버튼 표끝 + 이력 거래로그 스크롤) — 2026-07-03
- [x] 작업1: 표+버튼을 pf-scroll 컨테이너로 묶어 함께 스크롤 (tbl-wrap 자체스크롤 해제 → max-height:none; overflow:visible), thead top:0 pf-scroll 기준 고정, 버튼이 표 끝에 나옴
- [x] 작업2: 거래로그 max-height 160px→210px, 스냅샷목록 동일 조정, 페이지 스크롤 제거·헤더 고정
- [x] sw.js CACHE_NAME rebalance-v18 → rebalance-v19

## 수정 (이중 스크롤 제거) — 2026-07-03
- [x] 포트폴리오 tbl-wrap max-height 240px → 320px (하단 버튼 영역 반영)
- [x] 이력 스냅샷목록 max-height 120px → 160px (서브탭+여백 반영)
- [x] 이력 거래로그 max-height 120px → 160px (서브탭+여백 반영)
- [x] sw.js CACHE_NAME rebalance-v17 → rebalance-v18

## 수정 (표 스크롤 방식 통일) — 2026-07-03
- [x] 작업1: 포트폴리오 tbl-wrap을 기준설정처럼 max-height:calc(100vh-240px)+overflow-y:auto로 복원, thead top:0
- [x] 작업2: 이력 거래로그 래퍼에 overflow-y:auto+max-height:calc(100vh-120px), thead top:0 유지
- [x] 작업2: 이력 스냅샷목록 컨테이너에 overflow-y:auto+max-height:calc(100vh-120px) 래퍼 추가
- [x] (태그 구조 변경 없음 — CSS+JS 인라인 스타일만)
- [x] sw.js CACHE_NAME rebalance-v16 → rebalance-v17

## v1 마무리3 (표헤더sticky·여백·스냅샷간격) — 2026-07-02
- [x] 작업1: thead th top:0 → top:46px 전역 적용(페이지 스크롤 기준, 앱헤더 아래 고정)
- [x] 작업1: #tab-settings .tbl-wrap thead th { top:0 } 재정의(tbl-wrap 내부 스크롤 기준 유지)
- [x] 작업2: thead th padding 8px→7px(헤더-첫행 간격을 행-행 간격과 균일화)
- [x] 작업3: 스냅샷 카드 gap 16px→28px, 수치 블록 gap 24px→32px, min-width 확대(가로 간격 시원하게)
- [x] sw.js CACHE_NAME rebalance-v15 → rebalance-v16

## v1 마무리2 (포폴스크롤·스냅샷높이·거래로그수량) — 2026-07-02
- [x] 작업1: 포트폴리오 #tab-portfolio .tbl-wrap max-height:none + overflow-y:visible → 페이지 흐름 스크롤
- [x] 작업1: 포트폴리오 thead th top:46px (앱 헤더 아래 sticky)
- [x] 작업2: 스냅샷 카드 padding 12px→6px, gap 32px→16px, 스티커 라벨 인라인 2줄 구조, 수치 폰트 축소
- [x] 작업3: 거래로그 변동수량 prevQty→curQty 저장 + '이전 → 현재 (차이주)' 렌더
- [x] sw.js CACHE_NAME rebalance-v14 → rebalance-v15

## v1 마무리 (이력 배치·포폴 스크롤) — 2026-07-02
- [x] 작업1: 스냅샷 카드 헤더 — 스티커를 라벨 아래 전용 줄로 이동(min-height:18px 공간 확보), 수치 블록 min-width 지정
- [x] 작업1: 거래로그 종목 셀 — 종목명·티커·스티커 flex 정렬로 통일
- [x] 작업2: 포트폴리오 탭 pf-tbl-wrap 외부 래퍼 제거 → tbl-wrap 단일 스크롤 구조
- [x] 작업2: #tab-portfolio .tbl-wrap max-height calc(100vh-175px) → calc(100vh-320px) (버튼 영역 고려)
- [x] 작업2: .pf-tbl-wrap CSS 규칙 제거
- [x] sw.js CACHE_NAME rebalance-v13 → rebalance-v14

## 수정 (스냅샷 비중변화·스티커색·모달정리) — 2026-07-02
- [x] 작업1: buildSnapshot에 adjR 저장 + 스냅샷 상세 설정→조정(prevR→curR) & 현재비중(직전→현재) 변화 표시
  — 변화 있을 때만 화살표+색상, 없으면 단일값, 구 스냅샷/신규 종목 방어처리
- [x] 작업2: .snap-tag-adjr 색상을 accent(파란색)으로 통일
- [x] 작업3: 모달 제안거래 "제안 수량" 열 제거, 비율이동만 남김
- [x] 작업4: 모달 직전대비 변화 헤더 "수량 변화(주)"로 명확화, 값에 "주" 단위 추가(현금은 원 유지)
- [x] sw.js CACHE_NAME rebalance-v12 → rebalance-v13

## 수정 (확정 모달 표시 보강) — 2026-07-02
- [x] 문제1: 조정비율 기반 제안거래 `<details>` → `<div>` 교체, 항상 펼쳐진 상태로 표시
- [x] 문제2: 현금 변동(prevSnap CASH.q 대비 cashDiff) 변화량 표에 추가 — 1원 이상 변화 시만 노출
- [x] sw.js CACHE_NAME rebalance-v11 → rebalance-v12

## 수정 (보유수량 변경 반영 + 이력 스티커/현금) — 2026-07-02
- [x] 작업1[핵심]: 직전스냅샷 q 대비 변화로 실현손익·평단 계산(현재가 기준), 이중계산 원천 차단
  — commitTrades: 매도 → realized += (현재가−평단)×감소분 / 매수 → 가중평균 평단
  — 체결가 기반 A방식 로직 완전 제거, 스냅샷 diff 단일 경로로 통일
- [x] 작업1: 확정 모달 → 수량 변화 미리보기 + 예상 실현손익 표시(참고용, 저장 전 확인)
  — 조정비율 기반 제안 거래는 collapsible "참고용" 섹션으로 (장부 미반영)
- [x] 작업1: 스냅샷에 changedQty/changedAdjR/cashDelta 저장
- [x] 작업2: 거래 로그 — 스냅샷 유형 스티커(수량/비중) + 현금 변동 행(CASH_DELTA)
- [x] 작업3: 스냅샷 카드 헤더 스티커(보유수량 변경/조정비율 변경) + 상세 현금 증감 내역
- [x] sw.js CACHE_NAME rebalance-v10 → rebalance-v11

## 수정 (원금+실현손익 지표) — 2026-07-01
- [x] 작업1: 포트폴리오 상단 요약에 '원금+실현손익'(p0+totalReal) 추가, 평가금 유지
- [x] 작업2: 이력 스냅샷 카드에 '원금+실현손익'(snap.p0+totalRealized) 추가, snap.p0 방어처리
- [x] sw.js CACHE_NAME rebalance-v9 → rebalance-v10

## 수정 (합계행 열정렬) — 2026-07-01
- [x] subAlloc·subUnreal·subReal 누적 추가
- [x] 합계행 12열 재배치: 현재비중/배정금액/평가손익/실현손익 합을 각 열 아래
- [x] 설정% 통합 유지, 평가액 합은 라벨 옆 작은 글씨로 유지(환율 미입력 시 '환율 미입력')
- [x] 달러 토글 시 미국 그룹 합계 $ 환산(표시만)
- [x] sw.js CACHE_NAME rebalance-v8 → rebalance-v9

## 긴급수정 (환율버그·확정저장·달러표시) — 2026-07-01
- [x] 작업1[치명]: calcUnit 미국종목 환율 — curr=fxN/hist=fx0, ||1 폴백 제거(폭증 차단)
- [x] 작업2: 확정저장 변동 없어도 현재상태 저장 가능(commitTrades 0건 허용)
- [x] 작업4: 달러 토글 시 평가손익·실현손익도 미국종목 달러 표시(표시만, 저장 원화 유지)
- [x] 작업5: 기준설정 탭 1%당 주식수 — calcUnit 공유라 작업1에서 자동 정상화
- [ ] (보류) 작업3: 평가이익 반영 — 이번엔 안 함
- [x] sw.js CACHE_NAME rebalance-v7 → rebalance-v8

## 수정 (글자크기삭제·비중위치) — 2026-07-01
- [x] 작업1: 글자크기(A/A/A) 기능 CSS·HTML·JS 완전 삭제, 잔재 없음
- [x] 작업2: 기준설정 그룹헤더 '설정%' 가운데 정렬(absolute)+강조(--text, bold)
- [x] 작업3: 포트폴리오 그룹헤더 비중 제거 → 합계행에 '설정%' 통합(현재비중은 기존 열 활용)
- [x] sw.js CACHE_NAME rebalance-v6 → rebalance-v7

## 수정 (글자크기·시장별비중) — 2026-07-01
- [x] 작업1: 계좌선택 왼쪽에 글자크기 3단계 컨트롤 + localStorage(fontScale) 저장/복원
- [x] 작업2: 기준설정 그룹헤더에 설정비율합%, 포트폴리오 그룹헤더에 설정%+현재%
- [x] sw.js CACHE_NAME rebalance-v5 → rebalance-v6

## 수정 (시세메시지·기준환율조건·포폴달러·스위치UI) — 2026-07-01
- [x] 작업1: 기준설정 시세버튼 왼쪽에 fetch-result-settings 메시지(showFetchResult 양쪽 갱신)
- [x] 작업2: 기준환율(field-fx0) 과거종가 모드일 때만 표시(초기 로드 포함)
- [x] 작업3: 포트폴리오 배정금액 원/$ 토글 + USD 환산표시(allocCurrency 공유, 양탭 렌더)
- [x] 작업4: 원/$ 토글을 pill 슬라이드 스위치 UI로(기준설정·포폴 공통)
- [x] sw.js CACHE_NAME rebalance-v4 → rebalance-v5

## 수정 (현재가반영·환율소수점·달러토글·초기화탭색) — 2026-07-01
- [x] 작업1: getBasePrice·기준설정 현재가열이 s.price(실제시세) 표시 (c0+100 스텁 제거), 헤더 "현재가(임시)"→"현재가"
- [x] 작업2: 포트폴리오·기준설정 현재환율 소수 2자리 표시 (syncFxNPortfolio 포함)
- [x] 작업3: 배정금액 원/$ 토글 버튼 (기준설정 헤더, toggleAllocCurrency, 미국종목 원÷환율 표시)
- [x] 작업4: 초기화 탭 메뉴 글자색 일반화 (내부 경고 박스는 유지)
- [x] sw.js CACHE_NAME rebalance-v3 → rebalance-v4

## 수정 (시세반영·초기화탭·기준가격모드) — 2026-07-01
- [x] 작업1: fetchPrices에 renderSettingsTable() 추가 → 기준설정 현재가(임시) 반영
- [x] 작업2: 상단 초기화 버튼 제거 + "초기화" 탭 신설(설명박스+버튼, resetApp 재사용)
- [x] 작업3: 기준가격모드 순서 교체(현재가 왼쪽) + 기본값·폴백 'curr'로 통일
- [x] sw.js CACHE_NAME rebalance-v2 → rebalance-v3

## UI 수정 (버튼 배치) — 2026-07-01
- [x] 작업1: 기준설정 가격서버 줄 오른쪽에 [시세 새로고침] 버튼 (btn-fetch-prices-settings, fetchPrices 재사용)
- [x] 작업2: 포트폴리오 하단 — margin-top 14px + 좌(미리보기·시세새로고침 gray)/우(확정저장 blue) 배치 + 색상(좌2동일.btn/우1.btn-primary)
- [x] sw.js CACHE_NAME rebalance-v1 → rebalance-v2

## 통합 작업 (배포 준비)
- [x] A: 백업 안전장치 (확정 저장 시 오른쪽아래 알림→다운로드/배지 축소, 현재계좌만)
- [x] B: 시세 서버 연동 (주소칸 + [시세 새로고침], ticker/market 자동매칭, https·콜드스타트·에러처리)
- [x] C: PWA (manifest+아이콘+서비스워커, 별도파일 방식, 상대경로, iOS apple-touch-icon 대응)
- [ ] (사용자) D: main.py(네이버) Render 배포 + 해외 IP 네이버 응답 확인
- [ ] (사용자) E: GitHub Pages 앱 배포 + CORS 좁히기 + 가족 공유

---

## 🎉 10차 작업 완료 (남는 돈 현금화 시 현금 조정비율 자동 채움) — 2026-06-29

### 10차 체크리스트
- [x] **fillCashFromRemainder: 현금 adjR = 100 − (현금 제외 adjR 합) 자동 세팅**
  — `stockAdjRSum = Σ adjR (CASH 제외)` → `cashStock.adjR = +(100 - stockAdjRSum).toFixed(2)`
  — adjR 합 > 100이면 0으로 세팅 + 경고 메시지 ("주식 조정비율 합이 이미 100을 넘어…")
  — 결과 메시지에 "조정비율 ○○%" 표시 추가
- [x] **주식 adjR·모든 r 미변경 확인** — CASH 외 종목 adjR/r 무수정
- [x] **검증 (가)~(바) 통과**
  — (가) 주식 adjR=8 → 현금 adjR=92
  — (나) adjR 합=100 → 확정 저장 버튼 활성화
  — (다) 주식 adjR 불변, (라) r 불변, (마) 현금 q 불변
  — (바) 주식 adjR>100 → 현금 adjR=0 + 안내

---

## 🎉 9차 작업 완료 (남는 돈 현금화 버튼 위치 교정) — 2026-06-29

### 9차 체크리스트
- [x] **[남는 돈 현금으로 채우기] 버튼+결과블록을 기준설정 탭 → 포트폴리오 탭으로 이동**
  — 기준설정 탭(`tab-settings`)에서 블록 제거
  — 포트폴리오 탭(`tab-portfolio`) pf-actions 아래에 추가
  — 설명 문구: "초기 세팅용" → "현재 보유 입력 후, 남는 돈을 현금으로 채웁니다 — 기존 현금 값을 덮어씁니다"
- [x] **설정비율(r) 미변경 확인** — fillCashFromRemainder()는 cashStock.q만 세팅, r/adjR 불변
- [x] **검증 (가)~(바)**
  — (가) 포트폴리오 탭에 버튼 있고 기준설정 탭에는 없음
  — (나) 버튼 → 현금 q = 원금 − 매입원가합 세팅
  — (다) 설정비율 합계 변화 없음 (정상)
  — (라) 매입원가 > 원금 → 음수 + 빨강 경고
  — (마) 미국 종목 → "현재 환율 기준" 안내
  — (바) 버튼 안 누르면 현금 값 유지

---

## 🎉 7차 작업 완료 (뉴비용: 남는 돈 자동 현금화) — 2026-06-29

### 7차 체크리스트
- [x] **남는 현금 계산 함수 + [남는 돈 현금으로 채우기] 버튼**
  — `fillCashFromRemainder()`: p0 − Σ(avgKRW(s)×s.q, 현금 제외) → cashStock.q 세팅
  — 기준설정 탭 표 아래 버튼 배치, "초기 세팅용 — 기존 현금 값을 덮어씁니다" 라벨 병기
- [x] **결과/미리보기 표시 + 환율 안내 문구 + 음수 빨강 경고**
  — 결과: "원금 ○○ − 매입원가 ○○ = ○○원으로 현금을 설정했습니다."
  — 미국 종목 있으면 "현재 환율 ○○ 기준" 안내 + 오차 주의 문구
  — remaining < 0 이면 빨강 배경 + "보유 매입원가가 원금을 초과합니다" 경고
- [x] **5차 정산과 충돌 없음 확인 (버튼 안 누르면 자동 덮어쓰기 X)**
  — onclick 핸들러에서만 실행, commitTrades/updateConfirmCashDelta 코드 무변경
- [x] **검증 4케이스(가/나/다/라) 통과**

### 7차 검증 결과
| 케이스 | 입력 | 기대 | 결과 |
|--------|------|------|------|
| (가) | 원금 1억, 애플 $150×10주(fxN=1,350), 삼성 70,000×100주 | 매입원가 9,025,000 → 현금 90,975,000 세팅 | PASS |
| (나) | 보유 매입원가 > 원금 | 현금 음수 세팅 + 빨강 경고 (막지 않음) | PASS |
| (다) | 버튼 안 누름 | 기존 현금 값 유지, 자동 덮어쓰기 없음 | PASS |
| (라) | 미국 종목 포함 | "현재 환율 ○○ 기준" + 오차 안내 문구 노출 | PASS |

---

## 🎉 6차 작업 완료 (증감폭 조정 + 요약바 UI 다듬기) — 2026-06-28

### 6차 체크리스트
- [x] **작업1: 기준설정 비중 +/− 0.5 단위** — 커밋 d0623b9
  — onRatioChange 호출 delta ±1 → ±0.5 / 포트폴리오 onAdjRChange는 기존 0.5 유지
- [x] **작업2: 요약바 양끝 항목 중앙 쪽으로** — 커밋 a9ea7cd
  — .pf-summary justify-content: space-between → space-evenly
- [x] **작업3: 요약바 라벨 글자 키우기** — 커밋 1c1917b
  — .pf-summary-item .s-label font-size 10px → 12px, letter-spacing .05em → .03em
- [x] **작업4: 요약바 ↔ 표 헤더 구분 (간격+색상)** — 커밋 fa8ebcb
  — .pf-summary 및 .settings-meta border-bottom 1px → 2px (구분선 강화)
  — thead th background: var(--th-bg) → var(--surface2) (헤더 다른 톤)

---

## 🎉 5차 작업 완료 (현금 정산 교정 + 동기화 버튼 + UI 다듬기) — 2026-06-28

### 5차 체크리스트
- [x] **작업3: 이력 탭 카드 간격 (CSS)** — 커밋 af4910a
  — 카드 헤더 외부 gap 16→32px, 내부 블록 gap 24→56px, 패딩 증가
- [x] **작업4: 포트폴리오 요약 바 균등 분산 (CSS)** — 커밋 5c4ac26
  — .pf-summary에 justify-content: space-between 추가, 왼쪽 쏠림 해소
- [x] **작업2: 기준설정 [동기화] 버튼** — 커밋 eed4a8f
  — 설정비율 합계 배지 옆 [동기화] 버튼: 합계=100 → renderPortfolioTable() + "✓ 동기화 완료" 2초 / 합계≠100 → alert
- [x] **작업1: 현금 정산 로직 교정** — 커밋 2783bc9
  — commitTrades(): CASH 종목을 매매 루프에서 완전 제외 (q/평단/실현손익 직접 변동 없음)
  — updateConfirmCashDelta(): 동일 규칙 — 모달 표시와 실제 변동 항상 일치
  — 4케이스 검증 전부 통과 (기대값 일치 + 모달=실제)

### 5차 검증 결과 (작업1 — 현금 정산 4케이스)
| 케이스 | 기대 현금 변동 | 실제 변동 | 모달 표시 | 판정 |
|--------|---------------|-----------|-----------|------|
| (가) 주식 시뮬 그대로, 현금 불참 | 0 | 0 | 0 | PASS |
| (나) 매도 648k, 매수 600k | +48,000 | +48,000 | +48,000 | PASS |
| (다) 현금↓, 주식 100만 매수 | −1,000,000 | −1,000,000 | −1,000,000 | PASS |
| (다-2) 현금↓, 주식 80만만 매수 | −800,000 | −800,000 | −800,000 | PASS |

---

## 🎉 4차 작업 완료 (분할체결 잔돈 → 현금 정산) — 2026-06-28

### 4차 완료 단계
- [x] **1단계: 확정 로직 — S−B 차액 → 현금 잔액 반영**
  — commitTrades(): 체결 매도합(S)·매수합(B) 집계, cashDelta = S−B를 CASH.q에 추가 (이중계산 금지: 전체 아닌 차액만)
  — buildSnapshot(): cashSettlement { S, B, delta, cashAfter } 필드 추가
  — 요약바: CASH.q 음수 시 빨간색 + "(추가 입금 필요)" 표시
- [x] **2단계: 확정 모달 실시간 현금 변동 표시**
  — 체결수량·단가·체크박스 변경 시 updateConfirmCashDelta() 실시간 호출
  — 하단 "현금 변동: ±○○원 (매도 합 ○○ − 매수 합 ○○)" 표시
  — 음수=빨간색 + "(추가 입금 필요)" / 양수=기본색
- [x] **3단계: 이력 스냅샷·거래 로그 현금 정산 내역 기록**
  — 거래 로그: cashSettlement 있는 스냅샷마다 "현금 정산" 특수 행 추가 (S, B, 차액, 잔액)
  — 스냅샷 상세 펼침: 현금 정산 요약 박스 표시

### 설계 원칙 (스펙 2장 준수)
- **이중계산 금지**: 전체 매도/매수가 아닌 실제 체결 차액(S−B)만 CASH에 반영
- 현금 음수 허용 (자동 차단 없음, 빨간색으로 "추가 입금 필요" 표시)
- 자동 재배분 없음 — 사용자가 다음 리밸런싱에서 조정비율로 처리

### 검증 포인트 (사용자와 확인 필요)
- 시뮬 그대로 정확히 체결 → 현금 변동 0인지
- 매수 수량 시뮬보다 적게 입력 → 현금이 그만큼 늘고, 모달·이력 기록이 맞는지
- 매수를 더 많이 입력 → 현금 음수 + 빨간 경고가 뜨는지
- 되돌리기 시 현금도 직전 값으로 복원되는지

---

## 🎉 3차 작업 완료 (계좌 분리) — 2026-06-27

### 3차 완료 단계
- [x] **1단계: 데이터 구조 + 마이그레이션** — appData/state 포인터 구조, 구형 rebalance_state_v1 → "기본 계좌" 자동 이전, saveState/loadState 교체, resetApp/importBackup 포인터 안전 처리
- [x] **2단계: 계좌 전환 드롭다운** — 헤더에 select 추가, onAccountChange → activateAccount → render() 전체 전환, 선택 저장(appData.activeAccountId)
- [x] **3단계: [계좌설정] 탭** — 계좌 목록(종목수·총평가 요약), 새 계좌 추가(기본양식/현재계좌 복제·이력제외), 이름 변경, 삭제(최소 1개 보호·활성계좌 삭제 시 자동 전환)
- [x] **4단계: 백업/불러오기 계좌 대응** — exportBackup(전체 appData), exportAccountById(단일 계좌, _type 마커), importBackup(3-way 감지: 전체/단일계좌/구형), 계좌설정 탭 행마다 "내보내기" 버튼

---

## 2차 작업 완료 — 2026-06-27

### 2차 완료 단계
- [x] **A. 포트폴리오 탭 스타일 다듬기** — A-1 스피너 제거 / A-2 그룹헤더 크기 업 / A-3 표 전체 폭
- [x] **B. 모니터링 탭 추가** — 순수 SVG 직접 구현 (CDN 없음): 자산 추이 선그래프 + 도넛차트, 다크/라이트 테마 대응
- [x] **C. 거래 로그 표** — 이력 탭 서브탭(스냅샷 목록/거래 로그) 전환, 연속 스냅샷 N-1→N 비교로 변동 종목 추출, 비중1당 변화 포함

---

## 🎉 1차 완성 (전 기능 검증 완료) — 2026-06-27

### 검증된 핵심 기능
- **기준 계산**: P0·fx0·fxN 입력 → 배정금액·비중1당주식수·6/12보유수량 자동산출, 설정비율 합계 100 검증
- **리밸런싱 시뮬**: 조정비율 ±로 필요매매 실시간 계산, 미리보기(Beta) 모달에서 매도풀 배분 확인
- **확정 저장**: 체결수량·단가 입력 → 장부(보유·평단·실현손익) 갱신 + 이력 스냅샷 자동 저장
- **이익 재투자 재분할**: 확정 시 unit 재계산(q/r), 이력에서 비중1당 증감으로 효과 확인
- **이력 관리**: 스냅샷 목록·상세 펼침, 특정 시점 복원, 직전 확정 되돌리기(취소)
- **환율 연동**: 기준설정·포트폴리오 탭 양방향 fxN 동기화, 미입력 시 미국 종목 오계산 방지

---

## 완료된 단계

- [x] ① git 초기화 + 기본 골격(탭 전환·헤더 버튼) + 상태 객체 + localStorage 저장/백업/불러오기/초기화
- [x] ② 기준설정 탭: P0·fx0·fxN 입력, 설정비율 ±/직접, 6/12종가 입력, 배정금액·비중1당주식수·6/12보유수량 자동산출, 비율합계 검증, 종목 추가/삭제
- [x] ③ 포트폴리오 탭: 입력(현재가·평단·수량) 즉시 계산(평가·현재비중·손익) + 조정비율 ±→필요매매 미리보기 + 시장종합 + 요약 바
- [x] ④ 확정 저장: 실제 체결 입력(체결수량·단가) → 장부 갱신(보유·평단·unit·실현손익) + 이력 스냅샷
- [x] ⑤ 이력 탭: 확정 스냅샷 목록·상세 보기·이 시점으로 복원·되돌리기(직전 확정 취소)
- [x] ⑥ 헤더 겹침 수정(sticky z-index 20 + box-shadow), 금액/가격 입력 천단위 콤마, 수량 소수 2자리, 포커스 시 콤마 제거·블러 시 재포맷

## 완료된 추가 개선 (polish)

- [x] ⑦ fxN 미입력 시 미국 종목 오계산 방지: priceKRW/avgKRW `|| 1` → `|| 0`, 현재비중·평가손익 '—' 표시, 미국 합계행 '환율 미입력' 경고
- [x] ⑧ 조정비율 합계 실시간 표시: 요약 바에 추가, 100=초록 / 불일치=빨강
- [x] ⑨ 필요매매 천단위 콤마: fmtDec → fmtNum(need,2)
- [x] ⑩ 설정·조정비율 열 정렬: ratio-cell 센터 정렬
- [x] ⑪ 미리보기 버튼 라벨 → '미리보기 (Beta)'
- [x] ⑫ 포트폴리오 요약 바 환율 입력칸 (기준설정 fxN 양방향 동기화, 커서 유지)
- [x] ⑬ 이력 탭 매수/매도 행 색 강조 + ▲매수/▼매도 배지 + 변화량 소자 표기
- [x] ⑭ 이력 탭 '비중1당' 열 추가 (직전 대비 unit 증감)
- [x] ⑮ 현금 행 현재가·평단가·1%당주식수 → '—' (연산 로직 유지)
- [x] ⑯ 기준가격 모드 토글(기준설정 탭): '과거 종가'|'현재가' 선택, 현재가 모드는 c0+100 스텁, calcUnit 기반 비중1당·보유수량 자동 재산출
- [x] ⑰ 기준설정 탭 날짜 라벨 제거: '6/12 원금'→'원금', '6/12 환율'→'기준 환율', '6/12 종가'→모드별 동적 라벨, '6/12 보유수량'→'기준 보유수량'
- [x] ⑱ 조정비율 ± 버튼 0.5 단위 변경 (직접 입력 step=0.5 유지)
- [x] ⑲ 조정비율 합 ≠ 100이면 [확정 저장] 비활성화 + 경고 메시지 (renderPortfolioSummary 연동)
- [x] ⑳ 확정 저장 모달에 '비율이동(r→adjR)' 열 추가

## 미해결 이슈 (후속 필요 시 추가)

- 확정 저장 시 "행 추가" (시뮬 외 수동 체결)
- 이력 탭 "두 시점 비교"

## 기술 메모

- 저장 키: `rebalance_state_v1` (localStorage)
- 파생값(평가·현재비중·필요매매·시장종합)은 매번 계산, 저장 안 함
- `_updatePortfolioRows()`: summary bar 재빌드 없이 행 파생값만 갱신 (fxN oninput 커서 유지용)
- 최초 확정 시 "초기 상태" 스냅샷 push → 되돌리기 기준점
- 되돌리기: history[0] 제거 후 새 history[0]으로 복원 (history < 2면 불가)
