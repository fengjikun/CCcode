/**
 * 故障知识图谱可视化 — D3.js v7 力导向图
 */

// ===== 配置 =====
const NODE_CONFIG = {
  FaultType:  { color: '#e53935', stroke: '#b71c1c', radius: 22, label: '故障类型', shape: 'hexagon' },
  Symptom:    { color: '#fb8c00', stroke: '#e65100', radius: 16, label: '症  状',   shape: 'circle'  },
  Cause:      { color: '#8e24aa', stroke: '#4a148c', radius: 16, label: '原  因',   shape: 'circle'  },
  Solution:   { color: '#2e7d32', stroke: '#1b5e20', radius: 16, label: '解决方案', shape: 'circle'  },
  DeviceType: { color: '#1565c0', stroke: '#0d47a1', radius: 20, label: '设备类型', shape: 'rect'    },
};

const LINK_CONFIG = {
  has_symptom:  { color: '#fb8c00', label: '有症状',  dash: ''    },
  caused_by:    { color: '#8e24aa', label: '由...引起', dash: '6,3' },
  resolved_by:  { color: '#2e7d32', label: '可解决',  dash: '3,3' },
  prone_to:     { color: '#1565c0', label: '易发生',  dash: '8,4' },
};

let simulation, svg, g, zoom;
let allNodes = [], allLinks = [];
let activeTypes = new Set(Object.keys(NODE_CONFIG));
let highlightedId = null;

// ===== 初始化 =====
async function initGraph() {
  const container = document.getElementById('graphContainer');
  if (!container) return;

  showGraphLoading(true);
  try {
    const data = await fetchJSON('/api/diagnosis/graph');
    allNodes = data.nodes || [];
    allLinks = data.links || [];
    buildLegend();
    buildStats(allNodes, allLinks);
    renderGraph(allNodes, allLinks);
  } catch (e) {
    container.innerHTML = '<div class="graph-error">图谱数据加载失败：' + e.message + '</div>';
  }
  showGraphLoading(false);
}

