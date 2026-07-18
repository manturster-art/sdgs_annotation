# 이력 재작성 기록 (2026-07-18)

> **사유**: 실명 포함 백업 파일(`docs/backup_pilot_B_old_20260714.json`)이 공개 repo 추적 위치에 커밋됐던 것(2026-07-14)을 발견, HEAD 제거(구 `1c29570`) 후 **git filter-branch로 전 이력에서 완전 제거** (사용자 직접 실행, 2026-07-18). 데이터 자체는 `data/backup/`(gitignore, 로컬 전용)에 2중 보존.
> **사전 백업**: `data/backup/sdgs_annotation_prerewrite_20260718.bundle` (재작성 전 전체 이력, 로컬 전용 — 복원용).

## 커밋 해시 매핑 (구 → 신)

서명 재인코딩·부모 체인 변경으로 다수 커밋 해시가 바뀜. 메인 repo 문서(decisions.json D61 rationale·HANDOVER·session_history 세션 54 등)에 기록된 **구 해시는 아래 신 해시로 읽을 것**.

| 구 해시 | 신 해시 | 커밋 |
|---|---|---|
| `b0fe40a` | `68d1de1` | Add files via upload (7/8 — M-02 SDG17 가드 최초 배포) |
| `409fe06` | `c31ea57` | Add files via upload (7/8) |
| `fd9e036` | `4410fb2` | GS 회계범위 반영 (D51/D55) |
| `da8f4e5` | `a299f5b` | A·C 슬롯 잠금 + DB 규칙 잠금본 |
| `7c592a5` | **(삭제됨)** | 구 B 백업 커밋 — 대상 파일만 담고 있어 prune-empty로 소멸. Firebase 노드 초기화 기록은 메인 repo 세션 54 문서에 보존 |
| `4d8c036` | `a5bb41e` | stale localStorage 재업로드 버그 수정 |
| `ab44953` | `4691fd0` | D61 병행 체제 (모드별 가드·실명·규칙) |
| `a7d36f4` | `1967d8b` | 결정 ID 재정합 주석 |
| `539c8fe` | `4ae4f7d` | S1-4 익명 인증 클라이언트 |
| `4c52c6c` | `4062ae5` | S1-6 Apps Script v2 |
| `1c29570` | **(삭제됨)** | 파일 이동 커밋 — prune-empty로 소멸 |

- `246838a`(1442 예산 정정) 이전 커밋들은 변동 없음.

## 검증 결과 (2026-07-18)

- 로컬: 대상 파일 전 이력 검색 0건 · refs/original 정리 · reflog expire · gc --prune=now 후 구 커밋 객체 소멸(`cat-file` fatal 확인).
- GitHub: main에서 파일 404 · 파일 경로 커밋 검색 0건 · **단, 구 커밋 2건(7c592a5·1c29570)은 해시 직접 접근 시 아직 응답(dangling)** — 어느 브랜치에서도 도달 불가하나 서버 캐시 잔존. GitHub 자체 gc로 점진 소멸 예정이며, 즉시 완전 삭제는 GitHub Support 요청 필요(선택).

## 주의

- 다른 컴퓨터에 `sdgs_annotation` 클론이 있으면 **재클론**(또는 `git fetch && git reset --hard origin/main`) 필요 — 구 이력 기반 push는 거부됨.
