// coding_book_v1_6.docx 생성 스크립트
// v1.5 기반 + 주목표/연계목표 이원화 (OECD Rio Markers 방식 차용)
//   1. 용어 리네이밍: "1차 SDG" → "주목표 (Principal)",  "2차 SDG" → "연계목표 (Significant)"
//   2. [신규] Nexus 체크리스트 3문항 (제1장 1-4) — 연계목표 추가 판정 YES/NO
//   3. 연계목표 사용 목표율: 25~35% (파일럿 v1은 6%로 저조)
//   4. IAA 이원화: κ(주목표) + Jaccard(주+연계) 동시 보고
//   5. v2 UI 연동: "③ 연계목표" 독립 섹션 + Nexus 체크리스트 inline
//   6. FAQ Q8 추가: 언제 연계목표를 추가해야 하나요?

process.env.NODE_PATH = 'C:/Users/USER/AppData/Roaming/npm/node_modules';
require('module').Module._initPaths();

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType
} = require('docx');

const FONT_KR = "맑은 고딕";
const PAGE_WIDTH = 11906;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const outputPath = "D:/박정진/대학원(박사)/[박사-2]SDGs 논문/coding_book_v1_6.docx";

function run(text, opts = {}) {
  return new TextRun({
    text, font: { name: FONT_KR },
    size: opts.size || 20, bold: opts.bold || false, italics: opts.italics || false,
    color: opts.color || "000000",
  });
}
function para(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [run(text, opts)];
  return new Paragraph({
    children: runs,
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before || 60, after: opts.after || 60, line: 320 },
  });
}
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: { name: FONT_KR }, size: 30, bold: true })],
    spacing: { before: 400, after: 200 }
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: { name: FONT_KR }, size: 24, bold: true })],
    spacing: { before: 300, after: 150 }
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: { name: FONT_KR }, size: 22, bold: true })],
    spacing: { before: 200, after: 100 }
  });
}
function bullet(text) {
  return new Paragraph({
    children: [run("• " + text)],
    indent: { left: 280 },
    spacing: { before: 40, after: 40, line: 300 }
  });
}
function codeBlock(lines) {
  return lines.map(line => new Paragraph({
    children: [new TextRun({ text: line, font: { name: "Consolas" }, size: 18 })],
    spacing: { before: 20, after: 20, line: 280 },
    shading: { fill: "F5F5F5", type: ShadingType.CLEAR }
  }));
}
function callout(title, body, fill = "FFF4E5") {
  const titleP = new Paragraph({
    children: [new TextRun({ text: title, font: { name: FONT_KR }, size: 20, bold: true })],
    shading: { fill, type: ShadingType.CLEAR },
    spacing: { before: 160, after: 60, line: 300 }
  });
  const bodies = (Array.isArray(body) ? body : [body]).map(t =>
    new Paragraph({
      children: [run(t)],
      shading: { fill, type: ShadingType.CLEAR },
      spacing: { before: 20, after: 20, line: 300 }
    })
  );
  return [titleP, ...bodies];
}
function border() { return { style: BorderStyle.SINGLE, size: 4, color: "999999" }; }
function allBorders() { const b = border(); return { top: b, bottom: b, left: b, right: b }; }
function headerCell(text, width) {
  return new TableCell({
    borders: allBorders(),
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "D9E2F3", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, font: { name: FONT_KR }, size: 20, bold: true })]
    })]
  });
}
function cell(text, width, opts = {}) {
  const lines = Array.isArray(text) ? text : [String(text)];
  const children = lines.map(t => new Paragraph({
    children: [new TextRun({
      text: t, font: { name: FONT_KR }, size: 18, bold: opts.bold,
      color: opts.color || "000000"
    })],
    spacing: { before: 20, after: 20, line: 280 }
  }));
  return new TableCell({
    borders: allBorders(),
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children
  });
}
function makeTable(rows) {
  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, rows });
}

// ────────────────────────────────────────────
// 본문
// ────────────────────────────────────────────
const children = [];

// 표지
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 600, after: 200 },
  children: [new TextRun({ text: "AI 기반 지방정부 예산 SDGs 맵핑 연구", font: { name: FONT_KR }, size: 36, bold: true })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 120, after: 120 },
  children: [new TextRun({ text: "어노테이터 코딩북 (Coding Book)", font: { name: FONT_KR }, size: 28, bold: true })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 60, after: 600 },
  children: [new TextRun({ text: "Ground Truth 라벨링 공식 가이드라인", font: { name: FONT_KR }, size: 22 })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 600, after: 200 },
  children: [new TextRun({ text: "v1.6", font: { name: FONT_KR }, size: 40, bold: true, color: "2E74B5" })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 60, after: 60 },
  children: [new TextRun({ text: "2026년 4월 21일", font: { name: FONT_KR }, size: 20 })]
}));

// v1.6 주요 변경사항
children.push(h2("v1.6 주요 변경사항"));
children.push(para("파일럿 데이터에서 '2차 SDG' 사용률이 6% (3/50건)에 그친 것으로 확인되었다. SDGs는 본질적으로 상호연계적(Nexus)이므로, 단일 SDG로 판단하는 관행은 AI 학습 데이터의 현실 정합성을 약화시킨다. v1.6은 OECD Rio Markers의 'Principal + Significant' 방식을 차용하여 주목표(Principal)와 연계목표(Significant)를 이원화하고, Nexus 체크리스트로 연계목표 판정을 표준화한다."));
children.push(bullet("(1) [용어 변경] \"1차 SDG\" → \"주목표 (Principal SDG)\"  ·  \"2차 SDG\" → \"연계목표 (Significant SDGs)\""));
children.push(bullet("(2) [신규] Nexus 체크리스트 3문항 — 제1장 1-4. 주목표 선택 후 반드시 3문항을 거쳐 연계목표 유무를 판정"));
children.push(bullet("(3) [수정] 연계목표 상한선 2개 (v1.5까지는 최대 3개였으나 주목표+연계 총 3개 유지하면서 연계는 2개로 명확화)"));
children.push(bullet("(4) [업데이트] IAA 지표 이원화 — κ(주목표) + Jaccard 계수(주+연계) + Krippendorff's α 함께 보고"));
children.push(bullet("(5) [업데이트] v2 UI 연동 — '③ 연계목표 SDGs' 독립 섹션으로 격상, 확신도(tier)와 무관하게 상시 노출, Nexus 체크리스트 inline 표시"));
children.push(bullet("(6) [FAQ 추가] Q8. 언제 연계목표를 추가해야 하나요? — 판정 기준 명시"));
children.push(bullet("(7) [목표율] 연계목표 사용률 25~35% — 파일럿 6% 대비 4~6배 상승 기대"));

children.push(h3("v1.5 대비 유지 사항"));
children.push(bullet("제1장 1-3 수혜자 vs 제공자 식별 결정 트리"));
children.push(bullet("제2장 2-18 NA 분류 2유형 (NA-OUTSIDE / NA-UNSURE)"));
children.push(bullet("제3장 3-4 Red Tag A/B/C 판정 체크리스트"));
children.push(bullet("제4장 4-5 SDG 10 ↔ SDG 1·3 구분 결정 트리 / 4-6 SDG 8 ↔ SDG 9 구분 결정 트리"));
children.push(bullet("부록 C 파일럿 분석 결과 및 v2 UI 가드레일 연계"));

children.push(para("작업 전 반드시 전체를 숙독하고, 파일럿 50건을 완료한 후 본 라벨링을 시작하세요.", { bold: true }));

// 개요 표
children.push(h2("개요"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("항목", 3000), headerCell("내용", CONTENT_WIDTH - 3000)
  ]}));
  const items = [
    ["문서 버전", "v1.6 (주목표/연계목표 이원화 + Nexus 체크리스트)"],
    ["적용 대상", "경기도 31개 기초지자체 2016~2025년 세부사업설명서"],
    ["표본 수", "1,200건 (대도시형 360·도시형 600·농촌형 240; 희소 클래스 120건 포함)"],
    ["어노테이터 수", "3인 (홀수, 다수결 명확화)"],
    ["IAA 목표", "κ(주목표) ≥ 0.61 / Jaccard(주+연계) ≥ 0.50 / 희소 클래스 κ ≥ 0.41"],
    ["라벨 체계", "주목표 1개 (필수) + 연계목표 0~2개 (권장) + Red Tag (유형 또는 없음)"],
    ["라벨 상한", "주목표 1 + 연계 2 = 총 3개 (v1.5와 동일)"],
    ["연계목표 목표율", "25~35% (파일럿 v1은 6% — 사용률 4~6배 상승 목표)"],
    ["희소 클래스 표집", "SDG 9·12·14·17 — 목적표집으로 SDG당 최소 30건 포함"],
    ["v2 UI 연동", "가드레일 3종 (M-01/M-02/M-04) + 파일럿 모드 + Nexus 체크리스트"],
  ];
  items.forEach(([k, v]) => {
    rows.push(new TableRow({ children: [cell(k, 3000, { bold: true, fill: "F2F2F2" }), cell(v, CONTENT_WIDTH - 3000)] }));
  });
  children.push(makeTable(rows));
}

// ────────────────────────────────────────────
// 제1장
// ────────────────────────────────────────────
children.push(h1("제1장 시작 전 필독 사항"));

