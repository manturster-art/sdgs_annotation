# Firebase Auth 도입 가이드 (옵션 ③ — Blind IAA DB-level 보증)

**작성일**: 2026-04-24
**상태**: 준비 완료, 실행 보류 (사용자 승인 후 진행)
**목적**: 어노테이터 간 교차 쓰기를 **Firebase 규칙 레벨**에서 차단하여 Blind IAA κ 산출의 기술적 신뢰성을 확보한다.
**현재 단계**: 옵션 ① (슬롯 일치 규칙)이 적용되어 외부 비인증 쓰기는 차단되었으나, A/B/C 슬롯 교차 쓰기는 규약·문서로만 제한되는 상태. 옵션 ③은 이 잔여 위험을 DB 레벨에서 제거한다.

---

## 0. 적용 여부 결정 기준

다음 중 하나라도 해당하면 **③ 적용 권장**:
- 논문 §3 방법론에 "DB 레벨 Blind 보증"을 명시할 필요가 있음
- 어노테이터가 친분 있는 대학원생·동료로 구성되어 있어 규약 외 상호 확인 가능성이 있음
- 2편(한국정책학회보) 심사 시 IAA 신뢰성에 대한 기술적 방어 논리가 필요함
- C 어노테이터가 외부 인사로 섭외되어 규약 통제가 제한적임

---

## 1. 사전 준비 (연구자 측)

### 1.1 Firebase 콘솔 접근 권한 확인
- 프로젝트 소유자(Owner) 권한 필요 (Authentication 활성화 및 사용자 추가)

### 1.2 비밀번호 생성
- 각 슬롯별 12자 이상, 대소문자·숫자·특수문자 포함
- 생성 방법 권장: 1Password/Bitwarden 등 암호 관리자로 생성 후 복사
- **절대 금지**: 이메일·카톡·SMS로 평문 일괄 전송. 암호 관리자 공유 링크 또는 대면 전달 권장

### 1.3 기존 v1 데이터 확인
- `/_legacy_v1_pilot_20260424` 보존 상태 확인 (firebase-inspect 스크립트)
- 본 작업은 v1 아카이브에 영향 없음

---

## 2. Firebase Auth 활성화 및 계정 생성 (콘솔)

### 2.1 Authentication 활성화

1. Firebase 콘솔 → **Build** → **Authentication** 이동
2. **시작하기(Get started)** 클릭 (최초 1회)
3. **Sign-in method** 탭 → **이메일/비밀번호(Email/Password)** 제공업체 선택
4. **사용 설정(Enable)** 토글 ON → **저장**
5. "이메일 링크(비밀번호 없는 로그인)"는 **비활성** 유지 (비밀번호 방식만 사용)

### 2.2 계정 3개 생성

**Users** 탭 → **사용자 추가(Add user)** 3회:

| 슬롯 | 이메일 | 비밀번호 | 배정 대상 |
|------|--------|----------|-----------|
| A    | `a@sdg.local` | (생성 후 암호 관리자 저장) | 박정진 |
| B    | `b@sdg.local` | (생성 후 암호 관리자 저장) | 이종훈 |
| C    | `c@sdg.local` | (생성 후 암호 관리자 저장) | 섭외 예정자 |

**주의사항**:
- `@sdg.local`은 실제 도메인이 아닌 Firebase Auth 내부 식별자 — 이메일 발송 기능이 활성화되지 않음
- 계정 생성 직후 **UID**를 별도 기록 (콘솔 Users 탭에서 확인 가능) → 향후 감사 로그 추적용
- 비밀번호 재설정 필요 시 콘솔에서 "비밀번호 재설정 이메일 보내기"는 작동 안 함(도메인 미존재) — **직접 비밀번호 변경** 기능 사용

### 2.3 감사 로그 준비 (선택, 권장)

Firebase Authentication은 기본적으로 로그인 이벤트를 30일간 기록합니다. 논문 §3 방법론에 인용할 경우:
- Firebase 콘솔 → **Authentication** → **Users** → 각 사용자별 "마지막 로그인 시간" 주기적으로 CSV 내보내기
- 저장 경로: `프로그램/annotation_tool/data/audit/auth_activity_YYYYMMDD.csv`

---

## 3. `index.html` 수정 (3곳)

### 3.1 Firebase Auth CDN 추가

