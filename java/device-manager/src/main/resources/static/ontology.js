// =====================================================================
// 本体管理 — 科技感重构版
// =====================================================================

const onto = {
  inited:      false,
  step:        1,
  objectTypes: [],
  linkTypes:   [],
  actionTypes: [],
  functions:   [],
  selectedOT:  null,
  selectedAT:  null,
  sim1:        null,
  sim2:        null,
  dlgType:     null,   // current dialog action
};

// =====================================================================
// 入口 & 步骤切换
// =====================================================================

function initOntology() {
  if (onto.inited) return;
  onto.inited = true;
  loadStep1();
  updateStats();
}

function goStep(n) {
  onto.step = n;
  document.querySelectorAll('.onto-step-btn').forEach(b =>
    b.classList.toggle('active', +b.dataset.step === n));
  document.querySelectorAll('.onto-sp').forEach(p => p.classList.remove('active'));
  document.getElementById('onto-s' + n).classList.add('active');
  if      (n === 1) loadStep1();
  else if (n === 2) loadStep3();   // Actions（原 Step3）
  else if (n === 3) loadStep4();   // Functions（原 Step4）
}

async function updateStats() {
  try {
    const [ots, lts, ats, fns] = await Promise.all([
      fetch('/api/ontology/object-types').then(r => r.json()),
      fetch('/api/ontology/link-types').then(r => r.json()),
      fetch('/api/ontology/action-types').then(r => r.json()),
      fetch('/api/ontology/functions').then(r => r.json()),
    ]);
    setText('os-ent', ots.length);
    setText('os-rel', lts.length);
    setText('os-act', ats.length);
    setText('os-fn',  fns.length);
  } catch (_) {}
}

// =====================================================================
// Step 1 — 实体建模
// =====================================================================

async function loadStep1() {
  try {
    const [otRes, ltRes] = await Promise.all([
      fetch('/api/ontology/object-types'),
      fetch('/api/ontology/link-types'),
    ]);
    onto.objectTypes = await otRes.json();
    onto.linkTypes   = await ltRes.json();
  } catch (_) { onto.objectTypes = []; onto.linkTypes = []; }
  renderOTList();
  renderLTList();
  setTimeout(() => renderStep1Graph(), 50);
}

function renderOTList() {
  const el = document.getElementById('onto-ot-list');
  if (!onto.objectTypes.length) {
    el.innerHTML = '<div class="onto-loading">暂无实体类型</div>'; return;
  }
  el.innerHTML = onto.objectTypes.map(ot => `
    <div class="onto-ot-item ${onto.selectedOT?.id === ot.id ? 'selected' : ''}"
         onclick="selectOT(${ot.id})">
      <div class="oti-dot" style="background:${ot.color||'#5b8dee'};box-shadow:0 0 6px ${ot.color||'#5b8dee'}"></div>
      <div class="oti-info">
        <div class="oti-name">${esc(ot.displayName)}</div>
        <div class="oti-sub">${esc(ot.name)}</div>
      </div>
      <button class="iti-del oti-del" onclick="event.stopPropagation();deleteOT(${ot.id})">&#x1F5D1;</button>
    </div>`).join('');
}

async function selectOT(id) {
  onto.selectedOT = onto.objectTypes.find(o => o.id === id);
  renderOTList();
  // 高亮图谱节点
  d3.selectAll('#ontoSvg .node-circle')
    .attr('stroke', d => d.id === id ? '#00d4ff' : (d.color || '#5b8dee'))
    .attr('stroke-width', d => d.id === id ? 3 : 1.5);
  // 展示属性面板
  const panel = document.getElementById('onto-prop-panel');
  panel.style.display = 'block';
  document.getElementById('onto-prop-title').textContent = onto.selectedOT.displayName;
  await loadProps(id);
}

async function loadProps(otId) {
  const el = document.getElementById('onto-prop-list');
  try {
    const res = await fetch(`/api/ontology/object-types/${otId}/properties`);
    const props = await res.json();
    if (!props.length) { el.innerHTML = '<div class="onto-loading">暂无属性，点击上方添加</div>'; return; }
    el.innerHTML = props.map(p => `
      <div class="onto-prop-item">
        <span class="prop-name">${esc(p.name)}</span>
        <span class="prop-disp">${esc(p.displayName)}</span>
        <span class="prop-type">${p.dataType}</span>
        ${p.required ? '<span class="prop-req">*</span>' : ''}
        <button class="prop-del" onclick="deleteProp(${p.id})">&#x2715;</button>
      </div>`).join('');
  } catch (_) { el.innerHTML = '<div class="onto-loading">加载失败</div>'; }
}

async function deleteOT(id) {
  if (!confirm('确定删除该实体类型及其所有属性？')) return;
  await fetch(`/api/ontology/object-types/${id}`, { method: 'DELETE' });
  if (onto.selectedOT?.id === id) {
    onto.selectedOT = null;
    document.getElementById('onto-prop-panel').style.display = 'none';
  }
  await loadStep1();
  updateStats();
}

async function deleteProp(id) {
  if (!confirm('确定删除该属性？')) return;
  await fetch(`/api/ontology/properties/${id}`, { method: 'DELETE' });
  loadProps(onto.selectedOT.id);
}