children.push(h2("1-1. 라벨링의 목적"));
children.push(para("본 라벨링의 목적은 AI 모델 학습에 사용할 고품질 정답 데이터(Gold Standard)를 구축하는 것입니다. 어노테이터의 판단이 곧 AI 모델의 학습 기준이 되므로, 일관성과 정확성이 가장 중요합니다."));
children.push(para("[v1.6 개정] 주목표(Principal) 는 단일 레이블 분류 모델 학습에, 연계목표(Significant) 는 다중 레이블 분류(multi-label) 및 SDG 연계성(Nexus) 분석에 활용됩니다. 두 라벨 모두 AI 학습 데이터의 핵심 자원입니다."));
children.push(para("SDGs는 본질적으로 상호연계적입니다. 예컨대 '저소득층 에너지 바우처'는 주목표 SDG 7(에너지 접근)이지만 연계목표 SDG 1(빈곤)에도 명확히 기여합니다. 이러한 Nexus를 놓치면 AI 모델은 '경제=SDG 8, 환경=SDG 13' 같은 단순 이분법만 학습하게 됩니다."));

children.push(h2("1-2. SDG 17개 전체 포함 방침 및 희소 클래스 처리"));
children.push(para("v1.0에서는 지방정부 예산 적합성을 이유로 SDG 9·12·14·17을 제외했으나, 이를 철회하고 17개 전체를 포함합니다. 사례 희소성은 제외 근거가 아니며, 특정 SDG 예산이 얼마나 적게 편성되었는지 자체가 2편의 실증 결과가 됩니다."));
children.push(bullet("지방정부도 SDG 9(스마트시티), SDG 12(자원순환), SDG 14(내수면 생태), SDG 17(자매도시 교류) 관련 예산을 실제로 편성합니다."));
children.push(bullet("희소 클래스를 포함해 AI 모델의 성능을 분석하는 것 자체가 방법론적 기여입니다. Per-class F1으로 희소 SDG의 분류 난이도를 별도 보고합니다."));
children.push(bullet("SDG 9·12·14·17은 목적표집으로 SDG당 최소 30건이 라벨링 풀에 포함됩니다. 전체 1,200건 중 희소 클래스 배정 샘플에는 ★ 표시가 있습니다."));

children.push(h2("1-3. 수혜자 vs 제공자 식별 결정 트리 (v1.5 유지)"));
children.push(para("1차 SDG(주목표) 선택 직전 반드시 아래 3단계를 순서대로 확인한다."));
children.push(...callout("▣ STEP 1. 수혜자가 누구인가? (Who benefits?)", [
  "① 사업의 예산 집행으로 '실질적 편익'을 얻는 주체를 명확히 식별한다.",
  "② 예산 집행 업무를 '담당하는' 공무원·업체·기관은 제공자이며 수혜자가 아니다.",
  "③ 예: '공무원 SDG 교육' → 수혜자는 공무원이 아니라 공무원이 전달할 정책의 시민 최종 수혜자.",
], "FFF4E5"));
children.push(...callout("▣ STEP 2. 수혜자가 '어떤 유형'인가?", [
  "① 시민 전체 (general)  ② 취약계층 (vulnerable)  ③ 특정 집단 (specific)  ④ 해당없음 (NA)",
  "※ v2 UI는 STEP 2 유형 선택 시 M-01 카드에서 자동 반영 — 별도 체크 불필요",
], "FFF4E5"));
children.push(...callout("▣ STEP 3. 사업목적의 '핵심 변화'가 무엇인가?", [
  "① 경제적 빈곤 탈출 → SDG 1   ② 건강·돌봄 → SDG 3   ③ 교육 → SDG 4",
  "④ 구조적 불평등 해소 → SDG 10   ⑤ 일자리·자립 → SDG 8",
  "※ 수혜자가 취약계층이라는 사실만으로 자동 SDG 10이 되지 않는다.",
], "FFF4E5"));

// ── NEW SECTION 1-4
children.push(h2("1-4. [신규 v1.6] Nexus 체크리스트 — 연계목표 판정"));
children.push(para("주목표 선택 후 반드시 아래 3문항을 거쳐 연계목표 추가 여부를 판정합니다. 1개라도 YES이면 연계목표를 추가하고, 모두 NO이면 주목표만으로 저장합니다."));

children.push(...callout("▣ Q1. 수혜자가 2개 이상 SDG 영역에 걸쳐 있는가?", [
  "예시 1: 저소득 장애인 활동 지원 → 빈곤(SDG 1) + 불평등(SDG 10) 동시 해당",
  "예시 2: 농촌 청년 창업 지원 → 일자리(SDG 8) + 지역격차 해소(SDG 10) 동시 해당",
  "예시 3: 공공도서관 다문화 프로그램 → 교육(SDG 4) + 불평등(SDG 10) 동시 해당",
  "판정: 수혜자를 두 갈래 SDG에서 모두 명확히 설명 가능하면 YES.",
], "ECFDF5"));

children.push(...callout("▣ Q2. 사업 수단이 주목표 외 다른 SDG에 기여하거나 저해하는가?", [
  "예시 1: 스마트시티 플랫폼 구축 → 주목표 SDG 9, 수단이 '통합 행정 서비스' = 연계 SDG 16",
  "예시 2: 음식물쓰레기 감량 캠페인 → 주목표 SDG 12, 감축 과정에서 온실가스 감소 = 연계 SDG 13",
  "예시 3: 도시숲 조성 (탄소흡수 명시) → 주목표 SDG 13, 수단이 '녹지 확충' = 연계 SDG 11·15",
  "판정: 사업 수단 자체가 여러 SDG 경로를 타면 YES. 단, '저해' 경우는 연계목표가 아니라 Red Tag 유형 A로 처리.",
], "ECFDF5"));

children.push(...callout("▣ Q3. 사업목적 텍스트에 2개 이상 SDG 키워드가 명시되는가?", [
  "예시 1: \"기후변화 대응 및 에너지 전환\" → 명시적으로 SDG 13 + SDG 7",
  "예시 2: \"양질의 일자리 창출과 지역 혁신 생태계 조성\" → SDG 8 + SDG 9",
  "예시 3: \"취약계층 교육 기회 보장과 평생학습 확대\" → SDG 4 (단일 — NO)",
  "판정: 사업목적 또는 사업내용 텍스트에 2개 이상 SDG 개념이 '명시적으로' 기술되어 있으면 YES.",
  "주의: 단순히 취약계층을 대상으로 한다는 사실만으로는 SDG 10 연계가 아님. 제4장 4-5 참조.",
], "ECFDF5"));

children.push(h3("Nexus 판정 결정 트리"));
children.push(...codeBlock([
  "주목표 SDG 선택 완료",
  "    ↓",
  "Q1: 수혜자가 2개 이상 SDG 영역에 걸쳐 있는가?",
  "    ├── YES → 연계목표 추가 (해당 SDG)",
  "    └── NO  ↓",
  "Q2: 사업 수단이 주목표 외 다른 SDG에 기여/저해하는가?",
  "    ├── YES (기여) → 연계목표 추가",
  "    ├── YES (저해) → Red Tag 유형 A로 처리 (연계목표 아님)",
  "    └── NO  ↓",
  "Q3: 사업목적 텍스트에 2개 이상 SDG 키워드가 명시되는가?",
  "    ├── YES → 연계목표 추가 (명시된 SDG)",
  "    └── NO  → 주목표만으로 저장 (연계목표 없음)",
  "",
  "상한: 연계목표는 최대 2개 (주목표 1 + 연계 2 = 총 3개 이하)",
  "금지: '혹시 모르니 추가'는 모델 학습 오류를 유발함 — Q1~Q3 중 1개 이상 확실한 YES만 추가",
]));

