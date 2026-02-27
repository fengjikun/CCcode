const API      = '/api/devices';
const DIAG_API = '/api/diagnosis';

let deleteTargetId = null;
let searchTimer    = null;
let allDevices     = [];

const STATUS_LABEL = { ONLINE: '在线', OFFLINE: '离线', MAINTENANCE: '维修中', FAULT: '故障' };
const SEV_LABEL    = { LOW: '低', MEDIUM: '中', HIGH: '高', CRITICAL: '紧急' };
const SEV_CLASS    = { LOW: 'sev-low', MEDIUM: 'sev-medium', HIGH: 'sev-high', CRITICAL: 'sev-critical' };

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  loadDevices();
  loadTypes();
  initDiagnosisPanel();
  initSeverityBtns();
});

// ===== 标签切换 =====
let graphInited = false;
function switchTab(tab, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  btn.classList.add('active');
  if (tab === 'diagnosis') loadFaultRecords();
  else if (tab === 'graph' && !graphInited) { graphInited = true; initGraph(); }
}

// ===== 设备管理 =====
function delayedSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadDevices, 300);
}

async function loadDevices() {
  const keyword = document.getElementById('searchInput').value.trim();
  const status  = document.getElementById('filterStatus').value;
  const type    = document.getElementById('filterType').value;
  const params  = new URLSearchParams();
  if (keyword) params.append('keyword', keyword);
  if (status)  params.append('status', status);
  if (type)    params.append('type', type);

  allDevices = await fetchJSON(`${API}?${params}`);
  renderTable(allDevices);
  renderStats(allDevices);
  populateDeviceSelect(allDevices);
}

async function loadTypes() {
  const types = await fetchJSON(`${API}/types`);
  const sel = document.getElementById('filterType');
  const cur = sel.value;
  sel.innerHTML = '<option value="">全部类型</option>';
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    sel.appendChild(opt);
  });
  sel.value = cur;
}

