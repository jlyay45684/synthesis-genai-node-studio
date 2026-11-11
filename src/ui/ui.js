import { NODE_TYPES } from "../presets/presets.js";

export function setupInspector(editor, container) {
  let currentId = null;
  let inputs = new Map();

  function clear() {
    container.innerHTML = '<p class="muted">選取節點以編輯參數。 <br><b>僅模擬</b> — 未連接 ComfyUI / 無真實模型執行。</p>';
    inputs.clear();
    currentId = null;
  }

  function build(node) {
    const def = node.def;
    let html = `<div class="ins-field"><b style="color:var(--ink)">${def.title}</b><div class="muted">類型：${node.type}</div></div>`;
    def.fields.forEach((f) => {
      const v = node.data[f.k];
      const label = esc(f.label);
      if (f.type === "textarea")
        html += `<label class="ins-field">${label}<textarea data-ik="${f.k}" rows="4">${esc(v)}</textarea></label>`;
      else if (f.type === "select")
        html += `<label class="ins-field">${label}<select data-ik="${f.k}">${f.options.map((o) => `<option value="${esc(o)}" ${o == v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`;
      else html += `<label class="ins-field">${label}<input data-ik="${f.k}" type="${f.type || "text"}" value="${esc(v)}" ${f.min != null ? `min="${f.min}"` : ""} ${f.max != null ? `max="${f.max}"` : ""} ${f.step != null ? `step="${f.step}"` : ""}></label>`;
    });
    html += `<div class="muted" style="margin-top:6px">輸入埠：${def.inputs.map((p) => esc(p.label)).join(", ") || "—"} · 輸出埠：${def.outputs.map((p) => esc(p.label)).join(", ") || "—"}</div>`;
    container.innerHTML = html;
    inputs = new Map();
    container.querySelectorAll("[data-ik]").forEach((inp) => {
      const k = inp.dataset.ik;
      inputs.set(k, inp);
      const sync = (commit) => {
        node.data[k] = inp.type === "number" ? Number(inp.value) : inp.value;
        editor.syncInspectorField(node.id, k, inp.value);
        if (commit) editor.commit();
      };
      inp.addEventListener("input", () => sync(false));
      inp.addEventListener("change", () => sync(true));
    });
    currentId = node.id;
  }

  function updateValues(node) {
    if (!node || node.id !== currentId) return;
    inputs.forEach((inp, k) => {
      const v = node.data[k];
      const sv = v == null ? "" : String(v);
      if (document.activeElement === inp) return;
      if (inp.value !== sv) inp.value = sv;
    });
  }

  function render(node, reason) {
    if (!node) {
      clear();
      return;
    }
    if (reason === "live" && node.id === currentId) {
      updateValues(node);
      return;
    }
    if (reason === "commit" && node.id === currentId) {
      updateValues(node);
      return;
    }
    if (node.id !== currentId) build(node);
    else updateValues(node);
  }

  return { render };
}
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

export function setupAddMenu(editor, menuEl, anchorBtn, wrapEl) {
  menuEl.innerHTML = `<h4>新增節點</h4>` + Object.entries(NODE_TYPES).map(([k, v]) => `<button data-type="${k}">${v.title}</button>`).join("");
  const hide = () => menuEl.classList.add("hidden");
  anchorBtn.addEventListener("click", () => {
    const r = anchorBtn.getBoundingClientRect();
    menuEl.style.left = r.left + "px";
    menuEl.style.top = r.bottom + 6 + "px";
    menuEl.classList.toggle("hidden");
  });
  menuEl.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      const rect = wrapEl.getBoundingClientRect();
      const wx = (rect.width / 2 - editor.pan.x) / editor.scale;
      const wy = (rect.height / 2 - editor.pan.y) / editor.scale;
      editor.addNode(b.dataset.type, wx - 120, wy - 40);
      hide();
    })
  );
  document.addEventListener("pointerdown", (e) => {
    if (!menuEl.classList.contains("hidden") && !menuEl.contains(e.target) && e.target !== anchorBtn) hide();
  });
  return { hide };
}
