// coding_book_v1_5.docx 생성 스크립트
// v1.4 기반 + 파일럿 2인 IAA(κ=0.315) 및 박정진 test-retest(κ=0.522) 결과 반영
//   1. 수혜자 vs 제공자 식별 결정 트리 추가 (제1장 1-3)
//   2. NA 분류 2유형 명시 (제2장 끝 + 제5장) — v2 UI 파일럿 모드 연동
//   3. Red Tag A/B/C 판정 체크리스트 (제3장 3-4)
//   4. SDG10 ↔ SDG1/3 구분 결정 트리 (제4장 4-5)
//   5. SDG8 ↔ SDG9 구분 결정 트리 (제4장 4-6)
//   6. 부록 C: 파일럿 분석 결과 및 v2 UI 가드레일 연계

process.env.NODE_PATH = 'C:/Users/USER/AppData/Roaming/npm/node_modules';
require('module').Module._initPaths();

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType
} = require('docx');

// ────────────────────────────────────────────
// 설정
// ────────────────────────────────────────────
const FONT_KR = "맑은 고딕";
const PAGE_WIDTH = 11906;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const outputPath = "D:/박정진/대학원(박사)/[박사-2]SDGs 논문/coding_book_v1_5.docx";

// ────────────────────────────────────────────
// 헬퍼 함수
// ────────────────────────────────────────────
function run(text, opts = {}) {
  return new TextRun({
    text,
    font: { name: FONT_KR },
    size: opts.size || 20,
    bold: opts.bold || false,
    italics: opts.italics || false,
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

function border() {
  return { style: BorderStyle.SINGLE, size: 4, color: "999999" };
}
function allBorders() {
  const b = border();
  return { top: b, bottom: b, left: b, right: b };
}

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
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows,
  });
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
  children: [new TextRun({ text: "v1.5", font: { name: FONT_KR }, size: 40, bold: true, color: "2E74B5" })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 60, after: 60 },
  children: [new TextRun({ text: "2026년 4월 21일", font: { name: FONT_KR }, size: 20 })]
}));

// v1.5 주요 변경사항
children.push(h2("v1.5 주요 변경사항"));
children.push(para("파일럿 2인 IAA 분석 결과 κ(SDG) = 0.315 (Fair) 및 박정진 test-retest 분석 κ(SDG) = 0.522 / κ(Red Tag) = −0.092 를 바탕으로 판단 일관성을 높이기 위한 결정 트리와 체크리스트를 대폭 보강하였다. 또한 v2 어노테이션 도구의 가드레일 3종(M-01 수혜자 체크리스트, M-02 SDG 혼동 가드 토스트, M-04 Red Tag 판단 근거 필수화) 및 파일럿 모드 도입과 정합성을 확보하였다."));
children.push(bullet("(1) [신규] 수혜자 vs 제공자 식별 결정 트리 — 제1장 1-3 (v1 재라벨링에서 4건 재현되는 구조적 혼동 기준)"));
children.push(bullet("(2) [신규] NA 분류 2유형 명시 (NA-OUTSIDE '17개 외 사업' / NA-UNSURE '판단 불가') — 제2장 끝 + 제5장 5-1. v2 UI 파일럿 모드가 naReason 필드를 필수화함"));
children.push(bullet("(3) [신규] Red Tag A/B/C 판정 체크리스트 — 제3장 3-4 (κ(Red Tag) = −0.092 문제 대응). YES/NO 3~5문항"));
children.push(bullet("(4) [신규] SDG10 ↔ SDG1·SDG3 구분 결정 트리 — 제4장 4-5 (589/635/992/1118 네 건에서 재현된 '취약계층 대상이라서 SDG10으로 오분류' 패턴 방지)"));
children.push(bullet("(5) [신규] SDG8 ↔ SDG9 구분 결정 트리 — 제4장 4-6 (334/1089/1096 세 건에서 나타난 산업·혁신 vs 일자리 혼동 방지)"));
children.push(bullet("(6) [신규] 부록 C — 파일럿 분석 결과 및 v2 UI 가드레일 연계 설명. 본 코딩북의 각 보강 항목이 어떤 실증 근거로부터 유래했는지 역추적 가능"));
children.push(bullet("(7) [업데이트] 제6장 6-1 IAA 측정 — v2 파일럿 재라벨링 (3인 × 동일 50건) 절차 명시"));

children.push(h3("v1.4 대비 유지 사항"));
children.push(bullet("SDG 17개 전체 포함 (희소 클래스 SDG 9·12·14·17 목적표집 최소 30건)"));
children.push(bullet("표본 수 1,200건 (대도시형 360·도시형 600·농촌형 240)"));
children.push(bullet("IAA 목표: Fleiss κ ≥ 0.61 (전체) / ≥ 0.41 (희소 클래스)"));
children.push(bullet("1차 SDG(필수 1개) + 2차 SDG(선택 0~2개) + Red Tag 체계"));

children.push(para("작업 전 반드시 전체를 숙독하고, 파일럿 50건을 완료한 후 본 라벨링을 시작하세요.", { bold: true }));

