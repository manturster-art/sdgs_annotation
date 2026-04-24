# Firebase `sdg_pilot_v2_2026/` 아카이브 절차

> **목적**: 파일럿 50건 옵션 C 재선정(2026-04-24)으로 기존 v1 샘플(57, 71, 159, ...)이 새 샘플(19, 76, 87, ...)로 대체됨에 따라, Firebase에 쌓인 구 응답을 무손실 보존하고 경로를 초기화한다.
>
> **왜 필요한가**: v2 UI는 동일 경로(`sdg_pilot_v2_2026/pilot/{annotator}/{sample_id}`)를 사용한다. 교집합 7개 sample_id(1098, 1104, 1108, 1118, 1152, 1164, 1196)에 구 응답이 남아 있으면 어노테이터가 Blind 원칙을 위반할 수 있다. 또한 구 응답 43건은 새 표본과 무관하므로 분석 시 혼입되면 안 된다.

---

## 방법 ① — Firebase Console 수동 (권장, 5~10분)

### Step 1. 현재 상태 확인

1. Firebase Console 접속 → 대상 프로젝트 선택 → **Realtime Database** 메뉴
2. 좌측 트리에서 `sdg_pilot_v2_2026` 노드 확장
3. 하위 구조 확인:
   ```
   sdg_pilot_v2_2026/
     pilot/
       A/   (어노테이터 A = 박정진, 기존 응답 n건)
       B/   (어노테이터 B = 이종훈, 기존 응답 n건)
       C/   (섭외 전이면 없을 수도)
   ```

### Step 2. JSON Export (아카이브)

1. `sdg_pilot_v2_2026` 노드 우측 **⋮ (더보기)** → **JSON 내보내기** 클릭
2. 파일명 지정: `firebase_export_pilot_v1_20260424.json`
3. 로컬 저장 위치: `프로그램/annotation_tool/data/backup/firebase_export_pilot_v1_20260424.json`
4. 파일 크기·내용 확인 (어노테이터별 응답 수 대조)

### Step 3. 아카이브 경로로 이관 (원본 보존)

Firebase Realtime DB는 "이동" 명령이 없으므로 **수동 복사+삭제**로 처리한다.

**옵션 A (가장 안전, 권장)**: `_legacy_v1_pilot_20260424/` 경로 신설 후 데이터 복사
1. Step 2에서 내보낸 JSON을 준비
2. 루트의 **⋮ → JSON 가져오기** 클릭
3. 대상 경로: `/_legacy_v1_pilot_20260424` 선택 (또는 root에서 업로드 후 노드명 조정)
4. 업로드 완료 확인
5. 원본 `sdg_pilot_v2_2026` 하위 데이터가 정상 복사됐는지 샘플 3건 교차 확인

**옵션 B (간소화)**: JSON export만 로컬에 보관하고 Firebase에는 보존하지 않음
- Git 저장소에 JSON을 커밋(단, 실명·Firebase UID 포함 여부 검토)

### Step 4. 구 경로 삭제

1. `sdg_pilot_v2_2026/pilot/A` 노드 선택 → **×** 버튼 → 확인
2. 동일하게 `sdg_pilot_v2_2026/pilot/B`, `sdg_pilot_v2_2026/pilot/C` 삭제
3. **`sdg_pilot_v2_2026/pilot/` 상위 노드는 유지** (보안 규칙이 `$stage === 'pilot'` 강제)
4. 최종 상태:
   ```
   sdg_pilot_v2_2026/
     pilot/       (빈 노드)
   _legacy_v1_pilot_20260424/   (← 옵션 A 선택 시)
     pilot/
       A/ B/ C/ ...
   ```

### Step 5. 보안 규칙 업데이트 (옵션 A 사용 시)

`firebase_rules_sample.json` 하단의 `_legacy_v1` 블록에 다음 추가:

```json
"_legacy_v1_pilot_20260424": {
  "_comment": "2026-04-24 파일럿 재선정 시 아카이브된 구 응답",
  ".read":  "auth != null",
  ".write": false
}
```

