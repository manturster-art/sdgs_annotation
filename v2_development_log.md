# v2 어노테이션 도구 개발 기록

**작성일**: 2026-04-20
**작업 범위**: 파일럿 IAA 피드백 반영 가드레일 구현 (Phase 1 B) + 파일럿 모드 추가 (Phase 2 A)
**작업자**: 박정진 + Claude Code

---

## 세션 요약

### 진행 동기

이전 세션에서 파일럿 2인(박정진 50건 + 이종훈 29건) Firebase 데이터 분석 결과:

- Cohen's κ (SDG) = **0.315** (Fair — Landis & Koch 기준 하한)
- Cohen's κ (P5) = **0.235** (Slight)
- Cohen's κ (Red Tag) = **0.328**
- 18건 불일치에서 **6개 disagreement 패턴** 식별

이 결과를 바탕으로 v2 UI에 **가드레일 추가** 및 **파일럿 재라벨링 모드** 도입을 결정. Gold Standard 1,200건 본 라벨링 전에 v2 UI 효과를 정량 검증하는 것이 목표.

### v2 구현 완료도 진단

예상 8.5시간 작업이 예상보다 빨리 끝난 이유를 점검한 결과:

| 진행 | 상태 |
|---|---|
| README 스펙 기반 기능 구현 | ✓ 완료 |
| 파일럿 피드백 반영 | ❌ 미실시 (0h) |
| 단위/통합 테스트 | ❌ 미실시 (0h) |
| 디버깅 버퍼 | ❌ 미실시 (0h) |

→ "기능 스켈레톤은 완료, 품질 개선은 미완" 상태로 판정. 파일럿 IAA 피드백 반영(B) + 파일럿 모드 추가(A)를 **B → A 순서**로 진행하기로 결정.

---

## 변경·생성 파일 목록

| 파일 | 유형 | 요약 |
|---|---|---|
| `index_v2.html` | 수정 | 가드레일 UI + 파일럿 모드 분기 추가 (약 300줄 증가) |
| `data/pilot_assignments.json` | **신규** | 50개 파일럿 sample_id × 3인(A/B/C) 동일 할당 |
| `firebase_rules_sample.json` | **신규** | Firebase RTDB 보안 규칙 템플릿 (본+파일럿 경로 분리) |
| `v2_development_log.md` | **신규** | 본 기록 문서 |

---

## Phase 1 (B 단계): 파일럿 IAA 피드백 가드레일 구현

### M-01 수혜자 체크리스트 카드

**위치**: `record-body` 내부, 추진계획 블록 다음 (왼쪽 사업내용 읽기 영역 하단)

**UI 구성**:
- ① "최종 수혜자가 누구인가?" 체크박스
  - 하위 라디오 3지선다: 시민 전체 / 취약계층(저소득·노약자) / 특정 집단(여성·아동·지역 등)
- ② "제공자(공무원·업체·기관)를 수혜자로 착각하지 않았는가?" 체크박스
- 힌트: "예시: '공무원 SDG 교육' → 수혜자는 공무원이 아니라 해당 정책의 시민 최종 수혜자에 초점"

**동작**:
- 3개 모두 체크 시 카드 배경 녹색 전환 (완료 피드백)
- 체크 안 해도 저장 통과 (UX 압박 최소화)
- 어노테이션 JSON에 `beneficiary: {identified, providerAware, type}` 기록

### M-02 SDG 혼동 가드 토스트

**발동 조건**: 파일럿 IAA에서 혼동 빈발로 확인된 6개 SDG 선택 시

| SDG | 경고 내용 요지 |
|---|---|
| SDG11 (지속가능 도시) | 수혜자가 '시민 전체'가 아니면 SDG1/3/4/5/8/10 재검토 |
| SDG10 (불평등 감소) | 특정 취약집단 대상이면 SDG1/3/4/5 재검토 |
| SDG1 (빈곤 퇴치) | 경제 자립·훈련·주거복지면 SDG8/4/11 재검토 |
| SDG5 (성 평등) | 성평등 관점 미명시 여성 수혜면 SDG1/3/4/8 재검토 |
| SDG8 vs SDG9 | 산업·R&D·인프라면 SDG9 재검토 |
| SDG9 vs SDG8 | 일자리·고용 창출 주된 목적이면 SDG8 재검토 |

