const state = {
  data: null,
  modeId: "executive",
  selectedNodeId: null,
  selectedScenarioId: "e2e",
  hiddenLayers: new Set(),
  compact: false,
  search: "",
  activeScenarioStep: null,
  playing: false,
  viewBox: { x: 0, y: 0, w: 1600, h: 940 },
  initialViewBox: { x: 0, y: 0, w: 1600, h: 940 },
  pan: null,
  timers: []
};

const els = {
  svg: document.getElementById("atlasSvg"),
  viewport: document.getElementById("viewport"),
  layers: document.getElementById("layersGroup"),
  edges: document.getElementById("edgesGroup"),
  nodes: document.getElementById("nodesGroup"),
  packets: document.getElementById("packetsGroup"),
  modeStrip: document.getElementById("modeStrip"),
  scenarioList: document.getElementById("scenarioList"),
  layerList: document.getElementById("layerList"),
  timeline: document.getElementById("timelineTrack"),
  search: document.getElementById("searchInput"),
  play: document.getElementById("playButton"),
  reset: document.getElementById("resetButton"),
  fit: document.getElementById("fitButton"),
  compact: document.getElementById("compactButton"),
  activeModeName: document.getElementById("activeModeName"),
  activeModeDescription: document.getElementById("activeModeDescription"),
  detailCard: document.getElementById("detailCard"),
  detailDomain: document.getElementById("detailDomain"),
  detailTitle: document.getElementById("detailTitle"),
  detailSummary: document.getElementById("detailSummary"),
  detailAuthority: document.getElementById("detailAuthority"),
  detailConsumes: document.getElementById("detailConsumes"),
  detailExposes: document.getElementById("detailExposes"),
  detailProtocol: document.getElementById("detailProtocol"),
  detailDocs: document.getElementById("detailDocs"),
  relationSummary: document.getElementById("relationSummary")
};

const ns = "http://www.w3.org/2000/svg";
const xlink = "http://www.w3.org/1999/xlink";

const typeColors = {
  persona: "#dbeafe",
  agent: "#e0e7ff",
  view: "#fce7f3",
  product: "#fbcfe8",
  data: "#ede9fe",
  governance: "#fee2e2",
  phase: "#dcfce7",
  runtime: "#fed7aa",
  interface: "#fef3c7",
  adapter: "#ffedd5",
  core: "#bae6fd",
  artifact: "#e0f2fe",
  satellite: "#ccfbf1",
  external: "#f1f5f9"
};

const statusLabels = {
  operational: "Operational",
  target: "Target",
  mvp: "MVP",
  concept: "Concept",
  adapter: "Adapter"
};

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(ns, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "text") {
      node.textContent = value;
    } else if (key === "href") {
      node.setAttributeNS(xlink, "href", value);
      node.setAttribute("href", value);
    } else {
      node.setAttribute(key, value);
    }
  });
  return node;
}

function clear(node) {
  node.replaceChildren();
}

function nodeById(id) {
  return state.data.nodes.find((node) => node.id === id);
}

function modeById(id) {
  return state.data.modes.find((mode) => mode.id === id);
}

function scenarioById(id) {
  return state.data.scenarios.find((scenario) => scenario.id === id);
}

function isEdgeActive(edge) {
  const mode = modeById(state.modeId);
  return mode?.focusEdges.includes(edge.id) || edge.flow === state.modeId;
}

function hasSearchMatch(node) {
  if (!state.search) return false;
  return JSON.stringify(node).toLowerCase().includes(state.search.toLowerCase());
}

function isNodeInActiveContext(node) {
  const mode = modeById(state.modeId);
  const activeEdges = state.data.edges.filter((edge) => mode?.focusEdges.includes(edge.id) || edge.flow === state.modeId);
  const ids = new Set(activeEdges.flatMap((edge) => [edge.source, edge.target]));
  if (state.activeScenarioStep) ids.add(state.activeScenarioStep);
  return ids.has(node.id);
}

function edgePath(edge) {
  const source = nodeById(edge.source);
  const target = nodeById(edge.target);
  const sx = source.x + source.w / 2;
  const sy = source.y + source.h / 2;
  const tx = target.x + target.w / 2;
  const ty = target.y + target.h / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const curve = Math.max(40, Math.min(150, Math.abs(dx) * .28 + Math.abs(dy) * .08));
  const c1x = sx + dx * .45;
  const c1y = sy + (dy > 0 ? curve : -curve);
  const c2x = tx - dx * .45;
  const c2y = ty - (dy > 0 ? curve : -curve);
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
}