// 개요 표
children.push(h2("개요"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("항목", 3000),
    headerCell("내용", CONTENT_WIDTH - 3000)
  ]}));
  const items = [
    ["문서 버전", "v1.5 (파일럿 IAA 분석 반영 — 본 라벨링 개시 전 최종본)"],
    ["적용 대상", "경기도 31개 기초지자체 2016~2025년 세부사업설명서"],
    ["표본 수", "1,200건 (대도시형 360·도시형 600·농촌형 240; 희소 클래스 120건 포함)"],
    ["어노테이터 수", "3인 (홀수, 다수결 명확화)"],
    ["IAA 목표", "Fleiss κ ≥ 0.61 (전체) / ≥ 0.41 (희소 클래스 SDG 9·12·14·17)"],
    ["라벨 체계", "1차 SDG (필수 1개) + 2차 SDG (선택 0~2개) + Red Tag (유형 또는 없음)"],
    ["희소 클래스 표집", "SDG 9·12·14·17 — 목적표집으로 SDG당 최소 30건 포함"],
    ["v2 UI 연동", "가드레일 3종 (M-01/M-02/M-04) + 파일럿 모드 (blind, 3인 동일 50건)"],
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
children.push(para("1차 SDG는 단일 레이블 분류(primary label) 학습에, 2차 SDG는 다중 레이블 분류 학습 및 SDG 연계성 분석에 활용됩니다. 2차 SDG는 사업내용에서 두 번째 목표가 명확히 확인되는 경우에만 추가하세요. '혹시 모르니 추가'는 모델 학습 오류를 유발합니다."));

children.push(h2("1-2. SDG 17개 전체 포함 방침 및 희소 클래스 처리"));
children.push(para("v1.0에서는 지방정부 예산 적합성을 이유로 SDG 9·12·14·17을 제외했으나, 이를 철회하고 17개 전체를 포함합니다. 그 이유는 다음과 같습니다."));
children.push(bullet("사례 희소성은 제외 근거가 아닙니다. 특정 SDG 예산이 얼마나 적게 편성되었는지 자체가 2편의 실증 결과가 됩니다."));
children.push(bullet("지방정부도 SDG 9(스마트시티), SDG 12(자원순환), SDG 14(내수면 생태), SDG 17(자매도시 교류) 관련 예산을 실제로 편성합니다."));
children.push(bullet("희소 클래스를 포함해 AI 모델의 성능을 분석하는 것 자체가 방법론적 기여입니다. Per-class F1으로 희소 SDG의 분류 난이도를 별도 보고합니다."));
children.push(para("SDG 9·12·14·17은 목적표집(purposive sampling)으로 SDG당 최소 30건이 선별되어 라벨링 풀에 포함됩니다. 전체 1,200건 중 희소 클래스 배정 샘플에는 ★ 표시가 있습니다. 배정 이유가 반드시 해당 SDG로 귀결되어야 하는 것은 아닙니다 — 동일한 라벨링 기준으로 판단하세요."));

children.push(h2("1-3. [신규 v1.5] 수혜자 vs 제공자 식별 결정 트리"));
children.push(para("파일럿 분석 결과, 어노테이터가 '사업을 수행하는 주체(제공자)'의 관점에서 SDG를 선택해 SDG10(불평등)을 과다 선택하는 구조적 혼동 패턴이 재현되었다. 1차 SDG 선택 직전 반드시 아래 3단계를 순서대로 확인한다."));

children.push(...callout("▣ STEP 1. 수혜자가 누구인가? (Who benefits?)", [
  "① 사업의 예산 집행으로 '실질적 편익'을 얻는 주체를 명확히 식별한다.",
  "② 예산 집행 업무를 '담당하는' 공무원·업체·기관은 제공자이며 수혜자가 아니다.",
  "③ 예: '공무원 SDG 교육' → 수혜자는 공무원이 아니라 공무원이 전달할 정책의 시민 최종 수혜자. (공무원을 수혜자로 보면 SDG 4로 오분류)",
], "FFF4E5"));

children.push(...callout("▣ STEP 2. 수혜자가 '어떤 유형'인가? (Which population segment?)", [
  "① 시민 전체 (general) — 일반 주민 대상 (도시 인프라·환경 개선 등)",
  "② 취약계층 (vulnerable) — 저소득·노인·장애인·아동 등 '구조적으로 불리한 집단'",
  "③ 특정 집단 (specific) — 여성·다문화·농어민·청년 등 '인구학적 특성으로 구분되는 집단'",
  "④ 해당없음 (NA) — 내부 행정·제공자 중심 사업 (공무원 회의비·청사 관리비 등)",
  "※ v2 UI는 STEP 2 유형 선택 시 M-01 카드에서 자동 반영 — 별도 체크 불필요",
], "FFF4E5"));

children.push(...callout("▣ STEP 3. 사업목적의 '핵심 변화'가 무엇인가? (What changes?)", [
  "① 경제적 빈곤 탈출 · 기본생활 보장 → SDG 1",
  "② 건강·돌봄·의료 서비스 제공 → SDG 3",
  "③ 교육·평생학습 기회 → SDG 4",
  "④ 구조적 불평등 해소 · 장애인·다문화 포용 → SDG 10",
  "⑤ 일자리 · 경제적 자립 → SDG 8",
  "※ 수혜자가 취약계층이라는 사실만으로 자동 SDG 10이 되지 않는다. 핵심 변화 관점으로 판단한다.",
], "FFF4E5"));

children.push(h3("결정 트리 요약"));
children.push(...codeBlock([
  "1) 수혜자를 식별한다. → 제공자(공무원·업체)가 아님을 확인",
  "2) 수혜자 유형(일반/취약/특정/NA)을 판정한다.",
  "3) 사업목적의 '핵심 변화'로 SDG를 선택한다.",
  "   · 경제적 빈곤 탈출 → SDG 1",
  "   · 건강·돌봄 → SDG 3",
  "   · 교육 → SDG 4",
  "   · 구조적 불평등 해소 → SDG 10",
  "   · 일자리·자립 → SDG 8",
  "4) 수혜자가 취약계층이라는 이유만으로 SDG 10을 기계적으로 선택하지 않는다.",
]));

children.push(h2("1-4. 라벨링 단위"));
children.push(para("라벨링의 기본 단위는 세부사업 1건입니다. 각 세부사업은 아래 텍스트 필드로 구성됩니다."));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("필드명", 3500),
    headerCell("내용", 5000),
    headerCell("활용도", CONTENT_WIDTH - 8500)
  ]}));
  const items = [
    ["사업목적 (bizPurpCn)", "해당 사업을 추진하는 이유와 목표", "★★★ 핵심 — 가장 우선 참조"],
    ["사업내용 (bizCn)", "구체적 집행 방법, 대상, 수단", "★★★ 핵심 — Red Tag 판단에 필수"],
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
children.push(para("⚠ 사업명만 보고 판단하지 마세요. 사업내용까지 반드시 확인하세요.", { bold: true }));

children.push(h2("1-5. [개정 v1.5] 전체 라벨링 절차"));
children.push(para("각 세부사업의 사업목적→사업내용 순서로 텍스트를 읽는다. 추진계획이 있으면 보조 참조한다(없는 경우 많음)."));
children.push(bullet("① 1-3 결정 트리로 수혜자를 식별하고 유형을 선택한다 (v2 UI M-01 카드에 기록)"));
children.push(bullet("② 1차 SDG(핵심 목표 1개)를 선택한다. 17개 중 해당 없으면 'NA'를 선택하고 사유(NA-OUTSIDE/NA-UNSURE)를 지정한다."));
children.push(bullet("③ 2차 SDG(부가 목표, 최대 2개)를 선택한다. 없으면 공란."));
children.push(bullet("④ Red Tag 여부를 판단한다 — 3-4 체크리스트로 유형(A/B/C) 확정 후 판단 근거 필수 입력 (RT-NONE은 rationale 선택)."));
children.push(bullet("⑤ v2 UI 가드레일 M-02 (SDG 혼동 토스트) 발동 시 이대로 유지 / 다시 선택 판정 후 진행."));
children.push(bullet("⑥ 판단 근거를 한 줄 메모로 남긴다. 불확실한 경우 'HOLD' 표시 후 진행."));

children.push(h2("1-6. 절대 금지 사항"));
children.push(bullet("다른 어노테이터와 라벨링 결과를 사전에 공유하거나 상의하지 마세요. (IAA 오염)"));
children.push(bullet("인터넷 검색으로 실제 사업을 확인한 후 판단하지 마세요. (텍스트 기반 판단이 원칙)"));
children.push(bullet("사업명만 보고 판단하지 마세요. 사업내용까지 반드시 확인하세요."));
children.push(bullet("1차 SDG를 복수로 선택하지 마세요. 1차는 반드시 1개만 선택합니다."));
children.push(bullet("전체 라벨 수(1차+2차)가 3개를 초과하지 않도록 하세요."));
children.push(bullet("2016~2020년 예산서는 최신 용어(스마트시티, 탄소중립, 제로웨이스트 등)를 사용하지 않을 수 있으니 사업명이 아니라 '실질적 내용'을 기준으로 판단하세요."));

children.push(h2("1-7. 파일럿 50건 평가 프로토콜"));
children.push(bullet("구성: 연구자 사전 정답 보유 기준 샘플 25건 + 일반 샘플 25건"));
children.push(bullet("통과 기준: 기준 샘플 25건에 대한 정확도 ≥ 80% (20건 이상 일치)"));
children.push(bullet("기준 미달 시: 연구자와 1:1 면담 후 재파일럿 진행 (재시도 1회)"));
children.push(bullet("파일럿 50건은 본 1,200건 데이터셋에서 제외됩니다."));
children.push(bullet("파일럿 완료 후 전체 어노테이터가 참여하는 캘리브레이션 세션 1회 진행 (약 1시간)"));
children.push(bullet("[v1.5 추가] v2 UI 파일럿 모드(blind)로 3인 동일 50건 재라벨링을 수행하여 κ 재측정 — 부록 C 참조"));

// ────────────────────────────────────────────
// 제2장 (v1.4 본문을 압축 유지 + NA 분류 보강)
// ────────────────────────────────────────────
children.push(h1("제2장 SDG 라벨 정의 및 판단 기준 (17개 전체)"));
children.push(para("아래 17개 SDG 각각에 대해 UN 공식 정의, 지방정부 적용 범위, 포함/제외 사례, Red Tag 주의사항을 제시합니다. ★ 표시는 '희소 클래스(Rare Class)'로, 목적표집 최소 30건이 배정됩니다. 판단 기준은 동일하게 적용합니다."));

function sdgBlock(no, star, title, unDef, scope, incExc, redTag) {
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
  "저소득층 지원을 명목으로 하나 실제 수혜자가 불명확한 경우");

sdgBlock(2, false, "기아 종식", "기아 종식, 식량 안보 달성, 지속가능한 농업 증진",
  "친환경 농업, 학교·공공급식 지원, 도시농업, 식품 지원",
  {
    inc: ["친환경 농산물 생산 지원", "공공급식 확대사업", "도시텃밭 조성", "로컬푸드 지원"],
    exc: ["일반 농촌 개발(SDG 11)", "식품가공 산업 지원(SDG 8)"]
  },
  "농지 확장을 위한 산지·습지 훼손(SDG 15 상충)");

sdgBlock(3, false, "건강과 웰빙", "모든 연령층의 건강한 삶 보장 및 복지 증진",
  "보건소 운영, 정신건강, 의료비 지원, 감염병 대응, 노인 돌봄",
  {
    inc: ["보건소 운영비", "정신건강 위기대응", "어르신 방문건강관리", "장애인 의료비", "감염병 대응"],
    exc: ["스포츠 시설(직접 건강증진 목적 아닌 경우)", "관광·레저(SDG 11)"]
  },
  "건강 증진 명목이나 실제로는 홍보·행사 중심인 경우");

sdgBlock(4, false, "양질의 교육", "포용적이고 공평한 양질의 교육 보장 및 평생학습 기회 증진",
  "평생교육, 아동·청소년 교육 지원, 도서관, 직업훈련",
  {
    inc: ["평생학습 프로그램", "방과후 돌봄교실", "공공도서관 운영", "직업훈련 지원"],
    exc: ["학교 건물 신축(교육청 사무)", "단순 행사·축제(SDG 11)"]
  },
  "교육 명목이나 특정 집단 홍보·이념 교육에 편중된 경우");

sdgBlock(5, false, "성평등", "성평등 달성 및 모든 여성·여아의 권익 신장",
  "성인지 예산, 여성 권익, 가정폭력 피해자 지원, 경력단절 여성 지원",
  {
    inc: ["여성폭력 피해자 지원센터", "경력단절 여성 직업훈련", "성평등 문화 확산"],
    exc: ["일반 여성 복지(SDG 1·3 우선 검토)", "단순 여성 행사"]
  },
  "성평등 명목이나 특정 성별 역할 강화에 편중된 경우");

sdgBlock(6, false, "깨끗한 물과 위생", "모든 사람을 위한 물과 위생의 이용 가능성 및 지속가능한 관리 보장",
  "상하수도 관리, 수질 개선, 하천 정화, 빗물 재이용",
  {
    inc: ["상수도 시설 개량", "하수처리장 운영", "하천수질 개선(인간 이용 목적)", "빗물이용시설"],
    exc: ["하천 경관 조성(SDG 11·15)", "친수공간(SDG 15)", "수변 생태복원(생태 목적이면 SDG 14)"]
  },
  "하천 정비 명목이나 실제 콘크리트화·직강화로 수생태계 파괴 → SDG 14·15 상충");

sdgBlock(7, false, "깨끗한 에너지", "모든 사람을 위한 저렴하고 신뢰할 수 있는 지속가능한 현대적 에너지 접근 보장",
  "신재생에너지 보급, 에너지 효율화, 에너지 복지",
  {
    inc: ["태양광 설치 지원", "에너지효율화 사업", "에너지 취약계층 지원", "그린 공공건물"],
    exc: ["화석연료 관련 인프라", "일반 도로 가로등(SDG 11)"]
  },
  "산지·생태보전지역 태양광 설치(SDG 15 상충), 바이오매스 소각(SDG 13·15 상충)");

sdgBlock(8, false, "경제성장·일자리", "포용적이고 지속가능한 경제성장, 완전하고 생산적인 고용 및 양질의 일자리 증진",
  "일자리 창출, 소상공인·중소기업 지원, 산업 육성, 청년 취업",
  {
    inc: ["소상공인 경영 지원", "청년 취업 지원", "지역 산업 육성", "창업 지원"],
    exc: ["대기업 유치 인프라(SDG 9 검토)", "단순 관광 홍보(SDG 11)"]
  },
  "산업단지 조성으로 인한 녹지·습지 훼손(SDG 13·15 상충), 화석연료 관련 사업(SDG 7·13 상충)");

sdgBlock(9, true, "산업·혁신·인프라", "복원력 있는 인프라 구축, 포용적이고 지속가능한 산업화 촉진 및 혁신 장려",
  "스마트시티·디지털 인프라, 지역 혁신 거점, 기술 고도화, 공공 ICT 인프라 구축",
  {
    inc: ["스마트시티 플랫폼 구축", "디지털 행정 인프라", "지역 혁신거점(테크노파크 등) 지원", "공공 와이파이 확충", "4차산업 기반 지원"],
    exc: ["일반 도로·교량(SDG 11 검토)", "단순 소상공인 지원(SDG 8)", "IT 장비 단순 구매(목적 불명확)"]
  },
  "혁신 명목이나 특정 기업 특혜성 보조, 환경영향평가 없는 대규모 인프라");

sdgBlock(10, false, "불평등 감소", "국가 내 및 국가 간 불평등 감소",
  "장애인 지원, 다문화·외국인 지원, 노인 복지(구조적 불평등), 지역격차 해소",
  {
    inc: ["장애인 활동 지원", "다문화가족 지원", "농촌 지역 인프라 개선", "외국인 근로자 지원"],
    exc: ["일반 복지(SDG 1·3 우선)", "단순 시설 건립(수혜계층 불명확한 경우)"]
  },
  "불평등 해소 명목이나 특정 집단 배제·차별 요소 포함");
children.push(para("▣ [v1.5 신규] SDG 10 과다 선택 주의: 수혜자가 취약계층이라는 사실만으로 SDG 10이 되지 않는다. '핵심 변화'가 경제적 빈곤 탈출이면 SDG 1, 건강·돌봄이면 SDG 3, 구조적 불평등 해소(장애·다문화·격차 등)이면 SDG 10이다. 제4장 4-5 결정 트리 참조.", { bold: true, color: "2E74B5" }));

sdgBlock(11, false, "지속가능 도시", "포용적이고 안전하며 복원력 있고 지속가능한 도시 및 거주지 조성",
  "도시재생, 대중교통, 주거 지원, 문화시설, 공원·녹지, 재난 안전",
  {
    inc: ["도시재생 뉴딜", "대중교통 개선", "공공임대주택", "공원 조성", "재난안전망"],
    exc: ["단순 건물 신축(수혜 목적 불명확)", "기반시설 도로·교량(SDG 9 검토)"]
  },
  "도시 확장·개발로 인한 농지·녹지·생태계 훼손(SDG 13·15 상충)");

sdgBlock(12, true, "책임감 있는 소비·생산", "지속가능한 소비와 생산 양식 보장",
  "자원순환·재활용, 공공 녹색조달, 음식물쓰레기 감축, 제로웨이스트",
  {
    inc: ["자원순환센터 운영", "음식물쓰레기 감량 사업", "공공기관 녹색제품 구매", "제로웨이스트 캠페인", "일회용품 감축 지원"],
    exc: ["일반 쓰레기 수거(SDG 11)", "단순 환경 청소(SDG 15)", "재활용 수거 차량 구매(수단이 목적인 경우)"]
  },
  "재활용 명목이나 소각·매립 중심 처리, 그린워싱 홍보 위주 사업(SDG Washing)");

sdgBlock(13, false, "기후행동", "기후변화와 그 영향에 맞서기 위한 긴급 행동",
  "탄소중립, 온실가스 감축, 기후변화 적응, 녹지 확충",
  {
    inc: ["탄소중립 실행계획", "온실가스 감축 사업", "기후변화 취약계층 지원", "도시숲 조성(탄소흡수 기능 명시 시)"],
    exc: ["일반 환경 청소(SDG 15)", "단순 나무 심기(탄소흡수 미명시 시 SDG 15 검토 — 4장 판단 수목 참조)"]
  },
  "탄소중립 명목이나 화석연료 관련 보조(자기모순), 녹지 파괴 수반 사업");

sdgBlock(14, true, "수중 생태계", "지속가능발전을 위한 대양, 바다, 해양자원 보전 및 지속가능한 이용",
  "한강·임진강 등 수계 생태 보전, 수생생물 보호, 내수면 어업 지원, 수변 생태계 복원",
  {
    inc: ["한강 수생생물 보호사업", "내수면 수산자원 조성", "수변 생태복원(생태 목적)", "수질 개선(생태 목적)", "외래 수중 생물 제거"],
    exc: ["일반 하천 수질관리(SDG 6 우선 — 인간 이용 목적)", "하천 경관 조성(SDG 11)", "수산물 단순 소비 지원(SDG 2)"]
  },
  "수중 생태 복원 명목이나 하천 콘크리트화·준설로 서식지 파괴(SDG 15·6 상충)");

sdgBlock(15, false, "육상 생태계", "육상 생태계 보호·복원, 지속가능한 산림 관리, 사막화 방지, 생물다양성 보전",
  "산림 보호, 생태하천 복원, 야생동물 보호, 생물다양성",
  {
    inc: ["생태하천 복원", "산림보호 사업", "야생동물 구조센터", "생태교란종 관리", "생물다양성 보전"],
    exc: ["하천 경관 조성(생태 목적 아닌 경우, SDG 11)", "농지 개간(SDG 2 상충)"]
  },
  "생태 복원 명목이나 콘크리트 구조물 설치, 외래종 도입 포함");

sdgBlock(16, false, "평화·정의·강력한 제도", "지속가능발전을 위한 평화롭고 포용적인 사회 증진, 효과적·책임 있는 포용적 제도 구축",
  "주민참여예산, 부패 방지, 정보 공개, 행정 혁신, 인권 보호",
  {
    inc: ["주민참여예산 운영", "공공데이터 개방", "반부패 교육", "행정혁신 추진", "인권 침해 구제"],
    exc: ["일반 행정 운영비(목적 불명확 — NA-OUTSIDE)", "단순 홍보(SDG 내용 없는 경우)"]
  },
  "투명성 명목이나 실제 정보 접근 제한, 주민 의견 형식적 수렴");

sdgBlock(17, true, "글로벌 파트너십", "이행수단 강화 및 지속가능발전을 위한 글로벌 파트너십 재활성화",
  "국제자매도시 교류, 글로벌 도시 네트워크 참여, 해외 우수사례 벤치마킹, ODA 지방분권 연계",
  {
    inc: ["자매도시 교류 사업", "글로벌 도시 협약 참여(이클레이 등)", "개발도상국 지방행정 지원", "국제 SDGs 네트워크 참여"],
    exc: ["단순 해외 출장·연수(학습 목적이 아닌 경우)", "외국인 주민 지원(SDG 10 우선)", "국제 행사 유치(SDG 11 검토)"]
  },
  "파트너십 명목이나 실질 협력 없이 홍보·행사에만 집중된 경우(SDG Washing)");

// NA 분류 보강
children.push(h2("2-18. [신규 v1.5] NA 분류 — 2유형"));
children.push(para("v1.4까지 NA는 단일 라벨이었으나, 파일럿 분석에서 '17개 외 사업'과 '판단 불가' 두 상황을 구별할 필요성이 확인되었다. v1.5부터 NA 선택 시 아래 2유형 중 하나를 반드시 지정한다 (v2 UI에서 필수 입력)."));
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
children.push(para("▣ NA 선택 빈도 지침: 경기도 기초지자체 예산의 특성상 NA 전체는 5~15% 범위를 참고 기준으로 삼는다. NA 비율이 20%를 초과하면 과소 라벨링 가능성을, 3% 미만이면 과대 라벨링(강제 SDG 배정) 가능성을 연구자와 확인하세요."));

// ────────────────────────────────────────────
// 제3장 Red Tag (체크리스트 신규)
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

children.push(h2("3-3. SDG 상충 쌍 체크리스트 (유형 A 판단 보조)"));
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
      cell(a, 2500, { bold: true }),
      cell(b, 2500),
      cell(c, 2500),
      cell(d, CONTENT_WIDTH - 7500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("3-4. [신규 v1.5] Red Tag 판정 체크리스트"));
children.push(para("파일럿 분석에서 박정진 test-retest κ(Red Tag) = −0.092로 Red Tag 판정의 재현성이 사실상 '우연 수준 이하'로 확인되었다. 유형별로 YES/NO 체크리스트를 의무 적용해 임계점을 명확히 한다."));

children.push(h3("유형 A (SDG 상충) 체크리스트"));
children.push(para("다음 3문항 중 2개 이상 YES이면 RT-A로 판정한다."));
children.push(bullet("Q1. 사업 수단(인프라·시설·개발)이 구체적으로 기재되어 있는가?"));
children.push(bullet("Q2. 그 수단이 3-3 표의 상충 쌍 중 하나에 명확히 해당하는가?"));
children.push(bullet("Q3. 사업이 제공하는 긍정 효과와 3-3 표의 부정 효과가 동일한 사업 내에서 동시 발생하는가?"));
children.push(para("※ 상충 '가능성'만으로는 부족하며, 사업내용에 상충을 유발하는 '구체적 수단'이 명시되어야 함.", { italics: true }));

children.push(h3("유형 B (SDG Washing) 체크리스트"));
children.push(para("다음 3문항 중 2개 이상 YES이면 RT-B로 판정한다 (v1.2 기준 유지·명시화)."));
children.push(bullet("Q1. 사업 예산의 50% 이상이 홍보·이벤트·행사·구조물 건립에 배정되었는가?"));
children.push(bullet("Q2. 사업내용에 측정 가능한 SDG 성과지표(감축량, 수혜자 수, 재활용률 등)가 부재하는가?"));
children.push(bullet("Q3. 수혜자·대상이 SDG와 무관한 일반 대중이며, 직접적 SDG 개선 효과가 불분명한가?"));
children.push(para("※ 사업명이 친환경·친사회적이지만 내용은 일반 인프라/관광/홍보 중심이면 RT-B 강하게 권고.", { italics: true }));

children.push(h3("유형 C (역행 투자) 체크리스트"));
children.push(para("다음 4문항 중 1개 이상 YES이면 RT-C로 판정한다."));
children.push(bullet("Q1. 사업 수단이 특정 SDG를 '직접 저해'하는 것(화석연료, 콘크리트 직강화, 소각 중심 처리 등)인가?"));
children.push(bullet("Q2. 해당 수단이 SDG 어젠다의 핵심 원칙(탄소감축, 생태복원, 자원순환)과 '정면 배치'되는가?"));
children.push(bullet("Q3. 사업명이 SDG를 표방하더라도 실제 집행 수단이 SDG 역행 방향인가?"));
children.push(bullet("Q4. 비교 대상 SDG를 1개 이상 특정할 수 있는가(예: 'SDG 12 역행')?"));
children.push(para("※ RT-C는 '해당 SDG를 달성하려고 시도했으나 실패'가 아니라 '처음부터 반대 방향'일 때 적용한다. 애매하면 RT-B 또는 RT-NONE.", { italics: true }));

children.push(h3("공통 — RT-NONE 판정"));
children.push(para("위 3개 유형 어느 것에도 해당하지 않거나, 정보 부족으로 판단할 수 없으면 RT-NONE을 선택한다. '정보 부족'으로 인한 판단 불가는 RT-B가 아니다(파일럿 1119번 사례 참조)."));
children.push(para("▣ v2 UI M-04 가드레일: Red Tag A/B/C 선택 시 판단 근거(rationale) 한 줄 입력이 필수입니다. 근거 없이 RT-A/B/C는 저장되지 않습니다.", { bold: true, color: "C00000" }));

// ────────────────────────────────────────────
// 제4장 경계사례
// ────────────────────────────────────────────
children.push(h1("제4장 경계 사례 판단 가이드"));

children.push(h2("4-1. 복지 관련 사업의 SDG 구별"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("사업 패턴", CONTENT_WIDTH / 3),
    headerCell("1차 SDG", 2500),
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
      cell(a, CONTENT_WIDTH / 3),
      cell(b, 2500, { bold: true }),
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
    headerCell("1차 SDG", 2500),
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
      cell(a, CONTENT_WIDTH / 3),
      cell(b, 2500, { bold: true }),
      cell(c, CONTENT_WIDTH - CONTENT_WIDTH/3 - 2500)
    ]}));
  });
  children.push(makeTable(rows));
}
children.push(para("▣ SDG 11↔13 판단 수목 (도시숲·가로수·공원 조성):"));
children.push(...codeBlock([
  "사업목적에 \"탄소흡수\", \"온실가스 감축\", \"탄소중립\"이 명시되어 있는가?",
  "  → YES: SDG 13 (1차),  SDG 11 (2차 가능)",
  "  → NO:  사업목적이 \"주민쉼터\", \"경관\", \"도시환경 개선\" 중심인가?",
  "            → YES: SDG 11 (1차)",
  "            → NO:  사업내용 재검토 후 판단. 여전히 모호하면 HOLD.",
  "주의: 탄소흡수 언급이 있어도 부수적 표현(예: \"쾌적한 환경 조성 및 탄소흡수 기여\")이면",
  "       사업의 주목적을 우선 판단하세요.",
]));

