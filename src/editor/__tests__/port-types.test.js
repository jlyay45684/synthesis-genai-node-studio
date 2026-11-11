import { describe, it, expect, beforeEach, vi } from "vitest";
import { Editor } from "../Editor.js";
import { validateWorkflow, KIND, VERSION, getPortType, arePortsCompatible, PORT_TYPES } from "../validate.js";

function makeEditor() {
  document.body.innerHTML = `<div id="world"><svg id="svg"></svg><div id="nodes"></div></div>`;
  const world = document.getElementById("world");
  const nodes = document.getElementById("nodes");
  const svg = document.getElementById("svg");
  world.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
  return new Editor({ worldEl: world, nodesEl: nodes, svgEl: svg, onChange: () => {}, onSelect: () => {} });
}

describe("Port Type Compatibility", () => {
  it("getPortType 回傳正確型別", () => {
    expect(getPortType("checkpoint-loader", "model", "out")).toBe("MODEL");
    expect(getPortType("checkpoint-loader", "clip", "out")).toBe("CLIP");
    expect(getPortType("checkpoint-loader", "vae", "out")).toBe("VAE");
    expect(getPortType("positive-prompt", "clip", "in")).toBe("CLIP");
    expect(getPortType("positive-prompt", "cond", "out")).toBe("CONDITIONING");
    expect(getPortType("empty-latent", "latent", "out")).toBe("LATENT");
    expect(getPortType("ksampler", "latent", "out")).toBe("LATENT");
    expect(getPortType("vae-decode", "latent", "in")).toBe("LATENT");
    expect(getPortType("vae-decode", "vae", "in")).toBe("VAE");
    expect(getPortType("vae-decode", "image", "out")).toBe("IMAGE");
    expect(getPortType("output-preview", "image", "in")).toBe("IMAGE");
  });

  it("arePortsCompatible 嚴格要求相同型別", () => {
    PORT_TYPES.forEach((t) => expect(arePortsCompatible(t, t)).toBe(true));
    expect(arePortsCompatible("MODEL", "CLIP")).toBe(false);
    expect(arePortsCompatible("CONDITIONING", "LATENT")).toBe(false);
    expect(arePortsCompatible("LATENT", "IMAGE")).toBe(false);
    expect(arePortsCompatible("UNKNOWN", "MODEL")).toBe(false);
  });

  it("validateWorkflow 拒絕型別不相容", () => {
    const wf = {
      kind: KIND, version: VERSION,
      nodes: [
        { id: "n1", type: "checkpoint-loader", x: 0, y: 0, data: { ckpt: "flux1-dev.safetensors" } },
        { id: "n2", type: "positive-prompt", x: 100, y: 0, data: { text: "test" } },
      ],
      links: [{ id: "l1", fromNode: "n1", fromPort: "model", toNode: "n2", toPort: "clip" }],
      nextId: 3,
    };
    const r = validateWorkflow(wf);
    if (!r.ok) console.log("已拒絕:", r.error);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/型別不相容/);
  });

  it("validateWorkflow 接受相容型別", () => {
    const wf = {
      kind: KIND, version: VERSION,
      nodes: [
        { id: "n1", type: "checkpoint-loader", x: 0, y: 0, data: { ckpt: "flux1-dev.safetensors" } },
        { id: "n2", type: "lora-loader", x: 100, y: 0, data: { lora: "none", strength: 0.8 } },
      ],
      links: [
        { id: "l1", fromNode: "n1", fromPort: "model", toNode: "n2", toPort: "model" },
        { id: "l2", fromNode: "n1", fromPort: "clip", toNode: "n2", toPort: "clip" },
      ],
      nextId: 3,
    };
    expect(validateWorkflow(wf).ok).toBe(true);
  });
});

describe("Link ID Uniqueness", () => {
  it("拒絕重複連線 ID", () => {
    const wf = {
      kind: KIND, version: VERSION,
      nodes: [
        { id: "n1", type: "checkpoint-loader", x: 0, y: 0, data: { ckpt: "flux1-dev.safetensors" } },
        { id: "n2", type: "ksampler", x: 100, y: 0, data: { seed: 1, steps: 20, cfg: 5, sampler: "euler", scheduler: "normal", denoise: 1 } },
      ],
      links: [
        { id: "same", fromNode: "n1", fromPort: "model", toNode: "n2", toPort: "model" },
        { id: "same", fromNode: "n1", fromPort: "clip", toNode: "n2", toPort: "pos" },
      ],
      nextId: 3,
    };
    expect(validateWorkflow(wf).ok).toBe(false);
  });

  it("Editor 以唯一 data-id 渲染連線", () => {
    const ed = makeEditor();
    const a = ed.addNode("checkpoint-loader", 0, 0);
    const b = ed.addNode("ksampler", 200, 0);
    ed.links.push({ id: "l1", fromNode: a.id, fromPort: "model", toNode: b.id, toPort: "model" });
    ed.links.push({ id: "l2", fromNode: a.id, fromPort: "clip", toNode: b.id, toPort: "pos" });
    ed.renderLinks();
    const paths = ed.linksLayer.querySelectorAll("path.link");
    expect(paths.length).toBe(2);
    const ids = [...paths].map(p => p.getAttribute("data-id"));
    expect(new Set(ids).size).toBe(2);
  });
});
