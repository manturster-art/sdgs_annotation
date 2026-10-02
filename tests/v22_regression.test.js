// v2.2 (D109·D110·D111) 회귀·기능 시험 — 실행: node tests/v22_regression.test.js [기준 index.html] [기준 assignments.json]
//
// index.html 인라인 스크립트를 node vm 에서 가짜 DOM 으로 돌린다. 실제 네트워크·Firebase 를 쓰지 않는다
// (firebase 전역이 없으면 initFirebase 가 null → 로컬 저장 경로. [13]은 가짜 firebase 로 저장 경로·규칙 호환을 본다).
// fetch 는 저장소의 data/*.json 을 직접 읽는다. 사업 텍스트는 출력하지 않는다(id·건수만 비교).
// 두 번째 인자: 기준(변경 전·배포 중) index.html → Stage 1·1-R·데모·Stage 2 확인 표본 레코드 구조를 두 판본에서 대조.
// 세 번째 인자: 기준 data/assignments.json → 기존 키(stage1·stage1r·stage2_crosscheck) 보존 대조.
// ⑤ 사전라벨: data/ai_prelabels.json 이 있으면 그것을, 없으면(①~④ 배포 판, 2026-10-03) 환경 변수 AI_PRELABELS
// 또는 sdgs repo 사본(_workspace/design/stage2_freeze/annotool_data_v22/ai_prelabels.json)을 ⑤ 시험용으로 읽는다.
// 배포 판에서 디스크에 파일이 없을 때 ①~④ 가 정상 동작하는지는 [15]에서 본다.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const NEW_HTML = path.join(ROOT, 'index.html');
const BASE_HTML = process.argv[2] ? path.resolve(process.argv[2]) : null;
const BASE_ASSIGN = process.argv[3] ? path.resolve(process.argv[3]) : null;
const readJson = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const ASSIGN = readJson('data/assignments.json');
const POOL1 = readJson('data/stage1_pool.json');
const POOL2 = readJson('data/stage2_pool.json');
const PRE_IN_DATA = fs.existsSync(path.join(ROOT, 'data/ai_prelabels.json'));
const PRE_SRC = PRE_IN_DATA ? path.join(ROOT, 'data/ai_prelabels.json')
  : [process.env.AI_PRELABELS,
     path.resolve(ROOT, '../../../_workspace/design/stage2_freeze/annotool_data_v22/ai_prelabels.json'),   // .claude/worktrees/<name>
     path.resolve(ROOT, '../../_workspace/design/stage2_freeze/annotool_data_v22/ai_prelabels.json')]      // 프로그램/annotation_tool
    .filter(Boolean).find(x => fs.existsSync(x)) || null;
const PRE = PRE_SRC ? JSON.parse(fs.readFileSync(PRE_SRC, 'utf8')) : null;
const RULES = readJson('firebase_rules_stage2_confirm_PASTE.json').rules;
const S = slot => ASSIGN.annotators[slot];
const strs = a => (a || []).map(String);
const CROSS_A = strs(S('A').stage2_crosscheck);
const STEP_KEYS = {
  1: ['stage2_crosscheck'], 2: ['stage1v22_samples', 'stage1v22_extra_samples'], 3: ['stage2_blind1_samples'],
  4: ['stage2_audit_samples'], 5: ['stage2_target_samples', 'stage2_anchor_samples'],
};
const stepIds = (slot, n) => [...new Set(STEP_KEYS[n].flatMap(k => strs(S(slot)[k])))];
const BLIND_KEYS = ['stage2_crosscheck', 'stage1v22_samples', 'stage1v22_extra_samples', 'stage2_blind1_samples', 'stage2_audit_samples'];
const scopeOf = Object.fromEntries(POOL2.map(r => [String(r.id), r.scope]));

let pass = 0, fail = 0;
let sink = null;   // 변이 시험 중에는 결과를 여기로 모은다
function check(name, cond, extra) {
  if (sink) { sink.push(!!cond); return; }
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 300) : '')); }
}
const log = m => { if (!sink) console.log(m); };

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
// AI 패널을 DOM 에서 떼면 그 안의 ai-topk-wrap 도 함께 빠진다
const CHILDREN_OF = { 'ai-panel': ['ai-topk-wrap'] };
function makeEnv(html, { flags = {}, storage = null, prelabels = undefined, lenient = false, firebase = null } = {}) {
  let src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const [k, v] of Object.entries(flags)) {
    const re = new RegExp(`const ${k} = [^;]+;`);
    if (!re.test(src)) { if (lenient) continue; throw new Error('flag not found: ' + k); }
    src = src.replace(re, `const ${k} = ${JSON.stringify(v)};`);
  }
  const els = {};
  const detached = new Set();
  const parent = {
    removeChild(c) { detached.add(c.id); (CHILDREN_OF[c.id] || []).forEach(x => detached.add(x)); return c; },
    insertBefore(c) { detached.delete(c.id); (CHILDREN_OF[c.id] || []).forEach(x => detached.delete(x)); return c; },
  };
  const raw = id => (els[id] = els[id] || makeEl(id));
  function makeEl(id) {
    return {
      id, value: '', textContent: '', innerHTML: '', disabled: false, checked: false,
      style: {}, dataset: {}, classList: makeClassList(), children: [], parentNode: parent, nextSibling: null,
      addEventListener() {}, appendChild(c) { this.children.push(c); }, scrollIntoView() {}, click() {},
    };
  }
  const getEl = id => (detached.has(id) ? null : raw(id));
  const redtags = ['RT-NONE', 'A', 'B', 'C', 'D'].map(v => { const e = makeEl('rt-' + v); e.dataset.val = v; return e; });
  const alerts = [];
  const fetches = [];
  const store = storage || new Map();
  const ctx = {
    console: { log() {}, warn() {}, error: console.error }, Date, Math, JSON, Promise, Set, Map, Object, Array, String, Number, Boolean, RegExp, Error,
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
        if (sel === '#stage-select option[value="2"]') return raw('__opt2');
        return null;
      },
      createElement: () => makeEl(''),
      addEventListener() {},
    },
    fetch: async (url) => {
      const p = String(url).split('?')[0];
      fetches.push(p);
      if (p === 'data/ai_prelabels.json' && prelabels !== undefined) {
        return prelabels ? { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(prelabels)) } : { ok: false, status: 404 };
      }
      const fp = path.join(ROOT, p);
      if (!fs.existsSync(fp)) return { ok: false, status: 404 };
      const txt = fs.readFileSync(fp, 'utf8');
      return { ok: true, status: 200, json: async () => JSON.parse(txt) };
    },
  };
  if (firebase) ctx.firebase = firebase;
  ctx.window = ctx;
  ctx.window.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const run = code => vm.runInContext(code, ctx);
  return { ctx, run, els: raw, inDom: id => !detached.has(id), redtags, alerts, store, fetches };
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
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && b.every(x => a.includes(x));

