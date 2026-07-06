# 백업 스냅샷 + 복구 절차서 v1 (S1-6)

> **상태**: 초안 — 콘솔/Apps Script 적용 필요분 포함. 로컬에서 "완료" 증명 불가 항목은 [콘솔 필요] / [Apps Script 배포 필요]로 표기.
> **작성 근거**: `_workspace/annotator_inspection/02_storage_sync.md` F5(미러≠백업, 스냅샷 이력 0)·F7(localStorage 삭제 안내가 유실 트리거)·F11(백업·복구가 검증된 절차 아님).
> **원칙**: 기존 `apps_script_firebase_sync.js`·`firebase_pilot_archive_procedure.md` 원본은 파괴적 수정 없이 보존. 본 문서가 정정·보강분을 신규로 담는다.

---

## 0. 현행 진단 요약 (왜 이 절차가 필요한가)

| 항목 | 현행 | 문제 |
|---|---|---|
| Drive 동기 | `sdg_{label}_latest.json` 매분 **덮어쓰기** 미러 | 스냅샷 이력 0. Firebase 부분 삭제/오염이 1분 내 Drive로 전파(F5) |
| 백업 실물 | `data/backup/` = 2026-04-24 파일럿 v1 1회분, git 미추적 | v2·Stage 1/2 백업 0건. 정기성 없음(F11) |
| 복구 리허설 | 기록 없음 | restore 가 실제로 되는지 미검증(F11) |
| 삭제 안내 | archive 절차 Q2가 localStorage 수동 삭제를 안내 | Firebase 미동기 상태에서 수행 시 유실 확정(F7) |

핵심: **미러(latest 덮어쓰기)는 "지금 상태"만 보존하고, "어제 상태"로 되돌릴 수단이 없다.** 스냅샷(시점 고정본)과 복구 리허설이 빠져 있다.

---

## 1. 스냅샷 백업 절차

세 층위를 병행 권장. (A) 자동 일별 스냅샷, (B) 이벤트별 수동 export, (C) Drive 자체 버전 히스토리(보조).

### 1-A. 자동 일별 스냅샷 — Apps Script 확장안 [Apps Script 배포 필요]

현행 `syncFirebaseToDrive()`는 `sdg_{label}_latest.json` 하나만 덮어쓴다. 여기에 **날짜 스탬프 사본 1개**와 **급감 가드**를 더한다. 아래는 제안 diff이며, 실제 반영·배포는 script.google.com 콘솔에서 사용자가 수행한다(로컬 파일 수정은 배포와 무관하므로 본 문서는 코드 원본을 건드리지 않고 제안만 제시).

**제안 1 — 날짜별 스냅샷 사본 추가** (`upsertFile_` 호출부 근처, 현행 111~115행 블록 교체):

```js
// 현행 (apps_script_firebase_sync.js:110-115)
const pretty = JSON.stringify(JSON.parse(body), null, 2);
const fileName = `sdg_${label}_latest.json`;
upsertFile_(dataFolder, fileName, pretty, 'application/json');
syncCount++;
Logger.log(`[${label}] 동기화 완료 (${pretty.length} bytes)`);

// 제안 후 (급감 가드 + 일별 스냅샷 추가)
const parsed = JSON.parse(body);
const pretty = JSON.stringify(parsed, null, 2);
const fileName = `sdg_${label}_latest.json`;

// ── 급감 가드: 직전 latest 대비 최상위 키(=코더) 수가 급감하면 덮어쓰기 보류 ──
const prevCount = countKeys_(dataFolder, fileName);          // 헬퍼 아래 추가
const currCount = Object.keys(flattenSamples_(parsed)).length; // 샘플 총수
if (prevCount !== null && currCount < prevCount * 0.5) {
  Logger.log(`[${label}] ⚠ 급감 감지 (${prevCount}→${currCount}) — latest 덮어쓰기 보류, 스냅샷만 남김`);
  // latest 는 유지(과거 정상본 보존), 이상 스냅샷은 별도 이름으로 남겨 사후 분석
  upsertFile_(dataFolder, `sdg_${label}_ALERT_${dateStamp_()}.json`, pretty, 'application/json');
} else {
  upsertFile_(dataFolder, fileName, pretty, 'application/json');
}

// ── 일별 스냅샷: 하루 1개(같은 날 재실행 시 덮어쓰기 → 하루치 1파일) ──
upsertFile_(dataFolder, `snapshots/sdg_${label}_${dateStamp_()}.json`, pretty, 'application/json');

syncCount++;
Logger.log(`[${label}] 동기화 완료 (${pretty.length} bytes, 스냅샷 ${dateStamp_()})`);
```