// =====================================================================
// Step 1 — D3 图谱（实体节点）
// =====================================================================

function renderStep1Graph() {
  if (onto.sim1) { onto.sim1.stop(); onto.sim1 = null; }

  const wrap = document.getElementById('onto-graph-wrap');
  const W = wrap.clientWidth || 500;
  const H = wrap.clientHeight || 340;
  const svg = d3.select('#ontoSvg');
  svg.selectAll('*').remove();

  const empty = document.getElementById('onto-graph-empty');
  if (!onto.objectTypes.length) { empty.style.display = 'flex'; return; }
  empty.style.display = 'none';

  // 背景网格
  const bg = svg.append('g');
  for (let x = 0; x <= W; x += 48)
    bg.append('line').attr('x1',x).attr('y1',0).attr('x2',x).attr('y2',H)
      .attr('stroke','rgba(255,255,255,0.025)').attr('stroke-width',1);
  for (let y = 0; y <= H; y += 48)
    bg.append('line').attr('x1',0).attr('y1',y).attr('x2',W).attr('y2',y)
      .attr('stroke','rgba(255,255,255,0.025)').attr('stroke-width',1);

  const defs = svg.append('defs');
  mkGlow(defs, 'g1', 5);
  mkArrow(defs, 'arr1', '#7c3aed');

  const g = svg.append('g');
  const nodeMap = {};
  const nodes = onto.objectTypes.map(ot => {
    const n = { id: ot.id, label: ot.displayName, name: ot.name, color: ot.color || '#5b8dee' };
    nodeMap[ot.id] = n;
    return n;
  });

  const links = onto.linkTypes.map(lt => ({
    id: lt.id, label: lt.displayName, name: lt.name,
    source: lt.sourceObjectTypeId, target: lt.targetObjectTypeId,
  })).filter(l => nodeMap[l.source] && nodeMap[l.target]);

  const sim = d3.forceSimulation(nodes)
    .force('link',    d3.forceLink(links).id(d => d.id).distance(180))
    .force('charge',  d3.forceManyBody().strength(-260))
    .force('center',  d3.forceCenter(W / 2, H / 2))
    .force('collide', d3.forceCollide(58));
  onto.sim1 = sim;

  // 边
  const linkG = g.append('g').selectAll('.gl').data(links).join('g').attr('class', 'gl');
  const linkPath = linkG.append('path').attr('fill', 'none')
    .attr('stroke', 'rgba(124,58,237,.55)').attr('stroke-width', 1.5)
    .attr('marker-end', 'url(#arr1)');
  const linkLabel = linkG.append('text').attr('text-anchor', 'middle')
    .attr('font-size', '9px').attr('fill', '#7c3aed')
    .attr('font-family', 'Consolas,monospace').attr('pointer-events', 'none')
    .text(d => d.label);

  // 节点
  const nodeG = g.selectAll('.gn').data(nodes).join('g').attr('class', 'gn')
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) sim.alphaTarget(.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
    .on('click', (e, d) => selectOT(d.id));

  nodeG.append('circle').attr('r', 38).attr('fill', 'none')
    .attr('stroke', d => d.color).attr('stroke-width', 0.5).attr('opacity', .25)
    .attr('stroke-dasharray', '3 5');
  nodeG.append('circle').attr('class', 'node-circle').attr('r', 26)
    .attr('fill', d => d.color + '22')
    .attr('stroke', d => d.color).attr('stroke-width', 1.5)
    .style('filter', 'url(#g1)');
  nodeG.append('text').attr('text-anchor', 'middle').attr('dy', '.35em')
    .attr('font-size', '11px').attr('fill', '#e2e8f0')
    .attr('font-family', 'Microsoft YaHei,sans-serif').attr('pointer-events', 'none')
    .text(d => d.label.length > 4 ? d.label.slice(0, 4) : d.label);
  nodeG.append('text').attr('text-anchor', 'middle').attr('dy', '44px')
    .attr('font-size', '10px').attr('fill', '#334155')
    .attr('font-family', 'Consolas,monospace').attr('pointer-events', 'none')
    .text(d => d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name);

  svg.call(d3.zoom().scaleExtent([.2, 4]).on('zoom', e => g.attr('transform', e.transform)));

  sim.on('tick', () => {
    linkPath.attr('d', d => linkArc(d, W, H));
    linkLabel.attr('transform', d => {
      const mx = ((d.source.x||0) + (d.target.x||0)) / 2;
      const my = ((d.source.y||0) + (d.target.y||0)) / 2;
      return `translate(${mx},${my - 6})`;
    });
    nodeG.attr('transform', d => `translate(${clamp(d.x,44,W-44)},${clamp(d.y,44,H-44)})`);
  });
}

// =====================================================================
// LT 辅助（关系列表，现属于 Step 1 合并面板）
// =====================================================================