function renderTable(devices) {
  const tbody = document.getElementById('deviceTableBody');
  const empty = document.getElementById('emptyTip');
  if (!devices.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = devices.map(d => `
    <tr>
      <td>${d.id}</td>
      <td><strong>${esc(d.name)}</strong></td>
      <td>${esc(d.type || '—')}</td>
      <td>${esc(d.location || '—')}</td>
      <td><span class="badge badge-${d.status}">${STATUS_LABEL[d.status]}</span></td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(d.description || '')}">${esc(d.description || '—')}</td>
      <td>${formatDate(d.updatedAt)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="openModal(${d.id})">编辑</button>
          <button class="btn btn-sm btn-warning" onclick="startDiagFromDevice(${d.id})">诊断</button>
          <button class="btn btn-sm btn-danger" onclick="openDeleteModal(${d.id}, '${esc(d.name)}')">删除</button>
        </div>
      </td>
    </tr>`).join('');
}

function renderStats(devices) {
  const counts = { total: devices.length, ONLINE: 0, FAULT: 0, OFFLINE: 0 };
  devices.forEach(d => { if (d.status in counts) counts[d.status]++; });
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="stat-icon total">&#128196;</div>
      <div><div class="stat-label">设备总数</div><div class="stat-value">${counts.total}</div></div></div>
    <div class="stat-card"><div class="stat-icon online">&#9679;</div>
      <div><div class="stat-label">在线</div><div class="stat-value">${counts.ONLINE}</div></div></div>
    <div class="stat-card"><div class="stat-icon fault">&#9888;</div>
      <div><div class="stat-label">故障</div><div class="stat-value">${counts.FAULT}</div></div></div>
    <div class="stat-card"><div class="stat-icon offline">&#9675;</div>
      <div><div class="stat-label">离线</div><div class="stat-value">${counts.OFFLINE}</div></div></div>`;
}

// ===== 新增/编辑弹窗 =====
async function openModal(id = null) {
  document.getElementById('deviceForm').reset();
  document.getElementById('deviceId').value = '';
  if (id) {
    document.getElementById('modalTitle').textContent = '编辑设备';
    const d = await fetchJSON(`${API}/${id}`);
    document.getElementById('deviceId').value  = d.id;
    document.getElementById('fName').value     = d.name || '';
    document.getElementById('fType').value     = d.type || '';
    document.getElementById('fLocation').value = d.location || '';
    document.getElementById('fStatus').value   = d.status;
    document.getElementById('fDesc').value     = d.description || '';
  } else {
    document.getElementById('modalTitle').textContent = '新增设备';
  }
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(event) {
  if (event && event.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('active');
}

async function submitForm(e) {
  e.preventDefault();
  const id = document.getElementById('deviceId').value;
  const payload = {
    name:        document.getElementById('fName').value.trim(),
    type:        document.getElementById('fType').value.trim(),
    location:    document.getElementById('fLocation').value.trim(),
    status:      document.getElementById('fStatus').value,
    description: document.getElementById('fDesc').value.trim(),
  };
  if (id) await fetchJSON(`${API}/${id}`, 'PUT', payload);
  else    await fetchJSON(API, 'POST', payload);
  document.getElementById('modalOverlay').classList.remove('active');
  loadDevices(); loadTypes();
}

// ===== 删除弹窗 =====
function openDeleteModal(id, name) {
  deleteTargetId = id;
  document.getElementById('deleteDeviceName').textContent = name;
  document.getElementById('deleteOverlay').classList.add('active');
}
function closeDeleteModal(event) {
  if (event && event.target !== document.getElementById('deleteOverlay')) return;
  document.getElementById('deleteOverlay').classList.remove('active');
  deleteTargetId = null;
}
async function confirmDelete() {
  if (!deleteTargetId) return;
  await fetchJSON(`${API}/${deleteTargetId}`, 'DELETE');
  document.getElementById('deleteOverlay').classList.remove('active');
  deleteTargetId = null;
  loadDevices(); loadTypes();
}

// ===== 从设备列表跳转到诊断 =====
function startDiagFromDevice(deviceId) {
  const device = allDevices.find(d => d.id === deviceId);
  switchTab('diagnosis', document.querySelector('.tab-btn:nth-child(2)'));
  if (device) {
    document.getElementById('dDeviceId').value   = deviceId;
    document.getElementById('dDeviceName').value = device.name || '';
    document.getElementById('dDeviceType').value = device.type || '';
  }
}

// ===== 故障诊断面板初始化 =====
async function initDiagnosisPanel() {
  await loadPhenomenaSelector();
  await loadPhenomenaList();
}

/** 加载现象选择器（下拉 + 子现象多选） */
async function loadPhenomenaSelector() {
  const wrap = document.getElementById('symptomGrid');
  try {
    const phenomena = await fetchJSON(`${DIAG_API}/phenomena`);
    wrap.innerHTML = `
      <div class="phen-select-wrap">
        <select id="dPhenomenonId" onchange="onPhenomenonSelect()" style="width:100%;padding:8px 10px;border:1px solid #d9d9d9;border-radius:6px;font-size:13px">
          <option value="">— 请选择故障现象 —</option>
          ${phenomena.map(p => `<option value="${p.id}">${esc(String(p.label || ''))}</option>`).join('')}
        </select>
      </div>
      <div id="subPhenWrap" style="margin-top:8px;display:none">
        <div style="font-size:12px;color:#666;margin-bottom:4px">细分子现象（可选，帮助精准诊断）：</div>
        <div id="subPhenGrid" class="sub-phen-grid"></div>
      </div>`;
  } catch (e) {
    wrap.innerHTML = '<div class="symptom-loading" style="color:#e53935">现象列表加载失败</div>';
  }
}

/** 现象选择变化 */
async function onPhenomenonSelect() {
  const phenId = document.getElementById('dPhenomenonId').value;
  const wrap   = document.getElementById('subPhenWrap');
  const grid   = document.getElementById('subPhenGrid');

  if (!phenId) { wrap.style.display = 'none'; grid.innerHTML = ''; return; }

  try {
    const subPhens = await fetchJSON(`${DIAG_API}/phenomena/${phenId}/detail`)
      .then(d => d.subPhenomena || []);
    if (!subPhens.length) { wrap.style.display = 'none'; return; }

    grid.innerHTML = subPhens.map(sp => `
      <label class="symptom-chip">
        <input type="checkbox" value="${sp.id}" name="subPhen">
        <span>${esc(String(sp.label || ''))}</span>
      </label>`).join('');
    wrap.style.display = 'block';
  } catch (e) {
    wrap.style.display = 'none';
  }
}

/** 加载左侧现象列表卡片 */
async function loadPhenomenaList() {
  const el = document.getElementById('faultTypeList');
  try {
    const phenomena = await fetchJSON(`${DIAG_API}/phenomena`);
    const COLORS = ['#e53935', '#fb8c00', '#1565c0', '#2e7d32'];
    el.innerHTML = phenomena.map((p, i) => {
      const props = p.properties || {};
      return `<div class="ft-chip" style="border-left:3px solid ${COLORS[i % COLORS.length]};cursor:pointer"
          onclick="quickSelectPhenomenon('${p.id}')">
        <strong>${esc(String(p.label || ''))}</strong>
        <span class="ft-cat">${esc(props.code || '')}</span>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div style="color:#999;padding:8px">加载失败</div>';
  }
}

