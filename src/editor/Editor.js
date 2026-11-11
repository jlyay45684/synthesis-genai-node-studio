import { NODE_TYPES } from "../presets/presets.js";
import gsap from "gsap";
import { validateWorkflow, sanitizeData, getPortType, arePortsCompatible, KIND, VERSION } from "./validate.js";

let nextId = 1;
const uid = () => "n" + nextId++;
const SVGNS = "http://www.w3.org/2000/svg";

export class Editor {
  constructor({ worldEl, nodesEl, svgEl, onChange, onSelect }) {
    this.worldEl = worldEl; this.nodesEl = nodesEl; this.svgEl = svgEl;
    this.onChange = onChange; this.onSelect = onSelect;
    this.nodes = new Map();
    this.links = [];
    this.pan = { x: 40, y: 40 }; this.scale = 1;
    this.selected = null;
    this.pending = null;
    this.drag = null;
    this.history = []; this.future = []; this.suspend = 0;
    this._onPendMove = null; this._onPendUp = null;
    this._savedSnapshot = null;
    this.setupSvg();
    this.updateTransform();
  }

  setupSvg() {
    this.svgEl.replaceChildren();
    const defs = document.createElementNS(SVGNS, "defs");
    const grad = document.createElementNS(SVGNS, "linearGradient");
    grad.setAttribute("id", "grad-link"); grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%"); grad.setAttribute("x2", "100%"); grad.setAttribute("y2", "0%");
    [["0%", "#5de2ff"], ["50%", "#a78bff"], ["100%", "#ff6bd6"]].forEach(([o, c]) => { const s = document.createElementNS(SVGNS, "stop"); s.setAttribute("offset", o); s.setAttribute("stop-color", c); grad.appendChild(s); });
    defs.appendChild(grad);
    this.linksLayer = document.createElementNS(SVGNS, "g"); this.linksLayer.setAttribute("id", "links-layer");
    this.pendingPath = document.createElementNS(SVGNS, "path"); this.pendingPath.setAttribute("id", "pending-path"); this.pendingPath.setAttribute("class", "pending"); this.pendingPath.setAttribute("d", "");
    this.flowLayer = document.createElementNS(SVGNS, "g"); this.flowLayer.setAttribute("id", "flow-layer");
    this.svgEl.append(defs, this.linksLayer, this.pendingPath, this.flowLayer);
  }

  snapshot() { return this._makeSnapshot(); }
  _makeSnapshot() {
    return JSON.stringify({
      nodes: [...this.nodes.values()].map(n => ({ id: n.id, type: n.type, x: n.x, y: n.y, data: { ...n.data } })),
      links: this.links.map(l => ({ ...l })),
      nextId,
    });
  }
  _restoreFromSnapshot(snap) {
    const data = JSON.parse(snap);
    this.nodesEl.innerHTML = ""; this.nodes.clear(); this.links = []; this.selected = null;
    nextId = data.nextId || 1;
    data.nodes.forEach(n => this._createNode(n.type, n.x, n.y, n.data, n.id));
    this.links = (data.links || []).map(l => ({ ...l }));
    this.renderLinks();
    this.onSelect?.(null);
    this.onChange?.();
  }

  commit() { if (this.suspend) return; if (!this._savedSnapshot) return; const newSnap = this._makeSnapshot(); if (newSnap !== this._savedSnapshot) { this.history.push(this._savedSnapshot); if (this.history.length > 100) this.history.shift(); this.future = []; this.onChange?.(); } this._savedSnapshot = null; }
  beginOp() { if (this.suspend) return; if (!this._savedSnapshot) this._savedSnapshot = this._makeSnapshot(); }
  endOp(changed = true) { if (this.suspend) return; if (!changed || !this._savedSnapshot) { this._savedSnapshot = null; return; } const newSnap = this._makeSnapshot(); if (newSnap !== this._savedSnapshot) { this.history.push(this._savedSnapshot); if (this.history.length > 100) this.history.shift(); this.future = []; this.onChange?.(); } this._savedSnapshot = null; }
  beginBatch() { this.suspend++; if (this.suspend === 1) this._savedSnapshot = this._makeSnapshot(); }
  endBatch(commitNow = true) { this.suspend = Math.max(0, this.suspend - 1); if (this.suspend === 0 && commitNow) { const newSnap = this._makeSnapshot(); if (newSnap !== this._savedSnapshot) { this.history.push(this._savedSnapshot); if (this.history.length > 100) this.history.shift(); this.future = []; this.onChange?.(); } this._savedSnapshot = null; } }
  undo() { if (!this.history.length) return; this.future.push(this._makeSnapshot()); this._restoreFromSnapshot(this.history.pop()); this.onChange?.(); }
  redo() { if (!this.future.length) return; this.history.push(this._makeSnapshot()); this._restoreFromSnapshot(this.future.pop()); this.onChange?.(); }