**UI 동작**:
- 우측 상단 fixed 토스트, 400ms 지연 후 슬라이드 인
- 레코드당 동일 SDG 1회만 표시 (중복 방지)
- 버튼: **[이대로 유지]** / **[다시 선택]** → 응답 기록 (`kept`/`rechosen`)
- "다시 선택" 클릭 시 `clearPrimarySdg()` 호출로 선택 초기화
- 어노테이션 JSON에 `sdgGuardResponses: {SDGxx: "kept"|"rechosen"}` 기록

### M-04 Red Tag 판단 근거 필수화

**로직**: `validateAnnotation()`에 조건 추가
```javascript
if (ann.redTag && ann.redTag !== 'RT-NONE' && !ann.rationale) {
  return 'Red Tag(A/B/C) 선택 시 판단 근거를 반드시 입력하세요 (한 줄).';
}
```

- RT-NONE은 rationale 여전히 선택사항
- Red Tag A/B/C 선택 + rationale 공란 → 저장 차단 + 에러 메시지

### 데이터 스키마 확장

기존 어노테이션 JSON에 2개 필드 추가:

```json
{
  "sample_id": 57,
  "annotator": "A",
  "stage": "pilot",
  "sdgPath": {...},
  "tier": "certain",
  "redTag": "RT-NONE",
  "rationale": "...",

  "beneficiary": {
    "identified": true,
    "providerAware": true,
    "type": "vulnerable"
  },
  "sdgGuardResponses": {
    "SDG11": "rechosen",
    "SDG5": "kept"
  },

  "timestamp": "2026-04-20T...",
  "durationSec": 87
}
```

### CSV 컬럼 4개 추가

기존 19개 → 23개 컬럼:
- `beneIdentified` (TRUE/FALSE)
- `beneProviderAware` (TRUE/FALSE)
- `beneType` (general / vulnerable / specific / 공란)
- `sdgGuardResponses` (JSON 문자열)

### 검증 테스트

로컬 Python HTTP 서버(`python -m http.server 8000`)에서 `http://localhost:8000/index_v2.html` 접속 후 기본 동작 확인 완료. **테스트 통과**.

- 원래 `file://` 프로토콜로 열 때 CORS 오류 → HTTP 서버 경유로 해결

---

## Phase 2 (A 단계): 파일럿 모드 추가

### 설계 결정

**파일럿 재라벨링의 목적**:
1. v2 UI 실전 버그 테스트 (1200건 본 라벨링 전)
2. v1(κ=0.315) vs v2(κ=?) 정량 비교 → Method E 타당성 직접 증거
3. v2 스키마로 파일럿 재수집 → 계획서 근거 업그레이드
4. 3인 체제 워밍업 (Fleiss κ 첫 측정 + Firebase 동시 쓰기 충돌 점검)

**선택된 구현 방식**: Option A — 로그인 화면 Stage select에 "🧪 파일럿 (50건)" 옵션 추가
- 단일 파일(`index_v2.html`) 유지
- Firebase 데이터 경로 완전 분리 (`sdg_pilot_v2_2026`)
- localStorage 키 완전 분리 (`sdg_pilot_v2_*`)

### 구현 분기 매트릭스

| 항목 | Stage 1/2 (본 라벨링) | **파일럿 모드** |
|---|---|---|
| assignments 파일 | `data/assignments.json` | `data/pilot_assignments.json` |
| 데이터 풀 | `data/stage{N}_pool.json` | `data/pilot.json` (50건) |
| slot 키 | `stage{1,2}_samples` | `pilot_samples` |
| AI Top-3 패널 | Stage 2만 표시 | **항상 숨김 (Blind)** |
| Firebase 경로 | `sdg_main_2026/stage{N}/{A\|B\|C}/{id}` | `sdg_pilot_v2_2026/pilot/{A\|B\|C}/{id}` |
| localStorage | `sdg_anno_v2_A_s1` | `sdg_pilot_v2_A_pilot` |
| Stage badge | 🟠 Stage 1 / 🟢 Stage 2 | 🟣 **파일럿 · 50건** |
| CSV 파일명 | `annotations_A_s1_YYYY-MM-DD.csv` | `annotations_A_pilot_YYYY-MM-DD.csv` |