function fill(env, { sdg = 'SDG11', na = '', tier = 'certain', rt = 'RT-NONE', why = '' } = {}) {
  env.run(`selectSdg(${JSON.stringify(sdg)}, null)`);
  if (sdg === 'NA') env.run(`selectNaReason(${JSON.stringify(na)})`);
  env.run(`selectTier(${JSON.stringify(tier)})`);
  env.run(`selectRedTag(${JSON.stringify(rt)})`);
  env.els('rationale').value = why;
}
function save(env) { const ok = env.run('saveAnnotation()'); env.run('saving = false'); return ok; }
// 현재 단계 문항을 전부 저장하고 단계 전환을 기다린다
async function saveAll(env, opt) {
  const n = env.run('records.length');
  for (let i = 0; i < n; i++) {
    env.run(`currentIdx = ${i}; renderRecord()`);
    fill(env, opt || (i % 4 === 0 ? { sdg: 'NA', na: 'unsure', tier: 'unknown', rt: 'D', why: 'x' } : { sdg: 'SDG3' }));
    save(env);
  }
  await env.run('stage2Advance');
}
const savedS2 = (store, slot) => JSON.parse(store.get(`sdg_anno_v2_${slot}_s2`) || '{}');

// 단계 ①~④ 를 마친 상태의 로컬 저장본(합성, 게이트 판정 필드만)
function seededStore(slot, upto) {
  const o = {};
  const base = id => ({ sample_id: Number(id), annotator: slot, stage: '2', tier: 'certain', timestamp: '2026-10-02T00:00:00.000Z',
    sdgPath: { p5: 'People', sdg: 'SDG3', additionalSdgs: [], naReason: null }, redTag: 'RT-NONE' });
  const TASK = { 2: () => 'testset_relabel', 3: id => (scopeOf[id] === '전국' ? 'blind1_external' : 'blind1_val'), 4: () => 'audit' };
  for (let n = 1; n <= upto; n++) {
    for (const id of stepIds(slot, n)) o[id] = n === 1 ? { ...base(id), blindConfirm: true, aiShown: false, codebookVersion: '2.2' }
      : { ...base(id), blindConfirm: false, aiShown: false, codebookVersion: '2.2', task: TASK[n](id) };
  }
  return new Map([[`sdg_anno_v2_${slot}_s2`, JSON.stringify(o)]]);
}

