import { describe, it, expect, beforeEach, vi } from "vitest";
import { Editor } from "../Editor.js";
import { validateWorkflow, KIND, VERSION } from "../validate.js";
import { PRESETS } from "../../presets/presets.js";

function makeEditor() {
  document.body.innerHTML = `<div id="world"><svg id="svg"></svg><div id="nodes"></div></div>`;
  const world = document.getElementById("world");
  const nodes = document.getElementById("nodes");
  const svg = document.getElementById("svg");
  world.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
  return new Editor({ worldEl: world, nodesEl: nodes, svgEl: svg, onChange: () => {}, onSelect: () => {} });
}

describe("Editor import/export & safety", () => {
  it("exports valid workflow and round-trips (atomic)", () => {
    const ed = makeEditor();
    ed.loadPreset(PRESETS.flux);
    const json = ed.exportJSON();
    const v = validateWorkflow(json);
    expect(v.ok).toBe(true);
    expect(v.value.nodes).toHaveLength(7);
    expect(v.value.links).toHaveLength(9);
    const before = JSON.stringify({n: v.value.nodes.length, l: v.value.links.length});
    const ed2 = makeEditor();
    ed2.importJSON(json);
    const json2 = ed2.exportJSON();
    const v2 = validateWorkflow(json2);
    expect(v2.ok).toBe(true);
    expect(JSON.stringify({n:v2.value.nodes.length,l:v2.value.links.length})).toBe(before);
  });
  it("import is atomic: invalid input does not replace existing", () => {
    const ed = makeEditor();
    ed.loadPreset(PRESETS.flux);
    const snap = ed.snapshot();
    expect(() => ed.importJSON('{"kind":"bad"}')).toThrow();
    expect(ed.snapshot()).toBe(snap);
    expect(() => ed.importJSON('not json')).toThrow();
    expect(ed.snapshot()).toBe(snap);
  });
  it("renderLinks uses safe DOM (no untrusted id injection)", () => {
    const ed = makeEditor();
    ed.loadPreset(PRESETS.flux);
    ed.links[0].id = 'x" onload="alert(1)';
    ed.renderLinks();
    const path = ed.linksLayer.querySelector("path.link");
    expect(path).toBeTruthy();
    expect(path.getAttribute("data-id")).toBe('x" onload="alert(1)');
    expect(path.getAttribute("onload")).toBeNull();
    expect(ed.linksLayer.innerHTML).not.toContain("onload=\"alert");
  });
  it("topological sort detects cycles and orders dependencies", () => {
    const ed = makeEditor();
    const a = ed.addNode("checkpoint-loader", 0, 0, null, true);
    const b = ed.addNode("positive-prompt", 100, 0, null, true);
    ed.links.push({ id: "l1", fromNode: a.id, fromPort: "clip", toNode: b.id, toPort: "clip" });
    const res = ed.topologicalOrder();
    expect(res.cycle).toBe(false);
    const ids = res.order.map(n => n.id);
    expect(ids.indexOf(a.id)).toBeLessThan(ids.indexOf(b.id));
    ed.links.push({ id: "l2", fromNode: b.id, fromPort: "cond", toNode: a.id, toPort: "model" });
    expect(ed.topologicalOrder().cycle).toBe(true);
  });
});

describe("Preset validation via editor export", () => {
  it("FLUX/SDXL/SD15 presets export valid workflows", () => {
    const ed = makeEditor();
    Object.values(PRESETS).forEach(p => {
      ed.loadPreset(p);
      const json = ed.exportJSON();
      const v = validateWorkflow(json);
      if (!v.ok) console.error("Preset failed:", p.name, v.error);
      expect(v.ok).toBe(true);
    });
  });
});
