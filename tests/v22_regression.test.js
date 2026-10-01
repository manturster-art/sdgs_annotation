// v2.2 (D109·D110) 회귀·기능 시험 — 실행: node tests/v22_regression.test.js [기준 index.html 경로]
//
// index.html 인라인 스크립트를 node vm 에서 가짜 DOM 으로 돌린다. 네트워크·Firebase 를 쓰지 않는다
// (firebase 전역이 없어 initFirebase 가 null 을 돌려주므로 로컬 저장 전용 경로만 탄다).
// fetch 는 저장소의 data/*.json 을 직접 읽는다. 사업 텍스트는 출력하지 않는다(id·건수만 비교).
// 두 번째 인자로 기준(변경 전) index.html 을 주면 Stage 1·1-R·데모 레코드 구조를 두 판본에서 대조한다.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const NEW_HTML = path.join(ROOT, 'index.html');
const BASE_HTML = process.argv[2] ? path.resolve(process.argv[2]) : null;
const ASSIGN = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/assignments.json'), 'utf8'));
const CROSS_A = ASSIGN.annotators.A.stage2_crosscheck.map(String);

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

// ── 가짜 DOM ────────────────────────────────────────────────
function makeClassList() {
  const s = new Set();
  return {
    add: (...c) => c.forEach(x => s.add(x)),
    remove: (...c) => c.forEach(x => s.delete(x)),
    toggle: (c, on) => { const v = on === undefined ? !s.has(c) : !!on; v ? s.add(c) : s.delete(c); return v; },
    contains: c => s.has(c),
    _set: s,
  };
}
function makeEl(id) {
  return {
    id, value: '', textContent: '', innerHTML: '', disabled: false, checked: false,
    style: {}, dataset: {}, classList: makeClassList(), children: [],
    addEventListener() {}, appendChild(c) { this.children.push(c); }, scrollIntoView() {}, click() {},
  };
}

function makeEnv(html, { flags = {}, storage = null, prelabels = null } = {}) {
  let src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const [k, v] of Object.entries(flags)) {
    const re = new RegExp(`const ${k} = [^;]+;`);
    if (!re.test(src)) throw new Error('flag not found: ' + k);
    src = src.replace(re, `const ${k} = ${JSON.stringify(v)};`);
  }
  const els = {};
  const getEl = id => (els[id] = els[id] || makeEl(id));
  const redtags = ['RT-NONE', 'A', 'B', 'C', 'D'].map(v => { const e = makeEl('rt-' + v); e.dataset.val = v; return e; });
  const alerts = [];
  const store = storage || new Map();
  const ctx = {
    console, Date, Math, JSON, Promise, Set, Map, Object, Array, String, Number, Boolean, RegExp, Error,
    parseInt, parseFloat, isNaN, isFinite, URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
    Blob: function () {}, TextEncoder,
    setTimeout: (fn) => { fn(); return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
    alert: m => alerts.push(String(m)), confirm: () => true,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    },
    document: {
      getElementById: getEl,
      querySelectorAll: sel => (sel === '.redtag-option' ? redtags : []),
      querySelector: sel => {
        if (sel.startsWith('.redtag-option[data-val=')) {
          const v = sel.match(/data-val="([^"]+)"/)[1];
          return redtags.find(e => e.dataset.val === v) || null;
        }
        if (sel === '#stage-select option[value="2"]') return getEl('__opt2');
        return null;
      },
      createElement: () => makeEl(''),
      addEventListener() {},
    },
    fetch: async (url) => {
      const p = String(url).split('?')[0];
      if (p === 'data/ai_prelabels.json') {
        return prelabels ? { ok: true, status: 200, json: async () => prelabels } : { ok: false, status: 404 };
      }
      const fp = path.join(ROOT, p);
      if (!fs.existsSync(fp)) return { ok: false, status: 404 };
      const txt = fs.readFileSync(fp, 'utf8');
      return { ok: true, status: 200, json: async () => JSON.parse(txt) };
    },
  };
  ctx.window = ctx;
  ctx.window.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const run = code => vm.runInContext(code, ctx);
  return { ctx, run, els: getEl, redtags, alerts, store };
}