function renderLTList() {
  const el = document.getElementById('onto-lt-list');
  if (!onto.linkTypes.length) {
    el.innerHTML = '<div class="onto-loading">暂无关系类型</div>'; return;
  }
  const otMap = Object.fromEntries(onto.objectTypes.map(o => [o.id, o.displayName]));
  el.innerHTML = onto.linkTypes.map(lt => `
    <div class="onto-lt-item">
      <div style="flex:1;min-width:0">
        <div class="lti-name">${esc(lt.displayName)}</div>
        <div class="lti-meta">${otMap[lt.sourceObjectTypeId]||'?'} ──&#x25B6; ${otMap[lt.targetObjectTypeId]||'?'}</div>
        <div class="lti-meta" style="color:#334155">${lt.name} · ${lt.cardinality}</div>
      </div>
      <button class="lti-del" onclick="deleteLT(${lt.id})">&#x1F5D1;</button>
    </div>`).join('');
}

async function deleteLT(id) {
  if (!confirm('确定删除该关系类型？')) return;
  await fetch(`/api/ontology/link-types/${id}`, { method: 'DELETE' });
  await loadStep1();
  updateStats();
}

function linkArc(d, W, H) {
  const sx = d.source.x||0, sy = d.source.y||0;
  const tx = d.target.x||0, ty = d.target.y||0;
  const dx = tx - sx, dy = ty - sy;
  const dist = Math.sqrt(dx*dx + dy*dy) || 1;
  const r = 30;
  const ex = sx + dx/dist*r, ey = sy + dy/dist*r;
  const fx = tx - dx/dist*(r+8), fy = ty - dy/dist*(r+8);
  // 自环处理
  if (d.source.id === d.target.id) {
    const cx = clamp(sx+60, 44, W-44), cy = clamp(sy-60, 44, H-44);
    return `M${ex},${ey} Q${cx},${cy} ${fx},${fy}`;
  }
  return `M${ex},${ey}L${fx},${fy}`;
}

// =====================================================================
// Step 3 — Actions
// =====================================================================

async function loadStep3() {
  try {
    const res = await fetch('/api/ontology/action-types');
    onto.actionTypes = await res.json();
  } catch (_) { onto.actionTypes = []; }
  renderATList();
}

function renderATList() {
  const el = document.getElementById('onto-at-list');
  if (!onto.actionTypes.length) {
    el.innerHTML = '<div class="onto-loading">暂无 Action</div>'; return;
  }
  el.innerHTML = onto.actionTypes.map(at => `
    <div class="onto-at-item ${onto.selectedAT?.id === at.id ? 'selected' : ''}"
         onclick="selectAT(${at.id})">
      <div class="at-dot ${at.status==='ACTIVE'?'at-active':at.status==='DEPRECATED'?'at-depr':'at-draft'}"></div>
      <div class="oti-info">
        <div class="oti-name">${esc(at.displayName)}</div>
        <div class="oti-sub">${esc(at.name)}</div>
      </div>
      <button class="iti-del oti-del" onclick="event.stopPropagation();deleteAT(${at.id})">&#x1F5D1;</button>
    </div>`).join('');
}

async function selectAT(id) {
  const res = await fetch(`/api/ontology/action-types/${id}`);
  onto.selectedAT = await res.json();
  renderATList();
  document.getElementById('onto-at-detail').style.display = 'block';
  document.getElementById('onto-at-ph').style.display = 'none';
  document.getElementById('onto-at-name').textContent = '⚡ ' + onto.selectedAT.displayName;
  switchATTab('info');
  renderATInfo();
  loadATParams(id);
  loadRules(id);
  loadExecHistory(id);
  renderATValidation();
  renderATTrigger();
}

function switchATTab(tab) {
  document.querySelectorAll('.at-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.atTab === tab));
  document.querySelectorAll('.at-tab-panel').forEach(p => p.classList.toggle('active', p.id === `at-tp-${tab}`));
}

function renderATInfo() {
  const at = onto.selectedAT;
  if (!at) return;

  document.getElementById('ati-name').textContent = at.name;

  const statusBadgeClass = at.status === 'ACTIVE' ? 'at-badge-active' :
                           at.status === 'DEPRECATED' ? '' : 'at-badge-draft';
  const statusLabel = at.status === 'ACTIVE' ? '已启用' : at.status === 'DEPRECATED' ? '已停用' : '草稿';
  document.getElementById('ati-status').innerHTML = `<span class="at-badge ${statusBadgeClass}">${statusLabel}</span>`;
  document.getElementById('ati-display-name').value = at.displayName || '';
  document.getElementById('ati-desc').value = at.description || '';

  // Populate target ObjectType select
  const sel = document.getElementById('ati-target-ot');
  sel.innerHTML = '<option value="">— 不限定（可操作多种实体）—</option>' +
    onto.objectTypes.map(o => `<option value="${o.id}" ${o.id == at.targetObjectTypeId ? 'selected' : ''}>${o.displayName} (${o.name})</option>`).join('');

  // Update toggle button
  const btn = document.getElementById('onto-at-toggle-btn');
  if (at.status === 'ACTIVE') {
    btn.textContent = '停用'; btn.className = 'onto-btn-sm';
  } else {
    btn.textContent = '启用'; btn.className = 'onto-btn-success';
  }
}

async function saveATInfo() {
  const at = onto.selectedAT;
  if (!at) return;
  try {
    await fetch(`/api/ontology/action-types/${at.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...at,
        displayName: document.getElementById('ati-display-name').value.trim(),
        description: document.getElementById('ati-desc').value.trim(),
        targetObjectTypeId: document.getElementById('ati-target-ot').value || null,
      }),
    });
    const res = await fetch(`/api/ontology/action-types/${at.id}`);
    onto.selectedAT = await res.json();
    renderATInfo();
    renderATList();
    toast('基本信息已保存', true);
  } catch (err) { toast('保存失败: ' + err.message, false); }
}

async function toggleATStatus() {
  const at = onto.selectedAT;
  if (!at) return;
  const newStatus = at.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
  try {
    await fetch(`/api/ontology/action-types/${at.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...at, status: newStatus }),
    });
    const res = await fetch(`/api/ontology/action-types/${at.id}`);
    onto.selectedAT = await res.json();
    renderATInfo();
    renderATList();
    toast(newStatus === 'ACTIVE' ? 'Action 已启用' : 'Action 已停用', true);
  } catch (err) { toast('操作失败: ' + err.message, false); }
}