/** 快速选择现象 */
function quickSelectPhenomenon(phenId) {
  const sel = document.getElementById('dPhenomenonId');
  if (sel) { sel.value = phenId; onPhenomenonSelect(); }
}

function populateDeviceSelect(devices) {
  const sel = document.getElementById('dDeviceId');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— 不关联设备 —</option>';
  devices.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `[${d.id}] ${d.name}${d.type ? ' (' + d.type + ')' : ''}`;
    sel.appendChild(opt);
  });
  sel.value = cur;
}

function onDeviceSelect() {
  const id = parseInt(document.getElementById('dDeviceId').value);
  if (!id) return;
  const device = allDevices.find(d => d.id === id);
  if (device) {
    document.getElementById('dDeviceName').value = device.name || '';
    document.getElementById('dDeviceType').value = device.type || '';
  }
}

function initSeverityBtns() {
  document.querySelectorAll('.sev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('dSeverity').value = btn.dataset.val;
    });
  });
}

function resetDiagForm() {
  document.querySelectorAll('[name=subPhen]').forEach(cb => cb.checked = false);
  document.getElementById('dPhenomenonId').value = '';
  document.getElementById('subPhenWrap').style.display = 'none';
  document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.sev-btn[data-val="MEDIUM"]').classList.add('active');
  document.getElementById('dSeverity').value = 'MEDIUM';
  document.getElementById('diagResultCard').style.display = 'none';
}

