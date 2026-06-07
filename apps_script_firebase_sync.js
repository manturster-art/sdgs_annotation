/**
 * Firebase RTDB → Google Drive JSON 자동 동기화 (서비스 계정 방식)
 *
 * 설정 방법:
 * 1. Firebase Console → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성" 클릭
 *    → JSON 파일 다운로드됨
 * 2. 다운로드된 JSON에서 "client_email"과 "private_key" 값을 아래에 붙여넣기
 * 3. https://script.google.com → 새 프로젝트 → 이 코드 붙여넣기
 * 4. setupTrigger() 함수 실행 → 1분 간격 자동 동기화 시작
 * 5. 중지하려면 removeTrigger() 실행
 *
 * ⚠️ private_key는 -----BEGIN PRIVATE KEY-----로 시작하는 전체 문자열입니다.
 *    줄바꿈(\n)이 포함된 상태 그대로 붙여넣으세요.
 */

// ============================================================
// 설정
// ============================================================
const FIREBASE_URL = 'https://sdgs-annotation-52f47-default-rtdb.firebaseio.com';

// Firebase Console → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"에서 다운로드한 JSON의 값
const SERVICE_ACCOUNT_EMAIL = 'YOUR_SERVICE_ACCOUNT_EMAIL';  // 예: firebase-adminsdk-xxxxx@sdgs-annotation-52f47.iam.gserviceaccount.com
const PRIVATE_KEY = 'YOUR_PRIVATE_KEY';  // -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

const DRIVE_PARENT_FOLDER_ID = '1osm3_9jR4Ecw1EsJLcBb228eVx6_77pl';
const DATA_FOLDER_NAME       = 'Firebase 어노테이션 데이터';

// 동기화 대상 경로
const SYNC_PATHS = {
  'pilot':  'sdg_pilot_v2_2026',
  'stage1': 'sdg_main_2026/stage1',
  'stage2': 'sdg_main_2026/stage2',
};

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

        // Pretty-print JSON
        const pretty = JSON.stringify(JSON.parse(body), null, 2);
        const fileName = `sdg_${label}_latest.json`;

        upsertFile_(dataFolder, fileName, pretty, 'application/json');
        syncCount++;
        Logger.log(`[${label}] 동기화 완료 (${pretty.length} bytes)`);

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

/** 파일 덮어쓰기 (없으면 생성) */
function upsertFile_(folder, name, content, mimeType) {
  const iter = folder.getFilesByName(name);
  if (iter.hasNext()) {
    iter.next().setContent(content);
  } else {
    folder.createFile(name, content, mimeType);
  }
}