async function loadATParams(id) {
  const atId = id || onto.selectedAT?.id;
  if (!atId) return;
  try {
    const res = await fetch(`/api/ontology/action-types/${atId}/parameters`);
    onto.atParams = await res.json();
  } catch (_) { onto.atParams = []; }
  renderATParams();
}

function renderATParams() {
  const tbody = document.getElementById('at-param-tbody');
  if (!tbody) return;
  if (!onto.atParams?.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0c8d8;padding:20px">暂无参数</td></tr>';
    return;
  }
  tbody.innerHTML = onto.atParams.map(p => `
    <tr>
      <td><span style="font-family:Consolas;font-size:12px;color:#1a56db">${esc(p.name)}</span></td>
      <td>${esc(p.displayName || '')}</td>
      <td><span class="param-type-tag">${p.dataType}</span></td>
      <td>${p.required ? '<span class="param-req-tag">必填</span>' : '<span style="color:#9ca3af;font-size:11px">可选</span>'}</td>
      <td style="color:#6b7280;font-size:11px">${esc(p.defaultValue || '—')}</td>
      <td><button class="param-del-btn" onclick="deleteParam(${p.id})">✕</button></td>
    </tr>`).join('');
}

async function deleteParam(id) {
  if (!confirm('确定删除该参数？')) return;
  await fetch(`/api/ontology/parameters/${id}`, { method: 'DELETE' });
  loadATParams();
}

function renderATValidation() {
  const at = onto.selectedAT;
  if (!at) return;
  let rules = [];
  try { rules = JSON.parse(at.validationRulesJson || '[]'); } catch (_) {}
  onto.vrList = rules;
  const el = document.getElementById('at-vr-list');
  if (!el) return;
  if (!rules.length) {
    el.innerHTML = '<div style="color:#c0c8d8;font-size:13px;padding:20px;text-align:center">暂无校验规则</div>';
    return;
  }
  el.innerHTML = rules.map((r, i) => `
    <div class="vr-item">
      <span class="vr-num">${String(i+1).padStart(2,'0')}</span>
      <div class="vr-body">
        <div class="vr-name">${esc(r.name || '校验规则')}</div>
        <div class="vr-cond">${esc(r.condition || '')}</div>
        <div class="vr-msg">失败提示：${esc(r.message || '')}</div>
      </div>
      <button class="vr-del" onclick="deleteVRule(${i})">✕</button>
    </div>`).join('');
}

function deleteVRule(idx) {
  if (!onto.vrList) return;
  onto.vrList.splice(idx, 1);
  if (onto.selectedAT) onto.selectedAT.validationRulesJson = JSON.stringify(onto.vrList);
  renderATValidation();
}

async function saveATValidation() {
  const at = onto.selectedAT;
  if (!at) return;
  try {
    await fetch(`/api/ontology/action-types/${at.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...at, validationRulesJson: JSON.stringify(onto.vrList || []) }),
    });
    const res = await fetch(`/api/ontology/action-types/${at.id}`);
    onto.selectedAT = await res.json();
    renderATValidation();
    toast('校验规则已保存', true);
  } catch (err) { toast('保存失败: ' + err.message, false); }
}

function renderATTrigger() {
  const at = onto.selectedAT;
  if (!at) return;
  const tt = document.getElementById('at-trigger-type');
  const tc = document.getElementById('at-trigger-config');
  const ep = document.getElementById('at-exception-policy');
  const ec = document.getElementById('at-exception-config');
  if (tt) tt.value = at.triggerType || 'MANUAL';
  if (tc) tc.value = at.triggerConfigJson || '';
  if (ep) ep.value = at.exceptionPolicy || 'ROLLBACK';
  if (ec) ec.value = at.exceptionConfigJson || '';
  onTriggerTypeChange();
}

function onTriggerTypeChange() {
  const tt = document.getElementById('at-trigger-type')?.value;
  const wrap = document.getElementById('at-trigger-config-wrap');
  if (wrap) wrap.style.display = (tt && tt !== 'MANUAL') ? 'block' : 'none';
}

async function saveATTrigger() {
  const at = onto.selectedAT;
  if (!at) return;
  try {
    await fetch(`/api/ontology/action-types/${at.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...at,
        triggerType:        document.getElementById('at-trigger-type')?.value || 'MANUAL',
        triggerConfigJson:  document.getElementById('at-trigger-config')?.value || null,
        exceptionPolicy:    document.getElementById('at-exception-policy')?.value || 'ROLLBACK',
        exceptionConfigJson: document.getElementById('at-exception-config')?.value || null,
      }),
    });
    const res = await fetch(`/api/ontology/action-types/${at.id}`);
    onto.selectedAT = await res.json();
    toast('触发 & 异常配置已保存', true);
  } catch (err) { toast('保存失败: ' + err.message, false); }
}