children.push(h2("4-3. 디지털·혁신 사업의 SDG 구별 (SDG 9 포함)"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("사업 패턴", CONTENT_WIDTH / 3),
    headerCell("1차 SDG", 2500),
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
      cell(a, CONTENT_WIDTH / 3),
      cell(b, 2500, { bold: true }),
      cell(c, CONTENT_WIDTH - CONTENT_WIDTH/3 - 2500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("4-4. 국제협력·파트너십 사업의 SDG 구별 (SDG 17 포함)"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("사업 패턴", CONTENT_WIDTH / 3),
    headerCell("1차 SDG", 2500),
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
      cell(a, CONTENT_WIDTH / 3),
      cell(b, 2500, { bold: true }),
      cell(c, CONTENT_WIDTH - CONTENT_WIDTH/3 - 2500)
    ]}));
  });
  children.push(makeTable(rows));
}

// NEW 4-5
children.push(h2("4-5. [신규 v1.5] SDG 10 ↔ SDG 1 · SDG 3 구분 결정 트리"));
children.push(para("파일럿 분석에서 박정진 test-retest 불일치 22건 중 4건(589/635/992/1118)이 동일 패턴 — '수혜자가 취약계층이라서 SDG 10을 선택' — 으로 나타났다. SDG 10은 '구조적 불평등 해소'가 핵심이며, 단순히 취약계층을 대상으로 한다는 이유만으로 적용되지 않는다."));
children.push(...codeBlock([
  "Q1. 사업의 '핵심 변화(change)'가 무엇인가?",
  "   (A) 경제적 빈곤 탈출, 기초생활 보장 → SDG 1",
  "   (B) 건강 개선, 의료·돌봄 서비스 제공 → SDG 3",
  "   (C) 구조적 불평등 해소 (장애인·다문화·지역격차) → SDG 10",
  "   (D) 교육·학습 기회 제공 → SDG 4",
  "",
  "Q2. 수혜 대상이 '누구'인가?",
  "   (E) 저소득층 → 보통 SDG 1 (Q1 A)",
  "   (F) 장애인·다문화·외국인 근로자 → SDG 10 (구조적 차별·배제 해소)",
  "   (G) 일반 시민 (소득·장애·출신 무관) → SDG 3/11 계열 검토",
  "",
  "Q3. '불평등 해소 수단'이 사업내용에 명시되어 있는가?",
  "   (H) YES (예: 접근성 개선, 차별 해소 프로그램) → SDG 10 확정",
  "   (I) NO (단순 복지 서비스 제공) → Q1의 A/B 기준 재검토",
  "",
  "결정:",
  "  - 저소득 노인 의료비 지원 → 핵심 변화 = 건강 → SDG 3 (SDG 1/10 아님)",
  "  - 저소득 가구 긴급 생계비 → 핵심 변화 = 빈곤 탈출 → SDG 1",
  "  - 장애인 활동 보조 인력 지원 → 구조적 불평등 해소 → SDG 10",
  "  - 다문화 가족 한국어 교육 → 교육 기회 + 통합 → SDG 4 (2차 SDG 10 가능)",
]));
children.push(para("▣ 파일럿 재현 사례: (589) 주거취약계층 주거개선은 '경제적 빈곤'이 핵심이면 SDG 1, '주거 접근성·포용'이 핵심이면 SDG 10·11. 사업목적의 용어를 기준으로 판정.", { italics: true }));