function showGraphLoading(show) {
  const el = document.getElementById('graphLoading');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ===== 构建图谱 =====
function renderGraph(nodes, links) {
  const container = document.getElementById('graphContainer');
  const W = container.clientWidth || 900;
  const H = container.clientHeight || 620;

  // 清理旧实例
  d3.select('#graphSvg').remove();

  svg = d3.select(container).append('svg')
    .attr('id', 'graphSvg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, W, H]);

  // 箭头 marker
  const defs = svg.append('defs');
  Object.entries(LINK_CONFIG).forEach(([rel, cfg]) => {
    defs.append('marker')
      .attr('id', 'arrow-' + rel)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 30).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', cfg.color)
      .attr('d', 'M0,-5L10,0L0,5');
  });

  zoom = d3.zoom()
    .scaleExtent([0.2, 3])
    .on('zoom', e => g.attr('transform', e.transform));
  svg.call(zoom);

  g = svg.append('g').attr('class', 'graph-g');

  // 深拷贝节点数据（D3 会修改原始对象）
  const simNodes = nodes.map(n => ({ ...n }));
  const nodeById = new Map(simNodes.map(n => [n.id, n]));

  const simLinks = links
    .filter(l => nodeById.has(l.source) && nodeById.has(l.target))
    .map(l => ({ ...l, source: l.source, target: l.target }));

  // Force simulation
  simulation = d3.forceSimulation(simNodes)
    .force('link', d3.forceLink(simLinks).id(d => d.id).distance(d => {
      if (d.rel === 'prone_to') return 130;
      if (d.rel === 'resolved_by') return 120;
      return 90;
    }).strength(0.4))
    .force('charge', d3.forceManyBody().strength(-280))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide(d => nodeRadius(d) + 14))
    .force('x', d3.forceX(W / 2).strength(0.03))
    .force('y', d3.forceY(H / 2).strength(0.03));

  // 绘制边
  const linkG = g.append('g').attr('class', 'links');
  const link = linkG.selectAll('line')
    .data(simLinks)
    .join('line')
    .attr('class', 'graph-link')
    .attr('stroke', d => (LINK_CONFIG[d.rel] || {}).color || '#aaa')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', d => (LINK_CONFIG[d.rel] || {}).dash || '')
    .attr('marker-end', d => `url(#arrow-${d.rel})`)
    .attr('opacity', 0.7);

  // 边标签
  const linkLabel = g.append('g').attr('class', 'link-labels');
  const edgeLabelVisible = () => document.getElementById('toggleEdgeLabels')?.checked;
  const linkText = linkLabel.selectAll('text')
    .data(simLinks)
    .join('text')
    .attr('class', 'graph-link-label')
    .attr('text-anchor', 'middle')
    .attr('font-size', 10)
    .attr('fill', d => (LINK_CONFIG[d.rel] || {}).color || '#999')
    .attr('dy', -3)
    .text(d => (LINK_CONFIG[d.rel] || {}).label || d.rel);

  // 绘制节点组
  const nodeG = g.append('g').attr('class', 'nodes');
  const node = nodeG.selectAll('g')
    .data(simNodes)
    .join('g')
    .attr('class', 'graph-node')
    .attr('cursor', 'pointer')
    .call(d3.drag()
      .on('start', dragStart)
      .on('drag',  dragged)
      .on('end',   dragEnd))
    .on('click', (e, d) => {
      e.stopPropagation();
      selectNode(d, simNodes, simLinks, link, node);
    })
    .on('mouseenter', (e, d) => showTooltip(e, d))
    .on('mousemove',  (e)    => moveTooltip(e))
    .on('mouseleave', ()     => hideTooltip());

  // 节点形状
  node.each(function(d) {
    const el = d3.select(this);
    const cfg = NODE_CONFIG[d.type] || { color: '#999', radius: 14 };
    const r = nodeRadius(d);

    if (d.type === 'DeviceType') {
      el.append('rect')
        .attr('x', -r).attr('y', -r * 0.8)
        .attr('width', r * 2).attr('height', r * 1.6)
        .attr('rx', 5).attr('ry', 5)
        .attr('fill', cfg.color)
        .attr('stroke', cfg.stroke)
        .attr('stroke-width', 2);
    } else if (d.type === 'FaultType') {
      el.append('polygon')
        .attr('points', hexPoints(r))
        .attr('fill', cfg.color)
        .attr('stroke', cfg.stroke)
        .attr('stroke-width', 2);
    } else {
      el.append('circle')
        .attr('r', r)
        .attr('fill', cfg.color)
        .attr('stroke', cfg.stroke)
        .attr('stroke-width', 2);
    }
  });

  // 节点图标文字
  node.append('text')
    .attr('class', 'node-icon')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', d => nodeRadius(d) * 0.75)
    .attr('fill', '#fff')
    .attr('pointer-events', 'none')
    .text(d => nodeIcon(d.type));

  // 节点名称标签
  const nodeLabels = node.append('text')
    .attr('class', 'node-label')
    .attr('text-anchor', 'middle')
    .attr('dy', d => nodeRadius(d) + 12)
    .attr('font-size', 11)
    .attr('fill', '#333')
    .attr('pointer-events', 'none')
    .text(d => truncate(d.label, 8));

  // Tick
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => targetPoint(d).x).attr('y2', d => targetPoint(d).y);

    linkText
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2)
      .attr('display', edgeLabelVisible() ? null : 'none');

    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // 点击空白取消选中
  svg.on('click', () => clearSelection(link, node));

  // 保存引用供过滤/搜索使用
  svg._simNodes = simNodes;
  svg._simLinks = simLinks;
  svg._link = link;
  svg._node = node;
  svg._nodeLabels = nodeLabels;
}

// ===== 节点交互 =====
function selectNode(d, simNodes, simLinks, link, node) {
  highlightedId = d.id;

  const connected = new Set([d.id]);
  simLinks.forEach(l => {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    if (sid === d.id) connected.add(tid);
    if (tid === d.id) connected.add(sid);
  });

  node.attr('opacity', n => connected.has(n.id) ? 1 : 0.15);
  link.attr('opacity', l => {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    return (sid === d.id || tid === d.id) ? 1 : 0.05;
  });

  showNodeDetail(d, simLinks, simNodes);
}

function clearSelection(link, node) {
  highlightedId = null;
  node.attr('opacity', 1);
  link.attr('opacity', 0.7);
  hideNodeDetail();
}