children.push(h2("1-5. 라벨링 단위"));
children.push(para("라벨링의 기본 단위는 세부사업 1건입니다. 각 세부사업은 아래 텍스트 필드로 구성됩니다."));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("필드명", 3500), headerCell("내용", 5000), headerCell("활용도", CONTENT_WIDTH - 8500)
  ]}));
  const items = [
    ["사업목적 (bizPurpCn)", "해당 사업을 추진하는 이유와 목표", "★★★ 핵심 — 가장 우선 참조"],
    ["사업내용 (bizCn)", "구체적 집행 방법, 대상, 수단", "★★★ 핵심 — Red Tag·연계목표 판단 필수"],
    ["추진계획 (planCn)", "사업 추진 방법·일정·지역 등 상세 계획 (null 약 42%)", "★ 보조 — 공란 많음"],
    ["세부사업명 (dbizNm)", "사업의 공식 명칭", "★ 참고 — 단독 판단 금지"],
  ];
  items.forEach(([k, v, u]) => {
    rows.push(new TableRow({ children: [
      cell(k, 3500, { bold: true, fill: "F2F2F2" }),
      cell(v, 5000),
      cell(u, CONTENT_WIDTH - 8500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("1-6. [개정 v1.6] 전체 라벨링 절차"));
children.push(para("각 세부사업의 사업목적→사업내용 순서로 텍스트를 읽는다. 추진계획이 있으면 보조 참조한다."));
children.push(bullet("① 1-3 결정 트리로 수혜자를 식별하고 유형을 선택한다 (v2 UI M-01 카드)."));
children.push(bullet("② 주목표 SDG(핵심 목표 1개)를 선택한다. 17개 중 해당 없으면 'NA'를 선택하고 사유(NA-OUTSIDE/NA-UNSURE)를 지정한다."));
children.push(bullet("③ [v1.6 신규] 1-4 Nexus 체크리스트 3문항을 거쳐 연계목표(0~2개)를 판정한다 (v2 UI ③ 연계목표 섹션)."));
children.push(bullet("④ Red Tag 여부를 판단한다 — 3-4 체크리스트로 유형(A/B/C) 확정 후 판단 근거 필수 입력 (RT-NONE은 rationale 선택)."));
children.push(bullet("⑤ v2 UI 가드레일 M-02 (SDG 혼동 토스트) 발동 시 이대로 유지 / 다시 선택 판정 후 진행."));
children.push(bullet("⑥ 판단 근거를 한 줄 메모로 남긴다. 불확실한 경우 'HOLD' 표시 후 진행."));

children.push(h2("1-7. 절대 금지 사항"));
children.push(bullet("다른 어노테이터와 라벨링 결과를 사전에 공유하거나 상의하지 마세요. (IAA 오염)"));
children.push(bullet("인터넷 검색으로 실제 사업을 확인한 후 판단하지 마세요. (텍스트 기반 판단이 원칙)"));
children.push(bullet("사업명만 보고 판단하지 마세요. 사업내용까지 반드시 확인하세요."));
children.push(bullet("주목표 SDG를 복수로 선택하지 마세요. 주목표는 반드시 1개만 선택합니다."));
children.push(bullet("[v1.6] 연계목표는 Nexus 체크리스트 1개 이상 YES일 때만 추가하세요. '혹시 모르니'는 금지."));
children.push(bullet("전체 라벨 수(주목표 1 + 연계 2) 3개를 초과하지 않도록 하세요."));

children.push(h2("1-8. 파일럿 50건 평가 프로토콜"));
children.push(bullet("구성: 연구자 사전 정답 보유 기준 샘플 25건 + 일반 샘플 25건"));
children.push(bullet("통과 기준 (v1.6): 주목표 정확도 ≥ 80% + 연계목표 Jaccard ≥ 0.50 (기준 샘플 25건)"));
children.push(bullet("기준 미달 시: 연구자와 1:1 면담 후 재파일럿 진행 (재시도 1회)"));
children.push(bullet("v2 UI 파일럿 모드(blind)로 3인 동일 50건 재라벨링 수행 — 부록 C 참조"));

// ────────────────────────────────────────────
// 제2장 (SDG 17 전체 유지, 리네이밍 표기)
// ────────────────────────────────────────────
children.push(h1("제2장 SDG 라벨 정의 및 판단 기준 (17개 전체)"));
children.push(para("아래 17개 SDG 각각에 대해 UN 공식 정의, 지방정부 적용 범위, 포함/제외 사례, Red Tag 주의사항, 전형적 연계목표를 제시합니다. ★ 표시는 '희소 클래스'로, 목적표집 최소 30건이 배정됩니다."));

function sdgBlock(no, star, title, unDef, scope, incExc, redTag, nexus) {
  children.push(h2(`SDG ${no}${star ? "  ★ 희소 클래스" : ""}  ${title}`));
  {
    const rows = [];
    rows.push(new TableRow({ children: [
      cell("UN 공식 정의", 3000, { bold: true, fill: "F2F2F2" }),
      cell(unDef, CONTENT_WIDTH - 3000)
    ]}));
    rows.push(new TableRow({ children: [
      cell("지방정부 적용 범위", 3000, { bold: true, fill: "F2F2F2" }),
      cell(scope, CONTENT_WIDTH - 3000)
    ]}));
    if (nexus) {
      rows.push(new TableRow({ children: [
        cell("전형적 연계목표", 3000, { bold: true, fill: "E2EFD9" }),
        cell(nexus, CONTENT_WIDTH - 3000)
      ]}));
    }
    children.push(makeTable(rows));
  }
  {
    const rows = [];
    rows.push(new TableRow({ children: [
      headerCell("포함 사례 (라벨링 O)", CONTENT_WIDTH / 2),
      headerCell("제외 사례 (다른 SDG 검토)", CONTENT_WIDTH / 2),
    ]}));
    const maxLen = Math.max(incExc.inc.length, incExc.exc.length);
    for (let i = 0; i < maxLen; i++) {
      rows.push(new TableRow({ children: [
        cell(incExc.inc[i] ? "O  " + incExc.inc[i] : "", CONTENT_WIDTH / 2),
        cell(incExc.exc[i] ? "X  " + incExc.exc[i] : "", CONTENT_WIDTH / 2),
      ]}));
    }
    children.push(makeTable(rows));
  }
  children.push(para("⚠ Red Tag 주의: " + redTag, { bold: true, color: "C00000" }));
}

sdgBlock(1, false, "빈곤 종식", "모든 곳에서 모든 형태의 빈곤 종식",
  "기초생활수급자·차상위계층 지원, 긴급복지, 취약계층 자립 지원",
  {
    inc: ["기초생활수급 지원사업", "차상위계층 의료비 지원", "주거취약계층 주거개선", "긴급복지 지원"],
    exc: ["단순 건물 리모델링(수혜자가 저소득층이 아닌 경우)", "일반 복지관 운영(SDG 3·10 우선 검토)"]
  },
  "저소득층 지원을 명목으로 하나 실제 수혜자가 불명확한 경우",
  "SDG 3(의료비 지원), SDG 10(구조적 불평등 해소), SDG 7(에너지 바우처 시)");

sdgBlock(2, false, "기아 종식", "기아 종식, 식량 안보 달성, 지속가능한 농업 증진",
  "친환경 농업, 학교·공공급식 지원, 도시농업, 식품 지원",
  {
    inc: ["친환경 농산물 생산 지원", "공공급식 확대사업", "도시텃밭 조성", "로컬푸드 지원"],
    exc: ["일반 농촌 개발(SDG 11)", "식품가공 산업 지원(SDG 8)"]
  },
  "농지 확장을 위한 산지·습지 훼손(SDG 15 상충)",
  "SDG 12(로컬푸드·지속가능 소비), SDG 15(친환경 농업), SDG 3(공공급식 영양)");

sdgBlock(3, false, "건강과 웰빙", "모든 연령층의 건강한 삶 보장 및 복지 증진",
  "보건소 운영, 정신건강, 의료비 지원, 감염병 대응, 노인 돌봄",
  {
    inc: ["보건소 운영비", "정신건강 위기대응", "어르신 방문건강관리", "장애인 의료비", "감염병 대응"],
    exc: ["스포츠 시설(직접 건강증진 목적 아닌 경우)", "관광·레저(SDG 11)"]
  },
  "건강 증진 명목이나 실제로는 홍보·행사 중심인 경우",
  "SDG 1(저소득 의료비), SDG 10(장애인 의료), SDG 5(여성 건강)");

sdgBlock(4, false, "양질의 교육", "포용적이고 공평한 양질의 교육 보장 및 평생학습 기회 증진",
  "평생교육, 아동·청소년 교육 지원, 도서관, 직업훈련",
  {
    inc: ["평생학습 프로그램", "방과후 돌봄교실", "공공도서관 운영", "직업훈련 지원"],
    exc: ["학교 건물 신축(교육청 사무)", "단순 행사·축제(SDG 11)"]
  },
  "교육 명목이나 특정 집단 홍보·이념 교육에 편중된 경우",
  "SDG 8(직업훈련 → 취업), SDG 10(다문화·취약계층 교육), SDG 5(여성 교육)");

sdgBlock(5, false, "성평등", "성평등 달성 및 모든 여성·여아의 권익 신장",
  "성인지 예산, 여성 권익, 가정폭력 피해자 지원, 경력단절 여성 지원",
  {
    inc: ["여성폭력 피해자 지원센터", "경력단절 여성 직업훈련", "성평등 문화 확산"],
    exc: ["일반 여성 복지(SDG 1·3 우선 검토)", "단순 여성 행사"]
  },
  "성평등 명목이나 특정 성별 역할 강화에 편중된 경우",
  "SDG 8(경력단절 여성 취업), SDG 10(불평등 해소), SDG 16(폭력 피해자 구제)");

sdgBlock(6, false, "깨끗한 물과 위생", "모든 사람을 위한 물과 위생의 이용 가능성 및 지속가능한 관리 보장",
  "상하수도 관리, 수질 개선, 하천 정화, 빗물 재이용",
  {
    inc: ["상수도 시설 개량", "하수처리장 운영", "하천수질 개선(인간 이용 목적)", "빗물이용시설"],
    exc: ["하천 경관 조성(SDG 11·15)", "친수공간(SDG 15)", "수변 생태복원(생태 목적이면 SDG 14)"]
  },
  "하천 정비 명목이나 실제 콘크리트화·직강화로 수생태계 파괴 → SDG 14·15 상충",
  "SDG 11(도시 물 인프라), SDG 14(수생태 보전 병행 시)");

sdgBlock(7, false, "깨끗한 에너지", "모든 사람을 위한 저렴하고 신뢰할 수 있는 지속가능한 현대적 에너지 접근 보장",
  "신재생에너지 보급, 에너지 효율화, 에너지 복지",
  {
    inc: ["태양광 설치 지원", "에너지효율화 사업", "에너지 취약계층 지원", "그린 공공건물"],
    exc: ["화석연료 관련 인프라", "일반 도로 가로등(SDG 11)"]
  },
  "산지·생태보전지역 태양광 설치(SDG 15 상충), 바이오매스 소각(SDG 13·15 상충)",
  "SDG 13(온실가스 감축), SDG 1(에너지 바우처 → 빈곤 완화), SDG 11(도시 에너지 전환)");

sdgBlock(8, false, "경제성장·일자리", "포용적이고 지속가능한 경제성장, 완전하고 생산적인 고용 및 양질의 일자리 증진",
  "일자리 창출, 소상공인·중소기업 지원, 산업 육성, 청년 취업",
  {
    inc: ["소상공인 경영 지원", "청년 취업 지원", "지역 산업 육성", "창업 지원"],
    exc: ["대기업 유치 인프라(SDG 9 검토)", "단순 관광 홍보(SDG 11)"]
  },
  "산업단지 조성으로 인한 녹지·습지 훼손(SDG 13·15 상충)",
  "SDG 9(기술창업·R&D), SDG 10(취약계층 일자리), SDG 4(직업훈련 연계)");

sdgBlock(9, true, "산업·혁신·인프라", "복원력 있는 인프라 구축, 포용적이고 지속가능한 산업화 촉진 및 혁신 장려",
  "스마트시티·디지털 인프라, 지역 혁신 거점, 기술 고도화, 공공 ICT 인프라 구축",
  {
    inc: ["스마트시티 플랫폼 구축", "디지털 행정 인프라", "지역 혁신거점(테크노파크 등) 지원", "공공 와이파이 확충", "4차산업 기반 지원"],
    exc: ["일반 도로·교량(SDG 11 검토)", "단순 소상공인 지원(SDG 8)", "IT 장비 단순 구매(목적 불명확)"]
  },
  "혁신 명목이나 특정 기업 특혜성 보조, 환경영향평가 없는 대규모 인프라",
  "SDG 11(스마트시티→도시관리), SDG 16(디지털 행정), SDG 8(기술창업)");

sdgBlock(10, false, "불평등 감소", "국가 내 및 국가 간 불평등 감소",
  "장애인 지원, 다문화·외국인 지원, 노인 복지(구조적 불평등), 지역격차 해소",
  {
    inc: ["장애인 활동 지원", "다문화가족 지원", "농촌 지역 인프라 개선", "외국인 근로자 지원"],
    exc: ["일반 복지(SDG 1·3 우선)", "단순 시설 건립(수혜계층 불명확한 경우)"]
  },
  "불평등 해소 명목이나 특정 집단 배제·차별 요소 포함",
  "SDG 1(저소득+구조적 빈곤), SDG 3(장애인 의료), SDG 4(다문화 교육)");
children.push(para("▣ SDG 10 과다 선택 주의: 수혜자가 취약계층이라는 사실만으로 SDG 10이 되지 않는다. '핵심 변화'가 경제적 빈곤 탈출이면 SDG 1, 건강·돌봄이면 SDG 3, 구조적 불평등 해소(장애·다문화·격차 등)이면 SDG 10이다. 제4장 4-5 결정 트리 참조.", { bold: true, color: "2E74B5" }));

sdgBlock(11, false, "지속가능 도시", "포용적이고 안전하며 복원력 있고 지속가능한 도시 및 거주지 조성",
  "도시재생, 대중교통, 주거 지원, 문화시설, 공원·녹지, 재난 안전",
  {
    inc: ["도시재생 뉴딜", "대중교통 개선", "공공임대주택", "공원 조성", "재난안전망"],
    exc: ["단순 건물 신축(수혜 목적 불명확)", "기반시설 도로·교량(SDG 9 검토)"]
  },
  "도시 확장·개발로 인한 농지·녹지·생태계 훼손(SDG 13·15 상충)",
  "SDG 13(녹지 → 탄소흡수), SDG 1(공공임대 → 주거복지), SDG 9(대중교통 인프라)");

sdgBlock(12, true, "책임감 있는 소비·생산", "지속가능한 소비와 생산 양식 보장",
  "자원순환·재활용, 공공 녹색조달, 음식물쓰레기 감축, 제로웨이스트",
  {
    inc: ["자원순환센터 운영", "음식물쓰레기 감량 사업", "공공기관 녹색제품 구매", "제로웨이스트 캠페인", "일회용품 감축 지원"],
    exc: ["일반 쓰레기 수거(SDG 11)", "단순 환경 청소(SDG 15)", "재활용 수거 차량 구매(수단이 목적인 경우)"]
  },
  "재활용 명목이나 소각·매립 중심 처리, 그린워싱 홍보 위주 사업(SDG Washing)",
  "SDG 13(자원순환 → 온실가스 감축), SDG 9(재활용 기술), SDG 2(로컬푸드 → 식량순환)");

sdgBlock(13, false, "기후행동", "기후변화와 그 영향에 맞서기 위한 긴급 행동",
  "탄소중립, 온실가스 감축, 기후변화 적응, 녹지 확충",
  {
    inc: ["탄소중립 실행계획", "온실가스 감축 사업", "기후변화 취약계층 지원", "도시숲 조성(탄소흡수 기능 명시 시)"],
    exc: ["일반 환경 청소(SDG 15)", "단순 나무 심기(탄소흡수 미명시 시 SDG 15 검토)"]
  },
  "탄소중립 명목이나 화석연료 관련 보조(자기모순), 녹지 파괴 수반 사업",
  "SDG 7(재생에너지 전환), SDG 11(도시 탄소중립), SDG 15(산림·녹지)");

sdgBlock(14, true, "수중 생태계", "지속가능발전을 위한 대양, 바다, 해양자원 보전 및 지속가능한 이용",
  "한강·임진강 등 수계 생태 보전, 수생생물 보호, 내수면 어업 지원, 수변 생태계 복원",
  {
    inc: ["한강 수생생물 보호사업", "내수면 수산자원 조성", "수변 생태복원(생태 목적)", "수질 개선(생태 목적)", "외래 수중 생물 제거"],
    exc: ["일반 하천 수질관리(SDG 6 우선 — 인간 이용 목적)", "하천 경관 조성(SDG 11)", "수산물 단순 소비 지원(SDG 2)"]
  },
  "수중 생태 복원 명목이나 하천 콘크리트화·준설로 서식지 파괴(SDG 15·6 상충)",
  "SDG 6(수질 연계), SDG 15(수변 육상생태), SDG 2(내수면 어업)");

sdgBlock(15, false, "육상 생태계", "육상 생태계 보호·복원, 지속가능한 산림 관리, 사막화 방지, 생물다양성 보전",
  "산림 보호, 생태하천 복원, 야생동물 보호, 생물다양성",
  {
    inc: ["생태하천 복원", "산림보호 사업", "야생동물 구조센터", "생태교란종 관리", "생물다양성 보전"],
    exc: ["하천 경관 조성(생태 목적 아닌 경우, SDG 11)", "농지 개간(SDG 2 상충)"]
  },
  "생태 복원 명목이나 콘크리트 구조물 설치, 외래종 도입 포함",
  "SDG 13(산림 → 탄소흡수), SDG 14(수변 생태 연계), SDG 11(도시숲)");

sdgBlock(16, false, "평화·정의·강력한 제도", "지속가능발전을 위한 평화롭고 포용적인 사회 증진, 효과적·책임 있는 포용적 제도 구축",
  "주민참여예산, 부패 방지, 정보 공개, 행정 혁신, 인권 보호",
  {
    inc: ["주민참여예산 운영", "공공데이터 개방", "반부패 교육", "행정혁신 추진", "인권 침해 구제"],
    exc: ["일반 행정 운영비(목적 불명확 — NA-OUTSIDE)", "단순 홍보(SDG 내용 없는 경우)"]
  },
  "투명성 명목이나 실제 정보 접근 제한, 주민 의견 형식적 수렴",
  "SDG 9(디지털 행정 플랫폼), SDG 10(인권·차별 시정), SDG 17(국제 투명성 협력)");

sdgBlock(17, true, "글로벌 파트너십", "이행수단 강화 및 지속가능발전을 위한 글로벌 파트너십 재활성화",
  "국제자매도시 교류, 글로벌 도시 네트워크 참여, 해외 우수사례 벤치마킹, ODA 지방분권 연계",
  {
    inc: ["자매도시 교류 사업", "글로벌 도시 협약 참여(이클레이 등)", "개발도상국 지방행정 지원", "국제 SDGs 네트워크 참여"],
    exc: ["단순 해외 출장·연수(학습 목적이 아닌 경우)", "외국인 주민 지원(SDG 10 우선)", "국제 행사 유치(SDG 11 검토)"]
  },
  "파트너십 명목이나 실질 협력 없이 홍보·행사에만 집중된 경우(SDG Washing)",
  "SDG 16(국제 거버넌스), SDG 13(기후 국제협력), SDG 11(도시간 네트워크)");

// NA
children.push(h2("2-18. NA 분류 — 2유형 (v1.5 유지)"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("NA 유형", 2800),
    headerCell("정의", 4500),
    headerCell("v2 UI tier", 2000),
    headerCell("전형 사례", CONTENT_WIDTH - 9300),
  ]}));
  rows.push(new TableRow({ children: [
    cell("NA-OUTSIDE (17개 외)", 2800, { bold: true, fill: "E2EFD9" }),
    cell("사업이 SDG 17개 범주 어디에도 해당하지 않음이 명확한 경우 (순수 행정운영비, 청사 관리, 내부 회의비, 공무원 복리후생 등)", 4500),
    cell("certain", 2000),
    cell("청사 건물 유지관리, 부서 업무추진비, 직원 맞춤형 복지비", CONTENT_WIDTH - 9300),
  ]}));
  rows.push(new TableRow({ children: [
    cell("NA-UNSURE (판단 불가)", 2800, { bold: true, fill: "FFE5E5" }),
    cell("텍스트 정보가 부족하여 SDG를 판단할 수 없는 경우 (사업내용 공란, 재활용 사업 추진만 명시 등)", 4500),
    cell("unknown (자동)", 2000),
    cell("'사업 추진'만 명시된 경우, 구체적 집행 방법 불명확", CONTENT_WIDTH - 9300),
  ]}));
  children.push(makeTable(rows));
}
children.push(para("▣ NA 선택 시 연계목표는 선택할 수 없습니다 (v2 UI 자동 숨김). NA 비율이 20%를 초과하면 과소 라벨링을, 3% 미만이면 과대 라벨링(강제 SDG 배정)을 연구자와 확인하세요."));

// ────────────────────────────────────────────
// 제3장 Red Tag (v1.5 유지)
// ────────────────────────────────────────────
children.push(h1("제3장 Red Tag 판단 기준"));

children.push(h2("3-1. Red Tag란?"));
children.push(para("표면적으로 SDGs에 부합하는 것처럼 보이지만, 실질적으로 다른 SDG 목표와 상충하거나 지속가능성에 부정적 영향을 주는 예산 사업을 의미합니다. Venturini et al.(2020)의 SDG Nexus 프레임워크에 이론적 근거를 둡니다."));

children.push(h2("3-2. Red Tag 유형 3가지"));
children.push(h3("유형 A — SDG 상충 (Nexus Trade-off)"));
children.push(para("사업이 특정 SDG를 달성하는 수단을 사용하지만, 그 수단이 동시에 다른 SDG 목표를 저해하는 경우"));
children.push(bullet("예시 1: 산업단지 기반시설 조성 → SDG 8(경제성장) 긍정, 농지·녹지 훼손으로 SDG 13·15 부정"));
children.push(bullet("예시 2: 바이오매스 연료 활용 에너지 사업 → SDG 7 긍정, 소각 과정 온실가스로 SDG 13 부정"));
children.push(bullet("예시 3: 산지 대형 태양광 단지 조성 → SDG 7 긍정, 산림 훼손으로 SDG 15 부정"));
children.push(para("▣ 구분: Nexus 체크리스트 Q2에서 '저해' 유형은 연계목표가 아니라 Red Tag A로 처리합니다.", { bold: true, color: "2E74B5" }));

children.push(h3("유형 B — SDG Washing"));
children.push(para("사업명·목적에 친환경·친사회적 표현이 사용되었으나, 사업내용이 실질적 SDGs 기여와 무관한 경우"));
children.push(bullet("예시 1: 그린 관광 홍보관 건립 → 사업명은 환경적이지만 내용은 관광 인프라"));
children.push(bullet("예시 2: 탄소중립 도시 이미지 광고 제작 → 감축 조치 없이 홍보만"));
children.push(bullet("예시 3: SDG 17 자매도시 교류 명목이나 실질 협력 없이 행사·연수만"));

children.push(h3("유형 C — 역행 투자 (Anti-SDG)"));
children.push(para("특정 SDG 목표의 달성을 직접적으로 저해하는 사업 (SDG 명시 여부와 무관)"));
children.push(bullet("예시 1: 화석연료 관련 시설 확장 보조 → SDG 7·13 직접 역행"));
children.push(bullet("예시 2: 콘크리트 하천 정비(생태하천 훼손) → SDG 6·14·15 역행"));
children.push(bullet("예시 3: 재활용 명목이나 실제 소각 중심 처리 → SDG 12 역행"));

children.push(h2("3-3. SDG 상충 쌍 체크리스트"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("상충 쌍", 2500),
    headerCell("SDG (긍정)", 2500),
    headerCell("SDG (부정)", 2500),
    headerCell("전형적 사업 패턴", CONTENT_WIDTH - 7500)
  ]}));
  const items = [
    ["경제 ↔ 기후", "SDG 8 경제성장", "SDG 13 기후행동", "산업단지·공단 조성, 도로 신설·확장"],
    ["경제 ↔ 생태", "SDG 8 경제성장", "SDG 15 육상생태계", "골프장·리조트 개발, 녹지 상업화"],
    ["농업 ↔ 생태", "SDG 2 식량안보", "SDG 15 육상생태계", "농지 개간, 하천변 농경지 전환"],
    ["에너지 ↔ 생태", "SDG 7 청정에너지", "SDG 15 육상생태계", "산지 대형 태양광, 댐 건설"],
    ["에너지 ↔ 기후", "SDG 7 (바이오매스)", "SDG 13 기후행동", "바이오매스 소각 에너지"],
    ["도시 ↔ 기후", "SDG 11 지속가능도시", "SDG 13 기후행동", "도시 외곽 신개발지 조성"],
    ["도시 ↔ 생태", "SDG 11 지속가능도시", "SDG 15 육상생태계", "그린벨트 해제 개발"],
    ["물 ↔ 생태", "SDG 6 수자원", "SDG 14·15 생태계", "콘크리트 하천 정비·직강화"],
    ["소비 ↔ 기후", "SDG 12 책임소비", "SDG 13 기후행동", "재활용 명목 소각 처리"],
    ["혁신 ↔ 환경", "SDG 9 혁신인프라", "SDG 13·15", "대규모 인프라로 인한 생태 훼손"],
  ];
  items.forEach(([a, b, c, d]) => {
    rows.push(new TableRow({ children: [
      cell(a, 2500, { bold: true }), cell(b, 2500), cell(c, 2500), cell(d, CONTENT_WIDTH - 7500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("3-4. Red Tag 판정 체크리스트 (v1.5 유지)"));

children.push(h3("유형 A (SDG 상충) — 3문항 중 2개 이상 YES"));
children.push(bullet("Q1. 사업 수단(인프라·시설·개발)이 구체적으로 기재되어 있는가?"));
children.push(bullet("Q2. 그 수단이 3-3 표의 상충 쌍 중 하나에 명확히 해당하는가?"));
children.push(bullet("Q3. 사업의 긍정 효과와 3-3 표의 부정 효과가 동일 사업 내에서 동시 발생하는가?"));

children.push(h3("유형 B (SDG Washing) — 3문항 중 2개 이상 YES"));
children.push(bullet("Q1. 사업 예산의 50% 이상이 홍보·이벤트·행사·구조물 건립에 배정되었는가?"));
children.push(bullet("Q2. 사업내용에 측정 가능한 SDG 성과지표(감축량, 수혜자 수, 재활용률 등)가 부재하는가?"));
children.push(bullet("Q3. 수혜자·대상이 SDG와 무관한 일반 대중이며, 직접적 SDG 개선 효과가 불분명한가?"));

children.push(h3("유형 C (역행 투자) — 4문항 중 1개 이상 YES"));
children.push(bullet("Q1. 사업 수단이 특정 SDG를 '직접 저해'하는 것(화석연료, 콘크리트 직강화, 소각 중심 등)인가?"));
children.push(bullet("Q2. 해당 수단이 SDG 어젠다의 핵심 원칙(탄소감축, 생태복원, 자원순환)과 정면 배치되는가?"));
children.push(bullet("Q3. 사업명이 SDG를 표방하더라도 실제 집행 수단이 SDG 역행 방향인가?"));
children.push(bullet("Q4. 비교 대상 SDG를 1개 이상 특정할 수 있는가(예: 'SDG 12 역행')?"));

children.push(para("▣ v2 UI M-04 가드레일: Red Tag A/B/C 선택 시 판단 근거(rationale) 한 줄 입력이 필수입니다.", { bold: true, color: "C00000" }));

// ────────────────────────────────────────────
// 제4장 경계 사례 (v1.5 유지 + 4-7 신규)
// ────────────────────────────────────────────
children.push(h1("제4장 경계 사례 판단 가이드"));

children.push(h2("4-1. 복지 관련 사업의 SDG 구별"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("사업 패턴", CONTENT_WIDTH / 3),
    headerCell("주목표 SDG", 2500),
    headerCell("판단 근거", CONTENT_WIDTH - CONTENT_WIDTH/3 - 2500)
  ]}));
  const items = [
    ["저소득층 생계 지원, 기초생활수급", "SDG 1 (빈곤)", "경제적 빈곤 탈출이 핵심 목적"],
    ["의료비 지원, 정신건강, 돌봄", "SDG 3 (건강)", "건강·웰빙 개선이 핵심 목적"],
    ["장애인·다문화 지원", "SDG 10 (불평등)", "구조적 불평등 해소가 핵심 목적"],
    ["여성 권익·성평등", "SDG 5 (성평등)", "성별 기반 불평등이 핵심 목적"],
    ["노인 복지 (생계)", "SDG 1", "경제적 취약 노인 지원"],
    ["노인 복지 (돌봄·건강)", "SDG 3", "건강·돌봄 서비스 제공"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, CONTENT_WIDTH / 3), cell(b, 2500, { bold: true }),
      cell(c, CONTENT_WIDTH - CONTENT_WIDTH/3 - 2500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("4-2. 환경 관련 사업의 SDG 구별"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("사업 패턴", CONTENT_WIDTH / 3),
    headerCell("주목표 SDG", 2500),
    headerCell("판단 근거", CONTENT_WIDTH - CONTENT_WIDTH/3 - 2500)
  ]}));
  const items = [
    ["온실가스 감축, 탄소중립", "SDG 13 (기후행동)", "기후변화 대응이 핵심"],
    ["신재생에너지 설치·보급", "SDG 7 (에너지)", "에너지 전환이 핵심"],
    ["하천수질 개선, 상하수도 (인간 이용)", "SDG 6 (물·위생)", "인간의 물 이용이 핵심"],
    ["하천 수생태계·수생생물 보전", "SDG 14 (수중생태계) ★", "생물다양성 보전이 핵심"],
    ["자원순환·재활용·제로웨이스트", "SDG 12 (책임소비) ★", "소비·생산 방식 전환이 핵심"],
    ["생태하천 복원, 산림 보호", "SDG 15 (생태계)", "생물다양성·생태계 보전이 핵심"],
    ["공원 조성, 도시녹지", "SDG 11 (지속가능도시)", "도시 환경 개선이 핵심"],
    ["도시숲 조성 (탄소흡수 명시)", "SDG 13 (기후행동)", "탄소흡수 기능이 사업목적에 명시된 경우"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, CONTENT_WIDTH / 3), cell(b, 2500, { bold: true }),
      cell(c, CONTENT_WIDTH - CONTENT_WIDTH/3 - 2500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("4-3. 디지털·혁신 사업의 SDG 구별"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("사업 패턴", CONTENT_WIDTH / 3),
    headerCell("주목표 SDG", 2500),
    headerCell("주의사항", CONTENT_WIDTH - CONTENT_WIDTH/3 - 2500)
  ]}));
  const items = [
    ["스마트시티 플랫폼, 디지털 인프라", "SDG 9 (혁신인프라) ★", "기술·인프라 혁신이 핵심"],
    ["디지털 행정서비스 고도화", "SDG 9 또는 SDG 16", "목적이 행정 혁신이면 SDG 16, 기술 인프라면 SDG 9"],
    ["소상공인 ICT 지원", "SDG 8 (경제성장)", "경제적 지원이 핵심, ICT는 수단"],
    ["전자민주주의·공공데이터 개방", "SDG 16 (제도)", "투명성·참여가 핵심"],
    ["4차산업 혁신 생태계 조성", "SDG 9 (혁신인프라) ★", "산업 혁신 생태계 구축이 목적"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, CONTENT_WIDTH / 3), cell(b, 2500, { bold: true }),
      cell(c, CONTENT_WIDTH - CONTENT_WIDTH/3 - 2500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("4-4. 국제협력·파트너십 사업의 SDG 구별"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("사업 패턴", CONTENT_WIDTH / 3),
    headerCell("주목표 SDG", 2500),
    headerCell("주의사항", CONTENT_WIDTH - CONTENT_WIDTH/3 - 2500)
  ]}));
  const items = [
    ["국제 자매도시 교류·협력", "SDG 17 (파트너십) ★", "실질 협력 목적이 명시된 경우"],
    ["이클레이·C40 등 국제 도시 네트워크", "SDG 17 (파트너십) ★", "글로벌 SDGs 이행 네트워크"],
    ["외국인 주민 지원", "SDG 10 (불평등)", "국내 불평등 해소가 핵심"],
    ["국제 행사·박람회 유치", "SDG 11 (지속가능도시)", "도시 경쟁력·문화가 핵심"],
    ["해외 연수·공무 출장", "NA (해당없음)", "단순 학습·업무 목적, SDG 직접 기여 불명확"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, CONTENT_WIDTH / 3), cell(b, 2500, { bold: true }),
      cell(c, CONTENT_WIDTH - CONTENT_WIDTH/3 - 2500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("4-5. SDG 10 ↔ SDG 1 · SDG 3 구분 결정 트리 (v1.5 유지)"));
children.push(...codeBlock([
  "Q1. 사업의 '핵심 변화(change)'가 무엇인가?",
  "   (A) 경제적 빈곤 탈출 → SDG 1",
  "   (B) 건강 개선 → SDG 3",
  "   (C) 구조적 불평등 해소 (장애인·다문화·지역격차) → SDG 10",
  "   (D) 교육·학습 기회 → SDG 4",
  "결정:",
  "  - 저소득 노인 의료비 지원 → SDG 3 (연계 SDG 1 가능)",
  "  - 저소득 가구 긴급 생계비 → SDG 1",
  "  - 장애인 활동 보조 인력 지원 → SDG 10 (연계 SDG 3 가능)",
  "  - 다문화 가족 한국어 교육 → SDG 4 (연계 SDG 10)",
]));

children.push(h2("4-6. SDG 8 ↔ SDG 9 구분 결정 트리 (v1.5 유지)"));
children.push(...codeBlock([
  "Q1. 사업의 '주 목적'이 무엇인가?",
  "   (A) 일자리 창출, 고용 지원 → SDG 8",
  "   (B) 기술·인프라, 혁신 생태계 → SDG 9",
  "Q2. 수단이 무엇인가?",
  "   (D) 보조금, 컨설팅, 훈련 → SDG 8",
  "   (E) 플랫폼, R&D 시설 → SDG 9",
  "결정:",
  "  - 청년 창업 초기자금 → SDG 8 (연계 SDG 9 가능)",
  "  - 스마트시티 플랫폼 → SDG 9 (연계 SDG 11)",
  "  - 소상공인 ICT 교육 → SDG 8",
  "  - 테크노파크 R&D 지원 → SDG 9",
]));

// NEW 4-7: 연계목표 판정 예시
children.push(h2("4-7. [신규 v1.6] 연계목표 판정 예시 — Nexus 적용 샘플"));
children.push(para("아래 예시는 Nexus 체크리스트 3문항을 적용한 실전 판정 사례입니다. 연계목표 사용률 25~35%를 달성하려면 '명확한 YES만 추가' 원칙을 엄격히 적용해야 합니다."));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("사업 예시", 3500),
    headerCell("주목표", 1800),
    headerCell("Nexus Q1/Q2/Q3", 2200),
    headerCell("연계목표", 2000),
    headerCell("판단 근거", CONTENT_WIDTH - 9500)
  ]}));
  const items = [
    ["저소득층 에너지 바우처", "SDG 7", "Q1 YES (저소득+에너지)", "SDG 1", "수혜자가 두 SDG 영역 동시 충족"],
    ["스마트시티 통합플랫폼", "SDG 9", "Q2 YES (수단이 도시관리)", "SDG 11", "사업 수단이 다른 SDG에 기여"],
    ["음식물쓰레기 감량", "SDG 12", "Q2 YES (감축 과정 = 온실가스 감소)", "SDG 13", "수단의 부수 효과가 명확"],
    ["공공급식 확대", "SDG 2", "Q3 YES (영양+건강 명시)", "SDG 3", "사업목적에 두 SDG 키워드"],
    ["경력단절 여성 직업훈련", "SDG 5", "Q1 YES (여성+일자리)", "SDG 8", "성평등 + 고용 동시 기여"],
    ["도시숲 조성 (탄소흡수 명시)", "SDG 13", "Q2 YES (녹지 확충)", "SDG 11, SDG 15", "2개 연계 모두 명확 (상한 도달)"],
    ["도시재생 뉴딜", "SDG 11", "모두 NO", "(없음)", "수혜자·수단·목적 모두 도시 한정"],
    ["청사 경비 용역비", "NA-OUTSIDE", "—", "(없음)", "NA는 연계목표 선택 불가"],
    ["보건소 운영비", "SDG 3", "모두 NO", "(없음)", "일반 의료 서비스, 단일 SDG 명확"],
    ["태양광 설치 지원 (저소득 한정)", "SDG 7", "Q1 YES", "SDG 1", "수혜자 + 저탄소 모두 명시"],
  ];
  items.forEach(([a, b, c, d, e]) => {
    rows.push(new TableRow({ children: [
      cell(a, 3500),
      cell(b, 1800, { bold: true }),
      cell(c, 2200),
      cell(d, 2000, { bold: true, fill: "E2EFD9" }),
      cell(e, CONTENT_WIDTH - 9500)
    ]}));
  });
  children.push(makeTable(rows));
}

