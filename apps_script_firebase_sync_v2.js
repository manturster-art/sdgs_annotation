/**
 * Firebase RTDB → Google Drive JSON 자동 동기화 v2 (서비스 계정 방식)
 *
 * ── v2 변경점 (S1-6, 2026-07-17) ─────────────────────────────
 * 1. 일별 스냅샷: snapshots/sdg_{label}_{YYYYMMDD}.json — 하루 1파일(같은 날 재실행 시 덮어쓰기)
 *    → latest 미러와 달리 "어제 상태"로 되돌릴 시점 고정본이 생긴다.
 * 2. 급감 가드: 직전 latest 대비 라벨 수가 50% 이상 급감하면 latest 덮어쓰기를 보류하고
 *    ALERT 파일로만 남긴다(과거 정상본 보존 — 삭제·오염이 1분 만에 미러로 전파되는 것 방지).
 *    라벨 수 10건 미만일 때는 가드 미작동(초기 노이즈 방지).
 * 3. 카운트 로직: 레코드(sample_id 보유 객체) 단위 재귀 카운트 — pilot/stage 구조 모두 정확.
 *
 * ── 적용 방법 ─────────────────────────────────────────────────
 * 1. script.google.com → 기존 동기화 프로젝트 열기
 * 2. 기존 코드의 SERVICE_ACCOUNT_EMAIL / PRIVATE_KEY 두 값을 먼저 복사해 둔다 ⚠️
 * 3. 코드 전체를 이 파일 내용으로 교체 → 아래 두 상수에 복사해 둔 값 복원
 * 4. 저장 → 함수 선택 setupTrigger → 실행 (권한 승인 팝업 시 허용)
 * 5. 확인: Drive "Firebase 어노테이션 데이터" 폴더에 snapshots/ 하위폴더 + 당일 파일,
 *    _last_sync.txt 타임스탬프 1분 이내 갱신
 *
 * ⚠️ private_key는 -----BEGIN PRIVATE KEY-----로 시작하는 전체 문자열입니다.
 *    줄바꿈(\n)이 포함된 상태 그대로 붙여넣으세요.
 */

// ============================================================
// 설정
// ============================================================
const FIREBASE_URL = 'https://sdgs-annotation-52f47-default-rtdb.firebaseio.com';

// Firebase Console → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"에서 다운로드한 JSON의 값
const SERVICE_ACCOUNT_EMAIL = 'YOUR_SERVICE_ACCOUNT_EMAIL';  // ⚠️ 기존 프로젝트 값 유지
const PRIVATE_KEY = 'YOUR_PRIVATE_KEY';                      // ⚠️ 기존 프로젝트 값 유지

const DRIVE_PARENT_FOLDER_ID = '1osm3_9jR4Ecw1EsJLcBb228eVx6_77pl';
const DATA_FOLDER_NAME       = 'Firebase 어노테이션 데이터';
const SNAPSHOT_FOLDER_NAME   = 'snapshots';

// 동기화 대상 경로
const SYNC_PATHS = {
  'pilot':  'sdg_pilot_v2_2026',
  'stage1': 'sdg_main_2026/stage1',
  'stage2': 'sdg_main_2026/stage2',
};

// 급감 가드: 직전 대비 이 비율 미만으로 줄면 latest 보류 (0.5 = 50%)
const SHRINK_GUARD_RATIO = 0.5;
// 급감 가드 최소 발동 기준 (직전 라벨 수가 이 값 미만이면 가드 미작동)
const SHRINK_GUARD_MIN_PREV = 10;

// ============================================================
// OAuth2 토큰 생성 (서비스 계정 JWT → Access Token)
// ============================================================
function getAccessToken_() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const base64url = (obj) =>
    Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');

  const signInput = base64url(header) + '.' + base64url(claimSet);

  // 서명
  const key = PRIVATE_KEY.replace(/\\n/g, '\n');
  const signature = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(signInput, key)
  ).replace(/=+$/, '');

  const jwt = signInput + '.' + signature;

  // 토큰 교환
  const resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    },
    muteHttpExceptions: true,
  });

  if (resp.getResponseCode() !== 200) {
    throw new Error('토큰 발급 실패: ' + resp.getContentText());
  }

  return JSON.parse(resp.getContentText()).access_token;
}