### pilot_assignments.json 구조

```json
{
  "mode": "pilot",
  "source_records": "data/pilot.json",
  "annotators": {
    "A": { "name": "어노테이터 A (박정진)", "pilot_samples": [50개 ID] },
    "B": { "name": "어노테이터 B (이종훈)", "pilot_samples": [동일 50개] },
    "C": { "name": "어노테이터 C",          "pilot_samples": [동일 50개] }
  }
}
```

**할당 규칙**: 3인 전원 동일 50건 (Blind 일관성, 앵커 편향 통제).

**50개 sample_id**:
```
57, 71, 159, 334, 366, 389, 424, 449, 486, 496,
529, 549, 582, 589, 617, 635, 732, 894, 913, 924,
992, 994, 1049, 1052, 1072, 1089, 1090, 1096, 1098, 1104,
1108, 1109, 1117, 1118, 1119, 1123, 1124, 1136, 1143, 1152,
1157, 1162, 1164, 1165, 1176, 1180, 1184, 1187, 1196, 1198
```

### stageNum 타입 변경 (숫자 → 문자열)

파일럿 모드 도입으로 `stageNum`이 `1 | 2 | 'pilot'` 값을 가져야 해서 **전체 문자열화**.

**수정한 4곳 + CSV 파일명**:
- `renderRecord()`: AI 패널 표시 조건 `!isPilot && stageNum === '2'`
- `collectAnnotation()`: aiTopK 기록 조건 동일
- `saveAnnotation()`: Firebase 저장 경로 `fbStageKey` 분기
- `buildMiniGrid()`: Stage 2 crosscheck 표시 조건 `!isPilot && stageNum === '2' && assignmentMap`
- CSV 내보내기 파일명: `modeTag` 변수 도입

### loadBootstrap 2파일 병렬 로드

본 라벨링과 파일럿 assignments를 **둘 다** 로드 시도 → 로드된 것만 사용 가능한 모드로 오픈.

```
✅ 할당 파일 로드  본 라벨링 3명 · 파일럿 3명
```

한쪽만 로드되도 다른 쪽 모드는 `checkCanStart()`에서 비활성화.

### Firebase 보안 규칙 샘플 (firebase_rules_sample.json)

**3개 경로 분리**:
- `sdg_main_2026/*` — 본 라벨링 (스키마 검증 포함)
- `sdg_pilot_v2_2026/*` — 파일럿 재라벨링
- `_legacy_v1` — v1 파일럿 읽기 전용 아카이브

**경고**: 실전 투입 전 Firebase Anonymous Auth 활성화 + UID→어노테이터 매핑 + `$uid` 검증으로 교체 필수.

---

## 기술적 이슈 및 해결

### 1. file:// CORS 오류

**증상**: `Failed to fetch ... data/assignments.json`
**원인**: 브라우저가 `file:///` 프로토콜에서 fetch() 차단 (보안 정책)
**해결**: `python -m http.server 8000` → `http://localhost:8000/index_v2.html`
**대안**: VS Code Live Server 확장 / Node `npx serve` / GitHub Pages 배포 URL

### 2. Bash 툴 EEXIST 오류 (환경 이슈)

**증상**: `EEXIST: file already exists, mkdir '.../session-env/...'`
**영향**: Bash 명령 실행 불가
**우회**: Grep/Read/Edit/Write 툴만으로 전체 작업 수행 완료

---

## 다음 할 일

### 즉시 (이번 주)

- [ ] **박정진 본인 파일럿 5건 로컬 테스트**
  - 가드레일 3종(M-01/M-02/M-04) 실전 동작 확인
  - 파일럿 모드 진입·저장·복원 플로우 검증
  - Firebase 경로 분리 확인 (Console에서 `sdg_pilot_v2_2026/` 생성 여부)

- [ ] **이종훈 재라벨링 의뢰 안내문 작성**
  - v1 결과 잊고 백지에서 라벨링 요청
  - 파일럿 모드 접속 방법 (로컬 or GitHub Pages)
  - 예상 소요 시간: 2시간

- [ ] **어노테이터 C 섭외**
  - 지도교수 or 대학원생 1명
  - Firebase Anonymous Auth UID 사전 발급

### 완료 후 (다음 주)