**제안 2 — 헬퍼 3개 추가** (파일 하단 유틸리티 섹션에 붙여넣기):

```js
/** YYYYMMDD (Asia/Seoul) */
function dateStamp_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
}

/** 기존 latest 파일의 샘플 총수 반환. 없으면 null */
function countKeys_(folder, name) {
  const it = folder.getFilesByName(name);
  if (!it.hasNext()) return null;
  try {
    const obj = JSON.parse(it.next().getBlob().getDataAsString());
    return Object.keys(flattenSamples_(obj)).length;
  } catch (e) { return null; }
}

/** {stage:{annotator:{sample_id:{...}}}} 또는 {annotator:{sample_id}} 를 sample_id 평면 집합으로 */
function flattenSamples_(obj) {
  const out = {};
  const walk = (node, depth) => {
    if (!node || typeof node !== 'object') return;
    if (depth >= 2) { Object.keys(node).forEach(k => out[k] = 1); return; }
    Object.values(node).forEach(v => walk(v, depth + 1));
  };
  walk(obj, 0);
  return out;
}
```

> **주의**: `snapshots/` 하위 폴더 자동 생성이 필요하면 `getOrCreateDataFolder_` 방식을 재사용해 `getOrCreateSubFolder_(dataFolder, 'snapshots')`를 하나 더 만들고, `upsertFile_`의 folder 인자에 넘긴다. 위 제안은 폴더 경로 문자열이 아니라 Drive 폴더 객체를 넘겨야 동작하므로, 실제 반영 시 `snapshots/` 부분을 하위폴더 객체로 치환할 것. **급감 가드의 0.5 임계값은 코더 수·진행 단계에 따라 조정**(3인 중 1인 이탈 시 정상적으로도 감소할 수 있음 — Stage 1 진입 후 실데이터로 보정 권장).

**보존 주기**: `snapshots/`는 파일당 수십~수백 KB이므로 30~60일치를 유지해도 수 MB 수준. 별도 정리 트리거는 후순위(용량 압박 없음).

### 1-B. 이벤트별 수동 export [콘솔 필요]

자동 스냅샷과 별개로, 아래 **이벤트마다 콘솔에서 JSON 1회 export**하여 `data/backup/`에 시점 파일로 남긴다.

- Stage 1 착수 직전 / 완료 직후
- Stage 2 착수 직전 / 완료 직후
- 규칙·auth 배포 직전(롤백 대비)
- 아카이브(삭제) 작업 직전 — **archive_procedure Step 4 삭제 전 필수**

절차: Firebase Console → Realtime Database → 대상 노드(`sdg_main_2026` 또는 `sdg_pilot_v2_2026`) → ⋮ → **JSON 내보내기** → `data/backup/firebase_export_{label}_{YYYYMMDD}.json`.

> **명명 정합 주의(F11 정정)**: 기존 백업 `firebase_export_pilot_v1_20260424.json`은 루트 키가 실명("박정진")인 구식 구조다. **신규 v2 export의 루트 키는 슬롯(A/B/C)이어야 정상**이다. export 직후 루트 키가 A/B/C인지 눈으로 확인하고, 실명이면 v1 잔재이므로 파일명에 `_v1`을 붙여 구분한다.

### 1-C. Drive 버전 히스토리 (보조 수단, 절차화)

`sdg_{label}_latest.json`은 매분 덮어써도 Google Drive가 파일 버전을 자동 보관한다(통상 30일·최대 100개). **단 이는 1-A 스냅샷이 배포되기 전까지의 임시 안전망**이며, 복구 방법을 아래 §2-C에 절차화한다.

---

## 2. 복구 절차서

