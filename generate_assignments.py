# -*- coding: utf-8 -*-
"""
generate_assignments.py
-----------------------
Gold Standard 1,200건을 어노테이터 3명(A/B/C)에게 층화 분할하여
assignments.json + stage1_pool.json + stage2_pool.json 을 생성한다.

입력: gold_standard_1200.xlsx (프로그램 디렉토리 기준)
출력: annotation_tool/data/ 이하 JSON 파일들

분할 규칙 (gold_standard_process.md 기준)
- Stage 1 Blind: 300건 × 3명 전원 (앵커 편향 측정용, 동일 건)
- Stage 2 검수:  900건 = 270건 × 3명 분담 + 90건 × 3명 교차 (각 30건 중복)
- 층화 키: 지자체유형(type) × 회계연도(year) × rare_class_flag

저장 위치
- data/assignments.json  : 어노테이터별 할당 맵
- data/stage1_pool.json  : Stage 1 300건 (AI 비노출)
- data/stage2_pool.json  : Stage 2 900건 (AI Top-3 노출)
"""
from __future__ import annotations

import json
import os
import random
import sys
from collections import defaultdict
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("[ERROR] pandas 미설치. pip install pandas openpyxl 후 재실행.", file=sys.stderr)
    sys.exit(1)

# ─────────────────────────────────────────────────────────
# 설정
# ─────────────────────────────────────────────────────────
HERE = Path(__file__).resolve().parent
PROGRAM_DIR = HERE.parent
GOLD_XLSX = PROGRAM_DIR / "gold_standard_1200.xlsx"
DATA_DIR = HERE / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

ANNOTATORS = ["A", "B", "C"]
STAGE1_SIZE = 300   # Blind 전원 공통
STAGE2_TOTAL = 900  # 검수 총 규모
STAGE2_OVERLAP_PER_PAIR = 30  # 3쌍(AB/BC/CA)에서 각 30건씩 중복 → 90건
SEED = 2026


def pick_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    for c in candidates:
        if c in df.columns:
            return c
    return None


def stratified_sample(df: pd.DataFrame, n: int, strat_cols: list[str], seed: int) -> pd.DataFrame:
    """층화 표본 추출 (각 셀 비율대로 할당, 반올림 오차는 랜덤 보정)."""
    rng = random.Random(seed)
    strat_key = df[strat_cols].astype(str).agg("|".join, axis=1)
    groups = df.groupby(strat_key)
    total = len(df)

    # 각 그룹당 할당 건수 계산
    quota_raw = {k: n * len(g) / total for k, g in groups}
    quota_int = {k: int(v) for k, v in quota_raw.items()}
    remainder = n - sum(quota_int.values())

    # 반올림 오차 보정: 잔차 큰 순으로 +1
    if remainder > 0:
        residuals = sorted(quota_raw.items(), key=lambda kv: kv[1] - int(kv[1]), reverse=True)
        for k, _ in residuals[:remainder]:
            quota_int[k] += 1

    chosen_idx = []
    for key, grp in groups:
        q = min(quota_int.get(key, 0), len(grp))
        if q <= 0:
            continue
        idx = list(grp.index)
        rng.shuffle(idx)
        chosen_idx.extend(idx[:q])

    return df.loc[chosen_idx].copy()


def split_round_robin(items: list, n_groups: int) -> list[list]:
    """라운드로빈 분할."""
    buckets = [[] for _ in range(n_groups)]
    for i, x in enumerate(items):
        buckets[i % n_groups].append(x)
    return buckets


