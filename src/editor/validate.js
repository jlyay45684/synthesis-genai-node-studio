import { NODE_TYPES, PORT_TYPES } from "../presets/presets.js";

const KIND = "synthesis-workflow-sim";
const VERSION = 1;
const MAX_NODES = 100;
const MAX_LINKS = 300;
const MAX_ID_LEN = 64;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }
function finiteNum(v) { return typeof v === "number" && Number.isFinite(v); }
function clampNum(v, min, max, def) { const n = Number(v); if (!Number.isFinite(n)) return def; return Math.min(max, Math.max(min, n)); }

export function sanitizeData(type, data) {
  const def = NODE_TYPES[type];
  const out = {};
  if (!def) return out;
  def.fields.forEach(f => {
    let v = isObj(data) && Object.prototype.hasOwnProperty.call(data, f.k) ? data[f.k] : f.def;
    if (f.type === "select") {
      out[f.k] = f.options.includes(v) ? v : f.def;
    } else if (f.type === "number") {
      const min = f.min ?? -Infinity, max = f.max ?? Infinity;
      out[f.k] = clampNum(v, min, max, f.def);
    } else if (f.type === "textarea" || f.type === "text") {
      out[f.k] = typeof v === "string" ? v.slice(0, 4000) : String(f.def ?? "");
    } else {
      out[f.k] = (v == null) ? f.def : v;
    }
  });
  return out;
}

function getPortType(nodeType, portId, dir) {
  const def = NODE_TYPES[nodeType];
  if (!def) return null;
  const list = dir === "out" ? def.outputs : def.inputs;
  const p = list.find(x => x.id === portId);
  return p ? p.type : null;
}

function arePortsCompatible(fromType, toType) {
  if (!fromType || !toType) return false;
  if (!PORT_TYPES.includes(fromType) || !PORT_TYPES.includes(toType)) return false;
  return fromType === toType;
}

export function validateWorkflow(raw) {
  let data = raw;
  if (typeof raw === "string") {
    try { data = JSON.parse(raw); } catch { return { ok: false, error: "Invalid JSON" }; }
  }
  if (!isObj(data)) return { ok: false, error: "Workflow must be an object" };
  if (data.kind !== KIND) return { ok: false, error: "Invalid workflow kind" };
  if (data.version !== VERSION) return { ok: false, error: "Unsupported workflow version" };
  if (!Array.isArray(data.nodes)) return { ok: false, error: "nodes must be an array" };
  if (!Array.isArray(data.links)) return { ok: false, error: "links must be an array" };
  if (data.nodes.length > MAX_NODES) return { ok: false, error: `Too many nodes (max ${MAX_NODES})` };
  if (data.links.length > MAX_LINKS) return { ok: false, error: `Too many links (max ${MAX_LINKS})` };

  const ids = new Set();
  const nodeMap = new Map();
  const nodes = [];
  for (let i = 0; i < data.nodes.length; i++) {
    const n = data.nodes[i];
    if (!isObj(n)) return { ok: false, error: `Node ${i} invalid` };
    if (typeof n.id !== "string" || !ID_RE.test(n.id) || n.id.length > MAX_ID_LEN) return { ok: false, error: `Node ${i} has invalid id` };
    if (ids.has(n.id)) return { ok: false, error: `Duplicate node id: ${n.id}` };
    if (typeof n.type !== "string" || !NODE_TYPES[n.type]) return { ok: false, error: `Node ${n.id} has invalid type` };
    if (!finiteNum(n.x) || !finiteNum(n.y)) return { ok: false, error: `Node ${n.id} has invalid coordinates` };
    const x = clampNum(n.x, -2000, 12000, 0);
    const y = clampNum(n.y, -2000, 12000, 0);
    const clean = { id: n.id, type: n.type, x, y, data: sanitizeData(n.type, n.data) };
    ids.add(n.id); nodeMap.set(n.id, clean); nodes.push(clean);
  }

  const linkSeen = new Set();
  const linkIdSeen = new Set();
  const links = [];
  for (let i = 0; i < data.links.length; i++) {
    const l = data.links[i];
    if (!isObj(l)) return { ok: false, error: `Link ${i} invalid` };
    const { fromNode, fromPort, toNode, toPort } = l;
    if (!nodeMap.has(fromNode) || !nodeMap.has(toNode)) return { ok: false, error: `Link ${i} has invalid endpoints` };
    const fromType = getPortType(nodeMap.get(fromNode).type, fromPort, "out");
    const toType = getPortType(nodeMap.get(toNode).type, toPort, "in");
    if (!fromType) return { ok: false, error: `Link ${i} has invalid from port` };
    if (!toType) return { ok: false, error: `Link ${i} has invalid to port` };
    if (!arePortsCompatible(fromType, toType)) return { ok: false, error: `Link ${i} has incompatible port types (${fromType} -> ${toType})` };
    const key = `${toNode}::${toPort}`;
    if (linkSeen.has(key)) return { ok: false, error: `Duplicate input link: ${key}` };
    linkSeen.add(key);
    let id = (typeof l.id === "string" && ID_RE.test(l.id)) ? l.id : null;
    if (!id || linkIdSeen.has(id)) {
      if (id && linkIdSeen.has(id)) return { ok: false, error: `Duplicate link id: ${id}` };
      id = `l${i}`;
      while (linkIdSeen.has(id)) id = `l${i}_${linkIdSeen.size}`;
    }
    linkIdSeen.add(id);
    links.push({ id, fromNode, fromPort, toNode, toPort });
  }

  let nextId = 1;
  if (Number.isInteger(data.nextId) && data.nextId > 0 && data.nextId < 1000000) nextId = data.nextId;
  nodes.forEach(n => { const m = /^n(\d+)$/.exec(n.id); if (m) nextId = Math.max(nextId, Number(m[1]) + 1); });
  links.forEach(l => { const m = /^l(\d+)$/.exec(l.id); if (m) nextId = Math.max(nextId, Number(m[1]) + 1); });

  return { ok: true, value: { version: VERSION, kind: KIND, nodes, links, nextId } };
}

export { KIND, VERSION, MAX_NODES, MAX_LINKS, PORT_TYPES, getPortType, arePortsCompatible };