function renderLayers() {
  clear(els.layers);
  state.data.layers.forEach((layer) => {
    const hidden = state.hiddenLayers.has(layer.id);
    const group = svgEl("g", { class: hidden ? "layer is-hidden" : "layer" });
    group.append(
      svgEl("rect", {
        class: "layer-band",
        x: 24,
        y: layer.y,
        width: 1552,
        height: layer.height,
        rx: 22,
        fill: layer.color
      }),
      svgEl("text", {
        class: "layer-title",
        x: 42,
        y: layer.y + 30,
        text: layer.label
      })
    );
    els.layers.appendChild(group);
  });
}

function renderEdges() {
  clear(els.edges);
  state.data.edges.forEach((edge) => {
    const source = nodeById(edge.source);
    const target = nodeById(edge.target);
    const hidden = state.hiddenLayers.has(source.layer) || state.hiddenLayers.has(target.layer);
    const active = isEdgeActive(edge);
    const related = state.selectedNodeId && (edge.source === state.selectedNodeId || edge.target === state.selectedNodeId);
    const muted = hidden || (!active && state.modeId && !related);
    const pathId = `edge-${edge.id}`;
    const d = edgePath(edge);
    const path = svgEl("path", {
      id: pathId,
      class: `edge${active ? " is-active" : ""}${related ? " is-related" : ""}${muted ? " is-muted" : ""}`,
      d,
      "data-edge": edge.id
    });
    path.addEventListener("click", (event) => {
      event.stopPropagation();
      showRelation(edge);
    });
    els.edges.appendChild(path);

    if (!state.compact && (active || related)) {
      const sourceNode = nodeById(edge.source);
      const targetNode = nodeById(edge.target);
      const label = svgEl("text", {
        class: `edge-label${muted ? " is-muted" : ""}`,
        x: (sourceNode.x + sourceNode.w / 2 + targetNode.x + targetNode.w / 2) / 2,
        y: (sourceNode.y + sourceNode.h / 2 + targetNode.y + targetNode.h / 2) / 2 - 10,
        text: edge.protocol
      });
      els.edges.appendChild(label);
    }
  });
}

function renderNodes() {
  clear(els.nodes);
  state.data.nodes.forEach((node) => {
    const hidden = state.hiddenLayers.has(node.layer);
    const context = isNodeInActiveContext(node);
    const selected = state.selectedNodeId === node.id;
    const match = hasSearchMatch(node);
    const muted = !selected && !match && state.modeId && !context;
    const group = svgEl("g", {
      class: `node${selected ? " is-selected" : ""}${match ? " is-match" : ""}${muted ? " is-muted" : ""}${hidden ? " is-hidden" : ""}`,
      transform: `translate(${node.x} ${node.y})`,
      "data-node": node.id
    });
    const fill = typeColors[node.type] || "#ffffff";
    group.appendChild(svgEl("rect", {
      class: "node-card",
      width: node.w,
      height: node.h,
      rx: 16,
      fill
    }));

    const titleLines = wrapLabel(state.compact ? node.shortLabel : node.label, node.w > 210 ? 18 : 15);
    titleLines.forEach((line, index) => {
      group.appendChild(svgEl("text", {
        class: "node-title",
        x: node.w / 2,
        y: 28 + index * 20,
        text: line
      }));
    });

    if (!state.compact) {
      group.appendChild(svgEl("text", {
        class: "node-type",
        x: node.w / 2,
        y: node.h - 28,
        text: node.type
      }));
      group.appendChild(svgEl("text", {
        class: "node-status",
        x: node.w / 2,
        y: node.h - 10,
        text: statusLabels[node.status] || node.status
      }));
    }

    group.addEventListener("click", (event) => {
      event.stopPropagation();
      selectNode(node.id, { focus: true });
    });
    els.nodes.appendChild(group);
  });
}