// ===== 提交诊断 =====
async function submitDiagnosis(e) {
  e.preventDefault();

  const phenId = document.getElementById('dPhenomenonId').value;
  if (!phenId) { alert('请选择故障现象'); return; }

  const checkedSubPhens = Array.from(
    document.querySelectorAll('[name=subPhen]:checked')
  ).map(cb => cb.value);

  const deviceIdVal = document.getElementById('dDeviceId').value;
  const payload = {
    deviceId:     deviceIdVal ? parseInt(deviceIdVal) : null,
    deviceName:   document.getElementById('dDeviceName').value.trim(),
    deviceType:   document.getElementById('dDeviceType').value.trim(),
    phenomenonId: phenId,
    symptoms:     checkedSubPhens,
    description:  document.getElementById('dDescription').value.trim(),
    severity:     document.getElementById('dSeverity').value,
  };

  const submitBtn = document.getElementById('diagSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '分析中…';
  document.getElementById('diagResultCard').style.display = 'none';
  document.getElementById('diagAnalyzing').style.display  = 'flex';

  try {
    const record = await fetchJSON(`${DIAG_API}/analyze`, 'POST', payload);
    document.getElementById('diagAnalyzing').style.display = 'none';
    renderDiagResult(record);
    loadFaultRecords();
  } catch (err) {
    document.getElementById('diagAnalyzing').style.display = 'none';
    alert('诊断请求失败，请检查后端服务');
  } finally {
    submitBtn.disabled  = false;
    submitBtn.textContent = '&#129302; 开始诊断';
  }
}

function closeResult() {
  document.getElementById('diagResultCard').style.display = 'none';
}

function renderDiagResult(record) {
  const card = document.getElementById('diagResultCard');
  const el   = document.getElementById('diagResult');

  let r = {};
  try { r = JSON.parse(record.diagnosisResult || '{}'); } catch (e) {}

  const confClass = r.confidence === 'HIGH' ? 'conf-high' : r.confidence === 'LOW' ? 'conf-low' : 'conf-medium';
  const sevClass  = SEV_CLASS[r.urgency] || 'sev-medium';

  // 兼容新旧两种结果格式
  const phenomenon = r.phenomenon || r.fault_type || '未知';
  const causes     = r.causes || r.root_causes || [];
  const checkpoints = r.checkpoints || r.troubleshooting_steps || [];
  const solutions  = r.solutions || [];

  el.innerHTML = `
    <div class="result-summary">
      <div class="result-fault-type">
        <span class="result-label">故障现象</span>
        <strong class="result-fault-name">${esc(phenomenon)}</strong>
        <span class="conf-badge ${confClass}">置信度：${esc(r.confidence || '—')}</span>
        <span class="sev-badge ${sevClass}">紧急度：${esc(r.urgency || '—')}</span>
      </div>
      <p class="result-text">${esc(r.summary || '')}</p>
      ${r.note ? `<div class="result-note">&#8505; ${esc(r.note)}</div>` : ''}
    </div>

    ${r.matched_sub_phenomena?.length ? `
    <div class="result-section">
      <div class="result-section-title">&#128270; 匹配子现象</div>
      <div class="alt-faults">${r.matched_sub_phenomena.map(s => `<span class="alt-badge">${esc(s)}</span>`).join('')}</div>
    </div>` : ''}

    ${causes.length ? `
    <div class="result-section">
      <div class="result-section-title">&#9888; 故障原因分析</div>
      <ul class="result-list">${causes.map(c => `<li>${esc(String(c))}</li>`).join('')}</ul>
    </div>` : ''}

    ${checkpoints.length ? `
    <div class="result-section">
      <div class="result-section-title">&#128295; 排查步骤</div>
      <div class="steps-list">
        ${checkpoints.map(s => `
          <div class="step-item">
            <div class="step-num">${s.step || s.priority || ''}</div>
            <div class="step-body">
              <div class="step-action">${esc(s.checkpoint || s.action || '')}</div>
              <div class="step-detail">${esc(s.method || s.detail || '')}</div>
              ${s.expected ? `<div class="step-tool">&#9989; 预期结果：${esc(s.expected)}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${solutions.length ? `
    <div class="result-section">
      <div class="result-section-title">&#128161; 解决方案</div>
      ${solutions.map((sol, idx) => {
        const steps = String(sol.steps || sol.detail || '').split(';').filter(Boolean);
        return `
        <div class="solution-card" style="margin-bottom:12px;padding:12px;background:#f8fff8;border:1px solid #c8e6c9;border-radius:8px">
          <div style="font-weight:600;color:#2e7d32;margin-bottom:8px">
            ${idx + 1}. ${esc(sol.title || sol.action || '方案')}
            ${sol.estimated_time ? `<span style="font-weight:400;font-size:12px;color:#666;margin-left:8px">&#9200; ${esc(sol.estimated_time)}</span>` : ''}
            ${sol.risk_level === 'HIGH' ? `<span style="font-size:11px;color:#e53935;margin-left:4px">&#9888; 高风险</span>` : ''}
          </div>
          ${steps.length ? `<ol style="margin:0;padding-left:18px;font-size:13px;color:#333">
            ${steps.map(st => `<li style="margin-bottom:4px">${esc(st.replace(/^\d+\./,'').trim())}</li>`).join('')}
          </ol>` : ''}
        </div>`;
      }).join('')}
    </div>` : ''}

    <div class="result-meta-row">
      ${r.estimated_time ? `<div class="result-meta-item"><span>&#9200; 预计时间</span><strong>${esc(r.estimated_time)}</strong></div>` : ''}
    </div>`;

  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth' });
}

// ===== 故障记录列表 =====
async function loadFaultRecords() {
  const el = document.getElementById('faultRecordList');
  el.innerHTML = '<div style="padding:16px;color:#999">加载中…</div>';
  try {
    const records = await fetchJSON(`${DIAG_API}/records`);
    if (!records.length) { el.innerHTML = '<div style="padding:16px;color:#999">暂无诊断记录</div>'; return; }
    el.innerHTML = records.map(r => {
      let result = {};
      try { result = JSON.parse(r.diagnosisResult || '{}'); } catch (e) {}
      const phen = result.phenomenon || result.fault_type || '';
      return `
        <div class="record-item" onclick="showRecordDetail(${r.id})">
          <div class="record-header">
            <span class="record-device">${esc(r.deviceName || '未知设备')}</span>
            <span class="badge badge-${r.status === 'RESOLVED' ? 'ONLINE' : r.status === 'DIAGNOSING' ? 'MAINTENANCE' : 'FAULT'}">
              ${r.status === 'RESOLVED' ? '已诊断' : r.status === 'DIAGNOSING' ? '分析中' : '待处理'}
            </span>
          </div>
          <div class="record-meta">
            <span>${esc(r.deviceType || '—')}</span>
            <span>${formatDate(r.reportedAt)}</span>
          </div>
          <div class="record-symptoms">${esc(r.symptoms || '')}</div>
          ${phen ? `<div class="record-result">诊断：${esc(phen)}</div>` : ''}
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div style="padding:16px;color:#e53935">加载失败</div>';
  }
}

async function showRecordDetail(id) {
  const record = await fetchJSON(`${DIAG_API}/records/${id}`);
  const el = document.getElementById('recordDetailContent');

  el.innerHTML = `
    <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #eee">
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px">
        <span><strong>设备：</strong>${esc(record.deviceName || '—')}</span>
        <span><strong>类型：</strong>${esc(record.deviceType || '—')}</span>
        <span><strong>时间：</strong>${formatDate(record.reportedAt)}</span>
        <span class="badge badge-${record.severity === 'HIGH' || record.severity === 'CRITICAL' ? 'FAULT' : 'MAINTENANCE'}">${SEV_LABEL[record.severity] || record.severity}</span>
      </div>
      <div><strong>现象：</strong>${esc(record.symptoms || '—')}</div>
      ${record.description ? `<div style="margin-top:4px"><strong>说明：</strong>${esc(record.description)}</div>` : ''}
    </div>`;

  const resultDiv = document.createElement('div');
  el.appendChild(resultDiv);

  // 借用渲染函数
  const origEl = document.getElementById('diagResult');
  const fakeEl = document.createElement('div');
  fakeEl.id = 'diagResult';
  origEl.parentNode.replaceChild(fakeEl, origEl);
  renderDiagResult(record);
  resultDiv.innerHTML = fakeEl.innerHTML;
  fakeEl.parentNode.replaceChild(origEl, fakeEl);

  document.getElementById('recordDetailOverlay').classList.add('active');
}

function closeRecordDetail(event) {
  if (event && event.target !== document.getElementById('recordDetailOverlay')) return;
  document.getElementById('recordDetailOverlay').classList.remove('active');
}

// ===== 工具函数 =====
async function fetchJSON(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error || `请求失败：${res.status}`);
    throw new Error(err.error || res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n) { return String(n).padStart(2, '0'); }