async function loadRules(id) {
  const atId = id || onto.selectedAT?.id;
  if (!atId) return;
  const el = document.getElementById('onto-rule-list');
  try {
    const res = await fetch(`/api/ontology/action-types/${atId}/rules`);
    const rules = await res.json();
    if (!rules.length) { el.innerHTML = '<div class="onto-loading">暂无规则</div>'; return; }
    el.innerHTML = rules.map(r => `
      <div class="rule-item">
        <span class="rule-type">${r.ruleType}</span>
        <span class="rule-target">${r.targetObjectTypeName||r.targetLinkTypeName||'-'}</span>
        <span style="font-size:10px;font-family:Consolas;color:#9ca3af">order:${r.sortOrder}</span>
        <button class="rule-del" onclick="deleteRule(${r.id})">&#x2715;</button>
      </div>`).join('');
  } catch (_) {}
}

async function loadExecHistory(id) {
  const atId = id || onto.selectedAT?.id;
  if (!atId) return;
  const el = document.getElementById('onto-exec-list');
  try {
    const res = await fetch(`/api/ontology/action-types/${atId}/executions`);
    const execs = await res.json();
    if (!execs.length) { el.innerHTML = '<div class="onto-loading">暂无执行记录</div>'; return; }
    el.innerHTML = execs.slice(0, 12).map(e => `
      <div class="exec-item">
        <div class="exec-dot ${e.status==='SUCCESS'?'exec-ok':e.status==='PARTIAL'?'exec-part':'exec-fail'}"></div>
        <span style="color:#6b7280">${fmtTime(e.executedAt)}</span>
        <span style="color:#9ca3af;font-size:10px">${e.status}</span>
        ${e.errorMessage ? `<span class="exec-err">${esc(e.errorMessage)}</span>` : '<span style="color:#059669;font-size:10px">✓ OK</span>'}
      </div>`).join('');
  } catch (_) {}
}

async function deleteAT(id) {
  if (!confirm('确定删除该 Action Type？')) return;
  await fetch(`/api/ontology/action-types/${id}`, { method: 'DELETE' });
  if (onto.selectedAT?.id === id) {
    onto.selectedAT = null;
    document.getElementById('onto-at-detail').style.display = 'none';
    document.getElementById('onto-at-ph').style.display = 'flex';
  }
  await loadStep3();
  updateStats();
}

async function deleteRule(id) {
  if (!confirm('确定删除该规则？')) return;
  await fetch(`/api/ontology/rules/${id}`, { method: 'DELETE' });
  loadRules();
}

// =====================================================================
// Step 4 — Groovy Notebook
// =====================================================================

async function loadStep4() {
  try {
    const res = await fetch('/api/ontology/functions');
    onto.functions = await res.json();
  } catch (_) { onto.functions = []; }
  renderNotebook();
}

function renderNotebook() {
  const el = document.getElementById('onto-notebook');
  if (!onto.functions.length) {
    el.innerHTML = `
      <div class="nb-empty">
        <div style="font-size:48px">&#x1F4D3;</div>
        <div>点击「新建 Cell」创建第一个 Groovy 函数</div>
        <div style="font-size:11px;color:#334155">可用变量：input (Map) · context (Map)<br>返回 Map 或任意值</div>
      </div>`; return;
  }
  el.innerHTML = onto.functions.map((fn, i) => renderCell(fn, i + 1)).join('');
}

function renderCell(fn, num) {
  const script = esc(fn.scriptContent || '');
  const statusClass = fn.status.toLowerCase() === 'active' ? 'nbs-active' :
                      fn.status.toLowerCase() === 'deprecated' ? 'nbs-deprecated' : 'nbs-draft';
  return `
    <div class="nb-cell" id="cell-${fn.id}" data-fnid="${fn.id}">
      <div class="nb-hd">
        <span class="nb-num">In&nbsp;[${num}]:</span>
        <div class="nb-info">
          <span class="nb-name">${esc(fn.displayName)}</span>
          <code class="nb-fn-name">${esc(fn.name)}</code>
          <span class="nb-status ${statusClass}">${fn.status}</span>
        </div>
        <div class="nb-actions">
          <button class="nb-run-btn"  onclick="runCell(${fn.id})">&#x25B6; Run</button>
          <button class="nb-save-btn" onclick="saveCell(${fn.id})" title="保存脚本">&#x1F4BE;</button>
          <button class="nb-del-btn"  onclick="deleteCellFn(${fn.id})" title="删除">&#x1F5D1;</button>
        </div>
      </div>
      <textarea class="nb-code" id="code-${fn.id}" spellcheck="false"
        placeholder="// Groovy script&#10;// input: Map (passed params)&#10;// return Map or any value&#10;return [result: 'hello world']">${script}</textarea>
      <div class="nb-output" id="out-${fn.id}"><span class="nb-out-hint">— Run 后显示输出 —</span></div>
    </div>`;
}