// ────────────────────────────────────────────
// 제5장
// ────────────────────────────────────────────
children.push(h1("제5장 라벨링 시트 작성 요령"));

children.push(h2("5-1. [개정 v1.6] 라벨 코드 목록"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("코드", 2800), headerCell("의미", 4500),
    headerCell("비고", CONTENT_WIDTH - 7300)
  ]}));
  const items = [
    ["SDG01 ~ SDG17", "주목표 또는 연계목표 SDG", "17개 중 선택"],
    ["NA", "해당없음 — 사유 필수 지정", "NA-OUTSIDE 또는 NA-UNSURE (연계목표 불가)"],
    ["NA-OUTSIDE", "17개 외 사업 (명확히 SDG 무관)", "행정운영비·청사관리 등"],
    ["NA-UNSURE", "판단 불가 (정보 부족)", "사업내용 공란 등 — tier=unknown 자동"],
    ["HOLD", "판단 보류", "담당 연구자에게 문의"],
    ["RT-A", "Red Tag 유형 A (SDG 상충)", "주목표와 함께 표기 + 판단근거 필수"],
    ["RT-B", "Red Tag 유형 B (SDG Washing)", "주목표와 함께 표기 + 판단근거 필수"],
    ["RT-C", "Red Tag 유형 C (역행투자)", "주목표와 함께 표기 + 판단근거 필수"],
    ["RT-NONE", "Red Tag 없음", "판단근거 선택 입력"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, 2800, { bold: true }), cell(b, 4500), cell(c, CONTENT_WIDTH - 7300)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("5-2. [개정 v1.6] 작성 예시"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("사업명", 3800),
    headerCell("주목표", 1600),
    headerCell("연계목표", 2000),
    headerCell("Red Tag", 1400),
    headerCell("근거 메모", CONTENT_WIDTH - 8800),
  ]}));
  const items = [
    ["저소득층 에너지 바우처", "SDG07", "SDG01", "RT-NONE", "에너지 접근성 + 빈곤 해소"],
    ["스마트시티 통합플랫폼 구축 ★", "SDG09", "SDG11", "RT-NONE", "디지털 인프라 + 도시관리"],
    ["음식물쓰레기 감량 사업 ★", "SDG12", "SDG13", "RT-NONE", "책임소비 + 탄소감축"],
    ["한강 수생생물 서식지 복원 ★", "SDG14", "SDG15", "RT-NONE", "내수면 생태 + 육상생태"],
    ["자매도시 SDGs 협력 교류 ★", "SDG17", "(없음)", "RT-NONE", "주목표만 명확"],
    ["도시숲 조성 (탄소흡수 명시)", "SDG13", "SDG11, SDG15", "RT-NONE", "연계 2개 상한 도달"],
    ["산업단지 기반시설 조성", "SDG08", "(없음)", "RT-A", "농지 훼손 SDG13·15 상충 (연계 아닌 Red Tag)"],
    ["그린시티 홍보 영상 제작", "SDG11", "(없음)", "RT-B", "홍보 위주·성과지표 부재"],
    ["하천 콘크리트 직강화 정비", "SDG11", "(없음)", "RT-C", "수생태계 SDG14·15 역행"],
    ["청사 경비 용역비", "NA-OUTSIDE", "(불가)", "RT-NONE", "순수 행정운영비"],
    ["재활용 사업 추진 (내용 공란)", "NA-UNSURE", "(불가)", "RT-NONE", "정보 부족 — RT-B 아님"],
  ];
  items.forEach(([a, b, c, d, e]) => {
    rows.push(new TableRow({ children: [
      cell(a, 3800), cell(b, 1600, { bold: true }),
      cell(c, 2000), cell(d, 1400),
      cell(e, CONTENT_WIDTH - 8800)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("5-3. FAQ"));
children.push(h3("Q1. SDG 9·12·14·17 희소 클래스는 얼마나 엄격하게 적용해야 하나요?"));
children.push(para("다른 SDG와 동일한 기준을 적용합니다. 사업목적 텍스트에 해당 SDG 연관 키워드가 명확히 포함된 경우에만 선택하고, 애매하면 HOLD로 표시하세요."));
children.push(h3("Q2. SDG 9인지 SDG 8인지 구별이 어렵습니다."));
children.push(para("제4장 4-6 결정 트리를 적용하세요. 핵심: 목적이 '기술·인프라 혁신 자체'인가, '경제적 지원·일자리'인가?"));
children.push(h3("Q3. SDG 14는 해양이 없는 경기도에서 어떻게 적용하나요?"));
children.push(para("SDG 14는 해양뿐 아니라 내수면(강·호수·저수지) 생태계도 포함합니다. SDG 6과 구별: '인간의 물 이용 개선'이면 SDG 6, '수생생물 보전'이면 SDG 14."));
children.push(h3("Q4. SDG 17 자매도시 교류와 단순 해외 출장을 어떻게 구별하나요?"));
children.push(para("사업목적에 '협력', '파트너십', '공동사업', '네트워크 참여'가 명시되고 상호 교류 내용이 있으면 SDG 17, 단순 벤치마킹·연수·공무 출장이면 NA로 처리."));
children.push(h3("Q5. [개정 v1.6] 주목표와 연계목표의 차이가 무엇인가요?"));
children.push(para("주목표(Principal)는 사업의 '핵심 목표'로 AI 단일 레이블 분류 모델 학습에 사용됩니다. 반드시 1개만 선택합니다. 연계목표(Significant)는 '부가적으로 명확히 기여하는 목표'로 다중 레이블 분류 및 Nexus 분석에 활용됩니다. 최대 2개까지 선택 가능하며, Nexus 체크리스트(1-4) 3문항 중 1개 이상 YES일 때만 추가합니다."));
children.push(h3("Q6. 수혜자가 장애인이면 자동으로 SDG 10인가요?"));
children.push(para("아니오. 핵심 변화가 의료·돌봄이면 SDG 3, 생계 지원이면 SDG 1, 교육이면 SDG 4, 구조적 불평등 해소이면 SDG 10입니다. 1-3 결정 트리와 4-5 결정 트리를 적용하세요."));
children.push(h3("Q7. 사업내용이 '재활용 사업 추진'만 기재되어 있으면 RT-B인가요?"));
children.push(para("아니오. 정보 부족은 RT-B가 아니라 NA-UNSURE입니다. RT-B는 '측정 가능한 성과지표 없음 + 홍보·행사 위주 + 수혜자 불명확' 중 2개 이상 확인되어야 적용합니다."));
children.push(h3("Q8. [신규 v1.6] 언제 연계목표를 추가해야 하나요?"));
children.push(para("Nexus 체크리스트(제1장 1-4) 3문항 중 1개 이상이 '명확한 YES'일 때만 추가합니다. '혹시 모르니', '관련성이 있을 수도', '포괄적으로 보면'과 같은 막연한 추측으로 추가하면 AI 학습 데이터에 노이즈가 발생합니다. 목표 사용률은 25~35%이며, 파일럿에서 6%로 저조했던 것을 정상화하되 과도하게 확장하지 않는 것이 기준입니다."));
children.push(h3("Q9. [신규 v1.6] 연계목표와 Red Tag A는 어떻게 구별하나요?"));
children.push(para("연계목표는 주목표가 다른 SDG에 '긍정적으로 기여'하는 경우입니다. Red Tag A는 주목표가 다른 SDG를 '저해'하는 경우입니다. 두 경우 모두 Nexus 관점이지만, 긍정 방향이면 연계목표, 부정 방향이면 Red Tag A로 분리합니다. 예: 도시숲 조성(탄소흡수 명시) = SDG 13 주목표 + SDG 11·15 연계목표. 산업단지 조성 = SDG 8 주목표 + Red Tag A (SDG 13·15 저해)."));

// ────────────────────────────────────────────
// 제6장 IAA (이원화)
// ────────────────────────────────────────────
children.push(h1("제6장 IAA 및 불일치 해소 절차"));

children.push(h2("6-1. [개정 v1.6] IAA 측정 방법 — 이원화"));
children.push(para("v1.6은 주목표와 연계목표를 분리 측정합니다. 다중 레이블 분류의 합의도는 Jaccard 계수와 Krippendorff's α (set-valued)를 사용합니다."));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("구분", 3500),
    headerCell("지표", 3000),
    headerCell("목표값", 2000),
    headerCell("비고", CONTENT_WIDTH - 8500)
  ]}));
  const items = [
    ["주목표 SDG (단일 레이블)", "Fleiss' κ", "κ ≥ 0.61", "전통적 카테고리컬 합의"],
    ["희소 클래스 9·12·14·17 개별", "Per-class κ", "κ ≥ 0.41 (완화)", "희소성 감안"],
    ["주목표 + 연계목표 (집합)", "평균 Jaccard 계수", "J ≥ 0.50", "집합 일치도 지표"],
    ["주목표 + 연계목표 (다중 레이블)", "Krippendorff's α (set-valued)", "α ≥ 0.55", "다중 레이블 표준"],
    ["Red Tag 유형", "Fleiss' κ", "κ ≥ 0.61", "3-4 체크리스트 보완"],
    ["수혜자 식별 (M-01)", "일치율", "≥ 80%", "1-3 결정 트리 적용"],
    ["연계목표 사용률", "라벨링 건수 중 비율", "25~35%", "v1 파일럿 6% 대비 4~6배"],
  ];
  items.forEach(([a, b, c, d]) => {
    rows.push(new TableRow({ children: [
      cell(a, 3500, { bold: true }), cell(b, 3000),
      cell(c, 2000), cell(d, CONTENT_WIDTH - 8500)
    ]}));
  });
  children.push(makeTable(rows));
}
children.push(para("Jaccard 계수: J(A, B) = |A ∩ B| / |A ∪ B|. 예: 어노테이터 1 {SDG7, SDG1}, 어노테이터 2 {SDG7} → J = 1/2 = 0.5"));
children.push(para("Krippendorff's α는 누락 데이터와 여러 척도(명목·순서·구간·비율)에 강건하며, 다중 레이블 상황에서 널리 사용됩니다 (Krippendorff, 2011)."));