복원 소스는 3가지: (A) `data/backup/` 수동 export, (B) Apps Script 일별 스냅샷(`snapshots/`), (C) Drive `latest.json`의 버전 히스토리. 우선순위는 시점 정확도 순으로 A ≈ B > C.

### 2-A. JSON export 로부터 Firebase 복원 [콘솔 필요]

1. 복원 대상 시점의 백업 파일 확정(예: `firebase_export_stage1_20260710.json`).
2. **복원 전 현재 상태를 먼저 export**(덮어쓰기 사고 방지) → `..._prerestore_{YYYYMMDD_HHMM}.json`.
3. Firebase Console → Realtime Database → **복원할 정확한 노드 선택**
   - 전체 복원: 루트가 아니라 `sdg_main_2026`(또는 `sdg_pilot_v2_2026`) 노드에서 ⋮ → **JSON 가져오기**.
   - 부분 복원(특정 슬롯만): `sdg_main_2026/stage1/A` 노드에서 가져오기 → 백업 JSON 중 해당 하위 트리만 잘라 업로드.
   - ⚠️ **가져오기는 해당 노드 하위를 통째 치환**한다. 루트에서 가져오면 다른 프로젝트 트리(`_legacy_*`)까지 날아갈 수 있으므로 **반드시 프로젝트 노드 단위로** 수행.
4. 업로드 후 샘플 3건 교차 확인(값·timestamp 대조).
5. 복원 로그 기록: 시점·소스파일·대상노드·확인자 → `data/backup/RESTORE_LOG.md`에 1줄 추가.

### 2-B. Apps Script 일별 스냅샷으로부터 복원 [콘솔 필요]

`snapshots/sdg_{label}_{YYYYMMDD}.json`을 내려받아 §2-A의 백업 파일과 동일하게 취급(3~5단계 동일). 스냅샷은 Firebase 구조 그대로이므로 가져오기 대상 노드가 명확하다.

### 2-C. Drive latest.json 버전 히스토리로부터 복원 [콘솔 필요]

1. Drive → "Firebase 어노테이션 데이터" 폴더 → `sdg_{label}_latest.json` 우클릭 → **버전 기록 관리**.
2. 원하는 시점 버전 → ⋮ → **다운로드**.
3. 내려받은 JSON을 §2-A 절차로 Firebase에 가져오기.
   - **주의**: 이 파일은 Apps Script가 pretty-print한 미러다. 루트 구조가 `{annotator:{sample_id}}`(stage 접두 없음, 경로가 `sdg_main_2026/stage1`째로 쪼개져 있었으므로)일 수 있으니, 가져오기 대상 노드를 `.../stage1` 단위로 맞춰야 한다.

### 2-D. localStorage 로부터 개별 코더 복원 (F2/F7 대응)

코더 기기가 Firebase 미동기(로컬 전용 강등, F2) 상태였다면 그 기기 브라우저에만 라벨이 있다. **localStorage 삭제 전 반드시** 아래로 회수:

1. 코더 브라우저 → 도구에서 **CSV 내보내기** 실행(index.html 하단 버튼) → 파일 회수.
2. 또는 F12 → Application → Local Storage → 해당 도메인 → `sdg_anno_v2_*` / `sdg_pilot_v2_*` 값 복사 → 연구자에게 전달.
3. 회수 확인 **후에만** 삭제 안내(§3의 정정 반영).

---

## 3. `firebase_pilot_archive_procedure.md` Q2 정정 (F7)

기존 archive 절차 Q2(131~135행)는 코더에게 **localStorage 수동 삭제**를 곧바로 안내한다. 이는 Firebase 미동기 상태에서 수행하면 미동기 라벨이 영구 유실된다(02 보고서 F7). **원본은 보존하되, 아래 정정을 본 문서로 공표하고 향후 안내문에 반영한다.**

> **[정정] archive 절차 Q2 — localStorage 삭제 전 필수 선행 2단계**
> 1. **삭제 전 CSV 내보내기 필수** — 코더가 도구에서 CSV를 먼저 내보내 연구자에게 제출.
> 2. **연구자가 Firebase 콘솔에서 해당 코더 건수 확인** — 콘솔에 그 코더의 라벨이 예상 건수만큼 있는지 대조한 뒤에만 삭제 지시.
> 3. 위 1·2 확인 전에는 "F12 → Local Storage → 키 삭제"를 안내하지 않는다.

