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
  if (dir) toast(`自動品質 ${dir === "down" ? "↓" : "↑"} ${q}`);
};
bg.onError = (msg) => {
  toast(msg);
};
bg.init();

qualitySel.addEventListener("change", (e) => {
  const mode = e.target.value;
  bg.setMode(mode);
  toast(mode === "auto" ? "品質：自動 (起始為中)" : `品質：${mode}`);
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

// 平移/縮放
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

// 工具列動作
$("#btn-undo").addEventListener("click", () => {
  editor.undo();
  toast("已復原");
});
$("#btn-redo").addEventListener("click", () => {
  editor.redo();
  toast("已重做");
});
$("#btn-run").addEventListener("click", async () => {
  try {
    toast("正在執行工作流 (模擬)…");
    await editor.runSimulation((canvas) => {
      const box = $("#preview-box");
      box.innerHTML = "";
      box.appendChild(canvas);
      gsap.fromTo(canvas, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.4 });
    });
    toast("模擬完成 — 預覽已產生");
  } catch (e) {
    if (e && e.message === "CYCLE") toast("無法執行：偵測到工作流循環依賴");
    else toast("執行失敗 (模擬)");
  }
});
$("#preset-select").addEventListener("change", (e) => {
  const p = PRESETS[e.target.value];
  if (p) {
    editor.loadPreset(p);
    editor.setPan(40, 40);
    editor.setScale(0.9);
    toast(`已載入預設：${p.name}`);
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
    toast("工作流已匯入");
  } catch (err) {
    toast(`匯入被拒：${err?.message || "無效的工作流"}`);
  }
  e.target.value = "";
});
$("#btn-save").addEventListener("click", () => {
  localStorage.setItem("synthesis-workflow", editor.exportJSON());
  toast("工作流已儲存 (本地)");
});
$("#btn-load").addEventListener("click", () => {
  const s = localStorage.getItem("synthesis-workflow");
  if (!s) {
    toast("無儲存的工作流");
    return;
  }
  try {
    editor.importJSON(s);
    toast("工作流已載入");
  } catch (err) {
    toast(`載入失敗：${err?.message || "無效"}`);
  }
});

window.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  const tag = document.activeElement?.tagName;
  if (mod && e.key.toLowerCase() === "z") {
    e.preventDefault();
    editor.undo();
    toast("已復原");
  } else if (mod && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
    e.preventDefault();
    editor.redo();
    toast("已重做");
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

// 初始預設
editor.loadPreset(PRESETS.flux);
editor.setScale(0.85);
toast("SYNTHESIS 就緒 — 僅模擬，未連接 ComfyUI");