Console → **규칙** 탭 → 해당 블록 반영 → **게시**

### Step 6. 검증

1. v2 UI (배포 URL) 접속 → A/B/C 중 하나로 로그인 → Stage=`pilot` 선택 → 시작
2. 화면에 새 sample_id(19, 76, 87 등) 표시되는지 확인
3. "이미 라벨링된 건수" 0/50으로 초기 상태여야 정상
4. 교집합 sample_id(1098, 1104, 1108, 1118, 1152, 1164, 1196) 진입 시에도 빈 폼 표시 확인

---

## 방법 ② — 스크립트 자동화 (Firebase Admin SDK, 선택)

**전제**: 서비스 계정 JSON 키(`service-account.json`) 보유. 없으면 방법 ①을 사용.

### 서비스 계정 발급

1. Firebase Console → 프로젝트 설정 → 서비스 계정 탭
2. **새 비공개 키 생성** → 다운로드 → `service-account.json`으로 저장
3. **주의**: `.gitignore`에 추가, 절대 커밋 금지

### 실행

```bash
cd 프로그램/
npm install firebase-admin
node firebase_archive_v1_pilot.js \
  --service-account ../service-account.json \
  --database-url https://<your-project>.firebaseio.com \
  --source sdg_pilot_v2_2026 \
  --destination _legacy_v1_pilot_20260424 \
  --dry-run
```

`--dry-run`으로 복사 계획 확인 후 옵션 제거하고 실제 실행.

스크립트 동작
1. source 경로 전체 JSON 다운로드
2. 로컬 백업(`data/backup/firebase_export_pilot_v1_YYYYMMDD.json`)
3. destination 경로에 업로드
4. source 경로 하위 노드(pilot/*) 삭제

---

## 체크리스트

- [ ] Step 1. 현재 상태 확인 (어노테이터별 건수 파악)
- [ ] Step 2. JSON 내보내기 완료 (`data/backup/firebase_export_pilot_v1_20260424.json`)
- [ ] Step 3. 옵션 A/B 중 택일하여 아카이브 처리
- [ ] Step 4. `sdg_pilot_v2_2026/pilot/{A,B,C}` 삭제
- [ ] Step 5. 보안 규칙에 archive 경로 추가 (옵션 A 시)
- [ ] Step 6. v2 UI에서 빈 상태 검증
- [ ] Step 7. 어노테이터 안내문 발송 (다음 단계)

## 이슈 대응

### Q1. JSON 내보내기 파일이 너무 큰데?

정상. 어노테이터 수 × 샘플 수 × 응답 필드가 전체 크기. 박정진 50건 + 이종훈 29건 기준 약 20~50KB 예상.

### Q2. 삭제 후 어노테이터가 "진행 중"이라고 나오는데?

브라우저 `localStorage`에 남아 있는 것. 어노테이터에게 다음을 안내:
- Ctrl+Shift+R (브라우저 캐시 포함 새로고침)
- F12 → Application → Local Storage → 해당 도메인 → `sdg_pilot_v2_*` 키 수동 삭제

### Q3. v1 응답 데이터(`annotations_박정진.json`, `annotations_이종훈.json`)는 어떻게 되나?

- 저장소 경로에 남겨두어 IAA 비교 분석용으로 유지
- v1 파일럿 κ=0.315 vs v2 κ=? 비교에 사용 (v2_development_log.md 참고)

### Q4. 옵션 A와 B 중 어느 쪽을 택해야 하나?

- **옵션 A**: Firebase에 원본 보존 → 향후 언제든 쿼리 가능, 클라우드 비용 소폭 증가
- **옵션 B**: 로컬 JSON만 보관 → 저장소 클린, 단 Firebase에서는 히스토리 조회 불가

논문에서 v1 vs v2 비교 분석을 상세히 다룰 예정이면 **옵션 A** 권장.

---

## 참고

- Firebase 보안 규칙: `firebase_rules_sample.json`
- v2 개발·배포 이력: `v2_development_log.md`
- 파일럿 재선정 리포트: `data/pilot_v2_report.md`
