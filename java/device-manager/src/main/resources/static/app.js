const API = '/api/devices';
const DIAG_API = '/api/diagnosis';

let deleteTargetId = null;
let searchTimer = null;
let selectedSymptoms = new Set();
let allDevices = [];

const STATUS_LABEL = {
  ONLINE: '在线', OFFLINE: '离线', MAINTENANCE: '维修中', FAULT: '故障'
};
const SEV_LABEL = { LOW: '低', MEDIUM: '中', HIGH: '高', CRITICAL: '紧急' };
const SEV_CLASS = { LOW: 'sev-low', MEDIUM: 'sev-medium', HIGH: 'sev-high', CRITICAL: 'sev-critical' };

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
  if (tab === 'diagnosis') {
    loadFaultRecords();
  } else if (tab === 'graph') {
    if (!graphInited) { graphInited = true; initGraph(); }
  }
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

  const params = new URLSearchParams();
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
  const current = sel.value;
  sel.innerHTML = '<option value="">全部类型</option>';
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    sel.appendChild(opt);
  });
  sel.value = current;
}

function renderTable(devices) {
  const tbody = document.getElementById('deviceTableBody');
  const empty = document.getElementById('emptyTip');

  if (!devices.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
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
    </tr>
  `).join('');
}

function renderStats(devices) {
  const counts = { total: devices.length, ONLINE: 0, FAULT: 0, OFFLINE: 0 };
  devices.forEach(d => {
    if (d.status in counts) counts[d.status]++;
  });
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon total">&#128196;</div>
      <div><div class="stat-label">设备总数</div><div class="stat-value">${counts.total}</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon online">&#9679;</div>
      <div><div class="stat-label">在线</div><div class="stat-value">${counts.ONLINE}</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon fault">&#9888;</div>
      <div><div class="stat-label">故障</div><div class="stat-value">${counts.FAULT}</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon offline">&#9675;</div>
      <div><div class="stat-label">离线</div><div class="stat-value">${counts.OFFLINE}</div></div>
    </div>
  `;
}

// ===== 新增/编辑弹窗 =====
async function openModal(id = null) {
  document.getElementById('deviceForm').reset();
  document.getElementById('deviceId').value = '';

  if (id) {
    document.getElementById('modalTitle').textContent = '编辑设备';
    const d = await fetchJSON(`${API}/${id}`);
    document.getElementById('deviceId').value   = d.id;
    document.getElementById('fName').value      = d.name || '';
    document.getElementById('fType').value      = d.type || '';
    document.getElementById('fLocation').value  = d.location || '';
    document.getElementById('fStatus').value    = d.status;
    document.getElementById('fDesc').value      = d.description || '';
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

  if (id) {
    await fetchJSON(`${API}/${id}`, 'PUT', payload);
  } else {
    await fetchJSON(API, 'POST', payload);
  }

  document.getElementById('modalOverlay').classList.remove('active');
  loadDevices();
  loadTypes();
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
  loadDevices();
  loadTypes();
}

// ===== 从设备列表跳转到诊断 =====
function startDiagFromDevice(deviceId) {
  const device = allDevices.find(d => d.id === deviceId);
  switchTab('diagnosis', document.querySelector('.tab-btn:nth-child(2)'));
  if (device) {
    document.getElementById('dDeviceId').value = deviceId;
    document.getElementById('dDeviceName').value = device.name || '';
    document.getElementById('dDeviceType').value = device.type || '';
  }
}

// ===== 故障诊断面板初始化 =====
async function initDiagnosisPanel() {
  await loadSymptomGrid();
  await loadFaultTypeList();
}

async function loadSymptomGrid() {
  const grid = document.getElementById('symptomGrid');
  try {
    const symptoms = await fetchJSON(`${DIAG_API}/symptoms`);
    grid.innerHTML = symptoms.map(s => {
      const props = s.properties || {};
      return `
        <label class="symptom-chip" title="${esc(props.description || '')}">
          <input type="checkbox" value="${esc(props.name || '')}" onchange="toggleSymptom(this)">
          <span>${esc(props.name || '')}</span>
        </label>`;
    }).join('');
  } catch (e) {
    grid.innerHTML = '<div class="symptom-loading" style="color:#e53935">症状列表加载失败</div>';
  }
}

function toggleSymptom(cb) {
  if (cb.checked) selectedSymptoms.add(cb.value);
  else selectedSymptoms.delete(cb.value);
}

async function loadFaultTypeList() {
  const el = document.getElementById('faultTypeList');
  try {
    const types = await fetchJSON(`${DIAG_API}/fault-types`);
    const SEV_COLORS = { HIGH: '#e53935', MEDIUM: '#fb8c00', LOW: '#43a047', CRITICAL: '#7b1fa2' };
    el.innerHTML = types.map(t => {
      const p = t.properties || {};
      const color = SEV_COLORS[p.severity] || '#666';
      return `<div class="ft-chip" style="border-left:3px solid ${color}">
        <strong>${esc(p.name || '')}</strong>
        <span class="ft-cat">${esc(p.category || '')}</span>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div style="color:#999;padding:8px">加载失败</div>';
  }
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
  selectedSymptoms.clear();
  document.querySelectorAll('#symptomGrid input[type=checkbox]').forEach(cb => cb.checked = false);
  document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.sev-btn[data-val="MEDIUM"]').classList.add('active');
  document.getElementById('dSeverity').value = 'MEDIUM';
  document.getElementById('diagResultCard').style.display = 'none';
}

// ===== 提交诊断 =====
async function submitDiagnosis(e) {
  e.preventDefault();

  if (selectedSymptoms.size === 0) {
    alert('请至少选择一个故障症状');
    return;
  }

  const deviceIdVal = document.getElementById('dDeviceId').value;
  const payload = {
    deviceId:    deviceIdVal ? parseInt(deviceIdVal) : null,
    deviceName:  document.getElementById('dDeviceName').value.trim(),
    deviceType:  document.getElementById('dDeviceType').value.trim(),
    symptoms:    Array.from(selectedSymptoms),
    description: document.getElementById('dDescription').value.trim(),
    severity:    document.getElementById('dSeverity').value,
  };

  const submitBtn = document.getElementById('diagSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '分析中…';
  document.getElementById('diagResultCard').style.display = 'none';
  document.getElementById('diagAnalyzing').style.display = 'flex';

  try {
    const record = await fetchJSON(`${DIAG_API}/analyze`, 'POST', payload);
    document.getElementById('diagAnalyzing').style.display = 'none';
    renderDiagResult(record);
    loadFaultRecords();
  } catch (err) {
    document.getElementById('diagAnalyzing').style.display = 'none';
    alert('诊断请求失败，请检查后端服务');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '&#129302; 开始诊断';
  }
}

function closeResult() {
  document.getElementById('diagResultCard').style.display = 'none';
}

function renderDiagResult(record) {
  const card = document.getElementById('diagResultCard');
  const el = document.getElementById('diagResult');

  let result = {};
  try {
    result = JSON.parse(record.diagnosisResult || '{}');
  } catch (e) { result = {}; }

  const sevClass = SEV_CLASS[result.urgency] || 'sev-medium';
  const confClass = result.confidence === 'HIGH' ? 'conf-high' : result.confidence === 'LOW' ? 'conf-low' : 'conf-medium';

  el.innerHTML = `
    <div class="result-summary">
      <div class="result-fault-type">
        <span class="result-label">诊断故障</span>
        <strong class="result-fault-name">${esc(result.fault_type || '未知')}</strong>
        <span class="conf-badge ${confClass}">置信度：${esc(result.confidence || '未知')}</span>
        <span class="sev-badge ${sevClass}">紧急度：${esc(result.urgency || '—')}</span>
      </div>
      <p class="result-text">${esc(result.summary || '')}</p>
      ${result.note ? `<div class="result-note">&#8505; ${esc(result.note)}</div>` : ''}
    </div>

    ${result.root_causes?.length ? `
    <div class="result-section">
      <div class="result-section-title">&#128270; 根本原因分析</div>
      <ul class="result-list">
        ${result.root_causes.map(c => `<li>${esc(c)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${result.troubleshooting_steps?.length ? `
    <div class="result-section">
      <div class="result-section-title">&#128295; 排查处理步骤</div>
      <div class="steps-list">
        ${result.troubleshooting_steps.map(s => `
          <div class="step-item">
            <div class="step-num">${s.step}</div>
            <div class="step-body">
              <div class="step-action">${esc(s.action || '')}</div>
              <div class="step-detail">${esc(s.detail || '')}</div>
              ${s.tool ? `<div class="step-tool">&#128295; 所需工具：${esc(s.tool)}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <div class="result-meta-row">
      ${result.estimated_time ? `<div class="result-meta-item"><span>&#9200; 预计时间</span><strong>${esc(result.estimated_time)}</strong></div>` : ''}
      ${result.required_tools?.length ? `<div class="result-meta-item"><span>&#128295; 所需工具</span><strong>${result.required_tools.map(t => esc(t)).join('、')}</strong></div>` : ''}
    </div>

    ${result.prevention_tips?.length ? `
    <div class="result-section">
      <div class="result-section-title">&#9989; 预防建议</div>
      <ul class="result-list">
        ${result.prevention_tips.map(t => `<li>${esc(t)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${result.alternative_faults?.length ? `
    <div class="result-section">
      <div class="result-section-title">&#8505; 其他可能故障</div>
      <div class="alt-faults">
        ${result.alternative_faults.map(f => `<span class="alt-badge">${esc(f)}</span>`).join('')}
      </div>
    </div>` : ''}
  `;

  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth' });
}

// ===== 故障记录列表 =====
async function loadFaultRecords() {
  const el = document.getElementById('faultRecordList');
  el.innerHTML = '<div style="padding:16px;color:#999">加载中…</div>';
  try {
    const records = await fetchJSON(`${DIAG_API}/records`);
    if (!records.length) {
      el.innerHTML = '<div style="padding:16px;color:#999">暂无诊断记录</div>';
      return;
    }
    el.innerHTML = records.map(r => {
      let result = {};
      try { result = JSON.parse(r.diagnosisResult || '{}'); } catch (e) {}
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
          ${result.fault_type ? `<div class="record-result">诊断：${esc(result.fault_type)}</div>` : ''}
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div style="padding:16px;color:#e53935">加载失败</div>';
  }
}

async function showRecordDetail(id) {
  const record = await fetchJSON(`${DIAG_API}/records/${id}`);
  let result = {};
  try { result = JSON.parse(record.diagnosisResult || '{}'); } catch (e) {}

  const el = document.getElementById('recordDetailContent');

  // 重用 renderDiagResult 的渲染逻辑
  const tmpRecord = { diagnosisResult: record.diagnosisResult };
  const tmp = document.createElement('div');
  document.body.appendChild(tmp);

  el.innerHTML = `
    <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #eee">
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px">
        <span><strong>设备：</strong>${esc(record.deviceName || '—')}</span>
        <span><strong>类型：</strong>${esc(record.deviceType || '—')}</span>
        <span><strong>时间：</strong>${formatDate(record.reportedAt)}</span>
        <span class="badge badge-${record.severity === 'HIGH' || record.severity === 'CRITICAL' ? 'FAULT' : 'MAINTENANCE'}">${SEV_LABEL[record.severity] || record.severity}</span>
      </div>
      <div><strong>症状：</strong>${esc(record.symptoms || '—')}</div>
      ${record.description ? `<div style="margin-top:4px"><strong>说明：</strong>${esc(record.description)}</div>` : ''}
    </div>
  `;

  // 渲染诊断结果
  const resultDiv = document.createElement('div');
  el.appendChild(resultDiv);

  // 临时替换容器渲染
  const origCard = document.getElementById('diagResultCard');
  const origEl = document.getElementById('diagResult');
  const fakeEl = document.createElement('div');
  origEl.parentNode.replaceChild(fakeEl, origEl);
  fakeEl.id = 'diagResult';

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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n) { return String(n).padStart(2, '0'); }