children.push(h2("6-2. 불일치 케이스 해소 절차"));
children.push(bullet("어노테이터 간 주목표가 다른 케이스, 또는 연계목표 집합이 Jaccard < 0.5인 케이스를 추출합니다."));
children.push(bullet("각 어노테이터가 판단 근거 메모를 제출합니다."));
children.push(bullet("전체 어노테이터가 모여 토론 후 다수결(2/3 이상 동의) 또는 합의로 최종 라벨을 확정합니다."));
children.push(bullet("합의 불가 시 지도교수(또는 외부 전문가)가 최종 중재합니다."));
children.push(bullet("해소된 케이스와 근거를 기록하여 v1.7 코딩북에 반영합니다."));

children.push(h2("6-3. HOLD 케이스 처리 프로토콜"));
children.push(bullet("① HOLD 허용 비율: 전체 라벨링 건수의 10% 이내 권장. 10% 초과 시 연구자와 1:1 면담."));
children.push(bullet("② IAA 산출 시 HOLD 케이스는 제외. HOLD 비율은 어노테이터별로 별도 집계."));
children.push(bullet("③ HOLD 해소 절차: 전체 토론 → 2/3 동의 시 확정 → 합의 불가 시 외부 전문가 중재."));
children.push(bullet("④ HOLD 케이스는 별도 시트에 기록하고 판단이 어려웠던 이유를 메모로 남깁니다."));