function wrapLabel(label, maxChars) {
  const words = label.split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function renderPackets() {
  clear(els.packets);
  const activeEdges = state.data.edges.filter((edge) => isEdgeActive(edge));
  activeEdges.forEach((edge, index) => {
    const circle = svgEl("circle", { class: "packet", r: 7 });
    const motion = svgEl("animateMotion", {
      dur: `${2.2 + (index % 4) * .18}s`,
      begin: `${index * .11}s`,
      repeatCount: "indefinite",
      rotate: "auto"
    });
    motion.appendChild(svgEl("mpath", { href: `#edge-${edge.id}` }));
    circle.appendChild(motion);
    els.packets.appendChild(circle);
  });
}

function renderModeStrip() {
  clear(els.modeStrip);
  state.data.modes.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = mode.label;
    button.className = state.modeId === mode.id ? "is-active" : "";
    button.addEventListener("click", () => setMode(mode.id));
    els.modeStrip.appendChild(button);
  });
}

function renderScenarios() {
  clear(els.scenarioList);
  state.data.scenarios.forEach((scenario) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `scenario-button${state.selectedScenarioId === scenario.id ? " is-active" : ""}`;
    button.innerHTML = `<strong>${scenario.label}</strong><span>${scenario.description}</span>`;
    button.addEventListener("click", () => {
      state.selectedScenarioId = scenario.id;
      stopPlayback();
      render();
      playScenario();
    });
    els.scenarioList.appendChild(button);
  });
}

function renderLayersList() {
  clear(els.layerList);
  state.data.layers.forEach((layer) => {
    const hidden = state.hiddenLayers.has(layer.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "layer-button";
    button.setAttribute("aria-pressed", String(!hidden));
    button.innerHTML = `<strong>${hidden ? "Show" : "Hide"} ${layer.label}</strong><span>${layer.description}</span>`;
    button.addEventListener("click", () => {
      if (hidden) state.hiddenLayers.delete(layer.id);
      else state.hiddenLayers.add(layer.id);
      render();
    });
    els.layerList.appendChild(button);
  });
}

function renderTimeline() {
  clear(els.timeline);
  state.data.timeline.forEach((step) => {
    const div = document.createElement("div");
    div.className = `timeline-step${state.activeScenarioStep === step.id ? " is-active" : ""}`;
    div.innerHTML = `${step.label}<span>${step.gate}</span>`;
    div.addEventListener("click", () => {
      state.activeScenarioStep = step.id;
      selectNode(step.id, { focus: true });
    });
    els.timeline.appendChild(div);
  });
}

function renderActiveMode() {
  const mode = modeById(state.modeId);
  els.activeModeName.textContent = mode.label;
  els.activeModeDescription.textContent = mode.description;
}

function render() {
  renderLayers();
  renderEdges();
  renderNodes();
  renderPackets();
  renderModeStrip();
  renderScenarios();
  renderLayersList();
  renderTimeline();
  renderActiveMode();
}

function setMode(modeId) {
  state.modeId = modeId;
  state.activeScenarioStep = null;
  stopPlayback();
  render();
  focusMode(modeId, true);
  const mode = modeById(modeId);
  if (mode?.focusEdges?.length) {
    showRelation(state.data.edges.find((edge) => edge.id === mode.focusEdges[0]));
  }
}

function selectNode(id, options = { focus: false }) {
  state.selectedNodeId = id;
  const node = nodeById(id);
  if (!node) return;
  updateDetail(node);
  highlightRelationForNode(id);
  if (options.focus) focusNode(node);
  render();
}

function updateDetail(node) {
  els.detailCard.classList.remove("is-updating");
  void els.detailCard.offsetWidth;
  els.detailCard.classList.add("is-updating");
  els.detailDomain.textContent = `${node.layer} / ${node.status}`;
  els.detailTitle.textContent = node.label;
  els.detailSummary.textContent = node.summary;
  els.detailAuthority.textContent = node.authority;
  els.detailConsumes.textContent = node.consumes;
  els.detailExposes.textContent = node.exposes;
  els.detailProtocol.textContent = node.protocol;
  els.detailDocs.replaceChildren();
  (node.docs || []).forEach((doc) => {
    const link = document.createElement("a");
    link.href = docHref(doc);
    link.textContent = doc;
    els.detailDocs.appendChild(link);
  });
}

function docHref(doc) {
  if (doc.startsWith("reference/")) return `../../${doc.slice("reference/".length)}`;
  return `../../../${doc}`;
}

function showRelation(edge) {
  if (!edge) return;
  const source = nodeById(edge.source);
  const target = nodeById(edge.target);
  els.relationSummary.className = "relation-highlight";
  els.relationSummary.innerHTML = `<strong>${source.label} -> ${target.label}</strong><br>${edge.label}<br><br><strong>Protocol:</strong> ${edge.protocol}<br><strong>Ownership:</strong> ${edge.ownership}`;
}

function highlightRelationForNode(id) {
  const edge = state.data.edges.find((item) => item.source === id || item.target === id);
  if (edge) showRelation(edge);
}

function setViewBox(viewBox) {
  state.viewBox = { ...viewBox };
  els.svg.setAttribute("viewBox", `${state.viewBox.x} ${state.viewBox.y} ${state.viewBox.w} ${state.viewBox.h}`);
}

function focusNode(node) {
  const padding = 240;
  const ratio = state.initialViewBox.w / state.initialViewBox.h;
  let w = Math.max(600, node.w + padding * 2);
  let h = Math.max(360, node.h + padding * 1.35);
  if (w / h > ratio) h = w / ratio;
  else w = h * ratio;
  animateViewBox({
    x: node.x + node.w / 2 - w / 2,
    y: node.y + node.h / 2 - h / 2,
    w,
    h
  });
}

function focusMode(modeId, animated = true) {
  const mode = modeById(modeId);
  if (!mode) return;
  const edgeIds = new Set(mode.focusEdges || []);
  const nodeIds = new Set();
  state.data.edges.forEach((edge) => {
    if (edgeIds.has(edge.id) || edge.flow === modeId) {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }
  });
  const nodes = [...nodeIds].map(nodeById).filter(Boolean);
  if (!nodes.length) return;
  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.w));
  const maxY = Math.max(...nodes.map((node) => node.y + node.h));
  const target = paddedViewBox(minX, minY, maxX, maxY, 130);
  if (animated) animateViewBox(target, 620);
  else setViewBox(target);
}