  addNode(type, x = 120, y = 120, dataOverride, silent = false) {
    const def = NODE_TYPES[type]; if (!def) return null;
    const data = sanitizeData(type, dataOverride || {});
    const node = this._createNode(type, x, y, data);
    if (!silent) this.commit();
    return node;
  }
  _createNode(type, x, y, data, id) {
    const def = NODE_TYPES[type]; const nid = id || uid();
    const el = document.createElement("div");
    el.className = "node"; el.dataset.id = nid; el.style.left = x + "px"; el.style.top = y + "px";
    el.innerHTML = `
      <div class="node-head"><span><span class="ntype">${def.cat.toUpperCase()}</span><br>${this._esc(def.title)}</span><button class="del" title="刪除節點">×</button></div>
      <div class="ports">
        <div class="ports-col in">${def.inputs.map(p => `<div class="port in" data-port="${p.id}" data-dir="in"><span class="port-dot in"></span><span>${this._esc(p.label)}</span></div>`).join("")}</div>
        <div class="ports-col out">${def.outputs.map(p => `<div class="port out" data-port="${p.id}" data-dir="out"><span>${this._esc(p.label)}</span><span class="port-dot out"></span></div>`).join("")}</div>
      </div>
      <div class="node-body">${this._fieldsHtml(def, data)}</div>`;
    this.nodesEl.appendChild(el);
    const node = { id: nid, type, x, y, data: { ...sanitizeData(type, data) }, el, def };
    this.nodes.set(nid, node);
    this.bindNode(node);
    return node;
  }
  _fieldsHtml(def, data) {
    return def.fields.map(f => {
      const v = data[f.k] ?? f.def;
      if (f.type === "textarea") return `<label>${this._esc(f.label)}<textarea data-k="${f.k}">${this._esc(v)}</textarea></label>`;
      if (f.type === "select") return `<label>${this._esc(f.label)}<select data-k="${f.k}">${f.options.map(o => `<option value="${this._esc(o)}" ${o == v ? "selected" : ""}>${this._esc(o)}</option>`).join("")}</select></label>`;
      return `<label>${this._esc(f.label)}<input data-k="${f.k}" type="${f.type || "text"}" value="${this._esc(v)}" ${f.min != null ? `min="${f.min}"` : ""} ${f.max != null ? `max="${f.max}"` : ""} ${f.step != null ? `step="${f.step}"` : ""}></label>`;
    }).join("");
  }
  _esc(s) { return String(s ?? "").replace(/&/g, "\u0026amp;").replace(/</g, "\u0026lt;").replace(/>/g, "\u0026gt;").replace(/"/g, "\u0026quot;"); }

  bindNode(node) {
    const head = node.el.querySelector(".node-head");
    head.addEventListener("pointerdown", e => {
      if (e.target.closest(".del")) return;
      this.select(node.id);
      this.drag = { id: node.id, ox: e.clientX, oy: e.clientY, sx: node.x, sy: node.y, moved: false };
      head.setPointerCapture?.(e.pointerId);
    });
    head.addEventListener("pointermove", e => {
      if (!this.drag || this.drag.id !== node.id) return;
      const dx = (e.clientX - this.drag.ox) / this.scale;
      const dy = (e.clientY - this.drag.oy) / this.scale;
      node.x = this.drag.sx + dx; node.y = this.drag.sy + dy;
      node.el.style.left = node.x + "px"; node.el.style.top = node.y + "px";
      this.drag.moved = true; this.renderLinks();
    });
    head.addEventListener("pointerup", () => { if (this.drag && this.drag.id === node.id) { if (this.drag.moved) this.commit(); this.drag = null; } });
    node.el.querySelector(".del").addEventListener("click", e => { e.stopPropagation(); this.removeNode(node.id); });
    node.el.addEventListener("pointerdown", e => { if (!e.target.closest(".port-dot")) this.select(node.id); });
    node.el.querySelectorAll(".port-dot").forEach(dot => {
      dot.addEventListener("pointerdown", e => {
        e.stopPropagation(); e.preventDefault();
        const port = e.target.closest(".port");
        const dir = port.dataset.dir, pid = port.dataset.port;
        if (dir === "out") { this.pending = { fromNode: node.id, fromPort: pid }; this._startPending(); }
        else { const idx = this.links.findIndex(l => l.toNode === node.id && l.toPort === pid); if (idx >= 0) { const l = this.links[idx]; this.links.splice(idx, 1); this.pending = { fromNode: l.fromNode, fromPort: l.fromPort }; this.commit(); this.renderLinks(); this._startPending(); } }
      });
    });
    node.el.querySelectorAll("[data-k]").forEach(inp => {
      inp.addEventListener("change", () => { this._applyField(node, inp, true); });
      inp.addEventListener("input", () => { this._applyField(node, inp, false); });
    });
  }
  _applyField(node, inp, commitNow) {
    const k = inp.dataset.k;
    node.data[k] = inp.type === "number" ? Number(inp.value) : inp.value;
    if (this.selected === node.id) this.onSelect?.(node, commitNow ? "commit" : "live");
    if (commitNow) this.commit();
  }
  syncInspectorField(nodeId, key, value) { const node = this.nodes.get(nodeId); if (!node) return; const inp = node.el.querySelector(`[data-k="${key}"]`); if (inp && inp.value !== String(value)) inp.value = value; }

  _startPending() {
    this._onPendMove = ev => this.updatePending(ev.clientX, ev.clientY);
    this._onPendUp = ev => this.finishPending(ev);
    window.addEventListener("pointermove", this._onPendMove);
    window.addEventListener("pointerup", this._onPendUp);
  }
  portPos(nodeId, portId, dir) {
    const node = this.nodes.get(nodeId); if (!node) return { x: 0, y: 0 };
    const dot = node.el.querySelector(`.port.${dir}[data-port="${portId}"] .port-dot`); if (!dot) return { x: node.x, y: node.y };
    const r = dot.getBoundingClientRect(); const wr = this.worldEl.getBoundingClientRect();
    if (!wr.width || !wr.height) return { x: node.x, y: node.y };
    return { x: (r.left + r.width / 2 - wr.left) / this.scale, y: (r.top + r.height / 2 - wr.top) / this.scale };
  }
  updatePending(cx, cy) {
    if (!this.pending) return;
    const wr = this.worldEl.getBoundingClientRect();
    const x = (cx - wr.left) / this.scale, y = (cy - wr.top) / this.scale;
    const p1 = this.portPos(this.pending.fromNode, this.pending.fromPort, "out");
    this.pendingPath.setAttribute("d", this.curve(p1, { x, y }));
  }
  finishPending(ev) {
    if (this._onPendMove) window.removeEventListener("pointermove", this._onPendMove);
    if (this._onPendUp) window.removeEventListener("pointerup", this._onPendUp);
    const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".port.in");
    if (target && this.pending) {
      const nodeEl = target.closest(".node"); const toNode = nodeEl?.dataset.id; const toPort = target.dataset.port;
      if (toNode && this.nodes.has(toNode) && this.nodes.has(this.pending.fromNode)) {
        const toDef = this.nodes.get(toNode).def;
        if (toDef.inputs.some(p => p.id === toPort)) {
          const fromType = getPortType(this.nodes.get(this.pending.fromNode).type, this.pending.fromPort, "out");
          const toType = getPortType(toDef.type, toPort, "in");
          if (arePortsCompatible(fromType, toType)) {
            this.links = this.links.filter(l => !(l.toNode === toNode && l.toPort === toPort));
            this.links.push({ fromNode: this.pending.fromNode, fromPort: this.pending.fromPort, toNode, toPort, id: "l" + Math.random().toString(36).slice(2, 8) });
            this.commit();
          }
        }
      }
    }
    this.pending = null; this.pendingPath.setAttribute("d", ""); this.renderLinks();
  }

  curve(a, b) { const dx = Math.max(60, Math.abs(b.x - a.x) * 0.5); return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`; }
  renderLinks() {
    while (this.linksLayer.firstChild) this.linksLayer.removeChild(this.linksLayer.firstChild);
    for (const l of this.links) {
      if (!this.nodes.has(l.fromNode) || !this.nodes.has(l.toNode)) continue;
      const a = this.portPos(l.fromNode, l.fromPort, "out"), b = this.portPos(l.toNode, l.toPort, "in");
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("class", "link");
      p.setAttribute("data-id", String(l.id));
      p.setAttribute("d", this.curve(a, b));
      this.linksLayer.appendChild(p);
    }
  }

  select(id) {
    if (this.selected && this.nodes.get(this.selected)) this.nodes.get(this.selected).el.classList.remove("selected");
    this.selected = id;
    if (id && this.nodes.get(id)) { this.nodes.get(id).el.classList.add("selected"); this.onSelect?.(this.nodes.get(id), "select"); }
    else this.onSelect?.(null, "select");
  }
  removeNode(id) {
    if (!this.nodes.has(id)) return;
    this.links = this.links.filter(l => l.fromNode !== id && l.toNode !== id);
    this.nodes.get(id).el.remove(); this.nodes.delete(id);
    if (this.selected === id) this.selected = null;
    this.renderLinks(); this.commit(); this.onSelect?.(null, "select");
  }
  deleteSelected() { if (this.selected) this.removeNode(this.selected); }

  updateTransform() { this.worldEl.style.transform = `translate(${this.pan.x}px,${this.pan.y}px) scale(${this.scale})`; }
  setPan(x, y) { this.pan.x = x; this.pan.y = y; this.updateTransform(); }
  setScale(s, cx, cy) { const ns = Math.min(2.2, Math.max(0.25, s)); if (cx != null) { const wx = (cx - this.pan.x) / this.scale; const wy = (cy - this.pan.y) / this.scale; this.pan.x = cx - wx * ns; this.pan.y = cy - wy * ns; } this.scale = ns; this.updateTransform(); }

  clear() { this.nodesEl.innerHTML = ""; this.nodes.clear(); this.links = []; this.selected = null; nextId = 1; this.renderLinks(); this.commit(); this.onSelect?.(null, "select"); }
  loadPreset(preset) {
    this.beginBatch();
    this.nodesEl.innerHTML = ""; this.nodes.clear(); this.links = []; this.selected = null; nextId = 1;
    const ids = [];
    preset.nodes.forEach(n => { const node = this.addNode(n.type, n.x, n.y, n.data, true); ids.push(node.id); });
    preset.links.forEach(([a, ap, b, bp]) => { if (ids[a] && ids[b]) this.links.push({ fromNode: ids[a], fromPort: ap, toNode: ids[b], toPort: bp, id: "l" + Math.random().toString(36).slice(2, 8) }); });
    this.renderLinks();
    this.endBatch(false);
    this.history = []; this.future = []; this.commit();
    this.onSelect?.(null, "select");
  }

  exportJSON() { return JSON.stringify({ version: VERSION, kind: KIND, exportedAt: new Date().toISOString(), ...JSON.parse(this.snapshot()) }, null, 2); }
  importJSON(text) {
    const res = validateWorkflow(text);
    if (!res.ok) throw new Error(res.error || "無效的工作流");
    const snap = JSON.stringify({ nodes: res.value.nodes, links: res.value.links, nextId: res.value.nextId });
    this._restoreFromSnapshot(snap);
    this.history = []; this.future = []; this.commit();
    return res.value;
  }

  topologicalOrder() {
    const ids = [...this.nodes.keys()];
    const indeg = new Map(ids.map(id => [id, 0]));
    const adj = new Map(ids.map(id => [id, []]));
    for (const l of this.links) {
      if (!indeg.has(l.fromNode) || !indeg.has(l.toNode)) continue;
      indeg.set(l.toNode, indeg.get(l.toNode) + 1);
      adj.get(l.fromNode).push(l.toNode);
    }
    const q = ids.filter(id => indeg.get(id) === 0);
    q.sort();
    const out = [];
    while (q.length) {
      const id = q.shift();
      out.push(id);
      for (const nb of adj.get(id) || []) {
        indeg.set(nb, indeg.get(nb) - 1);
        if (indeg.get(nb) === 0) q.push(nb);
      }
    }
    if (out.length !== ids.length) return { order: null, cycle: true };
    return { order: out.map(id => this.nodes.get(id)).filter(Boolean), cycle: false };
  }

  async runSimulation(onPreview) {
    const { order, cycle } = this.topologicalOrder();
    if (cycle) throw new Error("CYCLE");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.nodes.forEach(n => n.el.classList.remove("running", "done"));
    for (const n of order) {
      n.el.classList.add("running");
      await this.pulseLinksFrom(n.id);
      await new Promise(r => setTimeout(r, reduced ? 60 : 220));
      n.el.classList.remove("running"); n.el.classList.add("done");
    }
    if (onPreview) onPreview(this.makePreview());
  }
  async pulseLinksFrom(nodeId) {
    const outs = this.links.filter(l => l.fromNode === nodeId);
    if (!outs.length) return;
    await Promise.all(outs.map(l => this.animateFlow(l)));
  }
  animateFlow(l) {
    return new Promise(res => {
      const path = this.linksLayer.querySelector(`[data-id="${CSS.escape(String(l.id))}"]`);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!path || reduced) { res(); return; }
      const dot = document.createElementNS(SVGNS, "circle");
      dot.setAttribute("r", "4"); dot.setAttribute("class", "flow-dot"); this.flowLayer.appendChild(dot);
      const len = path.getTotalLength ? path.getTotalLength() : 0; const obj = { t: 0 };
      gsap.to(obj, { t: 1, duration: 0.4, ease: "power1.inOut", onUpdate: () => {
        if (!path.getPointAtLength) return;
        const p = path.getPointAtLength(obj.t * len); dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y);
      }, onComplete: () => { dot.remove(); res(); }});
    });
  }
  makePreview() {
    const seedNode = [...this.nodes.values()].find(n => n.type === "ksampler");
    const seed = seedNode?.data?.seed ?? 1;
    const w = 320, h = 200; const c = document.createElement("canvas"); c.width = w; c.height = h; const ctx = c.getContext("2d");
    let x = Math.abs(Number(seed)) % 9973 + 1; const rnd = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#07101d"); g.addColorStop(0.5, `hsl(${180 + rnd() * 80},70%,${25 + rnd() * 20}%)`); g.addColorStop(1, "#140a24"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = `hsla(${170 + rnd() * 140},90%,65%,${0.06 + rnd() * 0.18})`; ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, 8 + rnd() * 55, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(234,244,255,0.88)"; ctx.font = "bold 14px system-ui"; ctx.fillText("模擬預覽", 14, 24);
    ctx.font = "11px system-ui"; ctx.fillStyle = "rgba(234,244,255,0.72)";
    ctx.fillText(`種子 ${seedNode?.data?.seed ?? "-"} · 步數 ${seedNode?.data?.steps ?? "-"} · CFG ${seedNode?.data?.cfg ?? "-"}`, 14, 44);
    ctx.fillText("未連接 ComfyUI / 無真實模型執行", 14, h - 14);
    return c;
  }
}