// ============================================================
// 메인 동기화 함수 (트리거가 1분마다 호출)
// ============================================================
function syncFirebaseToDrive() {
  let accessToken;
  try {
    accessToken = getAccessToken_();
  } catch (e) {
    Logger.log('인증 실패: ' + e.message);
    Logger.log('→ SERVICE_ACCOUNT_EMAIL과 PRIVATE_KEY를 확인하세요.');
    return;
  }

  const dataFolder = getOrCreateDataFolder_();
  const snapFolder = getOrCreateSubFolder_(dataFolder, SNAPSHOT_FOLDER_NAME);
  let syncCount = 0;

  for (const [label, path] of Object.entries(SYNC_PATHS)) {
    try {
      const url = `${FIREBASE_URL}/${path}.json?access_token=${accessToken}`;
      const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const code = resp.getResponseCode();

      if (code === 200) {
        const body = resp.getContentText();
        if (!body || body === 'null') {
          Logger.log(`[${label}] 데이터 없음 (아직 라벨링 전)`);
          continue;
        }

        const parsed = JSON.parse(body);
        const pretty = JSON.stringify(parsed, null, 2);
        const fileName = `sdg_${label}_latest.json`;

        // ── 급감 가드 (v2): 직전 latest 대비 라벨 수 급감 시 latest 보류 ──
        const prevCount = prevLabelCount_(dataFolder, fileName);
        const currCount = countLabels_(parsed);
        if (prevCount !== null && prevCount >= SHRINK_GUARD_MIN_PREV &&
            currCount < prevCount * SHRINK_GUARD_RATIO) {
          Logger.log(`[${label}] ⚠ 급감 감지 (${prevCount}→${currCount}) — latest 보류, ALERT 스냅샷만 기록`);
          upsertFile_(snapFolder, `sdg_${label}_ALERT_${dateStamp_()}.json`, pretty, 'application/json');
        } else {
          upsertFile_(dataFolder, fileName, pretty, 'application/json');
        }

        // ── 일별 스냅샷 (v2): 하루 1파일 ──
        upsertFile_(snapFolder, `sdg_${label}_${dateStamp_()}.json`, pretty, 'application/json');

        syncCount++;
        Logger.log(`[${label}] 동기화 완료 (${pretty.length} bytes, 라벨 ${currCount}건, 스냅샷 ${dateStamp_()})`);

      } else if (code === 401 || code === 403) {
        Logger.log(`[${label}] 인증/권한 오류 (HTTP ${code}) — 서비스 계정 권한을 확인하세요`);
      } else {
        Logger.log(`[${label}] HTTP ${code}: ${resp.getContentText().substring(0, 200)}`);
      }
    } catch (e) {
      Logger.log(`[${label}] 오류: ${e.message}`);
    }
  }

  // 타임스탬프 기록
  if (syncCount > 0) {
    const ts = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    upsertFile_(dataFolder, '_last_sync.txt',
      `마지막 동기화: ${ts}\n동기화된 경로: ${syncCount}개`, 'text/plain');
  }

  Logger.log(`동기화 완료: ${syncCount}개 경로`);
}

// ============================================================
// 트리거 관리
// ============================================================

/** 1분 간격 트리거 설정 (최초 1회 실행) */
function setupTrigger() {
  removeTrigger();
  ScriptApp.newTrigger('syncFirebaseToDrive')
    .timeBased()
    .everyMinutes(1)
    .create();
  syncFirebaseToDrive();
  Logger.log('1분 간격 자동 동기화가 시작되었습니다.');
}

/** 트리거 제거 (동기화 중지) */
function removeTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  if (triggers.length > 0) {
    Logger.log(`트리거 ${triggers.length}개 제거 완료`);
  }
}

// ============================================================
// 유틸리티
// ============================================================

/** 데이터 폴더 가져오기 (없으면 생성) */
function getOrCreateDataFolder_() {
  const parent = DriveApp.getFolderById(DRIVE_PARENT_FOLDER_ID);
  const iter = parent.getFoldersByName(DATA_FOLDER_NAME);
  if (iter.hasNext()) return iter.next();
  return parent.createFolder(DATA_FOLDER_NAME);
}

/** 하위 폴더 가져오기 (없으면 생성) — v2 신규 */
function getOrCreateSubFolder_(parent, name) {
  const iter = parent.getFoldersByName(name);
  if (iter.hasNext()) return iter.next();
  return parent.createFolder(name);
}

/** 파일 덮어쓰기 (없으면 생성) */
function upsertFile_(folder, name, content, mimeType) {
  const iter = folder.getFilesByName(name);
  if (iter.hasNext()) {
    iter.next().setContent(content);
  } else {
    folder.createFile(name, content, mimeType);
  }
}

/** YYYYMMDD (Asia/Seoul) — v2 신규 */
function dateStamp_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
}

/** 라벨 레코드(sample_id 보유 객체) 수 재귀 카운트 — pilot/stage 구조 모두 대응. v2 신규 */
function countLabels_(node) {
  if (!node || typeof node !== 'object') return 0;
  if (node.sample_id !== undefined) return 1;
  let n = 0;
  Object.keys(node).forEach(k => { n += countLabels_(node[k]); });
  return n;
}

/** 기존 latest 파일의 라벨 수 반환. 파일 없거나 파싱 실패 시 null — v2 신규 */
function prevLabelCount_(folder, name) {
  const iter = folder.getFilesByName(name);
  if (!iter.hasNext()) return null;
  try {
    return countLabels_(JSON.parse(iter.next().getBlob().getDataAsString()));
  } catch (e) {
    return null;
  }
}
