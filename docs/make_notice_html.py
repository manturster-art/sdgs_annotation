# -*- coding: utf-8 -*-
"""안내문 md → 인쇄용 self-contained HTML (한글 폰트 + 이미지 base64 embed).
   생성된 HTML을 브라우저에서 열고 Ctrl+P → 'PDF로 저장'하면 PDF 완성."""
import base64
from pathlib import Path

DOCS = Path(__file__).resolve().parent
md_path = DOCS / 'annotator_notice_v2_kickoff.md'
img_path = DOCS / 'img' / 'three_stage_journey.png'
out_path = DOCS / 'annotator_notice_v3_print.html'

md_text = md_path.read_text(encoding='utf-8')

# 이미지 base64 인라인 (단독 파일로 이동 가능하게)
img_b64 = base64.b64encode(img_path.read_bytes()).decode()
md_text = md_text.replace('img/three_stage_journey.png',
                          f'data:image/png;base64,{img_b64}')

try:
    import markdown
    body = markdown.markdown(md_text, extensions=['tables', 'fenced_code', 'sane_lists'])
    engine = 'markdown ' + markdown.__version__
except ImportError:
    engine = 'NONE'
    body = None

CSS = """
@page { size: A4; margin: 16mm 14mm; }
html { background:#ffffff; }
body { font-family:'Malgun Gothic','맑은 고딕',sans-serif; max-width:880px; margin:24px auto; padding:24px 28px; line-height:1.7; color:#1a1a1a; font-size:14px; background:#ffffff; }
h1 { font-size:24px; } h2 { font-size:19px; border-bottom:2px solid #e6e6e6; padding-bottom:5px; margin-top:30px; }
h3 { font-size:16px; margin-top:20px; }
table { border-collapse:collapse; width:100%; margin:12px 0; font-size:13px; }
th,td { border:1px solid #ccd; padding:6px 9px; text-align:left; vertical-align:top; }
th { background:#f4f5f7; }
img { max-width:100%; display:block; margin:18px auto; border:1px solid #eee; border-radius:8px; }
code { background:#f4f5f7; padding:1px 5px; border-radius:4px; font-size:0.92em; }
blockquote { border-left:4px solid #2F6FED; margin:10px 0; padding:6px 14px; background:#f7faff; color:#333; }
hr { border:none; border-top:1px solid #e6e6e6; margin:22px 0; }
"""

if body is not None:
    html = (f'<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
            f'<title>SDG 어노테이션 안내</title><style>{CSS}</style></head>'
            f'<body>{body}</body></html>')
    out_path.write_text(html, encoding='utf-8')
    print('OK engine=' + engine)
    print('saved:', out_path)
else:
    print('NO_MARKDOWN')