- [ ] **3인 재라벨링 완료 후 IAA 재측정**
  - Cohen's κ (3쌍 × SDG/P5/RedTag)
  - Fleiss κ (3인 × 50건, 첫 측정)
  - v1 κ=0.315 vs v2 κ=? 직접 비교
  - 가드레일 효과 측정: `sdgGuardResponses` 중 `rechosen` 비율

- [ ] **v3.0 계획서 근거 업데이트**
  - 제3장 3-2 파일럿 결과 섹션에 v2 재측정 κ 반영
  - Method E 타당성 정량 증거 기술

### 보류 (v3.0 계획서 확정 후)

- [ ] **M-03 Blind labeling 전환 (E-06)** 최종 확정
  - 현재 Stage 2는 AI Top-3 노출 (플랜 v2 상태)
  - Blind 전환 결정 시 → `data/ai_prelabels.json` 생성 불필요
  - 토글 옵션 추가 여부 결정

- [ ] **나머지 개선 항목 (Phase 3)**
  - M-05: Stage 1 → Stage 2 게이트 (완료율 100% 검증)
  - M-06: '모르겠음' 사유 기록 (`holdReason` 필드)
  - M-07: 연구자 대시보드 (`dashboard.html` — 3인 진행률 + 실시간 κ 추정)
  - 모바일/태블릿 반응형 점검
  - Firebase 동시 쓰기 충돌 시나리오 테스트

- [ ] **배포 준비**
  - 커밋/푸시 → GitHub Pages 배포 URL 최신화
  - Firebase Authorized Domains에 `manturster-art.github.io` 추가
  - Firebase Console에서 보안 규칙 적용 (`firebase_rules_sample.json` 기반)
  - `index.html` 리네임 결정 (v1 archive + v2 승격 or redirect)

---

## 참고 자료

- 파일럿 IAA 분석 보고서: `D:/박정진/대학원(박사)/[박사-2]SDGs 논문/프로그램/pilot_analysis/pilot_iaa_report_2person.md`
- 종합계획서 v2.0: `D:/박정진/대학원(박사)/[박사-2]SDGs 논문/종합계획서/research_master_plan_v2.docx`
- 종합 검토 보고서 (Critical 14건 + Warning 22건): `D:/박정진/클로드 코드/논문/_workspace/04_integrated_review_report.md`
- v2 README: `D:/박정진/대학원(박사)/[박사-2]SDGs 논문/프로그램/annotation_tool/README.md`

---

## 부록 — 파일럿 50건 재선정 (2026-04-24, 안 A)

### 배경

2026-04-24 세션 7 말미에 연구 범위를 **옵션 C (경기도 31 + 전국 대표 광역 5~7개)** 로 확정. Gold Standard 1,200건을 경기 840 + 전국 360 (70/30)으로 재층화하는 결정에 맞춰, 파일럿 50건도 경기 840의 층 비율(대도시 30% / 도시 50% / 농촌 20%)에 정합시킬 필요가 생김.

면담 안건 H(전국 광역 최종 선정)가 아직 미승인 상태이므로 **파일럿 단계는 경기도 단독 유지**(§10.7.5) 원칙을 준수, 안 A(층 비율만 조정)를 채택.

### 변경 사양

| 항목 | v1 (2026-03-27) | v2 (2026-04-24) |
|---|:-:|:-:|
| 총 건수 | 50 | 50 |
| 대도시형 | 10 | **15** |
| 도시형 | 26 | **25** |
| 농촌형 | 14 | **10** |
| 희소 25건 (SDG9/12/14/17) | 7/6/6/6 | 7/6/6/6 (유지) |
| 희소 × 층 배분 | 무작위 | **사전 고정 행렬** (8/12/5) |
| 일반 × 층 배분 | 무작위 | **(7/13/5)** |
| 시드 | 42 | 42 |

### 사용 스크립트

- `D:/박정진/대학원(박사)/[박사-2]SDGs 논문/프로그램/pilot_resampler_v2.js` (Node.js)
- 입력: 기존 `pilot.json` + `stage1_pool.json` + `stage2_pool.json` → 중복 제거로 GS 1,200 재구성
- parquet 재처리 불필요 — 속도·재현성 유리

### 산출물