// ── Firebase 규칙 에뮬레이터 (firebase_rules_stage2_confirm_PASTE.json 문자열에서 조건을 읽는다) ──
function ruleCheck(p, v) {
  const seg = p.split('/');
  if (seg.length !== 4) return 'depth ' + seg.length;
  const [proj, stage, slot] = seg;
  const P = RULES[proj];
  if (!P) return 'project ' + proj;
  const st = P.$stage;
  if (![...st['.validate'].matchAll(/\$stage === '([^']+)'/g)].map(m => m[1]).includes(stage)) return 'stage validate';
  const an = st.$annotator;
  const w = an['.write'];
  if (!w.includes('auth != null')) return 'auth';
  const wStages = [...w.matchAll(/\$stage === '([^']+)'/g)].map(m => m[1]);
  const wSlots = [...w.matchAll(/\$annotator === '([^']+)'/g)].map(m => m[1]);
  if (!wStages.includes(stage) || !wSlots.includes(slot)) return 'write denied';
  const sid = an.$sample_id;
  const req = JSON.parse(sid['.validate'].match(/hasChildren\((\[[^\]]+\])\)/)[1].replace(/'/g, '"'));
  for (const k of req) if (v[k] === undefined || v[k] === null) return 'missing ' + k;
  for (const [k, rule] of Object.entries(sid)) {
    if (k.startsWith('.') || k.startsWith('$')) continue;
    const r = rule['.validate'];
    if (r.includes('=== $annotator')) { if (v[k] !== slot) return 'annotator mismatch'; continue; }
    const ok = (r.includes('isString') && typeof v[k] === 'string') || (r.includes('isNumber') && typeof v[k] === 'number');
    if (!ok) return 'type ' + k;
  }
  if (JSON.stringify(v) !== JSON.stringify(JSON.parse(JSON.stringify(v)))) return 'undefined value';
  return null;
}
function fakeFirebase(remote = {}) {
  const writes = [], reads = [];
  const db = {
    ref(p) {
      return {
        get: async () => { reads.push(p); const v = remote[p]; return { exists: () => !!v, val: () => v }; },
        update: async o => { writes.push({ path: p, op: 'update', v: o }); },
        set: async v => { writes.push({ path: p, op: 'set', v: JSON.parse(JSON.stringify(v)), hasUndef: hasUndefined(v) }); },
        on() {},
      };
    },
  };
  const fb = {
    apps: [],
    initializeApp() { this.apps.push({}); return {}; },
    app() { return {}; },
    auth() { return { currentUser: null, signInAnonymously: async () => {} }; },
    database() { return db; },
  };
  return { fb, writes, reads };
}
function hasUndefined(v) {
  if (v === undefined) return true;
  if (v && typeof v === 'object') return Object.values(v).some(hasUndefined);
  return false;
}

const OPEN22 = { STAGE2_CODEBOOK_VERSION: '2.2', STAGE2_CONFIRM_OPEN: true };
// 파일 기본값과 무관하게 조건을 고정해 시험한다(배포 커밋에서 플래그를 바꿔도 시험이 유효하도록)
const CLOSED = { STAGE2_CODEBOOK_VERSION: '2.1', STAGE2_CONFIRM_OPEN: false, STAGE2_AI_OPEN: false, STAGE2_STEP_MAX: 1 };
const STEP = (n, ai = false) => ({ ...OPEN22, STAGE2_STEP_MAX: n, STAGE2_AI_OPEN: ai });

// ════════════════════════════════════════════════════════════
//  단계 게이트 시험 묶음 (본 시험 + 변이 시험에서 재사용)
// ════════════════════════════════════════════════════════════
async function suiteGate(HTML) {
  log('\n[12] 단계 게이트 — ① → ② → ③ → ④ 자동 개방, 상한 플래그, ⑤ 이전 AI 비노출');
  const st = new Map();
  // ① 만 열린 상태(상한 1): 90건 저장 뒤에도 ② 가 열리지 않는다
  {
    const e = makeEnv(HTML, { flags: STEP(1), storage: st });
    await start(e, 'A', '2');
    check('상한 1: ① 90건', recIds(e).length === 90 && e.run('stage2Phase') === 'blind');
    await saveAll(e, { sdg: 'SDG11' });
    check('상한 1: ① 완료 안내(다음 단계는 관리자 개방)', e.alerts.some(m => m.includes('적용 표본 90건을 모두 저장') && m.includes('관리자가 연 뒤')), e.alerts);
    check('상한 1: ① 완료 뒤에도 ① 유지', e.run('stage2Phase') === 'blind' && recIds(e).length === 90);
    check('상한 1: ai_prelabels.json 요청 없음', !e.fetches.includes('data/ai_prelabels.json'));
  }
  // 상한 4 로 다시 시작 → ② 가 열린다(Stage 1 판정 비노출 확인을 위해 같은 id 의 Stage 1 기록을 심어 둔다)
  const relA = stepIds('A', 2);
  const s1rec = { sample_id: Number(relA[0]), annotator: 'A', stage: '1', sdgPath: { p5: 'People', sdg: 'SDG4', additionalSdgs: [], naReason: null },
    tier: 'certain', redTag: 'RT-B', rationale: 'stage1-old', timestamp: '2026-08-01T00:00:00.000Z' };
  st.set('sdg_anno_v2_A_s1', JSON.stringify({ [relA[0]]: s1rec }));
  st.set('sdg_anno_v2_A_s1r', JSON.stringify({ [relA[0]]: { ...s1rec, stage: '1r', rationale: 'stage1r-old' } }));
  const e = makeEnv(HTML, { flags: STEP(4, true), storage: st, prelabels: PRE });
  await start(e, 'A', '2');
  {
    const ids = recIds(e);
    check('② 재라벨 단계 개방', e.run('stage2Phase') === 'step2', e.run('stage2Phase'));
    check('② 문항 = stage1v22(+extra) 전부·Stage 1 풀', sameSet(ids, relA) && ids.every(x => POOL1.some(r => String(r.id) === x)), ids.length);
    check('② 배지: 단계 이름만', e.els('header-stage').textContent === 'Stage 2 · v2.2 재판정 문항 · Blind', e.els('header-stage').textContent);
    check('② 남은 건수 표시', String(e.els('stat-remain').textContent) === String(relA.length), e.els('stat-remain').textContent);
    check('② AI 패널 DOM 없음', !e.inDom('ai-panel') && !e.inDom('ai-topk-wrap'));
    check('② AI 사전라벨 메모리 없음', e.run('Object.keys(aiPrelabels).length') === 0);
    e.run('currentIdx = 0; renderRecord()');
    check('② 이전 Stage 1·1-R 판정 비노출(선택 비어 있음)', e.run('selPrimarySdg') === '' && e.run('selRedTag') === '' && e.els('rationale').value === '');
    check('② 화면에 목적·선정 사유 문구 없음', !/재라벨 사유|불일치|스크리닝|선정/.test(e.els('header-stage').textContent + e.alerts.join('')));
    fill(e, { sdg: 'NA', na: 'outside', rt: 'B', why: 'x' });
    check('② v2.2 NA↔RT-B 규칙 적용', e.run('selRedTag') === '');
    fill(e, { sdg: 'SDG4' });
    const a = collect(e);
    check('② 레코드 task=testset_relabel·label_source=H3_BLIND', a.task === 'testset_relabel' && a.label_source === 'H3_BLIND', a);
    check('② 레코드 aiShown=false·blindConfirm=false·codebookVersion=2.2', a.aiShown === false && a.blindConfirm === false && a.codebookVersion === '2.2');
    check('② 레코드 AI 필드 비움', a.chosenFromAI === false && a.aiTopK === null && a.aiRank === null);
    check('② 레코드 stage="2"·annotator=A', a.stage === '2' && a.annotator === 'A');
  }
  await saveAll(e);
  {
    const ids = recIds(e), want = stepIds('A', 3);
    check('② 완료 → ③ 자동 개방', e.run('stage2Phase') === 'step3' && sameSet(ids, want), [e.run('stage2Phase'), ids.length]);
    check('③ 개방 안내: 단계 이름·건수만', e.alerts.some(m => m.includes(`이어서 「추가 판정」 ${want.length}건을 엽니다`)), e.alerts.slice(-2));
    check('③ 배지', e.els('header-stage').textContent === 'Stage 2 · 추가 판정 · Blind');
    check('③ AI 패널 DOM 없음', !e.inDom('ai-panel'));
    const tasks = {};
    for (let i = 0; i < ids.length; i++) {
      e.run(`currentIdx = ${i}; renderRecord()`);
      fill(e, { sdg: 'SDG8' });
      tasks[ids[i]] = collect(e).task;
    }
    check('③ task: 전국=blind1_external, 경기=blind1_val', ids.every(x => tasks[x] === (scopeOf[x] === '전국' ? 'blind1_external' : 'blind1_val')));
    check('③ task 두 종 모두 있음', Object.values(tasks).includes('blind1_external') && Object.values(tasks).includes('blind1_val'));
    check('③ label_source=H1_BLIND_EXTRA', collect(e).label_source === 'H1_BLIND_EXTRA');
  }
  await saveAll(e);
  {
    check('③ 완료 → ④ 자동 개방', e.run('stage2Phase') === 'step4' && sameSet(recIds(e), stepIds('A', 4)));
    check('④ 배지', e.els('header-stage').textContent === 'Stage 2 · 추가 판정 2 · Blind');
    e.run('currentIdx = 0; renderRecord()'); fill(e);
    const a = collect(e);
    check('④ task=audit·label_source=AUDIT2_BLIND·aiShown=false', a.task === 'audit' && a.label_source === 'AUDIT2_BLIND' && a.aiShown === false);
    check('④ AI 패널 DOM 없음', !e.inDom('ai-panel'));
  }
  await saveAll(e);
  {
    check('상한 4: ④ 완료 뒤 ④ 유지(⑤ 미개방)', e.run('stage2Phase') === 'step4');
    check('상한 4: 완료 안내', e.alerts.some(m => m.includes('추가 판정 2') && m.includes('관리자가 연 뒤')));
    check('①~④ 동안 ai_prelabels.json 요청 0', !e.fetches.includes('data/ai_prelabels.json'), e.fetches);
    check('①~④ 동안 AI 패널 DOM 복귀 없음', !e.inDom('ai-panel'));
    const sv = savedS2(st, 'A');
    const need = [1, 2, 3, 4].flatMap(n => stepIds('A', n));
    check('①~④ 저장 건수 = 배정 합계(한 노드 stage2)', need.every(x => sv[x]) && Object.keys(sv).length === need.length, [Object.keys(sv).length, need.length]);
    check('①~④ 저장본 aiShown=true 0건', Object.values(sv).every(r => r.aiShown === false));
    check('① 레코드에는 task 없음(구조 불변)', CROSS_A.every(x => !('task' in sv[x]) && sv[x].blindConfirm === true));
  }
  // 상한 5 + AI 개방 → ⑤ 개방(같은 저장본, 새 세션)
  const e5 = makeEnv(HTML, { flags: STEP(5, true), storage: st, prelabels: PRE });
  await start(e5, 'A', '2');
  {
    const ids = recIds(e5), want = stepIds('A', 5);
    check('⑤ AI 초안 검토 개방', e5.run('stage2Phase') === 'step5' && sameSet(ids, want), [e5.run('stage2Phase'), ids.length]);
    check('⑤ 배지', e5.els('header-stage').textContent === 'Stage 2 · AI 초안 검토');
    check('⑤ AI 패널 DOM 복귀·표시', e5.inDom('ai-panel') && e5.els('ai-panel').style.display === 'block');
    check('⑤ 사전라벨 메모리 = 본인 ⑤ 문항만', sameSet(e5.run('Object.keys(aiPrelabels)'), want));
    check('⑤ AI 값 렌더', e5.els('ai-topk-wrap').children.length > 0);
    const first = PRE[ids[e5.run('currentIdx')]];
    e5.run(`selectSdgFromAi(${JSON.stringify(first[0].sdg)}, 1)`);
    if (first[0].sdg === 'NA') e5.run(`selectNaReason('outside')`);
    e5.run(`selectTier('certain'); selectRedTag('RT-NONE')`);
    const a = collect(e5);
    check('⑤ 레코드 task=targeted·label_source=H_TARGET_AIEXP', a.task === 'targeted' && a.label_source === 'H_TARGET_AIEXP');
    check('⑤ 레코드 aiShown=true·blindConfirm=false·aiTopK 기록', a.aiShown === true && a.blindConfirm === false && Array.isArray(a.aiTopK) && a.aiTopK.length === first.length);
    check('⑤ chosenFromAI=true·aiRank=1', a.chosenFromAI === true && a.aiRank === 1);
    check('⑤ 단계에서도 확인 표본 id 는 AI 불가', e5.run(`aiVisibleFor(${JSON.stringify(CROSS_A[0])})`) === false);
  }
}

async function suiteAiLocks(HTML) {
  log('\n[12b] ⑤ 잠금 — AI 플래그·사전라벨 무결성');
  const st = () => seededStore('B', 4);
  {
    const e = makeEnv(HTML, { flags: STEP(5, false), storage: st(), prelabels: PRE });
    await start(e, 'B', '2');
    check('AI 플래그 닫힘: ④ 유지', e.run('stage2Phase') === 'step4' && !e.inDom('ai-panel'));
  }
  {
    const e = makeEnv(HTML, { flags: STEP(5, true), storage: st(), prelabels: null });
    await start(e, 'B', '2');
    check('사전라벨 파일 없음: ④ 유지', e.run('stage2Phase') === 'step4' && !e.inDom('ai-panel'));
  }
  {
    const bad = { ...PRE, [String(S('C').stage2_crosscheck[0])]: [{ sdg: 'SDG1', prob: null, role: 'principal' }] };
    const e = makeEnv(HTML, { flags: STEP(5, true), storage: st(), prelabels: bad });
    await start(e, 'B', '2');
    check('사전라벨에 (타 슬롯) 확인 표본 포함: ⑤ 차단', e.run('stage2Phase') === 'step4' && e.alerts.some(m => m.includes('파일 점검')));
  }
  {
    const bad = JSON.parse(JSON.stringify(PRE));
    delete bad[stepIds('B', 5)[0]];
    const e = makeEnv(HTML, { flags: STEP(5, true), storage: st(), prelabels: bad });
    await start(e, 'B', '2');
    check('사전라벨 누락 1건: ⑤ 차단', e.run('stage2Phase') === 'step4');
  }
  {
    const e = makeEnv(HTML, { flags: STEP(5, true), storage: seededStore('B', 1), prelabels: PRE });
    await start(e, 'B', '2');
    check('상한 5·AI 개방이어도 ② 미완료면 ② (건너뛰기 없음)', e.run('stage2Phase') === 'step2' && !e.inDom('ai-panel'));
    check('② 에서 ai_prelabels.json 요청 0', !e.fetches.includes('data/ai_prelabels.json'));
  }
  {
    // ④ 진행 중 다른 단계 레코드가 한 노드에 섞여 있어도 남은 건수는 현재 단계 기준
    const e = makeEnv(HTML, { flags: STEP(5, true), storage: seededStore('C', 3), prelabels: PRE });
    await start(e, 'C', '2');
    check('④ 남은 건수 = ④ 배정 건수', String(e.els('stat-remain').textContent) === String(stepIds('C', 4).length), e.els('stat-remain').textContent);
  }
}

async function main() {
  const NEW = fs.readFileSync(NEW_HTML, 'utf8');
  const fileFlag = k => (NEW.match(new RegExp(`const ${k} = ([^;]+);`)) || [])[1];
  console.log('파일 기본값: ' + ['STAGE2_CODEBOOK_VERSION', 'STAGE2_CONFIRM_OPEN', 'STAGE2_AI_OPEN', 'STAGE2_STEP_MAX'].map(k => k + '=' + fileFlag(k)).join(' · '));

  console.log('\n[0] 배포 기본값·배정 데이터');
  // ①~④ 배포(2026-10-03): STEP_MAX ≤ 4·AI 닫힘이면 사전라벨 파일을 싣지 않는다. ⑤ 를 열 때만 둘 다 바꾸고 파일을 넣는다
  const smax = Number(fileFlag('STAGE2_STEP_MAX'));
  check('파일 기본값 STAGE2_STEP_MAX 1~4·AI 닫힘(⑤ 는 열리지 않음)', smax >= 1 && smax <= 4 && fileFlag('STAGE2_AI_OPEN') === 'false');
  check('AI 닫힌 배포 판에는 data/ai_prelabels.json 없음', fileFlag('STAGE2_AI_OPEN') !== 'false' || !PRE_IN_DATA);
  console.log('  (⑤ 시험용 사전라벨: ' + (PRE_SRC ? (PRE_IN_DATA ? 'data/' : '저장소 밖 사본 ') + path.basename(PRE_SRC) : '없음') + ')');
  for (const slot of ['A', 'B', 'C']) {
    const sets = [1, 2, 3, 4, 5].map(n => stepIds(slot, n));
    const all = sets.flat();
    check(`${slot}: 단계 사이 id 겹침 0`, new Set(all).size === all.length);
    check(`${slot}: ② 재라벨 ⊂ Stage 1 풀, Stage 2 풀과 겹침 0`, sets[1].length > 0 && sets[1].every(x => POOL1.some(r => String(r.id) === x)) && sets[1].every(x => !(x in scopeOf)));
    check(`${slot}: stage2_samples ⊆ 확인 표본 ∪ ⑤ (구 판본 캐시 fail-safe)`, strs(S(slot).stage2_samples).every(x => sets[0].includes(x) || sets[4].includes(x)));
  }
  if (PRE) {
    const keys = Object.keys(PRE).filter(k => k !== '_meta');
    const blind = new Set(['A', 'B', 'C'].flatMap(s => BLIND_KEYS.flatMap(k => strs(S(s)[k]))));
    const exposed = new Set(['A', 'B', 'C'].flatMap(s => stepIds(s, 5)));
    check('ai_prelabels.json: blind 문항(확인·재라벨·blind 1인·감사) 0건', keys.every(k => !blind.has(k)));
    check('ai_prelabels.json: ⑤ 문항 전부 포함·그 밖 0건', sameSet(keys, [...exposed]));
    // 2026-10-03: v2.2 사전분류(Claude Opus 5.5) 동결본으로 교체. 메타에 모델·코딩북·동결본 해시
    const M = PRE._meta || {};
    check('ai_prelabels.json _meta: 모델 Claude Opus 5.5·코딩북 v2.2·동결본 sha256 f6123fdb…·건수 일치',
      M.model === 'Claude Opus 5.5' && M.model_id === 'claude-opus-5-5' && M.codebook === 'v2.2'
      && M.source_sha256 === 'f6123fdb7ee0a7ff8ec73ffab35341b86072e383783152935a542ad0ed0382e0'
      && M.codebook_sha256 === 'b6be33a40766ae9368b1b733828549c9589bc58b580843c73021f8b9083539cc'
      && M.items === keys.length, M);
    check('ai_prelabels.json: 항목 형식(주목표 1 + 연계 ≤2, prob=null, confidence 있음)',
      keys.every(k => Array.isArray(PRE[k]) && PRE[k].length >= 1 && PRE[k].length <= 3 && PRE[k][0].role === 'principal'
        && ['high', 'medium', 'low'].includes(PRE[k][0].confidence) && PRE[k].every(x => x.prob === null)));
    // ③ 의 경기 문항(검증셋 + 희소 보조 평가 이동분)은 task blind1_val 로 기록된다(scope 규칙). ⑤ 는 학습분만 — 분할 대조는 생성 스크립트가 한다
    check('⑤ 건수 슬롯 간 차이 ≤1·③ 건수 슬롯 간 차이 ≤1',
      (a => Math.max(...a) - Math.min(...a) <= 1)(['A', 'B', 'C'].map(s => stepIds(s, 5).length))
      && (a => Math.max(...a) - Math.min(...a) <= 1)(['A', 'B', 'C'].map(s => stepIds(s, 3).length)));
  } else check('ai_prelabels.json 존재', false);
  if (BASE_ASSIGN) {
    const B0 = JSON.parse(fs.readFileSync(BASE_ASSIGN, 'utf8'));
    for (const slot of ['A', 'B', 'C']) {
      const keep = ['name', 'name_sha256', 'stage1_samples', 'stage1r_samples', 'stage2_crosscheck'];
      check(`${slot}: 기존 키 값 보존(${keep.join('·')})`, keep.every(k => JSON.stringify(B0.annotators[slot][k]) === JSON.stringify(S(slot)[k])));
    }
  }

  console.log('\n[1] Stage 1 (v2.0) — 기존 동작 유지');
  {
    const e = makeEnv(NEW);
    await start(e, 'A', '1');
    const ids = recIds(e);
    check('300건 로드', ids.length === 300, ids.length);
    check('배정 목록과 같은 집합', new Set(ids).size === 300 && S('A').stage1_samples.every(x => ids.includes(String(x))));
    check('AI 패널 숨김', e.els('ai-panel').style.display === 'none');
    check('배지 Stage 1 · Blind', e.els('header-stage').textContent === 'Stage 1 · Blind');
    fill(e, { sdg: 'NA', na: 'outside', rt: 'B', why: 'x' });
    check('v2.0 모드: NA + RT-B 선택 유지(규칙 미적용)', e.run('selRedTag') === 'B');
    check('v2.0 모드: RT-A·B·C 비활성 표시 없음', e.redtags.every(r => !r.classList.contains('disabled')));
    const a = collect(e);
    check('Stage 1 레코드에 신규 필드 없음', !('blindConfirm' in a) && !('aiShown' in a) && !('codebookVersion' in a) && !('task' in a) && !('label_source' in a), Object.keys(a));
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
    check('Stage 1-R 레코드에 신규 필드 없음', !('blindConfirm' in a) && !('codebookVersion' in a) && !('task' in a));
    check('localStorage 키 _s1r', e.store.has('sdg_anno_v2_B_s1r'));
  }

  console.log('\n[3] Stage 2 플래그 닫힘 — 기존 차단 유지');
  {
    const e = makeEnv(NEW, { flags: CLOSED });
    await start(e, 'A', '2');
    check('차단 안내 표시', e.alerts.some(m => m.includes('Stage 2는 아직 열리지 않았습니다')), e.alerts);
    check('레코드 미로드', recIds(e).length === 0);
    check('모드 표기 미변경', e.els('__opt2').textContent === '');
  }

  console.log('\n[4] Stage 2 확인 표본 blind (v2.2, ① 단계)');
  const sharedStore = new Map();
  {
    const e = makeEnv(NEW, { flags: STEP(1), storage: sharedStore });
    await start(e, 'A', '2');
    const ids = recIds(e);
    check('90건만 연다', ids.length === 90, ids.length);
    check('90건 = stage2_crosscheck', ids.every(x => CROSS_A.includes(x)) && new Set(ids).size === 90);
    check('stage2Phase = blind', e.run('stage2Phase') === 'blind');
    check('배지 v2.2 적용 표본 · Blind', e.els('header-stage').textContent === 'Stage 2 · v2.2 적용 표본 · Blind', e.els('header-stage').textContent);
    check('모드 표기 v2.2', e.els('__opt2').textContent.includes('v2.2'));
    check('AI 패널 표시 안 됨(DOM 에서 제거)', !e.inDom('ai-panel'));

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
    check('① 레코드에 task·label_source 없음(구조 불변)', !('task' in a) && !('label_source' in a));

    for (let i = 0; i < 90; i++) {
      e.run(`currentIdx = ${i}; renderRecord()`);
      if (i % 3 === 0) fill(e, { sdg: 'NA', na: 'unsure', tier: 'unknown', rt: 'D', why: 'x' });
      else fill(e, { sdg: 'SDG11' });
      save(e);
    }
    await e.run('stage2Advance');
    const saved = JSON.parse(sharedStore.get('sdg_anno_v2_A_s2'));
    check('90건 저장(로컬 키 _s2)', Object.keys(saved).length === 90);
    check('90건 전부 blindConfirm=true', Object.values(saved).every(r => r.blindConfirm === true));
    check('완료 안내 1회', e.alerts.filter(m => m.includes('적용 표본 90건을 모두 저장')).length === 1, e.alerts);
  }

  console.log('\n[5] 상한 5·AI 개방·사전라벨 있음 + 본인 90건 미완료 → 여전히 ① 90건만');
  {
    const e = makeEnv(NEW, { flags: STEP(5, true), prelabels: PRE });
    await start(e, 'B', '2');
    check('미완료면 ① 단계', e.run('stage2Phase') === 'blind' && recIds(e).length === 90);
    check('AI 패널 DOM 없음', !e.inDom('ai-panel'));
  }

  console.log('\n[6] 상한 1(AI 플래그만 열림) + 90건 완료 → ① 유지');
  {
    const e = makeEnv(NEW, { flags: { ...STEP(1), STAGE2_AI_OPEN: true }, storage: new Map(sharedStore), prelabels: PRE });
    await start(e, 'A', '2');
    check('① 유지', e.run('stage2Phase') === 'blind' && recIds(e).length === 90);
    check('완료 안내 재표시 없음', !e.alerts.some(m => m.includes('모두 저장')));
  }

  console.log('\n[7] ①~④ 완료 + 상한 5 + AI 개방 + 사전라벨 → ⑤ 만 AI 노출');
  {
    const e = makeEnv(NEW, { flags: STEP(5, true), storage: seededStore('A', 4), prelabels: PRE });
    await start(e, 'A', '2');
    const ids = recIds(e);
    check('⑤ 단계 = 본인 표적 문항', e.run('stage2Phase') === 'step5' && sameSet(ids, stepIds('A', 5)), ids.length);
    check('⑤ 에 확인 표본 없음', ids.every(x => !CROSS_A.includes(x)));
    check('첫 미완료 = 1번째', e.run('currentIdx') === 0);
    check('AI 패널 표시', e.inDom('ai-panel') && e.els('ai-panel').style.display === 'block');
    e.run(`selectSdgFromAi('SDG1', 1)`);
    const a = collect(e);
    check('AI 문항 레코드 aiShown=true·blindConfirm=false·aiTopK 기록', a.aiShown === true && a.blindConfirm === false && Array.isArray(a.aiTopK) && a.aiTopK.length >= 1);
    check('AI 문항 chosenFromAI=true', a.chosenFromAI === true);
    check('확인 표본 id: aiVisibleFor=false', e.run(`aiVisibleFor(${JSON.stringify(CROSS_A[0])})`) === false);
    e.run(`renderAiTopK(${JSON.stringify(CROSS_A[0])})`);
    check('확인 표본 id: AI 값 DOM 미기록', e.els('ai-topk-wrap').innerHTML === '');
    check('확인 표본은 isBlindRecordId 로 강제 blind', e.run(`isBlindRecordId(${JSON.stringify(CROSS_A[0])})`) === true);
  }

  console.log('\n[8] Stage 2 판본 v2.1 로 개방 — NA 규칙은 판본에 묶여 꺼짐');
  {
    const e = makeEnv(NEW, { flags: { STAGE2_CODEBOOK_VERSION: '2.1', STAGE2_CONFIRM_OPEN: true, STAGE2_STEP_MAX: 1 } });
    await start(e, 'C', '2');
    check('90건 blind', recIds(e).length === 90);
    fill(e, { sdg: 'NA', na: 'outside', rt: 'B', why: 'x' });
    check('v2.1: NA + RT-B 허용', e.run('selRedTag') === 'B' && save(e) === true);
    check('codebookVersion=2.1 기록', collect(e).codebookVersion === '2.1');
  }

  console.log('\n[9] 기존 레코드 읽기');
  {
    const legacy = { sample_id: Number(S('A').stage1_samples[0]), annotator: 'A', annotator_name: 'x', stage: '1',
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
    check('데모: 신규 필드 없음·NA 규칙 미적용', !('codebookVersion' in collect(e)) && !('task' in collect(e)) && save(e) === true);
    const p = makeEnv(NEW);
    await start(p, 'A', 'pilot');
    check('파일럿 A 잠금 유지', p.alerts.some(m => m.includes('잠금')));
  }

  await suiteGate(NEW);
  await suiteAiLocks(NEW);

  console.log('\n[15] 배포 판 그대로(파일 플래그 기본값 · 디스크의 data/ 그대로, 사전라벨 주입 없음)');
  {
    const e = makeEnv(NEW, {});
    await start(e, 'C', '2');
    check('기본값: 미시작 사람은 ① 90건', e.run('stage2Phase') === 'blind' && recIds(e).length === 90);
    for (let n = 1; n <= 3; n++) {
      const e2 = makeEnv(NEW, { storage: seededStore('B', n) });
      await start(e2, 'B', '2');
      check(`기본값: ①~${['①', '②', '③'][n - 1]} 완료 → ${['②', '③', '④'][n - 1]} 개방·건수 일치`,
        e2.run('stage2Phase') === 'step' + (n + 1) && sameSet(recIds(e2), stepIds('B', n + 1)), [e2.run('stage2Phase'), recIds(e2).length]);
      check(`기본값: ${['②', '③', '④'][n - 1]} AI 패널 DOM 없음·사전라벨 요청 0`, !e2.inDom('ai-panel') && !e2.fetches.includes('data/ai_prelabels.json'));
    }
    const e4 = makeEnv(NEW, { storage: seededStore('A', 4) });
    await start(e4, 'A', '2');
    check('기본값: ①~④ 완료 → ⑤ 안 열림(④ 유지)·AI 패널 DOM 없음', e4.run('stage2Phase') === 'step4' && !e4.inDom('ai-panel'), e4.run('stage2Phase'));
    check('기본값: ①~④ 완료 뒤에도 사전라벨 요청 0', !e4.fetches.includes('data/ai_prelabels.json'));
    // 세션 안 ③ → ④ 자동 개방(기본값)
    const e3 = makeEnv(NEW, { storage: seededStore('C', 2) });
    await start(e3, 'C', '2');
    await saveAll(e3, { sdg: 'SDG11' });
    check('기본값: ③ 저장 완료 → 세션 안에서 ④ 자동 개방', e3.run('stage2Phase') === 'step4' && sameSet(recIds(e3), stepIds('C', 4)), e3.run('stage2Phase'));
    if (!PRE_IN_DATA) {
      // 플래그를 ⑤ 로 올려도 디스크에 파일이 없으면 ⑤ 는 막힌다(fail-safe)
      const e5 = makeEnv(NEW, { flags: STEP(5, true), storage: seededStore('A', 4) });
      await start(e5, 'A', '2');
      check('파일 없음 + ⑤ 플래그: ⑤ 차단·④ 유지', e5.run('stage2Phase') === 'step4' && !e5.inDom('ai-panel'));
    }
  }

  console.log('\n[13] 저장 경로·Firebase 규칙 호환 (가짜 firebase, firebase_rules_stage2_confirm_PASTE.json 조건)');
  {
    const ff = fakeFirebase();
    const e = makeEnv(NEW, { flags: STEP(5, true), storage: new Map(), prelabels: PRE, firebase: ff.fb });
    await start(e, 'C', '2');
    check('Firebase 연결 경로 사용', e.run('db !== null'));
    check('시작 시 읽는 경로 = stage2/C 하나(Stage 1·1-R 판정 미조회)', JSON.stringify(ff.reads) === JSON.stringify(['sdg_main_2026/stage2/C']), ff.reads);
    const per = {};
    for (let n = 1; n <= 5; n++) {
      const want = stepIds('C', n);
      if (!want.length) continue;
      check(`C ⑤까지 진행: 단계 ${n} 개방`, e.run('stage2Cur && stage2Cur.no') === n, e.run('stage2Phase'));
      const before = ff.writes.length;
      await saveAll(e, { sdg: 'SDG6' });
      per[n] = ff.writes.slice(before).filter(w => w.op === 'set');
    }
    const sets = ff.writes.filter(w => w.op === 'set');
    const total = [1, 2, 3, 4, 5].reduce((s, n) => s + stepIds('C', n).length, 0);
    check('쓰기 건수 = 배정 합계', sets.length === total, [sets.length, total]);
    check('모든 쓰기 경로 = sdg_main_2026/stage2/C/{sample_id}', sets.every(w => w.path === `sdg_main_2026/stage2/C/${w.v.sample_id}`));
    const errs = sets.map(w => ruleCheck(w.path, w.v)).filter(Boolean);
    check('모든 쓰기가 현행 규칙 통과(필수 필드·형식·슬롯)', errs.length === 0, errs.slice(0, 3));
    check('undefined 값 0(Firebase set 거부 방지)', sets.every(w => !w.hasUndef));
    const T = { 2: ['testset_relabel'], 3: ['blind1_external', 'blind1_val'], 4: ['audit'], 5: ['targeted'] };
    const L = { 2: 'H3_BLIND', 3: 'H1_BLIND_EXTRA', 4: 'AUDIT2_BLIND', 5: 'H_TARGET_AIEXP' };
    check('① 쓰기: task 없음·blindConfirm=true·aiShown=false', per[1].every(w => !('task' in w.v) && w.v.blindConfirm === true && w.v.aiShown === false));
    for (const n of [2, 3, 4, 5]) {
      check(`단계 ${n} 쓰기: task·label_source·aiShown=${n === 5}`, per[n].every(w => T[n].includes(w.v.task) && w.v.label_source === L[n] && w.v.aiShown === (n === 5) && w.v.codebookVersion === '2.2' && w.v.blindConfirm === false));
    }
    check('규칙 에뮬레이터 자체 점검: stage1 쓰기·필수 필드 누락은 거부', ruleCheck('sdg_main_2026/stage1/C/1', { sample_id: 1, annotator: 'C', stage: '1', tier: 'certain', timestamp: 't' }) !== null &&
      ruleCheck('sdg_main_2026/stage2/C/1', { sample_id: 1, annotator: 'C', stage: '2', timestamp: 't' }) !== null &&
      ruleCheck('sdg_main_2026/stage2/C/1', { sample_id: 1, annotator: 'A', stage: '2', tier: 'certain', timestamp: 't' }) !== null);
  }

  if (BASE_HTML) {
    console.log('\n[11] 기준 판본 대조 (Stage 1·1-R·데모·Stage 2 확인 표본 레코드 구조 동일성)');
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
    const eb = makeEnv(BASE, { flags: CLOSED, lenient: true }); await start(eb, 'A', '2');
    const en = makeEnv(NEW, { flags: CLOSED }); await start(en, 'A', '2');
    check('Stage 2 플래그 닫힘 차단 안내 동일', JSON.stringify(eb.alerts) === JSON.stringify(en.alerts), [eb.alerts, en.alerts]);

    // 배포 중 판본(기준 파일 플래그 그대로) 대 신판(파일 기본값 그대로): 확인 표본 90건 화면·저장
    for (const slot of ['A', 'B', 'C']) {
      const out = [];
      for (const html of [BASE, NEW]) {
        const e = makeEnv(html);
        await start(e, slot, '2');
        const recs = recIds(e);
        const steps = [];
        for (const [i, opt] of [[0, { sdg: 'SDG6', tier: 'ambiguous', rt: 'A', why: 'r', add: true }], [1, { sdg: 'NA', na: 'unsure', tier: 'unknown', rt: 'D', why: 'x' }], [2, { sdg: 'NA', na: 'outside', rt: 'B', why: 'x' }]]) {
          e.run(`currentIdx = ${i}; renderRecord()`);
          fill(e, opt);
          if (opt.add) e.run(`toggleAdditional('SDG13')`);
          const ann = stripVolatile(collect(e));
          steps.push({ ann, ok: save(e), rt: e.run('selRedTag'), msg: e.els('status-msg').textContent });
        }
        out.push({ recs, steps, badge: e.els('header-stage').textContent,
          aiVisible: e.inDom('ai-panel') && e.els('ai-panel').style.display === 'block', opt2: e.els('__opt2').textContent, alerts: e.alerts.slice() });
      }
      check(`S2 ${slot}: 확인 표본 목록·순서 동일`, JSON.stringify(out[0].recs) === JSON.stringify(out[1].recs) && out[0].recs.length === 90);
      check(`S2 ${slot}: 저장 레코드(키·값·순서) 동일 3종`, JSON.stringify(out[0].steps) === JSON.stringify(out[1].steps), [out[0].steps[0].ann, out[1].steps[0].ann]);
      check(`S2 ${slot}: 배지·AI 비표시·모드 표기·시작 안내 동일`, out[0].badge === out[1].badge && out[0].aiVisible === false && out[1].aiVisible === false && out[0].opt2 === out[1].opt2 && JSON.stringify(out[0].alerts) === JSON.stringify(out[1].alerts), [out[0].badge, out[1].badge, out[0].alerts, out[1].alerts]);
    }
    // 구 판본이 캐시로 남은 채 새 배정 파일을 받는 경우: 확인 표본 90건 동작이 그대로여야 한다
    {
      const e = makeEnv(BASE);
      await start(e, 'A', '2');
      check('구 index.html + 새 배정: 90건 blind 그대로·오류 없음', recIds(e).length === 90 && recIds(e).every(x => CROSS_A.includes(x)) && !e.alerts.some(m => m.includes('오류')), e.alerts);
    }
  }

  // ── 변이 시험: 게이트·필드·비노출 구현을 하나씩 망가뜨리면 시험이 잡아내는가 ──
  console.log('\n[14] 변이 시험');
  const MUTANTS = [
    ['상한 무시(STEP_MAX 검사 제거)', s => s.replace('if (step.no > STAGE2_STEP_MAX) return false;', '')],
    ['완료 검사 제거(앞 단계 미완료여도 다음 단계)', s => s.replace('if (stage2StepDone(s)) { done.push(s); continue; }', 'if (s.no < 2 && stage2StepDone(s)) { done.push(s); continue; } if (s.no === 2) { done.push(s); continue; }')],
    ['AI 노출 조건 완화(⑤ 이전에도 AI)', s => s.replace("return !isPilot && !isDemo && stageNum === '2' && aiIdSet.has(String(id)) && !blindIdSet.has(String(id));", "return !isPilot && !isDemo && stageNum === '2' && !blindIdSet.has(String(id));")],
    ['AI 패널 DOM 제거 생략', s => s.replace('if (step.ai) attachAiPanel(); else detachAiPanel();', 'attachAiPanel();')],
    ['task 필드 누락', s => s.replace('ann.task = t.task;', '')],
    ['label_source 오기', s => s.replace("labelSource: 'AUDIT2_BLIND'", "labelSource: 'H1_BLIND_EXTRA'")],
    ['사전라벨 무결성 검사 제거', s => s.replace('const err = pre ? checkAiPrelabels(pre, step) : ', 'const err = pre ? null : ')],
    ['① 레코드에 task 추가(구조 변경)', s => s.replace('if (!blind && t) {', 'if (t) {')],
  ];
  for (const [name, mut] of MUTANTS) {
    const m = mut(NEW);
    if (m === NEW) { check(`변이 적용 실패: ${name}`, false); continue; }
    sink = [];
    try { await suiteGate(m); await suiteAiLocks(m); } catch (err) { sink.push(false); }
    // ① 레코드 구조 변경은 [13] 계열 검사로만 잡히므로 직접 본다
    if (name.startsWith('①')) {
      const e = makeEnv(m, { flags: STEP(1) });
      await start(e, 'A', '2');
      fill(e); check('', !('task' in collect(e)));
    }
    const caught = sink.filter(x => !x).length;
    sink = null;
    check(`변이 적발: ${name} (실패 ${caught}건)`, caught > 0);
  }

  console.log(`\n결과: ${pass} 통과 · ${fail} 실패`);
  process.exit(fail ? 1 : 0);
}
main().catch(err => { console.error(err); process.exit(2); });