def main():
    if not GOLD_XLSX.exists():
        print(f"[ERROR] {GOLD_XLSX} 파일이 없습니다.", file=sys.stderr)
        sys.exit(2)

    df = pd.read_excel(GOLD_XLSX)
    print(f"[INFO] gold_standard_1200 로드: {df.shape}")
    print(f"[INFO] 컬럼: {list(df.columns)}")

    # 컬럼 매핑 (엑셀 실제 컬럼명 방어적 탐색)
    col_id = pick_col(df, ["sample_id", "id", "SAMPLE_ID"])
    col_year = pick_col(df, ["회계연도", "year", "연도"])
    col_type = pick_col(df, ["stratum_type", "type", "지자체유형", "지자체_유형"])
    col_rare = pick_col(df, ["rare_class_flag", "rare_flag", "rare"])

    if col_id is None:
        # sample_id가 없으면 0부터 부여
        df = df.reset_index(drop=True)
        df["sample_id"] = df.index
        col_id = "sample_id"

    for c in [col_year, col_type]:
        if c is None:
            raise RuntimeError("필수 층화 컬럼(회계연도/지자체유형)이 없습니다.")

    strat_cols = [col_type, col_year]
    if col_rare:
        strat_cols.append(col_rare)

    # ── Stage 1 Blind 300건: 1,200건 중 층화 추출
    stage1 = stratified_sample(df, STAGE1_SIZE, strat_cols, seed=SEED)
    stage1_ids = sorted(stage1[col_id].tolist())
    print(f"[INFO] Stage 1 Blind: {len(stage1_ids)}건 추출")

    # ── Stage 2 900건: 1,200 - Stage1 = 900
    remaining = df[~df[col_id].isin(stage1_ids)].copy()
    stage2_ids_all = sorted(remaining[col_id].tolist())
    print(f"[INFO] Stage 2 총 풀: {len(stage2_ids_all)}건")

    # ── Stage 2 교차 검증 90건: 3명이 각 30건씩 중복 보는 부분
    rng = random.Random(SEED + 1)
    stage2_shuffled = stage2_ids_all[:]
    rng.shuffle(stage2_shuffled)
    cross_ids = sorted(stage2_shuffled[:STAGE2_OVERLAP_PER_PAIR * 3])  # 90건
    solo_pool = [x for x in stage2_ids_all if x not in set(cross_ids)]
    print(f"[INFO] Stage 2 교차검증 공통: {len(cross_ids)}건, 분담 풀: {len(solo_pool)}건")

    # ── Stage 2 분담 810건: 3명에게 라운드로빈 (각 270건)
    rng.shuffle(solo_pool)
    solo_split = split_round_robin(solo_pool, 3)
    for i, bucket in enumerate(solo_split):
        print(f"[INFO] Stage 2 분담({ANNOTATORS[i]}): {len(bucket)}건")

    # ── 어노테이터별 할당 구성
    assignments = {"annotators": {}}
    for i, ann in enumerate(ANNOTATORS):
        assignments["annotators"][ann] = {
            "name": f"어노테이터 {ann}",
            "stage1_samples": stage1_ids,  # 3명 전원 동일
            "stage2_samples": sorted(solo_split[i] + cross_ids),  # 본인 분담 + 교차 90건
            "stage2_crosscheck": cross_ids,  # 참고용 (어느 건이 교차인지)
        }

    # ── Pool 파일: UI가 빠르게 조회하도록 레코드 통째로 저장
    def _to_jsonable(v):
        if pd.isna(v):
            return None
        if hasattr(v, "item"):
            try:
                return v.item()
            except Exception:
                pass
        if isinstance(v, (int, float, str, bool)):
            return v
        return str(v)

    def records_for(ids: list) -> list[dict]:
        sub = df[df[col_id].isin(ids)].copy()
        sub = sub.sort_values(col_id)
        out = []
        for _, r in sub.iterrows():
            rec = {k: _to_jsonable(v) for k, v in r.items()}
            # UI가 r.id 또는 r.sample_id를 조회하므로 둘 다 보장
            rec["id"] = _to_jsonable(r[col_id])
            # UI의 type 필드 호환(지자체유형)
            if col_type and "type" not in rec:
                rec["type"] = _to_jsonable(r[col_type])
            out.append(rec)
        return out

    # 저장
    out_paths = {}
    p1 = DATA_DIR / "assignments.json"
    p2 = DATA_DIR / "stage1_pool.json"
    p3 = DATA_DIR / "stage2_pool.json"

    with open(p1, "w", encoding="utf-8") as f:
        json.dump(assignments, f, ensure_ascii=False, indent=2)
    with open(p2, "w", encoding="utf-8") as f:
        json.dump(records_for(stage1_ids), f, ensure_ascii=False, indent=2)
    with open(p3, "w", encoding="utf-8") as f:
        json.dump(records_for(stage2_ids_all), f, ensure_ascii=False, indent=2)

    print(f"[OK] {p1} ({p1.stat().st_size // 1024} KB)")
    print(f"[OK] {p2} ({p2.stat().st_size // 1024} KB)")
    print(f"[OK] {p3} ({p3.stat().st_size // 1024} KB)")

    # ── 요약
    summary = {
        "seed": SEED,
        "stage1_size_each": STAGE1_SIZE,
        "stage2_total_pool": len(stage2_ids_all),
        "stage2_solo_per_annotator": [len(solo_split[i]) for i in range(3)],
        "stage2_crosscheck": len(cross_ids),
        "per_annotator_workload": {
            ann: {
                "stage1": STAGE1_SIZE,
                "stage2": len(assignments["annotators"][ann]["stage2_samples"]),
                "total": STAGE1_SIZE + len(assignments["annotators"][ann]["stage2_samples"]),
            } for ann in ANNOTATORS
        },
    }
    print("[SUMMARY]", json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