// NEW 4-6
children.push(h2("4-6. [신규 v1.5] SDG 8 ↔ SDG 9 구분 결정 트리"));
children.push(para("파일럿 test-retest 3건(334/1089/1096)에서 '산업·혁신·인프라' vs '경제성장·일자리' 혼동이 재현되었다. 두 SDG는 '목적'을 기준으로 구분한다."));
children.push(...codeBlock([
  "Q1. 사업의 '주 목적'이 무엇인가?",
  "   (A) 일자리 창출, 고용 지원, 경제적 자립 → SDG 8",
  "   (B) 기술·인프라 구축, 산업 혁신 생태계 조성 → SDG 9",
  "   (C) 복지·불평등 해소 (노동권 측면 포함) → SDG 8 + SDG 10 (2차)",
  "",
  "Q2. 사업 '수단'이 무엇인가?",
  "   (D) 보조금, 컨설팅, 훈련, 인증 → SDG 8",
  "   (E) 플랫폼 구축, R&D 시설, 테크노파크 → SDG 9",
  "   (F) 창업 지원 (일자리 창출형) → SDG 8",
  "   (G) 창업 지원 (기술 사업화형) → SDG 9",
  "",
  "Q3. 수혜자가 '누구'인가?",
  "   (H) 소상공인·자영업자 → SDG 8",
  "   (I) 기술기업·스타트업 → SDG 9 (R&D 중심이면)",
  "   (J) 청년 취업준비생 → SDG 8",
  "",
  "결정:",
  "  - 청년 창업 초기자금 지원 → 일자리 창출 → SDG 8",
  "  - 스마트시티 플랫폼 구축 → 기술 인프라 → SDG 9",
  "  - 소상공인 ICT 교육 → 경제적 자립 수단으로 ICT → SDG 8",
  "  - 테크노파크 R&D 시설 지원 → 혁신 생태계 구축 → SDG 9",
  "  - 4차산업 기반 지원 → 산업 혁신 생태계 → SDG 9",
]));
children.push(para("▣ 핵심 원칙: ICT·디지털은 '수단'이 아니라 '목적'일 때만 SDG 9. 수단이면 원목적의 SDG (예: 경제 지원을 위한 ICT → SDG 8, 교육을 위한 ICT → SDG 4, 행정 혁신을 위한 ICT → SDG 16).", { italics: true }));

