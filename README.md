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