async function runCell(fnId) {
  const cell = document.getElementById('cell-' + fnId);
  const codeEl = document.getElementById('code-' + fnId);
  const outEl  = document.getElementById('out-'  + fnId);
  const btn = cell.querySelector('.nb-run-btn');
  const numEl = cell.querySelector('.nb-num');

  // 先保存脚本
  const script = codeEl.value;
  await fetch(`/api/ontology/functions/${fnId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptContent: script }),
  });

  cell.className = 'nb-cell cell-running';
  btn.disabled = true;
  btn.textContent = '⏳ Running…';
  numEl.textContent = 'In [*]:';
  outEl.innerHTML = '<span class="nb-out-hint" style="color:#f59e0b">执行中…</span>';

  try {
    const res = await fetch(`/api/ontology/functions/${fnId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const log = await res.json();
    const idx = onto.functions.findIndex(f => f.id === fnId) + 1;
    numEl.textContent = `In [${idx}]:`;
    btn.textContent = '▶ Run';
    btn.disabled = false;

    if (log.status === 'SUCCESS') {
      cell.className = 'nb-cell cell-success';
      outEl.innerHTML = `
        <div class="nb-out-meta">Out [${idx}]: &nbsp; ${log.durationMs}ms &nbsp;·&nbsp; ${new Date().toLocaleTimeString()}</div>
        <div class="nb-out-success">${esc(prettyJson(log.outputDataJson))}</div>`;
    } else if (log.status === 'TIMEOUT') {
      cell.className = 'nb-cell cell-error';
      outEl.innerHTML = `<div class="nb-out-meta">TIMEOUT</div><div class="nb-out-error">脚本执行超过 30 秒，已强制终止</div>`;
    } else {
      cell.className = 'nb-cell cell-error';
      outEl.innerHTML = `
        <div class="nb-out-meta">Error &nbsp;·&nbsp; ${log.durationMs||0}ms</div>
        <div class="nb-out-error">${esc(log.errorMessage || '执行失败')}</div>`;
    }
  } catch (err) {
    cell.className = 'nb-cell cell-error';
    btn.textContent = '▶ Run'; btn.disabled = false;
    outEl.innerHTML = `<div class="nb-out-error">${esc(err.message)}</div>`;
  }
}

async function saveCell(fnId) {
  const script = document.getElementById('code-' + fnId).value;
  const res = await fetch(`/api/ontology/functions/${fnId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptContent: script }),
  });
  if (res.ok) toast('脚本已保存', true);
  else toast('保存失败', false);
}

async function deleteCellFn(fnId) {
  if (!confirm('确定删除该 Function？')) return;
  await fetch(`/api/ontology/functions/${fnId}`, { method: 'DELETE' });
  await loadStep4();
  updateStats();
}

// =====================================================================
// 通用弹窗
// =====================================================================

function showOntoDialog(type) {
  onto.dlgType = type;
  const titleMap = {
    createOT:    '新建 Object Type',
    addProp:     '添加属性',
    createLT:    '新建 Link Type',
    createAT:    '新建 Action Type',
    addParam:    '添加参数',
    addRule:     '添加动作规则',
    addVRule:    '添加校验规则',
    execAction:  '执行 Action',
    createFn:    '新建 Function',
  };
  document.getElementById('ontoModalTitle').textContent = titleMap[type] || '操作';
  document.getElementById('ontoModalBody').innerHTML = buildDialogBody(type);
  document.getElementById('ontoModalBg').classList.add('open');
}

function buildDialogBody(type) {
  const field = (label, id, tag='input', extra='', placeholder='') => `
    <div class="onto-form-row">
      <label>${label}</label>
      ${tag === 'textarea'
        ? `<textarea class="onto-textarea" id="${id}" rows="3" placeholder="${placeholder}">${extra}</textarea>`
        : `<input class="onto-input" id="${id}" type="text" placeholder="${placeholder}" ${extra}>`}
    </div>`;

  const select = (label, id, options) => `
    <div class="onto-form-row">
      <label>${label}</label>
      <select class="onto-select" id="${id}">
        ${options.map(o => typeof o === 'string' ? `<option>${o}</option>` : `<option value="${o.v}">${o.t}</option>`).join('')}
      </select>
    </div>`;

  if (type === 'createOT') return `
    ${field('名称 *', 'dm_name', 'input', '', 'e.g. Device')}
    ${field('展示名 *', 'dm_disp', 'input', '', 'e.g. 设备')}
    ${field('描述', 'dm_desc', 'textarea')}
    <div class="onto-form-row">
      <label>图标 (emoji)</label>
      <input class="onto-input" id="dm_icon" type="text" placeholder="🧬" style="width:90px">
    </div>
    <div class="onto-form-row">
      <label>颜色</label>
      <input id="dm_color" type="color" value="#5b8dee"
        style="width:56px;height:34px;border:none;background:none;cursor:pointer;padding:0">
    </div>`;

  if (type === 'addProp') return `
    ${field('名称 *', 'dm_name', 'input', '', 'e.g. serialNumber')}
    ${field('展示名 *', 'dm_disp', 'input', '', 'e.g. 序列号')}
    ${select('数据类型 *', 'dm_dtype', ['STRING','INTEGER','DOUBLE','BOOLEAN','DATE','DATETIME'])}
    <div class="onto-check-row">
      <input type="checkbox" id="dm_req">
      <label for="dm_req">必填字段</label>
    </div>
    ${field('默认值', 'dm_def', 'input', '', '可选')}
    <div class="onto-form-row">
      <label>排序</label>
      <input class="onto-input" id="dm_sort" type="number" value="0" style="width:90px">
    </div>`;

  if (type === 'createLT') {
    const otOptions = onto.objectTypes.map(o => ({ v: o.id, t: `${o.displayName} (${o.name})` }));
    return `
      ${field('名称 *', 'dm_name', 'input', '', 'e.g. HAS_DEVICE')}
      ${field('展示名 *', 'dm_disp', 'input', '', 'e.g. 包含设备')}
      ${select('源实体 *', 'dm_src', otOptions)}
      ${select('目标实体 *', 'dm_tgt', otOptions)}
      ${select('基数', 'dm_card', ['MANY_TO_MANY','ONE_TO_MANY','ONE_TO_ONE'])}
      ${field('描述', 'dm_desc', 'textarea')}`;
  }

  if (type === 'createAT') return `
    ${field('名称 *', 'dm_name', 'input', '', 'e.g. CREATE_DEVICE')}
    ${field('展示名 *', 'dm_disp', 'input', '', 'e.g. 创建设备')}
    ${field('描述', 'dm_desc', 'textarea')}
    ${select('状态', 'dm_status', ['DRAFT','ACTIVE'])}`;

  if (type === 'addParam') return `
    ${field('参数名 *', 'dm_name', 'input', '', 'e.g. deviceName')}
    ${field('展示名 *', 'dm_disp', 'input', '', 'e.g. 设备名称')}
    ${select('数据类型 *', 'dm_dtype', ['STRING','INTEGER','DOUBLE','BOOLEAN','DATE','DATETIME'])}
    <div class="onto-check-row">
      <input type="checkbox" id="dm_req">
      <label for="dm_req">必填参数</label>
    </div>
    ${field('默认值', 'dm_def', 'input', '', '可选')}
    <div class="onto-form-row">
      <label>排序</label>
      <input class="onto-input" id="dm_sort" type="number" value="0" style="width:90px">
    </div>`;

  if (type === 'addVRule') return `
    ${field('规则名称 *', 'dm_name', 'input', '', 'e.g. 名称不能为空')}
    <div class="onto-form-row">
      <label>校验条件（SpEL / 描述）</label>
      <textarea class="onto-textarea" id="dm_cond" rows="2"
        placeholder='e.g. #parameters.name != null && !#parameters.name.isEmpty()'></textarea>
    </div>
    ${field('失败提示信息 *', 'dm_msg', 'input', '', 'e.g. 设备名称不能为空')}`;

  if (type === 'addRule') return `
    ${select('规则类型 *', 'dm_rtype',
      ['CREATE_OBJECT','MODIFY_OBJECT','DELETE_OBJECT','CREATE_LINK','DELETE_LINK'])}
    ${field('目标 ObjectType 名称', 'dm_tgtOT', 'input', '', 'e.g. Device')}
    ${field('目标 LinkType 名称', 'dm_tgtLT', 'input', '', 'e.g. HAS_DEVICE')}
    <div class="onto-form-row">
      <label>属性映射 JSON</label>
      <textarea class="onto-textarea" id="dm_mapping" rows="4"
        placeholder='{"name":"$parameters.name","type":"$parameters.type"}'></textarea>
    </div>
    <div class="onto-form-row">
      <label>执行条件 JSON（可选）</label>
      <textarea class="onto-textarea" id="dm_cond" rows="2"
        placeholder='{"field":"action","operator":"eq","value":"create"}'></textarea>
    </div>
    <div class="onto-form-row">
      <label>顺序</label>
      <input class="onto-input" id="dm_sort" type="number" value="0" style="width:90px">
    </div>`;

  if (type === 'execAction') return `
    <div style="font-size:11px;color:#6b7280;margin-bottom:12px">
      JSON 格式参数，占位符 <code style="color:#1a56db;background:#eff3ff;padding:1px 5px;border-radius:3px">$parameters.xxx</code> 将被替换
    </div>
    <textarea class="onto-textarea" id="dm_execp" rows="8"
      style="font-family:Consolas,monospace;min-height:140px"
      placeholder='{"name":"设备001","type":"传感器"}'>{}</textarea>`;

  if (type === 'createFn') return `
    ${field('名称 *', 'dm_name', 'input', '', 'e.g. calcRisk')}
    ${field('展示名 *', 'dm_disp', 'input', '', 'e.g. 风险计算')}
    ${field('描述', 'dm_desc', 'textarea')}
    ${select('初始状态', 'dm_status', ['DRAFT','ACTIVE'])}`;

  return '';
}

function closeOntoDialog(e) {
  if (e && e.target !== document.getElementById('ontoModalBg')) return;
  document.getElementById('ontoModalBg').classList.remove('open');
}

async function ontoDialogOK() {
  const t = onto.dlgType;
  const v = id => (document.getElementById(id)?.value || '').trim();

  try {
    if (t === 'createOT') {
      await postJ('/api/ontology/object-types', {
        name: v('dm_name'), displayName: v('dm_disp'),
        description: v('dm_desc'), icon: v('dm_icon'),
        color: document.getElementById('dm_color')?.value || '#5b8dee',
      });
      await loadStep1(); updateStats();

    } else if (t === 'addProp' && onto.selectedOT) {
      await postJ(`/api/ontology/object-types/${onto.selectedOT.id}/properties`, {
        name: v('dm_name'), displayName: v('dm_disp'),
        dataType: v('dm_dtype'),
        required: document.getElementById('dm_req')?.checked || false,
        defaultValue: v('dm_def'),
        sortOrder: parseInt(v('dm_sort')) || 0,
      });
      await loadProps(onto.selectedOT.id);

    } else if (t === 'createLT') {
      await postJ('/api/ontology/link-types', {
        name: v('dm_name'), displayName: v('dm_disp'),
        sourceObjectTypeId: parseInt(v('dm_src')),
        targetObjectTypeId: parseInt(v('dm_tgt')),
        cardinality: v('dm_card'), description: v('dm_desc'),
      });
      await loadStep1(); updateStats();

    } else if (t === 'createAT') {
      await postJ('/api/ontology/action-types', {
        name: v('dm_name'), displayName: v('dm_disp'),
        description: v('dm_desc'), status: v('dm_status'),
      });
      await loadStep3(); updateStats();

    } else if (t === 'addParam' && onto.selectedAT) {
      await postJ(`/api/ontology/action-types/${onto.selectedAT.id}/parameters`, {
        name: v('dm_name'), displayName: v('dm_disp'),
        dataType: v('dm_dtype'),
        required: document.getElementById('dm_req')?.checked || false,
        defaultValue: v('dm_def') || null,
        sortOrder: parseInt(v('dm_sort')) || 0,
      });
      loadATParams();

    } else if (t === 'addVRule' && onto.selectedAT) {
      const rules = [...(onto.vrList || [])];
      rules.push({
        name: v('dm_name'),
        condition: document.getElementById('dm_cond')?.value?.trim() || '',
        message: v('dm_msg'),
      });
      onto.vrList = rules;
      if (onto.selectedAT) onto.selectedAT.validationRulesJson = JSON.stringify(rules);
      renderATValidation();

    } else if (t === 'addRule' && onto.selectedAT) {
      await postJ(`/api/ontology/action-types/${onto.selectedAT.id}/rules`, {
        ruleType: v('dm_rtype'),
        targetObjectTypeName: v('dm_tgtOT') || null,
        targetLinkTypeName:   v('dm_tgtLT') || null,
        propertyMappingsJson: v('dm_mapping') || null,
        conditionJson:        v('dm_cond') || null,
        sortOrder: parseInt(v('dm_sort')) || 0,
      });
      loadRules();

    } else if (t === 'execAction' && onto.selectedAT) {
      const params = JSON.parse(document.getElementById('dm_execp').value || '{}');
      const res = await fetch(`/api/ontology/action-types/${onto.selectedAT.id}/execute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const exec = await res.json();
      toast(exec.status === 'SUCCESS' ? '执行成功 ✓' : `执行 ${exec.status}`, exec.status === 'SUCCESS');
      loadExecHistory();
      document.getElementById('ontoModalBg').classList.remove('open');
      return;

    } else if (t === 'createFn') {
      await postJ('/api/ontology/functions', {
        name: v('dm_name'), displayName: v('dm_disp'),
        description: v('dm_desc'), status: v('dm_status'), scriptType: 'GROOVY',
      });
      await loadStep4(); updateStats();
    }

    document.getElementById('ontoModalBg').classList.remove('open');
    toast('操作成功', true);
  } catch (err) {
    toast('操作失败: ' + err.message, false);
  }
}

