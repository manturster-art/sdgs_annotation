"""
convert_to_json.py
──────────────────
pilot_50.xlsx (또는 gold_standard_1200.xlsx) → data/pilot.json 변환 스크립트

사용법:
  python convert_to_json.py --input pilot_50.xlsx --output data/pilot.json
  python convert_to_json.py --input gold_standard_1200.xlsx --output data/gold.json
"""

import argparse
import json
import os
import sys

def convert(input_path: str, output_path: str):
    try:
        import pandas as pd
    except ImportError:
        print("pandas가 필요합니다: pip install pandas openpyxl")
        sys.exit(1)

    print(f"읽는 중: {input_path}")
    ext = os.path.splitext(input_path)[1].lower()
    if ext == '.xlsx' or ext == '.xls':
        df = pd.read_excel(input_path)
    elif ext == '.csv':
        df = pd.read_csv(input_path, encoding='utf-8-sig')
    else:
        print(f"지원하지 않는 형식: {ext}")
        sys.exit(1)

    print(f"총 {len(df)}건 로드됨. 컬럼: {list(df.columns)}")

    # sample_id가 없으면 생성
    if 'sample_id' not in df.columns:
        df['sample_id'] = range(1, len(df) + 1)

    # id 필드 추가 (JS에서 annotation key로 사용)
    df['id'] = df['sample_id'].astype(str)

    # NaN → None (JSON null)
    df = df.where(pd.notnull(df), None)

    # 텍스트 필드 문자열 변환 (숫자로 읽힌 경우 대비)
    for col in ['사업목적', '사업내용', '추진계획', '세부사업명', '지자체명']:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: str(x) if x is not None else None)

    records = json.loads(df.to_json(orient='records', force_ascii=False))

    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"저장 완료: {output_path}  ({len(records)}건)")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='xlsx/csv → JSON 변환')
    parser.add_argument('--input',  default='pilot_50.xlsx',   help='입력 파일 경로')
    parser.add_argument('--output', default='data/pilot.json', help='출력 JSON 경로')
    args = parser.parse_args()
    convert(args.input, args.output)
