import "./style.css";
import { Editor } from "./editor/Editor.js";
import { PRESETS } from "./presets/presets.js";
import { setupInspector, setupAddMenu } from "./ui/ui.js";
import { ParticleBackground } from "./background/particles.js";
import gsap from "gsap";

const $ = (s) => document.querySelector(s);
const toastEl = $("#toast");
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

const fpsEl = $("#fps");
const qualitySel = $("#quality");
const bg = new ParticleBackground($("#bg-canvas"));
bg.onFps = (fps) => {
  fpsEl.textContent = `${fps.toFixed(0)} FPS`;
};
bg.onQuality = (q, mode, dir) => {
  if (dir) toast(`Auto quality ${dir === "down" ? "↓" : "↑"} ${q}`);
};
bg.onError = (msg) => {
  toast(msg);
};
bg.init();

qualitySel.addEventListener("change", (e) => {
  const mode = e.target.value;
  bg.setMode(mode);
  toast(mode === "auto" ? "Quality: Auto (starts Medium)" : `Quality: ${mode}`);
});

const wrap = $("#canvas-wrap");
let inspector;
const editor = new Editor({
  worldEl: $("#world"),
  nodesEl: $("#nodes"),
  svgEl: $("#connections"),
  onChange: () => {},
  onSelect: (n, reason) => {
    if (inspector) inspector.render(n, reason);
  },
});
inspector = setupInspector(editor, $("#inspector-body"));
setupAddMenu(editor, $("#add-menu"), $("#btn-add"), wrap);

// pan/zoom
let panning = false,
  panStart = null,
  space = false;
wrap.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1.1 : 0.9;
    const r = wrap.getBoundingClientRect();
    editor.setScale(editor.scale * dir, e.clientX - r.left, e.clientY - r.top);
  },
  { passive: false }
);
wrap.addEventListener("pointerdown", (e) => {
  if (
    e.button === 1 ||
    (e.button === 0 &&
      (space ||
        e.target === wrap ||
        e.target.id === "world" ||
        e.target.id === "nodes" ||
        e.target.id === "connections"))
  ) {
    if (e.target.closest(".node")) return;
    panning = true;
    panStart = { x: e.clientX, y: e.clientY, px: editor.pan.x, py: editor.pan.y };
    wrap.classList.add("panning");
    wrap.setPointerCapture(e.pointerId);
  } else if (!e.target.closest(".node")) {
    editor.select(null);
  }
});
wrap.addEventListener("pointermove", (e) => {
  if (!panning) return;
  editor.setPan(panStart.px + e.clientX - panStart.x, panStart.py + e.clientY - panStart.y);
  editor.renderLinks();
});
wrap.addEventListener("pointerup", () => {
  panning = false;
  wrap.classList.remove("panning");
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") space = true;
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") space = false;
});

// toolbar actions
$("#btn-undo").addEventListener("click", () => {
  editor.undo();
  toast("Undo");
});
$("#btn-redo").addEventListener("click", () => {
  editor.redo();
  toast("Redo");
});
$("#btn-run").addEventListener("click", async () => {
  try {
    toast("Running workflow (Simulation)…");
    await editor.runSimulation((canvas) => {
      const box = $("#preview-box");
      box.innerHTML = "";
      box.appendChild(canvas);
      gsap.fromTo(canvas, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.4 });
    });
    toast("Simulation complete — preview generated");
  } catch (e) {
    if (e && e.message === "CYCLE") toast("Cannot run: cycle detected in workflow");
    else toast("Run failed (simulation)");
  }
});
$("#preset-select").addEventListener("change", (e) => {
  const p = PRESETS[e.target.value];
  if (p) {
    editor.loadPreset(p);
    editor.setPan(40, 40);
    editor.setScale(0.9);
    toast(`Preset loaded: ${p.name}`);
  }
  e.target.value = "";
});
$("#btn-export").addEventListener("click", () => download("workflow.json", editor.exportJSON()));
$("#btn-import").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    editor.importJSON(await f.text());
    toast("Workflow imported");
  } catch (err) {
    toast(`Import rejected: ${err?.message || "invalid workflow"}`);
  }
  e.target.value = "";
});
$("#btn-save").addEventListener("click", () => {
  localStorage.setItem("synthesis-workflow", editor.exportJSON());
  toast("Workflow saved (local)");
});
$("#btn-load").addEventListener("click", () => {
  const s = localStorage.getItem("synthesis-workflow");
  if (!s) {
    toast("No saved workflow");
    return;
  }
  try {
    editor.importJSON(s);
    toast("Workflow loaded");
  } catch (err) {
    toast(`Load failed: ${err?.message || "invalid"}`);
  }
});

window.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  const tag = document.activeElement?.tagName;
  if (mod && e.key.toLowerCase() === "z") {
    e.preventDefault();
    editor.undo();
    toast("Undo");
  } else if (mod && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
    e.preventDefault();
    editor.redo();
    toast("Redo");
  } else if (mod && e.key.toLowerCase() === "s") {
    e.preventDefault();
    $("#btn-save").click();
  } else if (mod && e.key.toLowerCase() === "e") {
    e.preventDefault();
    $("#btn-export").click();
  } else if (mod && e.key === "Enter") {
    e.preventDefault();
    $("#btn-run").click();
  } else if ((e.key === "Delete" || e.key === "Backspace") && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
    editor.deleteSelected();
  }
});

function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// initial preset
editor.loadPreset(PRESETS.flux);
editor.setScale(0.85);
toast("SYNTHESIS ready — Simulation only, no ComfyUI");