// 부록
children.push(h1("부록 A. SDG 17개 전체 목록 및 채택 현황"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("번호", 1200), headerCell("목표명(한국어)", 3000),
    headerCell("목표명(영어)", 3500), headerCell("본 연구", 1800),
    headerCell("비고", CONTENT_WIDTH - 9500)
  ]}));
  const items = [
    ["SDG 1", "빈곤 종식", "No Poverty", "O (일반)", ""],
    ["SDG 2", "기아 종식", "Zero Hunger", "O (일반)", ""],
    ["SDG 3", "건강과 웰빙", "Good Health and Well-being", "O (일반)", ""],
    ["SDG 4", "양질의 교육", "Quality Education", "O (일반)", ""],
    ["SDG 5", "성평등", "Gender Equality", "O (일반)", ""],
    ["SDG 6", "깨끗한 물과 위생", "Clean Water and Sanitation", "O (일반)", ""],
    ["SDG 7", "깨끗한 에너지", "Affordable and Clean Energy", "O (일반)", ""],
    ["SDG 8", "경제성장과 양질의 일자리", "Decent Work and Economic Growth", "O (일반)", ""],
    ["SDG 9", "산업·혁신·인프라", "Industry, Innovation and Infrastructure", "O (희소★)", "v1.0 제외→복원"],
    ["SDG 10", "불평등 감소", "Reduced Inequalities", "O (일반)", ""],
    ["SDG 11", "지속가능한 도시와 공동체", "Sustainable Cities and Communities", "O (일반)", ""],
    ["SDG 12", "책임감 있는 소비와 생산", "Responsible Consumption and Production", "O (희소★)", "v1.0 제외→복원"],
    ["SDG 13", "기후행동", "Climate Action", "O (일반)", ""],
    ["SDG 14", "수중 생태계", "Life Below Water", "O (희소★)", "내수면 적용"],
    ["SDG 15", "육상 생태계", "Life on Land", "O (일반)", ""],
    ["SDG 16", "평화·정의·강력한 제도", "Peace, Justice and Strong Institutions", "O (일반)", ""],
    ["SDG 17", "글로벌 파트너십", "Partnerships for the Goals", "O (희소★)", "v1.0 제외→복원"],
  ];
  items.forEach(([a, b, c, d, e]) => {
    rows.push(new TableRow({ children: [
      cell(a, 1200, { bold: true }), cell(b, 3000), cell(c, 3500),
      cell(d, 1800), cell(e, CONTENT_WIDTH - 9500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h1("부록 B. 핵심 참고문헌"));
children.push(bullet("Guariso, D. et al. (2023). Automatic SDG budget tagging: Building public financial management capacity through natural language processing. Data & Policy."));
children.push(bullet("Venturini, S. et al. (2020). Towards nexus-based governance: defining interactions between economic activities and SDGs. International Journal of Sustainable Development & World Ecology."));
children.push(bullet("Landis, J. R., & Koch, G. G. (1977). The Measurement of Observer Agreement for Categorical Data. Biometrics, 33(1), 159-174."));
children.push(bullet("Fleiss, J. L. (1971). Measuring nominal scale agreement among many raters. Psychological Bulletin, 76(5), 378-382."));
children.push(bullet("Krippendorff, K. (2011). Computing Krippendorff's Alpha-Reliability. University of Pennsylvania ScholarlyCommons."));
children.push(bullet("OECD (2016). OECD DAC Rio Markers for Climate — Handbook. Paris: OECD Publishing. (Principal/Significant 방식 기원)"));

children.push(h1("부록 C. 파일럿 분석 결과 및 v2 UI 가드레일 연계 (v1.5 유지)"));

children.push(h2("C-1. 파일럿 2인 IAA 결과"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("지표", 4000), headerCell("값", 2500),
    headerCell("Landis & Koch 해석", CONTENT_WIDTH - 6500)
  ]}));
  const items = [
    ["Cohen's κ (주목표)", "0.315", "Fair (하한)"],
    ["Cohen's κ (5P 틀)", "0.235", "Slight"],
    ["Cohen's κ (Red Tag 유형)", "0.328", "Fair"],
    ["연계목표 사용률", "6% (3/50)", "v1.6 목표 25~35% 대비 과소"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, 4000, { bold: true }), cell(b, 2500), cell(c, CONTENT_WIDTH - 6500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("C-2. 박정진 test-retest 결과 (동일 50건)"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("지표", 4000), headerCell("값", 2500),
    headerCell("해석", CONTENT_WIDTH - 6500)
  ]}));
  const items = [
    ["Cohen's κ (주목표)", "0.522", "Moderate"],
    ["Cohen's κ (5P 틀)", "0.648", "Substantial"],
    ["Cohen's κ (Red Tag 유형)", "−0.092", "우연 수준 이하 (체크리스트 부재)"],
    ["불일치 케이스", "22 / 50", "P5-내부 9 + P5-교차 12 + NA 1"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, 4000, { bold: true }), cell(b, 2500), cell(c, CONTENT_WIDTH - 6500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("C-3. 식별된 disagreement 패턴 → v1.6 보강 매핑"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("패턴", 4500), headerCell("재현 건수", 1800),
    headerCell("v1.5/v1.6 보강 항목", CONTENT_WIDTH - 6300)
  ]}));
  const items = [
    ["수혜자 vs 제공자 혼동 (주체 중심 관점)", "4건 (589/635/992/1118)", "1-3 결정 트리 + v2 M-01 (v1.5)"],
    ["SDG 10 ↔ SDG 1/3 (취약계층 대상 = SDG 10 오분류)", "4건 (위 동일)", "4-5 결정 트리 (v1.5)"],
    ["SDG 8 ↔ SDG 9 (산업·혁신 vs 일자리)", "3건 (334/1089/1096)", "4-6 결정 트리 (v1.5)"],
    ["NA 단일 범주 — 회피와 17개 외 미분화", "1건 (366/1072)", "2-18 NA 2유형 (v1.5)"],
    ["Red Tag 체크리스트 부재 (κ=−0.092)", "전반", "3-4 YES/NO 체크리스트 + v2 M-04 (v1.5)"],
    ["연계목표 사용률 저조 (6%, 3/50)", "50건 중 47건", "1-4 Nexus 체크리스트 + v2 ③ 독립 섹션 (v1.6)"],
    ["SDG 11 과다 일관성 (인프라 = SDG 11)", "P5-internal", "v2 M-02 SDG 혼동 토스트"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, 4500), cell(b, 1800), cell(c, CONTENT_WIDTH - 6300)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("C-4. v2 UI 가드레일 3종 + Nexus 체크리스트"));
children.push(bullet("M-01 수혜자 체크리스트 카드 — 수혜자 유형(일반/취약/특정/NA) + 제공자 인지"));
children.push(bullet("M-02 SDG 혼동 가드 토스트 — 혼동 빈발 6개 SDG(11/10/1/5/8/9) 선택 시 재검토 경고"));
children.push(bullet("M-04 Red Tag 판단 근거 필수화 — RT-A/B/C rationale 한 줄 필수"));
children.push(bullet("[v1.6 신규] Nexus 체크리스트 — '③ 연계목표 SDGs' 섹션 상단 3문항 상시 노출"));

children.push(h2("C-5. v2 파일럿 재라벨링 계획 (v1.6 기준)"));
children.push(bullet("3인(A/B/C) 동일 50건 blind 라벨링 (파일럿 모드)"));
children.push(bullet("목표: 주목표 Fleiss κ ≥ 0.50, 주+연계 Jaccard ≥ 0.45, 연계목표 사용률 ≥ 20%"));
children.push(bullet("가드레일 효과 측정: sdgGuardResponses의 rechosen 비율, M-04로 걸러진 Red Tag, 연계목표 추가 케이스 수"));
children.push(bullet("재측정 결과가 목표 미달이면 본 1,200건 라벨링 개시 보류 — v1.7 가이드라인 재정비"));

children.push(para(""));
children.push(para("— 코딩북 v1.6 끝 — v2 파일럿 재라벨링 결과에 따라 v1.7(또는 v2.0)으로 업데이트 예정", { align: AlignmentType.CENTER, italics: true }));

// 문서 빌드
const doc = new Document({
  creator: "박정진",
  title: "SDGs 어노테이터 코딩북 v1.6",
  styles: {
    default: { document: { run: { font: { name: FONT_KR }, size: 20 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: 16838 },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outputPath, buf);
  console.log(`✓ Saved: ${outputPath}  (${buf.length.toLocaleString()} bytes, ${children.length} children)`);
}).catch(err => {
  console.error("ERR", err);
  process.exit(1);
});