async function start(env, slot, mode) {
  await env.run('loadBootstrap()');
  env.els('annotator-name').value = slot;
  env.els('stage-select').value = mode;
  env.els('annotator-full-name').value = '시험코더';
  await env.run('startSession()');
}
const recIds = env => env.run('records.map(r => String(r.id ?? r.sample_id))');
const collect = env => JSON.parse(env.run('JSON.stringify(collectAnnotation())'));
const stripVolatile = a => { const o = { ...a }; delete o.timestamp; delete o.durationSec; return o; };

// 현재 레코드에 선택을 넣고 저장 (저장 잠금은 시험에서 즉시 해제)
function fill(env, { sdg = 'SDG11', na = '', tier = 'certain', rt = 'RT-NONE', why = '' } = {}) {
  env.run(`selectSdg(${JSON.stringify(sdg)}, null)`);
  if (sdg === 'NA') env.run(`selectNaReason(${JSON.stringify(na)})`);
  env.run(`selectTier(${JSON.stringify(tier)})`);
  env.run(`selectRedTag(${JSON.stringify(rt)})`);
  env.els('rationale').value = why;
}
function save(env) { const ok = env.run('saveAnnotation()'); env.run('saving = false'); return ok; }

async function main() {
  const NEW = fs.readFileSync(NEW_HTML, 'utf8');
  const OPEN22 = { STAGE2_CODEBOOK_VERSION: '2.2', STAGE2_CONFIRM_OPEN: true };

  console.log('\n[1] Stage 1 (v2.0) — 기존 동작 유지');
  {
    const e = makeEnv(NEW);
    await start(e, 'A', '1');
    const ids = recIds(e);
    check('300건 로드', ids.length === 300, ids.length);
    check('배정 목록과 같은 집합', new Set(ids).size === 300 && ASSIGN.annotators.A.stage1_samples.every(x => ids.includes(String(x))));
    check('AI 패널 숨김', e.els('ai-panel').style.display === 'none');
    check('배지 Stage 1 · Blind', e.els('header-stage').textContent === 'Stage 1 · Blind');
    fill(e, { sdg: 'NA', na: 'outside', rt: 'B', why: 'x' });
    check('v2.0 모드: NA + RT-B 선택 유지(규칙 미적용)', e.run('selRedTag') === 'B');
    check('v2.0 모드: RT-A·B·C 비활성 표시 없음', e.redtags.every(r => !r.classList.contains('disabled')));
    const a = collect(e);
    check('Stage 1 레코드에 신규 필드 없음', !('blindConfirm' in a) && !('aiShown' in a) && !('codebookVersion' in a), Object.keys(a));
    check('v2.0 모드: NA + RT-B 저장 허용', save(e) === true);
    check('localStorage 키 sdg_anno_v2_A_s1', e.store.has('sdg_anno_v2_A_s1'));
  }

  console.log('\n[2] Stage 1-R (v2.1) — 기존 동작 유지');
  {
    const e = makeEnv(NEW);
    await start(e, 'B', '1r');
    check('67건 로드', recIds(e).length === 67);
    check('배지 Stage 1-R', e.els('header-stage').textContent === 'Stage 1-R · v2.1 재라벨 · Blind');
    check('AI 패널 숨김', e.els('ai-panel').style.display === 'none');
    fill(e, { sdg: 'NA', na: 'unsure', tier: 'unknown', rt: 'A', why: 'x' });
    check('v2.1 모드: NA + RT-A 저장 허용(규칙 미적용)', save(e) === true);
    const a = collect(e);
    check('Stage 1-R 레코드에 신규 필드 없음', !('blindConfirm' in a) && !('codebookVersion' in a));
    check('localStorage 키 _s1r', e.store.has('sdg_anno_v2_B_s1r'));
  }

  console.log('\n[3] Stage 2 기본값(플래그 닫힘) — 기존 차단 유지');
  {
    const e = makeEnv(NEW);
    await start(e, 'A', '2');
    check('차단 안내 표시', e.alerts.some(m => m.includes('Stage 2는 아직 열리지 않았습니다')), e.alerts);
    check('레코드 미로드', recIds(e).length === 0);
    check('모드 표기 미변경', e.els('__opt2').textContent === '');
  }

  console.log('\n[4] Stage 2 확인 표본 blind (v2.2, AI 닫힘)');
  const sharedStore = new Map();
  {
    const e = makeEnv(NEW, { flags: OPEN22, storage: sharedStore });
    await start(e, 'A', '2');
    const ids = recIds(e);
    check('90건만 연다', ids.length === 90, ids.length);
    check('90건 = stage2_crosscheck', ids.every(x => CROSS_A.includes(x)) && new Set(ids).size === 90);
    check('stage2Phase = blind', e.run('stage2Phase') === 'blind');
    check('배지 v2.2 적용 표본 · Blind', e.els('header-stage').textContent === 'Stage 2 · v2.2 적용 표본 · Blind', e.els('header-stage').textContent);
    check('모드 표기 v2.2', e.els('__opt2').textContent.includes('v2.2'));
    check('AI 패널 숨김', e.els('ai-panel').style.display === 'none');

    // NA ↔ RT-A·B·C
    e.run(`selectSdg('SDG11', null)`); e.run(`selectRedTag('B')`);
    check('SDG + RT-B 선택 가능', e.run('selRedTag') === 'B');
    e.run(`selectSdg('NA', null)`);
    check('NA 선택 시 기존 RT-B 해제', e.run('selRedTag') === '');
    check('해제 안내 표시', e.els('status-msg').textContent.includes('해제했습니다'));
    check('RT-A·B·C 비활성 표시', ['A', 'B', 'C'].every(v => e.redtags.find(r => r.dataset.val === v).classList.contains('disabled')));
    check('RT-NONE·RT-D 활성', ['RT-NONE', 'D'].every(v => !e.redtags.find(r => r.dataset.val === v).classList.contains('disabled')));
    e.run(`selectRedTag('C')`);
    check('NA 상태에서 RT-C 클릭 무시', e.run('selRedTag') === '');
    e.run(`selectRedTag('D')`);
    check('NA 상태에서 RT-D 선택 가능', e.run('selRedTag') === 'D');
    e.run(`selectSdg('SDG3', null)`);
    check('SDG로 바꾸면 비활성 해제', e.redtags.every(r => !r.classList.contains('disabled')));
    // 저장 직전 검증: 화면을 우회해 조합을 강제로 넣어도 막힌다
    e.run(`selPrimarySdg='NA'; selNaReason='unsure'; selTier='unknown'; selRedTag='B'`);
    e.els('rationale').value = 'x';
    check('검증: NA-UNSURE + RT-B 저장 차단(skip 경로 포함)', save(e) === false);
    e.run(`selNaReason='outside'; selTier='certain'; selRedTag='A'`);
    check('검증: NA-OUTSIDE + RT-A 저장 차단', save(e) === false);
    e.run(`selRedTag='RT-NONE'`);
    check('검증: NA-OUTSIDE + RT-NONE 허용', save(e) === true);
    const a = collect(e);
    check('레코드 blindConfirm=true', a.blindConfirm === true);
    check('레코드 aiShown=false', a.aiShown === false);
    check('레코드 codebookVersion=2.2', a.codebookVersion === '2.2');
    check('레코드 chosenFromAI=false·aiTopK=null·aiRank=null', a.chosenFromAI === false && a.aiTopK === null && a.aiRank === null);
    check('레코드 stage="2" (Stage 1과 같은 키 구조)', a.stage === '2' && a.annotator === 'A' && 'sdgPath' in a);

    // 90건 전부 저장 → 완료 안내
    for (let i = 0; i < 90; i++) {
      e.run(`currentIdx = ${i}; renderRecord()`);
      if (i % 3 === 0) fill(e, { sdg: 'NA', na: 'unsure', tier: 'unknown', rt: 'D', why: 'x' });
      else fill(e, { sdg: 'SDG11' });
      save(e);
    }
    const saved = JSON.parse(sharedStore.get('sdg_anno_v2_A_s2'));
    check('90건 저장(로컬 키 _s2)', Object.keys(saved).length === 90);
    check('90건 전부 blindConfirm=true', Object.values(saved).every(r => r.blindConfirm === true));
    check('완료 안내 1회', e.alerts.filter(m => m.includes('적용 표본 90건을 모두 저장')).length === 1, e.alerts);
  }

  console.log('\n[5] AI 개방 + 사전라벨 있음 + 본인 90건 미완료 → 여전히 90건만');
  const fakePre = {};
  ASSIGN.annotators.A.stage2_samples.forEach(id => { fakePre[String(id)] = [{ sdg: 'SDG1', prob: 0.9 }]; });  // 가짜 값(시험용)
  {
    const e = makeEnv(NEW, { flags: { ...OPEN22, STAGE2_AI_OPEN: true }, prelabels: fakePre });
    await start(e, 'B', '2');
    check('미완료면 blind 단계', e.run('stage2Phase') === 'blind' && recIds(e).length === 90);
    check('AI 패널 숨김', e.els('ai-panel').style.display === 'none');
  }

  console.log('\n[6] AI 개방 + 사전라벨 없음 + 90건 완료 → 90건만(사전라벨 배치 전 AI 단계 차단)');
  {
    const e = makeEnv(NEW, { flags: { ...OPEN22, STAGE2_AI_OPEN: true }, storage: new Map(sharedStore) });
    await start(e, 'A', '2');
    check('blind 단계 유지', e.run('stage2Phase') === 'blind' && recIds(e).length === 90);
    check('완료 안내 재표시 없음', !e.alerts.some(m => m.includes('모두 저장')));
  }

  console.log('\n[7] AI 개방 + 사전라벨 있음 + 90건 완료 → 90건 먼저, 이후 AI 노출');
  {
    const e = makeEnv(NEW, { flags: { ...OPEN22, STAGE2_AI_OPEN: true }, storage: new Map(sharedStore), prelabels: fakePre });
    await start(e, 'A', '2');
    const ids = recIds(e);
    check('full 단계 360건', e.run('stage2Phase') === 'full' && ids.length === 360, ids.length);
    check('앞 90건 = 확인 표본', ids.slice(0, 90).every(x => CROSS_A.includes(x)) && ids.slice(90).every(x => !CROSS_A.includes(x)));
    check('첫 미완료 = 91번째', e.run('currentIdx') === 90);
    check('91번째: AI 패널 표시', e.els('ai-panel').style.display === 'block');
    e.run(`selectSdgFromAi('SDG1', 1)`);
    const a = collect(e);
    check('AI 문항 레코드 aiShown=true·blindConfirm=false·aiTopK 기록', a.aiShown === true && a.blindConfirm === false && Array.isArray(a.aiTopK) && a.aiTopK.length === 1);
    check('AI 문항 chosenFromAI=true', a.chosenFromAI === true);
    e.run('currentIdx = 0; renderRecord()');
    check('1번째(확인 표본): AI 패널 숨김', e.els('ai-panel').style.display === 'none');
    check('1번째: AI 값 DOM 미기록', e.els('ai-topk-wrap').innerHTML === '');
    e.run(`window._chosenFromAi = true; window._aiRank = 1`);   // 직전 문항 상태가 남아도
    const b = collect(e);
    check('확인 표본은 AI 단계에서도 chosenFromAI=false·aiTopK=null', b.chosenFromAI === false && b.aiTopK === null && b.blindConfirm === true);
  }

  console.log('\n[8] Stage 2 판본 v2.1 로 개방 — NA 규칙은 판본에 묶여 꺼짐');
  {
    const e = makeEnv(NEW, { flags: { STAGE2_CONFIRM_OPEN: true } });
    await start(e, 'C', '2');
    check('90건 blind', recIds(e).length === 90);
    fill(e, { sdg: 'NA', na: 'outside', rt: 'B', why: 'x' });
    check('v2.1: NA + RT-B 허용', e.run('selRedTag') === 'B' && save(e) === true);
    check('codebookVersion=2.1 기록', collect(e).codebookVersion === '2.1');
  }

  console.log('\n[9] 기존 레코드 읽기');
  {
    const legacy = { sample_id: Number(ASSIGN.annotators.A.stage1_samples[0]), annotator: 'A', annotator_name: 'x', stage: '1',
      sdgPath: { p5: null, sdg: 'NA', additionalSdgs: [], naReason: 'outside' }, aiTopK: null, chosenFromAI: false, aiRank: null,
      tier: 'certain', redTag: 'B', rationale: '구 기록', beneficiary: { identified: false, providerAware: false, type: null },
      sdgGuardResponses: null, timestamp: '2026-08-01T00:00:00.000Z', durationSec: 10 };
    const st = new Map([['sdg_anno_v2_A_s1', JSON.stringify({ [String(legacy.sample_id)]: legacy })]]);
    const e = makeEnv(NEW, { storage: st });
    await start(e, 'A', '1');
    e.run('currentIdx = 0; renderRecord()');
    check('구 레코드 복원(NA + RT-B)', e.run('selPrimarySdg') === 'NA' && e.run('selRedTag') === 'B' && e.run('selNaReason') === 'outside');
    check('구 레코드 화면: 비활성 표시 없음', e.redtags.every(r => !r.classList.contains('disabled')));
    check('구 레코드 재저장 허용(v2.0 모드)', save(e) === true);
    const csvOk = (() => { try { e.run('exportCSV()'); return true; } catch (err) { return false; } })();
    check('CSV 내보내기 오류 없음', csvOk);
  }

  console.log('\n[10] 데모·파일럿');
  {
    const e = makeEnv(NEW);
    await start(e, 'DEMO', 'demo');
    check('데모 로드', recIds(e).length > 0, recIds(e).length);
    fill(e, { sdg: 'NA', na: 'outside', rt: 'B', why: 'x' });
    check('데모: 신규 필드 없음·NA 규칙 미적용', !('codebookVersion' in collect(e)) && save(e) === true);
    const p = makeEnv(NEW);
    await start(p, 'A', 'pilot');
    check('파일럿 A 잠금 유지', p.alerts.some(m => m.includes('잠금')));
  }

  if (BASE_HTML) {
    console.log('\n[11] 기준 판본 대조 (Stage 1·1-R·데모 레코드 구조 동일성)');
    const BASE = fs.readFileSync(BASE_HTML, 'utf8');
    for (const [slot, mode] of [['A', '1'], ['B', '1r'], ['DEMO', 'demo']]) {
      const out = [];
      for (const html of [BASE, NEW]) {
        const e = makeEnv(html);
        await start(e, slot, mode);
        const recs = recIds(e);
        e.run('currentIdx = 0; renderRecord()');
        fill(e, { sdg: 'SDG6', tier: 'ambiguous', rt: 'A', why: 'r' });
        e.run(`toggleAdditional('SDG13')`);
        out.push({ recs, ann: stripVolatile(collect(e)), ok: save(e), badge: e.els('header-stage').textContent, ai: e.els('ai-panel').style.display });
      }
      check(`${mode}: 레코드 목록·순서 동일`, JSON.stringify(out[0].recs) === JSON.stringify(out[1].recs));
      check(`${mode}: 저장 레코드 동일`, JSON.stringify(out[0].ann) === JSON.stringify(out[1].ann), [out[0].ann, out[1].ann]);
      check(`${mode}: 저장 결과·배지·AI 패널 동일`, out[0].ok === out[1].ok && out[0].badge === out[1].badge && out[0].ai === out[1].ai);
    }
    const eb = makeEnv(BASE); await start(eb, 'A', '2');
    const en = makeEnv(NEW); await start(en, 'A', '2');
    check('Stage 2 기본값 차단 안내 동일', JSON.stringify(eb.alerts) === JSON.stringify(en.alerts));
  }

  console.log(`\n결과: ${pass} 통과 · ${fail} 실패`);
  process.exit(fail ? 1 : 0);
}
main().catch(err => { console.error(err); process.exit(2); });