---

## 4. 복구 리허설 (1회 필수, Stage 1 착수 전) [콘솔 필요]

"백업이 있다"가 아니라 "**복구가 실제로 된다**"를 1회 증명한다. **운영 데이터가 아닌 테스트 경로**에서 수행한다.

### 리허설 스크립트 (수동 단계)

| # | 단계 | 방법 | 성공 판정 |
|---|---|---|---|
| 1 | 테스트 데이터 주입 | 콘솔에서 `sdg_pilot_v2_2026/pilot/A` 아래 테스트 샘플 3건 수기 입력(또는 도구로 데모 아닌 pilot 슬롯 A에 3건 저장) | 콘솔에 3건 보임 |
| 2 | 스냅샷/백업 생성 | `sdg_pilot_v2_2026` 노드 JSON 내보내기 → `data/backup/REHEARSAL_{YYYYMMDD}.json` | 파일에 3건 포함 |
| 3 | 유실 시뮬레이션 | 콘솔에서 `sdg_pilot_v2_2026/pilot/A` 노드 **삭제** | 콘솔에 A 비어 있음 |
| 4 | 복원 | §2-A로 REHEARSAL 파일을 `sdg_pilot_v2_2026` 노드에 JSON 가져오기 | 콘솔에 3건 재출현 |
| 5 | 도구 검증 | 도구에서 pilot 슬롯 A로 로그인 → 3건이 "이미 라벨됨"으로 복원 표시 | 진행률·값 일치 |
| 6 | 정리 | 리허설 테스트 3건 삭제(운영 오염 방지) + `RESTORE_LOG.md`에 리허설 성공 기록 | 로그 1줄 추가 |

> **하드닝 규칙과의 상호작용 주의**: `firebase_rules_hardened_draft.json`의 삭제 차단(`newData.exists()`)이 이미 배포됐다면, 3단계의 "콘솔 삭제"는 **콘솔 소유자 권한이라 규칙을 우회**하므로 정상 수행된다. 반대로 클라이언트(도구)로는 삭제가 거부되는 것이 정상 — 이것이 F5 오염 전파를 막는 방어선이다.

### 리허설 기록 템플릿 (`data/backup/RESTORE_LOG.md` 신규 — 리허설 시 생성)

```
# 복구 로그
| 일시 | 유형(리허설/실복구) | 소스 파일 | 대상 노드 | 결과 | 확인자 |
|---|---|---|---|---|---|
| 2026-07-?? | 리허설 | REHEARSAL_2026????.json | sdg_pilot_v2_2026 | 3/3 복원 성공 | 박정진 |
```

---

## 5. 사용자 콘솔/배포 조치 체크리스트 (S1-6)

- [ ] [Apps Script] §1-A 제안 diff를 script.google.com 프로젝트에 반영 → `setupTrigger()` 재실행 → Drive `snapshots/` 폴더에 당일 파일 생성 확인
- [ ] [Apps Script] `_last_sync.txt` 타임스탬프 1분 이내 갱신 확인(F6 가동 실증 겸)
- [ ] [콘솔] §1-B 이벤트 export 1회 실행 → `data/backup/`에 v2 백업 최초 1건 생성(루트 키 A/B/C 확인)
- [ ] [콘솔] §4 복구 리허설 6단계 수행 → `RESTORE_LOG.md` 기록
- [ ] [문서] §3 Q2 정정을 코더 안내문(`annotator_notice_v2_kickoff.md`)에 반영
- [ ] [검토] `data/backup/`를 git 추적 예외로 둘지 결정(개인정보·실명 포함 여부 검토 후)

---

## 참고
- 저장 아키텍처 실측: `_workspace/annotator_inspection/02_storage_sync.md` (F5·F7·F11)
- 미러 동기화 원본: `apps_script_firebase_sync.js` (수정 대상 아님 — 제안만)
- 아카이브 삭제 절차: `firebase_pilot_archive_procedure.md` (Q2는 §3에서 정정)
- 보안 규칙 강화: `firebase_rules_hardened_draft.json` (S1-4, 본 절차의 삭제 차단 전제)