**위치**: `<head>` 내 기존 Firebase CDN 라인 다음

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>
<!-- 아래 한 줄 추가 ↓ -->
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
```

### 3.2 로그인 카드에 비밀번호 필드 추가

**위치**: `index.html` 라인 515 부근 (슬롯 select 다음, 모드 선택 label 이전)

```html
<label for="login-password">
  비밀번호
  <span style="color:var(--muted); font-size:11px; font-weight:500;">
    (연구자로부터 전달받음)
  </span>
</label>
<input
  type="password"
  id="login-password"
  autocomplete="current-password"
  placeholder="비밀번호 입력"
/>
```

CSS는 기존 `input` 스타일 재사용 — 추가 필요 없음.

### 3.3 `startSession()` 함수 앞단에 로그인 로직 삽입

**위치**: `index.html` 내 `startSession` 함수 정의부 (라인 1063 부근)

**기존**:
```js
async function startSession() {
  const ann = document.getElementById('annotator-name').value;
  const stageVal = document.getElementById('stage-select').value;
  const fullName = document.getElementById('annotator-full-name').value.trim();
  // ... (생략)
  annotatorName = document.getElementById('annotator-name').value;
  annotatorFullName = document.getElementById('annotator-full-name').value.trim();
  // ... 세션 시작 로직
}
```

**수정 후** (로그인 블록 삽입):
```js
async function startSession() {
  const ann = document.getElementById('annotator-name').value;
  const stageVal = document.getElementById('stage-select').value;
  const fullName = document.getElementById('annotator-full-name').value.trim();

  // ───────── Firebase Auth 로그인 (③ 추가) ─────────
  if (firebase.apps.length === 0) {
    alert('Firebase 설정이 누락되었습니다. 연구자에게 문의하세요.');
    return;
  }
  if (!ann || !['A','B','C'].includes(ann)) {
    alert('슬롯을 먼저 선택하세요 (A/B/C).');
    return;
  }
  const password = document.getElementById('login-password').value;
  if (!password) {
    alert('비밀번호를 입력하세요. 연구자로부터 전달받은 비밀번호입니다.');
    return;
  }
  const email = ann.toLowerCase() + '@sdg.local';
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    console.log('[Auth] 로그인 성공:', email);
  } catch (e) {
    const msg = e.code === 'auth/wrong-password' ? '비밀번호가 일치하지 않습니다.'
              : e.code === 'auth/user-not-found' ? '해당 슬롯 계정이 등록되지 않았습니다.'
              : '로그인 실패: ' + (e.message || e.code);
    alert(msg);
    return;
  }
  // ───────── 기존 세션 시작 로직 계속 ─────────

  annotatorName = document.getElementById('annotator-name').value;
  annotatorFullName = document.getElementById('annotator-full-name').value.trim();
  // ... (이하 기존 로직)
}
```

### 3.4 로그아웃 버튼 추가 (선택, 권장)

**위치**: 헤더 우측 `sync-badge` 근처 (라인 549 부근)

```html
<button id="logout-btn" class="btn btn-secondary" style="font-size:12px; padding:4px 10px;"
        onclick="doLogout()">로그아웃</button>