// ===== 节点详情面板 =====
function showNodeDetail(d, simLinks, simNodes) {
  const panel = document.getElementById('nodeDetailPanel');
  const cfg = NODE_CONFIG[d.type] || {};

  const connectedLinks = simLinks.filter(l => {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    return sid === d.id || tid === d.id;
  });

  const nodeById = new Map(simNodes.map(n => [n.id, n]));

  const connHTML = connectedLinks.map(l => {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    const isOut = sid === d.id;
    const otherId = isOut ? tid : sid;
    const other = nodeById.get(otherId);
    const relLabel = (LINK_CONFIG[l.rel] || {}).label || l.rel;
    const relColor = (LINK_CONFIG[l.rel] || {}).color || '#666';
    const otherCfg = NODE_CONFIG[other?.type] || {};
    return `<div class="detail-conn-item">
      <span class="detail-rel-badge" style="background:${relColor}20;color:${relColor};border:1px solid ${relColor}40">${isOut ? '→' : '←'} ${relLabel}</span>
      <span class="detail-conn-node" style="color:${otherCfg.color || '#333'}">${other?.label || otherId}</span>
    </div>`;
  }).join('');

  const propsHTML = Object.entries(d.props || {})
    .filter(([k]) => k !== 'name')
    .map(([k, v]) => `<div class="detail-prop"><span class="detail-prop-key">${k}</span><span class="detail-prop-val">${v}</span></div>`)
    .join('');

  panel.innerHTML = `
    <div class="detail-header" style="border-left:4px solid ${cfg.color || '#999'}">
      <div class="detail-type-badge" style="background:${cfg.color || '#999'}20;color:${cfg.color || '#999'}">${cfg.label || d.type}</div>
      <div class="detail-name">${d.label}</div>
      <button class="detail-close" onclick="clearSelectionFromPanel()">✕</button>
    </div>
    ${propsHTML ? `<div class="detail-section"><div class="detail-section-title">属性</div>${propsHTML}</div>` : ''}
    ${connectedLinks.length ? `<div class="detail-section"><div class="detail-section-title">关联 (${connectedLinks.length})</div>${connHTML}</div>` : ''}
  `;
  panel.style.display = 'block';
}

function hideNodeDetail() {
  const panel = document.getElementById('nodeDetailPanel');
  if (panel) panel.style.display = 'none';
}

function clearSelectionFromPanel() {
  const svgEl = document.getElementById('graphSvg');
  if (svgEl && svg?._link && svg?._node) {
    clearSelection(svg._link, svg._node);
  }
}

// ===== 过滤节点类型 =====
function onTypeFilterChange(type, checked) {
  if (checked) activeTypes.add(type);
  else activeTypes.delete(type);

  if (!svg?._node || !svg?._link) return;
  svg._node.attr('display', d => activeTypes.has(d.type) ? null : 'none');
  svg._link.attr('display', l => {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    const sNode = svg._simNodes?.find(n => n.id === sid);
    const tNode = svg._simNodes?.find(n => n.id === tid);
    return (sNode && activeTypes.has(sNode.type) && tNode && activeTypes.has(tNode.type)) ? null : 'none';
  });
}

// ===== 搜索高亮 =====
function onGraphSearch(keyword) {
  if (!svg?._node || !svg?._link) return;
  if (!keyword.trim()) {
    svg._node.attr('opacity', 1);
    svg._link.attr('opacity', 0.7);
    return;
  }
  const kw = keyword.toLowerCase();
  const matchIds = new Set();
  (svg._simNodes || []).forEach(n => {
    if (n.label.toLowerCase().includes(kw)) matchIds.add(n.id);
  });

  svg._node.attr('opacity', d => matchIds.has(d.id) ? 1 : 0.1);
  svg._link.attr('opacity', l => {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    return (matchIds.has(sid) && matchIds.has(tid)) ? 0.8 : 0.05;
  });
}

// ===== 缩放控制 =====
function graphZoomIn()   { svg?.transition().call(zoom.scaleBy, 1.4); }
function graphZoomOut()  { svg?.transition().call(zoom.scaleBy, 0.7); }
function graphZoomReset() {
  svg?.transition().duration(500).call(
    zoom.transform, d3.zoomIdentity.translate(0, 0).scale(1)
  );
}

// ===== 布局控制 =====
function toggleSimulation(running) {
  if (!simulation) return;
  if (running) simulation.alpha(0.3).restart();
  else simulation.stop();
}