// ────────────────────────────────────────────
// 제5장
// ────────────────────────────────────────────
children.push(h1("제5장 라벨링 시트 작성 요령"));

children.push(h2("5-1. [개정 v1.5] 라벨 코드 목록"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("코드", 2800),
    headerCell("의미", 4500),
    headerCell("비고", CONTENT_WIDTH - 7300)
  ]}));
  const items = [
    ["SDG01 ~ SDG17", "해당 SDG 목표", "전체 17개 사용 가능"],
    ["NA", "해당없음 — 사유 필수 지정", "NA-OUTSIDE 또는 NA-UNSURE 중 하나"],
    ["NA-OUTSIDE (신규)", "17개 외 사업 (명확히 SDG 무관)", "행정운영비·청사관리 등 — tier=certain"],
    ["NA-UNSURE (신규)", "판단 불가 (정보 부족)", "사업내용 공란 등 — tier=unknown 자동"],
    ["HOLD", "판단 보류", "담당 연구자에게 문의 (6장 HOLD 프로토콜 참조)"],
    ["RT-A", "Red Tag 유형 A (SDG 상충)", "1차 SDG와 함께 표기 + 판단근거 필수"],
    ["RT-B", "Red Tag 유형 B (SDG Washing)", "1차 SDG와 함께 표기 + 판단근거 필수"],
    ["RT-C", "Red Tag 유형 C (역행투자)", "1차 SDG와 함께 표기 + 판단근거 필수"],
    ["RT-NONE", "Red Tag 없음", "판단근거 선택 입력"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, 2800, { bold: true }),
      cell(b, 4500),
      cell(c, CONTENT_WIDTH - 7300)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("5-2. 작성 예시 (희소 클래스 포함)"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("사업명", 4000),
    headerCell("1차 SDG", 1600),
    headerCell("2차 SDG", 1600),
    headerCell("Red Tag", 1600),
    headerCell("근거 메모", CONTENT_WIDTH - 8800),
  ]}));
  const items = [
    ["저소득층 에너지 바우처", "SDG07", "SDG01", "RT-NONE", "에너지 접근성+빈곤 해소"],
    ["스마트시티 통합플랫폼 구축 ★", "SDG09", "SDG11", "RT-NONE", "디지털 인프라+도시관리"],
    ["음식물쓰레기 감량 사업 ★", "SDG12", "SDG13", "RT-NONE", "책임소비+탄소감축"],
    ["한강 수생생물 서식지 복원 ★", "SDG14", "SDG15", "RT-NONE", "내수면 생태+육상생태"],
    ["자매도시 SDGs 협력 교류 ★", "SDG17", "", "RT-NONE", "실질 국제협력 명시"],
    ["산업단지 기반시설 조성", "SDG08", "", "RT-A", "농지 훼손 SDG13·15 상충"],
    ["그린시티 홍보 영상 제작", "SDG11", "", "RT-B", "홍보 위주·성과지표 부재"],
    ["하천 콘크리트 직강화 정비", "SDG11", "", "RT-C", "수생태계 SDG14·15 역행"],
    ["청사 경비 용역비", "NA-OUTSIDE", "", "RT-NONE", "순수 행정운영비"],
    ["재활용 사업 추진 (내용 공란)", "NA-UNSURE", "", "RT-NONE", "정보 부족 — RT-B 아님"],
  ];
  items.forEach(([a, b, c, d, e]) => {
    rows.push(new TableRow({ children: [
      cell(a, 4000),
      cell(b, 1600, { bold: true }),
      cell(c, 1600),
      cell(d, 1600),
      cell(e, CONTENT_WIDTH - 8800)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("5-3. FAQ"));
children.push(h3("Q1. SDG 9·12·14·17 희소 클래스는 얼마나 엄격하게 적용해야 하나요?"));
children.push(para("다른 SDG와 동일한 기준을 적용합니다. 사업목적 텍스트에 해당 SDG 연관 키워드(스마트, 혁신, 자원순환, 수생태, 국제협력 등)가 명확히 포함된 경우에만 선택하고, 애매하면 HOLD로 표시하세요."));
children.push(h3("Q2. SDG 9인지 SDG 8인지 구별이 어렵습니다."));
children.push(para("제4장 4-6 결정 트리를 적용하세요. 핵심 질문: 이 사업의 목적이 '기술·인프라 혁신 자체'인가, '경제적 지원·일자리'인가?"));
children.push(h3("Q3. SDG 14는 해양이 없는 경기도에서 어떻게 적용하나요?"));
children.push(para("SDG 14는 해양뿐 아니라 강·호수·저수지 등 내수면(Freshwater) 생태계도 포함합니다. 한강·임진강 수생생물 보호, 내수면 어업자원 조성 등이 해당됩니다. SDG 6과 구별: '인간의 물 이용 개선'이면 SDG 6, '수생생물·수중 생태계 보전'이면 SDG 14입니다."));
children.push(h3("Q4. SDG 17 자매도시 교류와 단순 해외 출장을 어떻게 구별하나요?"));
children.push(para("사업목적에 '협력', '파트너십', '공동사업', '네트워크 참여'가 명시되고 상호 교류 내용이 있으면 SDG 17, 단순 벤치마킹·연수·공무 출장이면 NA(해당없음)로 처리합니다."));
children.push(h3("Q5. 1차 SDG와 2차 SDG의 차이가 무엇인가요?"));
children.push(para("1차 SDG는 해당 사업의 '핵심 목표'로, AI 단일 레이블 분류 모델 학습에 사용됩니다. 반드시 1개만 선택합니다. 2차 SDG는 '부가적으로 기여하는 목표'로, 다중 레이블 분류 및 SDG 연계 분석에 활용됩니다. 2차 SDG는 사업내용에서 두 번째 목표가 명확히 확인될 때만 추가하세요."));
children.push(h3("Q6. [신규 v1.5] 수혜자가 장애인이면 자동으로 SDG 10인가요?"));
children.push(para("아니오. 핵심 변화가 의료·돌봄이면 SDG 3, 생계 지원이면 SDG 1, 교육 기회이면 SDG 4, 구조적 불평등 해소이면 SDG 10입니다. 제1장 1-3 결정 트리와 제4장 4-5 결정 트리를 적용하세요."));
children.push(h3("Q7. [신규 v1.5] 사업내용이 '재활용 사업 추진'만 기재되어 있으면 RT-B(SDG Washing)인가요?"));
children.push(para("아니오. 정보 부족은 RT-B가 아니라 NA-UNSURE입니다. RT-B는 '측정 가능한 성과지표 없음 + 홍보/행사 위주 + 수혜자 불명확' 중 2개 이상 확인되어야 적용합니다. 정보가 없을 뿐이면 1차 라벨 NA-UNSURE + RT-NONE으로 처리합니다."));

// ────────────────────────────────────────────
// 제6장 IAA
// ────────────────────────────────────────────
children.push(h1("제6장 IAA 및 불일치 해소 절차"));

children.push(h2("6-1. [개정 v1.5] IAA 측정 방법"));
children.push(para("모든 어노테이터의 독립 라벨링이 완료된 후, 담당 연구자가 Fleiss' Kappa를 산출합니다. 전체 평균 및 SDG별 Per-class Kappa를 모두 산출합니다. v1.5부터는 본 라벨링 전에 v2 파일럿 모드(3인 동일 50건, blind) 재라벨링으로 κ를 선행 검증합니다."));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("구분", 3500),
    headerCell("목표값", 2500),
    headerCell("미달 시 조치", CONTENT_WIDTH - 6000)
  ]}));
  const items = [
    ["1차 SDG 전체 평균", "κ ≥ 0.61", "해당 SDG 정의 수정 후 전체 재레이블링"],
    ["희소 클래스(SDG 9·12·14·17) 개별", "κ ≥ 0.41 (완화)", "희소성 감안, 가이드라인 보완으로 개선 시도"],
    ["Red Tag 유형", "κ ≥ 0.61", "3-4 체크리스트 보완 및 예시 추가 (v1.5 신규)"],
    ["수혜자 식별 (v2 M-01)", "일치율 ≥ 80%", "1-3 결정 트리 재교육"],
    ["v2 파일럿 재측정", "κ(SDG) ≥ 0.50", "미달 시 본 라벨링 개시 보류 + 가이드라인 재검토"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, 3500, { bold: true }),
      cell(b, 2500),
      cell(c, CONTENT_WIDTH - 6000)
    ]}));
  });
  children.push(makeTable(rows));
}
children.push(para("희소 클래스의 IAA 목표를 κ ≥ 0.41로 완화하는 이유: 사례 수가 적으면 Kappa 추정 분산이 커지기 때문. 논문에서 이를 명시적으로 서술하고, Per-class F1으로 모델 성능을 별도 보고."));