| 파일 | 내용 |
|---|---|
| `data/pilot.json` | v2 재선정본 50건 |
| `data/pilot_assignments.json` | 3인 Blind 공통 50 sample_id (v2) |
| `data/backup/pilot_v1_20260424.json` | v1 원본 백업 |
| `data/backup/pilot_assignments_v1_20260424.json` | v1 할당표 백업 |
| `data/pilot_v2_report.md` | 재선정 리포트 (층·희소·연도 분포) |

### 연도 분포 (참고)

2016:6 / 2017:2 / 2018:8 / 2019:3 / 2020:4 / 2021:6 / 2022:5 / 2023:7 / 2024:3 / 2025:6 → 10년 전부 커버

### 영향 사항

- v2 UI(`index_v2.html`)는 `data/pilot.json`을 동적 로드하므로 **코드 변경 없이 자동 반영**
- v1 어노테이션 결과(`annotations_박정진.json`, `annotations_이종훈.json`)는 과거 50건 기준 → 새 50건으로 재라벨링 시 IAA는 처음부터 재측정
- sample_id 교집합은 7건 (1098, 1104, 1108, 1118, 1152, 1164, 1196) — 신규 43건 추가, 구 43건 제외. Blind 원칙상 교집합 7건도 **백지 재라벨링 권장**

### 후속 조치

- [x] Firebase `sdg_pilot_v2_2026/` 경로 기존 데이터 아카이브 (v1 기준 50건 응답 보존) — v2 배포 이전 단계로 이동
- [ ] 어노테이터 A·B·C에게 "파일럿 50건 재선정 완료, 백지 재라벨링 요청" 안내문 발송
- [ ] v2 UI 접속 후 새 pilot.json 로드 여부 브라우저 캐시 초기화 포함 점검

---

## 부록 — v2 → 배포 승격 (2026-04-24)

### 배경

v2 개발본이 로컬 테스트(파일럿 모드 + Stage 1/2 분기)에서 기본 동작 검증을 마치고, 파일럿 50건 재선정(옵션 C 정합)까지 완료됨. 이제 배포 운영에 투입해도 충분한 성숙도 → `index.html`로 승격.

v1(17개 병렬 버튼)은 재참조 가능성이 있어 삭제하지 않고 `archive/`로 이전.

### 변경 내역 (파일시스템)

| 이전 경로 | 이후 경로 | 비고 |
|---|---|---|
| `index.html` (v1, 46,370 B) | `archive/index_v1.html` | 배포 후에도 참고용 보존 |
| `index-1.html` (v1 이전 백업, 45,878 B) | `archive/index_v1_legacy.html` | 구 백업 격리 |
| `index_v2.html` (73,564 B) | **`index.html`** | 배포 기본 파일로 승격 |

### GitHub Pages 영향

- 배포 URL 구조 변경 없음 — 루트 `index.html`이 곧 v2
- 기존 URL(`https://manturster-art.github.io/sdgs_annotation/`)에 접속하면 자동으로 v2 로드
- 어노테이터는 **별도 경로 변경 불필요**, 단 브라우저 캐시 비우기 1회 권장

### 어노테이터 공지 시 포함할 사항

1. URL은 그대로 (브라우저 캐시는 Ctrl+Shift+R로 초기화)
2. Stage 선택 드롭다운에서 `pilot` 선택
3. 파일럿 50건이 새로 재선정됨 — 기존 기억 무시하고 백지에서 라벨링
4. 3인 전원 동일 50건 Blind — 5P → SDG → Red Tag 순
5. 완료 기한: (면담 후 확정)

### 로컬 검증 (배포 전)

- [x] 디렉토리 이동 후 `archive/` 포함 구조 확인
- [ ] `python -m http.server 8000` → `http://localhost:8000/index.html` 접속
- [ ] pilot_assignments.json 로드 → 어노테이터 선택 → pilot.json 50건 정상 표시
- [ ] Firebase 연결 상태 (apiKey/databaseURL 입력 후)
- [ ] 로컬 저장 + Firebase 동기화 동작

### 롤백 방법

긴급 롤백이 필요하면 다음 순서로 복원 가능:
```bash
cd annotation_tool/
mv index.html index_v2.html
mv archive/index_v1.html index.html
git commit -am "rollback: v1 restored"
```