function paddedViewBox(minX, minY, maxX, maxY, padding) {
  const ratio = state.initialViewBox.w / state.initialViewBox.h;
  let w = Math.max(680, maxX - minX + padding * 2);
  let h = Math.max(420, maxY - minY + padding * 2);
  if (w / h > ratio) h = w / ratio;
  else w = h * ratio;
  if (w > state.initialViewBox.w || h > state.initialViewBox.h) {
    w = state.initialViewBox.w;
    h = state.initialViewBox.h;
  }
  let x = minX + (maxX - minX) / 2 - w / 2;
  let y = minY + (maxY - minY) / 2 - h / 2;
  x = Math.max(0, Math.min(x, state.initialViewBox.w - w));
  y = Math.max(0, Math.min(y, state.initialViewBox.h - h));
  return { x, y, w, h };
}

function animateViewBox(target, duration = 520) {
  const start = { ...state.viewBox };
  const startTime = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function tick(now) {
    const p = Math.min(1, (now - startTime) / duration);
    const k = ease(p);
    setViewBox({
      x: start.x + (target.x - start.x) * k,
      y: start.y + (target.y - start.y) * k,
      w: start.w + (target.w - start.w) * k,
      h: start.h + (target.h - start.h) * k
    });
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function playScenario() {
  stopPlayback(false);
  const scenario = scenarioById(state.selectedScenarioId);
  if (!scenario) return;
  state.playing = true;
  els.play.textContent = "Stop";
  scenario.steps.forEach((nodeId, index) => {
    const timer = setTimeout(() => {
      state.activeScenarioStep = nodeId;
      selectNode(nodeId, { focus: true });
      const next = scenario.steps[index + 1];
      const edge = state.data.edges.find((item) => item.source === nodeId && item.target === next);
      if (edge) showRelation(edge);
      if (index === scenario.steps.length - 1) stopPlayback(false);
    }, index * 1150);
    state.timers.push(timer);
  });
}

function stopPlayback(clearStep = true) {
  state.timers.forEach((timer) => clearTimeout(timer));
  state.timers = [];
  state.playing = false;
  els.play.textContent = "Play E2E";
  if (clearStep) state.activeScenarioStep = null;
}

function reset() {
  stopPlayback();
  state.modeId = "executive";
  state.selectedNodeId = null;
  state.search = "";
  state.hiddenLayers.clear();
  state.compact = false;
  els.search.value = "";
  els.compact.setAttribute("aria-pressed", "false");
  updateIntroDetail();
  render();
  focusMode(state.modeId, false);
}

function updateIntroDetail() {
  els.detailDomain.textContent = "Atlas";
  els.detailTitle.textContent = "Evolith Governance Atlas";
  els.detailSummary.textContent = "Vista dinamica de producto y arquitectura: explora autoridad, interfaces, evidencia, agentes, satelites e integraciones.";
  els.detailAuthority.textContent = "Core define reglas; Tracker decide estado; proveedores aportan hechos.";
  els.detailConsumes.textContent = "Vision de producto, C4, flujos, hubs de producto y governance corpus.";
  els.detailExposes.textContent = "Narrativas dinamicas y rutas de exploracion.";
  els.detailProtocol.textContent = "CLI, REST, MCP, eventos, Git, policy evaluation.";
  els.detailDocs.replaceChildren();
}

function pointerToSvg(event) {
  const rect = els.svg.getBoundingClientRect();
  return {
    x: state.viewBox.x + ((event.clientX - rect.left) / rect.width) * state.viewBox.w,
    y: state.viewBox.y + ((event.clientY - rect.top) / rect.height) * state.viewBox.h
  };
}

function installInteractions() {
  els.search.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    render();
  });

  els.play.addEventListener("click", () => {
    if (state.playing) stopPlayback();
    else playScenario();
  });

  els.reset.addEventListener("click", reset);

  els.fit.addEventListener("click", () => {
    setViewBox(state.initialViewBox);
  });

  els.compact.addEventListener("click", () => {
    state.compact = !state.compact;
    els.compact.setAttribute("aria-pressed", String(state.compact));
    render();
  });

  els.svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const point = pointerToSvg(event);
    const factor = event.deltaY > 0 ? 1.12 : .88;
    const nextW = Math.max(500, Math.min(2200, state.viewBox.w * factor));
    const nextH = Math.max(294, Math.min(1290, state.viewBox.h * factor));
    setViewBox({
      x: point.x - ((point.x - state.viewBox.x) / state.viewBox.w) * nextW,
      y: point.y - ((point.y - state.viewBox.y) / state.viewBox.h) * nextH,
      w: nextW,
      h: nextH
    });
  }, { passive: false });

  els.svg.addEventListener("pointerdown", (event) => {
    state.pan = {
      x: event.clientX,
      y: event.clientY,
      viewBox: { ...state.viewBox }
    };
    els.svg.setPointerCapture(event.pointerId);
    els.svg.classList.add("is-panning");
  });

  els.svg.addEventListener("pointermove", (event) => {
    if (!state.pan) return;
    const rect = els.svg.getBoundingClientRect();
    const dx = ((event.clientX - state.pan.x) / rect.width) * state.pan.viewBox.w;
    const dy = ((event.clientY - state.pan.y) / rect.height) * state.pan.viewBox.h;
    setViewBox({
      ...state.viewBox,
      x: state.pan.viewBox.x - dx,
      y: state.pan.viewBox.y - dy
    });
  });

  els.svg.addEventListener("pointerup", (event) => {
    state.pan = null;
    els.svg.releasePointerCapture(event.pointerId);
    els.svg.classList.remove("is-panning");
  });

  els.svg.addEventListener("click", () => {
    state.selectedNodeId = null;
    render();
  });
}

async function loadData() {
  const response = await fetch("./architecture-map.json");
  if (!response.ok) throw new Error(`Unable to load architecture-map.json: ${response.status}`);
  return response.json();
}

async function init() {
  state.data = await loadData();
  setViewBox(state.initialViewBox);
  installInteractions();
  updateIntroDetail();
  render();
  selectNode("tracker", { focus: false });
  focusMode(state.modeId, false);
}

init().catch((error) => {
  document.body.innerHTML = `<main style="padding:24px;font-family:sans-serif"><h1>Evolith Governance Atlas</h1><p>${error.message}</p><p>Open this folder through a local static server so the JSON file can be loaded.</p></main>`;
});