// ===== 统计 & 图例 =====
function buildStats(nodes, links) {
  const counts = {};
  nodes.forEach(n => counts[n.type] = (counts[n.type] || 0) + 1);
  const relCounts = {};
  links.forEach(l => relCounts[l.rel] = (relCounts[l.rel] || 0) + 1);

  const el = document.getElementById('graphStats');
  if (!el) return;
  el.innerHTML = Object.entries(counts).map(([type, cnt]) => {
    const cfg = NODE_CONFIG[type] || {};
    return `<span class="stat-chip" style="border-left:3px solid ${cfg.color || '#999'}">${cfg.label || type}: <strong>${cnt}</strong></span>`;
  }).join('') +
  `<span class="stat-chip stat-total">边: <strong>${links.length}</strong></span>`;
}

function buildLegend() {
  const typeEl = document.getElementById('graphLegendTypes');
  if (typeEl) {
    typeEl.innerHTML = Object.entries(NODE_CONFIG).map(([type, cfg]) => `
      <label class="legend-item">
        <input type="checkbox" checked onchange="onTypeFilterChange('${type}', this.checked)">
        <span class="legend-dot" style="background:${cfg.color}"></span>
        <span>${cfg.label}</span>
      </label>`).join('');
  }

  const relEl = document.getElementById('graphLegendRels');
  if (relEl) {
    relEl.innerHTML = Object.entries(LINK_CONFIG).map(([rel, cfg]) => `
      <div class="legend-rel">
        <svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5"
          stroke="${cfg.color}" stroke-width="2"
          stroke-dasharray="${cfg.dash || ''}" marker-end="url(#arrow-${rel})"/></svg>
        <span>${cfg.label}</span>
      </div>`).join('');
  }
}

// ===== Tooltip =====
function showTooltip(e, d) {
  const tip = document.getElementById('graphTooltip');
  if (!tip) return;
  const cfg = NODE_CONFIG[d.type] || {};
  const links = (svg._simLinks || []).filter(l => {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    return sid === d.id || tid === d.id;
  });
  tip.innerHTML = `
    <div class="tip-type" style="color:${cfg.color}">${cfg.label || d.type}</div>
    <div class="tip-name">${d.label}</div>
    <div class="tip-conn">连接: ${links.length} 条边</div>
  `;
  tip.style.display = 'block';
  moveTooltip(e);
}

function moveTooltip(e) {
  const tip = document.getElementById('graphTooltip');
  if (!tip) return;
  const container = document.getElementById('graphContainer');
  const rect = container.getBoundingClientRect();
  let x = e.clientX - rect.left + 12;
  let y = e.clientY - rect.top - 8;
  if (x + 160 > rect.width)  x -= 170;
  if (y + 80  > rect.height) y -= 90;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

function hideTooltip() {
  const tip = document.getElementById('graphTooltip');
  if (tip) tip.style.display = 'none';
}

// ===== 拖拽 =====
function dragStart(e, d) {
  if (!e.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x; d.fy = d.y;
}
function dragged(e, d)  { d.fx = e.x; d.fy = e.y; }
function dragEnd(e, d)  {
  if (!e.active) simulation.alphaTarget(0);
  d.fx = null; d.fy = null;
}

// ===== 辅助函数 =====
function nodeRadius(d) { return (NODE_CONFIG[d.type] || {}).radius || 14; }

function hexPoints(r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 180 * (60 * i - 30);
    return `${r * Math.cos(a)},${r * Math.sin(a)}`;
  }).join(' ');
}

function targetPoint(d) {
  const dx = d.target.x - d.source.x;
  const dy = d.target.y - d.source.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const r = nodeRadius(d.target) + 4;
  return { x: d.target.x - dx / dist * r, y: d.target.y - dy / dist * r };
}

function nodeIcon(type) {
  return { FaultType: '⚠', Symptom: '◎', Cause: '●', Solution: '✔', DeviceType: '▣' }[type] || '●';
}

function truncate(str, len) {
  return str && str.length > len ? str.slice(0, len) + '…' : str;
}

// 边标签 toggle
function toggleEdgeLabels(show) {
  if (!svg) return;
  svg.selectAll('.graph-link-label').attr('display', show ? null : 'none');
}