// =====================================================================
// D3 工具函数
// =====================================================================

function mkGlow(defs, id, stdDev) {
  const f = defs.append('filter').attr('id', id)
    .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
  f.append('feGaussianBlur').attr('stdDeviation', stdDev).attr('result', 'blur');
  const m = f.append('feMerge');
  m.append('feMergeNode').attr('in', 'blur');
  m.append('feMergeNode').attr('in', 'SourceGraphic');
}

function mkArrow(defs, id, color) {
  defs.append('marker').attr('id', id)
    .attr('viewBox', '0 -5 10 10').attr('refX', 10).attr('refY', 0)
    .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
    .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// =====================================================================
// 工具函数
// =====================================================================

async function postJ(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text() || res.statusText);
  return res.json();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('zh-CN', { hour12: false });
}

function prettyJson(s) {
  try { return JSON.stringify(JSON.parse(s), null, 2); }
  catch (_) { return s || ''; }
}

function toast(msg, ok) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:28px;right:28px;z-index:9999;
    padding:10px 20px;border-radius:8px;font-size:13px;
    background:${ok ? 'rgba(16,185,129,.9)' : 'rgba(239,68,68,.9)'};
    color:#fff;box-shadow:0 4px 20px rgba(0,0,0,.4);transition:opacity .4s`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2200);
}