```

**함수 추가**:
```js
async function doLogout() {
  if (!confirm('로그아웃하시겠습니까? 저장되지 않은 임시 라벨은 유지됩니다.')) return;
  try {
    await firebase.auth().signOut();
    location.reload();
  } catch (e) {
    alert('로그아웃 실패: ' + e.message);
  }
}
```

---

## 4. 보안 규칙 최종형 (③ 완료 후 교체)

**중요**: `index.html` 신 버전 배포 완료 확인 후에만 교체. 규칙 먼저 교체하면 구 버전 사용자 쓰기 전면 실패.

```json
{
  "rules": {
    "sdg_pilot_v2_2026": {
      "pilot": {
        "$annotator": {
          ".read":  "auth != null && auth.token.email == $annotator.toLowerCase() + '@sdg.local'",
          ".write": "auth != null && auth.token.email == $annotator.toLowerCase() + '@sdg.local'"
        }
      }
    },
    "sdg_main_2026": {
      "$stage": {
        ".validate": "$stage.matches(/^stage[12]$/)",
        "$annotator": {
          ".read":  "auth != null && auth.token.email == $annotator.toLowerCase() + '@sdg.local'",
          ".write": "auth != null && auth.token.email == $annotator.toLowerCase() + '@sdg.local'"
        }
      }
    }
  }
}
```

**검증 로직**:
- `auth != null` — 미로그인 거부
- `auth.token.email` — Firebase Auth가 JWT에 자동 삽입한 이메일
- `$annotator.toLowerCase() + '@sdg.local'` — 경로의 슬롯명(A/B/C)을 소문자화하여 기대 이메일 구성
- 일치하면 read/write 허용, 아니면 거부

---

## 5. 시뮬레이터 검증 (규칙 교체 후 필수)

Firebase 콘솔 → Database → 규칙 → 플레이그라운드:

| # | Type | Location | Auth | Email | 기대 |
|---|------|----------|------|-------|------|
| 1 | Write | `/sdg_pilot_v2_2026/pilot/A/57` | OFF | — | ❌ denied |
| 2 | Write | `/sdg_pilot_v2_2026/pilot/A/57` | ON | `a@sdg.local` | ✅ allowed |
| 3 | Write | `/sdg_pilot_v2_2026/pilot/A/57` | ON | `b@sdg.local` | ❌ denied (교차 쓰기 차단) |
| 4 | Write | `/sdg_pilot_v2_2026/pilot/B/57` | ON | `b@sdg.local` | ✅ allowed |
| 5 | Write | `/sdg_main_2026/stage1/A/100` | ON | `a@sdg.local` | ✅ allowed |
| 6 | Write | `/sdg_main_2026/stage3/A/100` | ON | `a@sdg.local` | ❌ denied (stage3 미허용) |
| 7 | Read | `/_legacy_v1_pilot_20260424/A/57` | ON | `a@sdg.local` | ❌ denied (규칙 미정의) |

**3번이 가장 중요** — 이게 denied로 나오면 Blind 보증 완성.

---

## 6. 배포 순서 (무중단)

```
Step 1: [콘솔] Auth 활성화 + 계정 3개 생성 (§2)
         └─ 검증: Users 탭에 3개 계정 보이면 OK

Step 2: [로컬] index.html 수정 (§3) + 로컬 테스트
         └─ 로컬 실행 → 슬롯 A 선택 → 비밀번호 입력 → 로그인 성공 확인
         └─ 테스트 데이터 1건 저장 → Firebase 콘솔에서 `/sdg_pilot_v2_2026/pilot/A/` 하위 생성 확인

Step 3: [git] 커밋 → 푸시 → 자동 배포 확인
         └─ 배포 URL 접속 → 하드 리프레시 → 비밀번호 필드 보이면 OK

Step 4: [콘솔] 보안 규칙을 §4 최종형으로 교체 → 게시
         └─ 시뮬레이터로 §5의 7개 시나리오 검증

Step 5: [안내문] §7 변경사항을 annotator_notice_v2_kickoff.md §3.2에 반영 → 커밋
         └─ 어노테이터에게 비밀번호 개별 전달

Step 6: [어노테이터] 배포 URL 접속 → 슬롯 선택 + 비밀번호 입력 → 로그인 후 라벨링 시작
```

**Step 2와 Step 4 사이에 1시간 이상 간격이 있어야 안전** — 배포 전파 + 캐시 무효화 여유.

---

## 7. 안내문 §3.2 교체 (발송 전 반영)

**파일**: `프로그램/annotation_tool/docs/annotator_notice_v2_kickoff.md`

**기존 §3.2 (라인 51~59)**:
```markdown
### 3.2 로그인 정보

| 어노테이터 | 로그인명 | 비고 |
|---|---|---|
| A | 박정진 | 본인 |
| B | 이종훈 | (변경 없음) |
| C | (추후 안내) | 섭외 진행 중 |

Firebase 인증 이메일·비밀번호는 기존 v1과 동일하게 유지됩니다. 별도 재가입 불필요.
```

**교체안**:
```markdown
### 3.2 로그인 정보

| 어노테이터 | 슬롯 | 이메일 (자동 구성) | 비밀번호 |
|---|---|---|---|
| 박정진 | A | a@sdg.local | 개별 전달 |
| 이종훈 | B | b@sdg.local | 개별 전달 |
| C (섭외) | C | c@sdg.local | 계약 후 전달 |

