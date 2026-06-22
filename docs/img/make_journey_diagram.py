# -*- coding: utf-8 -*-
"""어노테이터 안내문용 '3단계 여정' 다이어그램 PNG 생성 (한글: Malgun Gothic)."""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from pathlib import Path

# 한글 폰트
for name in ['Malgun Gothic', '맑은 고딕', 'NanumGothic', 'Noto Sans CJK KR']:
    try:
        plt.rcParams['font.family'] = name
        break
    except Exception:
        continue
plt.rcParams['axes.unicode_minus'] = False

OUT = Path(__file__).resolve().parent / 'three_stage_journey.png'

fig, ax = plt.subplots(figsize=(12.6, 6.4), dpi=200)
ax.set_xlim(0, 12.6); ax.set_ylim(0, 6.4); ax.axis('off')

stages = [
    dict(cx=2.15, face='#FEF3E2', edge='#D9821B', title='파일럿',
         lines=['50건 · 연습', 'AI 추천: 숨김', '3인이 같은 50건', '→ 내가 보는 건수: 50'], here=True),
    dict(cx=6.3, face='#E8F0FE', edge='#2F6FED', title='Stage 1 · Blind',
         lines=['300건 · 본 라벨링 시작', 'AI 추천: 숨김', '3인이 같은 300건', '→ 내가 보는 건수: 300'], here=False),
    dict(cx=10.45, face='#E9F7EF', edge='#2E9E5B', title='Stage 2 · 검수',
         lines=['900건 · 마무리', 'AI 추천: Top-3 보임', '나눠서 270 + 공통 90', '→ 내가 보는 건수: 360'], here=False),
]
bw, bh, by = 3.5, 2.75, 3.0

ax.text(6.3, 6.12, '어노테이션 3단계 여정', ha='center', va='center',
        fontsize=20, fontweight='bold', color='#1a1a1a')

for s in stages:
    ax.add_patch(FancyBboxPatch((s['cx'] - bw/2, by), bw, bh,
                 boxstyle='round,pad=0.1,rounding_size=0.18',
                 facecolor=s['face'], edgecolor=s['edge'], linewidth=2.4))
    ax.text(s['cx'], by + bh - 0.45, s['title'], ha='center', va='center',
            fontsize=16.5, fontweight='bold', color='#1a1a1a')
    for i, ln in enumerate(s['lines']):
        fw = 'bold' if ln.startswith('→') else 'normal'
        col = '#11457a' if ln.startswith('→') else '#333333'
        ax.text(s['cx'], by + bh - 1.05 - i * 0.5, ln, ha='center', va='center',
                fontsize=12, color=col, fontweight=fw)
    if s['here']:
        ax.text(s['cx'], by - 0.34, '▲ 지금 여기', ha='center', va='center',
                fontsize=12.5, fontweight='bold', color='#D9821B')

for x0, x1 in [(2.15 + bw/2, 6.3 - bw/2), (6.3 + bw/2, 10.45 - bw/2)]:
    ax.add_patch(FancyArrowPatch((x0 + 0.04, by + bh/2), (x1 - 0.04, by + bh/2),
                 arrowstyle='-|>', mutation_scale=24, linewidth=2.2, color='#9aa0a6'))

ax.add_patch(FancyBboxPatch((0.45, 0.3), 11.7, 2.0,
             boxstyle='round,pad=0.1,rounding_size=0.15',
             facecolor='#F4F5F7', edgecolor='#D5D8DC', linewidth=1.3))
ax.text(6.3, 1.92, '어느 단계든 누르는 순서는 똑같습니다',
        ha='center', va='center', fontsize=13.5, fontweight='bold', color='#1a1a1a')
ax.text(6.3, 1.45, '5P  →  주목표 SDG  →  확신도  →  연계목표  →  Red Tag  →  저장',
        ha='center', va='center', fontsize=12.5, color='#2F6FED', fontweight='bold')
ax.text(6.3, 0.98, '달라지는 건 딱 3가지 — 건수 · AI 추천이 보이는지 · 혼자 보는지 나눠 보는지.  그뿐입니다.',
        ha='center', va='center', fontsize=11.5, color='#444444')
ax.text(6.3, 0.56, '내가 실제로 라벨링하는 총량 = Stage 1 300건 + Stage 2 360건 = 약 660건  (파일럿 50건은 연습이라 별도)',
        ha='center', va='center', fontsize=11.5, fontweight='bold', color='#2E9E5B')

plt.savefig(OUT, bbox_inches='tight', dpi=200, facecolor='white')
print('saved:', OUT)
