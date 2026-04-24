# SDGs 예산 어노테이션 도구

경기도 지자체 세부사업설명서 SDG 라벨링 웹 애플리케이션. **v2 (5P + AI Top-3 + 3-tier)**가 배포 기본.

> 📌 2026-04-24: v2를 `index.html`로 승격, v1은 `archive/`로 이전. 파일럿 50건 옵션 C 층화 재선정 반영(대15/도25/농10).

## 파일 구조

```
annotation_tool/
├── index.html                          ← ★ v2 배포본 (파일럿 + Stage 1 + Stage 2)
├── archive/
│   ├── index_v1.html                   ← v1 (17개 병렬 버튼, 보존용)
│   └── index_v1_legacy.html            ← v1 이전 백업
├── generate_assignments.py             ← 1,200건 → 3명 층화 분할
├── convert_to_json.py                  ← xlsx → JSON 변환
├── data/
│   ├── pilot.json                      ← 파일럿 50건 (v2 재선정, 2026-04-24)
│   ├── pilot_assignments.json          ← 파일럿 3인 Blind 공통 50 sample_id
│   ├── stage1_pool.json                ← Stage 1 Blind 300건 레코드
│   ├── stage2_pool.json                ← Stage 2 검수 900건 레코드
│   ├── assignments.json                ← Stage 1/2 어노테이터별 할당
│   ├── ai_prelabels.json               ← GPT-4o 사전 분류 Top-3 (Stage 2용, 선택)
│   ├── pilot_v2_report.md              ← 파일럿 재선정 리포트
│   └── backup/                         ← 원본 v1 데이터 백업
│       ├── pilot_v1_20260424.json
│       └── pilot_assignments_v1_20260424.json
├── firebase_rules_sample.json          ← Firebase 보안 규칙 샘플
├── README.md                           ← 이 파일
└── v2_development_log.md               ← v2 개발·배포 이력
```

## 배포 (GitHub Pages)

```bash
git add -A
git commit -m "deploy: v2 → production"
git push
```

배포 URL: `https://[계정].github.io/[저장소명]/` (루트 `index.html` = v2)

- GitHub Pages → Settings → Pages → Source: `main` 브랜치 `/` (root)
- Firebase Authorized Domains에 배포 도메인 추가 필수

## 데이터 준비 (연구자)

### 파일럿 50건
이미 생성 완료 — `data/pilot.json`. 재선정이 필요하면:
```bash
node ../pilot_resampler_v2.js
```

### Stage 1/2 본 라벨링 (1,200건)
```bash
python generate_assignments.py
# 결과: data/assignments.json, stage1_pool.json, stage2_pool.json
```

분할 규칙
- Stage 1 Blind: 300건 × 3명 **전원 동일** (앵커 편향 측정)
- Stage 2 검수: 3명이 270건씩 분담 + 교차 30건씩 × 3 (총 900건)

### AI Pre-labeling (Stage 2 시작 전, 선택)
```bash
python ../ai_prelabeling/prelabel_gpt4o.py
# 결과: data/ai_prelabels.json
```

`ai_prelabels.json` 스키마:
```json
{
  "57": [
    { "sdg": "SDG13", "prob": 0.78 },
    { "sdg": "SDG11", "prob": 0.15 },
    { "sdg": "SDG7",  "prob": 0.04 }
  ]
}
```

## 어노테이터 사용법

1. 배포 URL 접속
2. 어노테이터 코드(A/B/C) + Stage(`pilot` / `1` / `2`) 선택
3. 한 건씩 라벨링
   - **pilot / Stage 1 (Blind)**: 5P → SDG 2단계 직접 선택 (AI Top-3 미노출)
   - **Stage 2 (검수)**: AI Top-3 중 선택 or "기타" → 5P 직접
   - **확신도**: 확실함 / 애매함(추가 SDG 1~3개) / 모르겠음(skip)
   - **Red Tag**: RT-NONE / A(SDG 상충, Nexus) / B(SDG Washing) / C(역행 투자, Anti-SDG)
   - **판단 근거**: 한 줄 메모
4. `Ctrl+S` 저장 / `Ctrl+Enter` 저장 후 다음
5. 완료 후 "CSV 내보내기" → 연구자에게 제출

## Firebase 저장 경로 (모드별 분리)

| 모드 | 경로 | 용도 |
|---|---|---|
| 파일럿 | `sdg_pilot_v2_2026/pilot/{annotatorCode}/{sample_id}` | 파일럿 50건 IAA 측정 |
| Stage 1 | `sdg_main_2026/stage1/{annotatorCode}/{sample_id}` | Blind 300건 |
| Stage 2 | `sdg_main_2026/stage2/{annotatorCode}/{sample_id}` | AI 검수 900건 |

## 저장 스키마 (공통)

```json
{
  "sample_id": 57,
  "annotator": "A",
  "stage": 1,
  "sdgPath": {
    "p5": "Planet",
    "sdg": "SDG13",
    "additionalSdgs": ["SDG11"]
  },
  "aiTopK": null,
  "chosenFromAI": true,
  "aiRank": 1,
  "tier": "certain",
  "redTag": "RT-NONE",
  "rationale": "...",
  "timestamp": "2026-06-15T14:23:45.000Z",
  "durationSec": 87
}
```

- `aiTopK`: Stage 2만 값 존재, pilot/Stage 1은 `null`
- `tier`: `certain` / `ambiguous` / `unknown`

## IAA 산출

3인 CSV 수집 후:
```bash
python ../iaa/iaa_calculator.py --input pilot_v2.csv --output pilot_v2_iaa.md -n 1000
```

지표
- Fleiss κ (다중 관측자 명목 일치)
- Cohen κ + 부트스트랩 95% CI (쌍별)
- Jaccard (다중 레이블)
- Krippendorff α (결측치 허용)

통과 기준 (파일럿 v2)
- Fleiss κ (SDG) ≥ 0.41
- Jaccard ≥ 0.45
- 연계목표(additionalSdgs) 사용률 ≥ 20%

미달 시 코딩북 v1.7 리비전 + Arbitration 발동.

## 버전 이력

| 버전 | 일자 | 핵심 변경 |
|---|---|---|
| v1 | 2026-03 | 17개 병렬 버튼, 파일럿 50건 (경기도 단독) |
| v2 | 2026-04-20 | 5P 필터 + AI Top-3 + 3-tier + 가드레일 |
| v2 (재선정) | 2026-04-24 | 파일럿 50건 옵션 C 층화 재선정 (대15/도25/농10) |
| **v2 승격** | **2026-04-24** | **`index.html`로 승격, v1은 archive/로 이전** |