- 이메일은 **입력할 필요 없습니다** — 슬롯 선택 시 자동 구성됩니다
- 비밀번호는 박정진이 카톡 1:1 메시지로 개별 전달합니다 (메모장 저장 권장)
- **분실 시 즉시 연락** — 재발급 해드립니다 (자가 리셋 불가)
- 본 인증은 Blind IAA κ 산출의 기술적 보증을 위한 것입니다. B가 A 슬롯 경로로 쓰려고 해도 Firebase 규칙이 거부하므로, 어노테이터 간 라벨 교환이 구조적으로 불가능합니다.
```

---

## 8. 롤백 계획 (문제 발생 시)

**증상별 대응**:

| 증상 | 원인 | 대응 |
|------|------|------|
| 모든 어노테이터 로그인 실패 | 콘솔 Auth 계정 누락 or 규칙 오류 | 규칙을 ①(슬롯 일치)로 즉시 복구 + Auth 계정 재확인 |
| 특정 슬롯만 실패 | 비밀번호 오타 또는 계정 미생성 | 콘솔에서 해당 슬롯 비밀번호 재설정 |
| 저장은 되는데 콘솔에 안 보임 | 경로 구조 변경 누락 | `index.html` 경로 로직 재검토 (`fbStageKey` 변수) |
| 배포 후 이전 라벨 사라짐 | localStorage 키 변경 | localStorage 그대로 유지됨 — 재시작 시 복원됨 (문제 아님) |

**긴급 롤백** (5분 내):
1. Firebase 콘솔 → 규칙 → 옵션 ① 블록으로 교체 → 게시
2. 어노테이터에게 "잠시 비밀번호 무시하고 작업 계속" 공지
3. 원인 분석 후 재시도

---

## 9. 체크리스트 (실행 시점에 수행)

### 9.1 연구자 측
- [ ] Firebase 콘솔에서 Authentication 활성화
- [ ] 슬롯 A/B/C 계정 3개 생성 + UID 기록
- [ ] 12자+ 비밀번호 3개 생성 (암호 관리자 사용)
- [ ] `index.html` 수정 (§3의 3곳) + 로컬 테스트 1회
- [ ] git 커밋 + 푸시 + 배포 확인
- [ ] 배포 URL에서 슬롯 A로 로그인 테스트 성공
- [ ] 보안 규칙 §4로 교체 + 시뮬레이터 7개 시나리오 검증
- [ ] 안내문 §3.2 교체 + 커밋
- [ ] 어노테이터에게 비밀번호 개별 전달 (카톡 1:1)

### 9.2 어노테이터 측 (발송 시 안내)
- [ ] 카톡으로 받은 비밀번호 메모장 저장
- [ ] 배포 URL 접속 + 하드 리프레시
- [ ] 슬롯 선택 + 비밀번호 입력 + 로그인 성공 확인
- [ ] 테스트 저장 1건 후 "0/50 진행" 초기 화면 확인

---

## 10. 실행 트리거 (향후 이 가이드를 다시 열 때)

다음 시점에 본 가이드를 재검토하여 실행:

1. **파일럿 v2 결과 분석 후** — Fleiss κ가 0.41 미만이거나 어노테이터 간 교차 쓰기 의심 시
2. **Stage 1 본 라벨링 착수 전** — 2026-07 경, 300건 Blind 라벨링의 기술적 신뢰성 확보 목적
3. **C 어노테이터 섭외 확정 후** — 외부 인사일 경우 DB 레벨 분리 강력 권장
4. **2편 방법론 심사 우려 발생 시** — IAA 방어 논리 강화 필요 시점

**실행 소요 시간 추정**: 연구자 약 3~4시간 (계정 생성 10분 + 코드 수정·테스트 2시간 + 배포·검증 1시간 + 안내문 업데이트·발송 30분)

---

## 11. 참고 자료

- Firebase Auth 공식 문서: https://firebase.google.com/docs/auth/web/password-auth
- Realtime Database 규칙: https://firebase.google.com/docs/database/security
- 현재 규칙(옵션 ①, 적용됨): `annotation_tool/docs/annotator_notice_v2_kickoff.md` 부록
- 본 가이드 작성 배경: 세션 7 (2026-04-24) 파일럿 v2 킥오프 준비 중 Firebase Auth 부재 발견

---

**문서 이력**
- 2026-04-24: 초안 작성 (세션 7, 옵션 ① 적용 직후)