children.push(h2("6-2. 불일치 케이스 해소 절차"));
children.push(bullet("어노테이터 간 1차 SDG가 다른 케이스를 추출합니다."));
children.push(bullet("각 어노테이터가 판단 근거 메모를 제출합니다."));
children.push(bullet("전체 어노테이터가 모여 토론 후 다수결(2/3 이상 동의) 또는 합의로 최종 라벨을 확정합니다."));
children.push(bullet("합의 불가 시 지도교수(또는 외부 전문가)가 최종 중재합니다."));
children.push(bullet("해소된 케이스와 근거를 기록하여 v1.6 코딩북에 반영합니다."));

children.push(h2("6-3. HOLD 케이스 처리 프로토콜"));
children.push(bullet("① HOLD 허용 비율: 전체 라벨링 건수의 10% 이내를 권장합니다. 10%를 초과하면 연구자와 1:1 면담을 진행합니다."));
children.push(bullet("② IAA 산출 시 HOLD 케이스는 제외하고 계산합니다. HOLD 비율은 어노테이터별로 별도 집계하여 기록합니다."));
children.push(bullet("③ HOLD 해소 절차: 전체 어노테이터 토론 → 2/3 이상 동의 시 확정 → 합의 불가 시 외부 전문가 중재. 해소 결과는 Gold Standard 데이터셋에 포함됩니다."));
children.push(bullet("④ HOLD 케이스는 별도 시트에 기록하고 판단이 어려웠던 이유를 메모로 남기세요. 이 내용은 v1.6 가이드라인 개선에 활용됩니다."));

