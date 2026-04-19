# SDGs 예산 어노테이션 도구

경기도 지자체 세부사업설명서 SDG 라벨링 웹 애플리케이션.

## 파일 구조

```
annotation-tool/
├── index.html          ← 어노테이션 앱 (GitHub Pages 배포 대상)
├── convert_to_json.py  ← xlsx → JSON 변환 스크립트 (연구자용)
├── data/
│   └── pilot.json      ← 라벨링 데이터 (convert_to_json.py 실행 후 생성)
└── README.md
```

## 배포 방법 (GitHub Pages)

1. 이 폴더를 GitHub 저장소로 만들기
   ```bash
   git init
   git add .
   git commit -m "Initial annotation tool"
   git remote add origin https://github.com/[계정]/[저장소명].git
   git push -u origin main
   ```

2. GitHub → Settings → Pages → Source: `main` 브랜치 `/` (root) 선택

3. 배포 URL: `https://[계정].github.io/[저장소명]/`

## 데이터 준비 (연구자)

```bash
# pilot_50.xlsx → data/pilot.json 변환
python convert_to_json.py --input pilot_50.xlsx --output data/pilot.json

# gold_standard_1200.xlsx 전체 라벨링 시
python convert_to_json.py --input gold_standard_1200.xlsx --output data/gold.json
```

변환 후 `data/pilot.json`을 저장소에 커밋하면 어노테이터들이 웹에서 접근 가능.

## 어노테이터 사용법

1. 배포된 URL 접속
2. 이름 입력 후 "라벨링 시작"
3. 한 건씩 라벨링:
   - **1차 SDG**: 핵심 목표 1개 (필수)
   - **2차 SDG**: 부가 목표 0~2개 (선택)
   - **Red Tag**: RT-NONE / Type A / B / C
   - **HOLD**: 불확실하면 체크 후 다음으로 진행
   - **판단 근거**: 한 줄 메모
4. `Ctrl+S` 저장 / `Ctrl+Enter` 저장 후 다음
5. 완료 후 "CSV 내보내기" → 연구자에게 파일 제출

## IAA 산출

어노테이터 3인의 CSV를 수집 후 Python으로 Fleiss' Kappa 산출:

```python
import pandas as pd
from statsmodels.stats.inter_rater import fleiss_kappa, aggregate_raters

a1 = pd.read_csv('annotations_어노테이터1_날짜.csv')
a2 = pd.read_csv('annotations_어노테이터2_날짜.csv')
a3 = pd.read_csv('annotations_어노테이터3_날짜.csv')

# sample_id 기준으로 병합 후 fleiss_kappa 계산
```

---

# 🆕 v2 (2026-04) — 5P + AI Top-3 + 3-tier

v1(17개 병렬 버튼)은 `index.html`로 유지하되, 본 라벨링용 v2는 별도 파일입니다.

## v2 파일 구조

```
annotation_tool/
├── index.html                    ← v1 (파일럿 50건, 유지)
├── index_v2.html                 ← v2 (본 라벨링 1,200건)
├── generate_assignments.py       ← 1,200건 → 3명 층화 분할 스크립트
├── data/
│   ├── pilot.json                ← v1 파일럿 데이터
│   ├── assignments.json          ← ★ v2 선행: 어노테이터별 할당
│   ├── stage1_pool.json          ← Stage 1 Blind 300건 레코드
│   ├── stage2_pool.json          ← Stage 2 검수 900건 레코드
│   └── ai_prelabels.json         ← GPT-4o 사전 분류 Top-3 (Stage 2용)
└── README.md
```

## v2 준비 절차 (연구자)

### 1. 할당 파일 생성 (최초 1회)

```bash
cd annotation_tool/
python generate_assignments.py
# 결과: data/assignments.json, stage1_pool.json, stage2_pool.json
```

분할 규칙:
- Stage 1 Blind: **300건 × 3명 전원 동일** (앵커 편향 측정)
- Stage 2 검수: **3명이 270건씩 분담 + 교차 30건씩 × 3** (총 900건)

### 2. AI Pre-labeling 생성 (Stage 2 시작 전)

```bash
python ../ai_prelabeling/prelabel_gpt4o.py  # 별도 스크립트
# 결과: data/ai_prelabels.json
```

`ai_prelabels.json` 스키마:
```json
{
  "57": [
    {"sdg": "SDG13", "prob": 0.78},
    {"sdg": "SDG11", "prob": 0.15},
    {"sdg": "SDG7",  "prob": 0.04}
  ],
  "58": [ ... ]
}
```

## v2 어노테이터 사용법

1. 배포 URL + `index_v2.html` 접속
2. 어노테이터 코드(A/B/C) 선택 + Stage(1/2) 선택
3. 한 건씩 라벨링:
   - **Stage 1 (Blind)**: 5P → SDG 2단계 직접 선택
   - **Stage 2 (검수)**: AI Top-3 중 선택 or "기타" → 5P 직접
   - **확신도**: 확실함 / 애매함(추가 SDG 1~3개) / 모르겠음(skip)
   - **Red Tag**: RT-NONE / A / B / C
   - **판단 근거**: 한 줄 메모
4. `Ctrl+S` 저장 / `Ctrl+Enter` 저장 후 다음
5. 완료 후 "CSV 내보내기" → 연구자 제출

## v2 Firebase 저장 경로

`sdg_main_2026/stage{1|2}/{annotatorCode}/{sample_id}` (v1과 별도 경로)

## v2 저장 스키마

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
  "aiTopK": [...],             // Stage 2만, Stage 1은 null
  "chosenFromAI": true,         // AI 후보 중 선택 여부
  "aiRank": 1,                  // 몇 순위 선택 (null/1/2/3)
  "tier": "certain",            // certain/ambiguous/unknown
  "redTag": "RT-NONE",
  "rationale": "...",
  "timestamp": "2026-06-15T14:23:45.000Z",
  "durationSec": 87
}
```