// ────────────────────────────────────────────
// 부록
// ────────────────────────────────────────────
children.push(h1("부록 A. SDG 17개 전체 목록 및 채택 현황"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("번호", 1200),
    headerCell("목표명(한국어)", 3000),
    headerCell("목표명(영어)", 3500),
    headerCell("본 연구", 1800),
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
      cell(a, 1200, { bold: true }),
      cell(b, 3000),
      cell(c, 3500),
      cell(d, 1800),
      cell(e, CONTENT_WIDTH - 9500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h1("부록 B. 핵심 참고문헌"));
children.push(bullet("Guariso, D. et al. (2023). Automatic SDG budget tagging: Building public financial management capacity through natural language processing. Data & Policy."));
children.push(bullet("Venturini, S. et al. (2020). Towards nexus-based governance: defining interactions between economic activities and SDGs. International Journal of Sustainable Development & World Ecology."));
children.push(bullet("Landis, J. R., & Koch, G. G. (1977). The Measurement of Observer Agreement for Categorical Data. Biometrics, 33(1), 159-174."));
children.push(bullet("Fleiss, J. L. (1971). Measuring nominal scale agreement among many raters. Psychological Bulletin, 76(5), 378-382."));

children.push(h1("부록 C. [신규 v1.5] 파일럿 분석 결과 및 v2 UI 가드레일 연계"));

children.push(h2("C-1. 파일럿 2인 IAA 결과 (2026-04-18 기준, 박정진·이종훈 29건 공통)"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("지표", 4000),
    headerCell("값", 2500),
    headerCell("Landis & Koch 해석", CONTENT_WIDTH - 6500)
  ]}));
  const items = [
    ["Cohen's κ (1차 SDG)", "0.315", "Fair (하한)"],
    ["Cohen's κ (5P 틀)", "0.235", "Slight"],
    ["Cohen's κ (Red Tag 유형)", "0.328", "Fair"],
    ["공통 라벨링 건수", "29 / 50", ""],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, 4000, { bold: true }),
      cell(b, 2500),
      cell(c, CONTENT_WIDTH - 6500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("C-2. 박정진 test-retest 결과 (v1 2026-03-28~31 vs v1 2026-04-20, 동일 50건)"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("지표", 4000),
    headerCell("값", 2500),
    headerCell("해석", CONTENT_WIDTH - 6500)
  ]}));
  const items = [
    ["Cohen's κ (1차 SDG)", "0.522", "Moderate"],
    ["Cohen's κ (5P 틀)", "0.648", "Substantial"],
    ["Cohen's κ (Red Tag 유형)", "−0.092", "우연 수준 이하 (체크리스트 부재)"],
    ["불일치 케이스", "22 / 50", "P5-내부 9 + P5-교차 12 + NA 1"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, 4000, { bold: true }),
      cell(b, 2500),
      cell(c, CONTENT_WIDTH - 6500)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("C-3. 식별된 disagreement 패턴 → v1.5 보강 매핑"));
{
  const rows = [];
  rows.push(new TableRow({ children: [
    headerCell("패턴", 4500),
    headerCell("재현 건수", 1800),
    headerCell("v1.5 보강 항목", CONTENT_WIDTH - 6300)
  ]}));
  const items = [
    ["수혜자 vs 제공자 혼동 (주체 중심 관점)", "4건 (589/635/992/1118)", "제1장 1-3 결정 트리 + v2 UI M-01 카드"],
    ["SDG 10 ↔ SDG 1/3 (취약계층 대상 = SDG 10 오분류)", "4건 (위 동일)", "제4장 4-5 결정 트리"],
    ["SDG 8 ↔ SDG 9 (산업·혁신 vs 일자리)", "3건 (334/1089/1096)", "제4장 4-6 결정 트리"],
    ["NA 단일 범주 — 회피와 17개 외 미분화", "1건 (366/1072)", "제2장 2-18 + 제5장 5-1 2유형 분리"],
    ["Red Tag 체크리스트 부재 (κ=−0.092)", "전반", "제3장 3-4 YES/NO 체크리스트 + v2 UI M-04 근거 필수화"],
    ["SDG 11 과다 일관성 (인프라 = SDG 11)", "P5-internal", "v2 UI M-02 SDG 혼동 토스트"],
  ];
  items.forEach(([a, b, c]) => {
    rows.push(new TableRow({ children: [
      cell(a, 4500),
      cell(b, 1800),
      cell(c, CONTENT_WIDTH - 6300)
    ]}));
  });
  children.push(makeTable(rows));
}

children.push(h2("C-4. v2 UI 가드레일 3종"));
children.push(bullet("M-01 수혜자 체크리스트 카드 — 수혜자 유형(일반/취약/특정/NA) + 제공자 인지 확인"));
children.push(bullet("M-02 SDG 혼동 가드 토스트 — 파일럿에서 혼동 빈발로 확인된 6개 SDG(11/10/1/5/8/9) 선택 시 재검토 경고"));
children.push(bullet("M-04 Red Tag 판단 근거 필수화 — RT-A/B/C 선택 시 rationale 한 줄 입력 없으면 저장 차단"));
children.push(para("가드레일 응답은 JSON 스키마의 beneficiary·sdgGuardResponses 필드와 CSV 컬럼(beneProviderAware, beneType, sdgGuardResponses)으로 기록되어 v2 재라벨링 κ 개선 효과를 정량 측정할 수 있다."));

children.push(h2("C-5. v2 파일럿 재라벨링 계획"));
children.push(bullet("3인(A/B/C) 동일 50건 blind 라벨링 (파일럿 모드, Firebase sdg_pilot_v2_2026 경로)"));
children.push(bullet("목표: Fleiss κ(SDG) ≥ 0.50, κ(Red Tag) ≥ 0.40"));
children.push(bullet("가드레일 효과 측정: sdgGuardResponses의 rechosen 비율 집계, M-04로 걸러진 Red Tag 사례 분석"));
children.push(bullet("재측정 결과가 목표 미달이면 본 1,200건 라벨링 개시 보류 — v1.6 가이드라인 재정비"));

children.push(para(""));
children.push(para("— 코딩북 v1.5 끝 — v2 파일럿 재라벨링 결과에 따라 v1.6(또는 v2.0)으로 업데이트 예정", { align: AlignmentType.CENTER, italics: true }));

// ────────────────────────────────────────────
// 문서 빌드
// ────────────────────────────────────────────
const doc = new Document({
  creator: "박정진",
  title: "SDGs 어노테이터 코딩북 v1.5",
  styles: {
    default: {
      document: { run: { font: { name: FONT_KR }, size: 20 } },
    },
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
