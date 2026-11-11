import { NODE_TYPES } from '../presets/presets.js';

export function setupInspector(editor, container, onParam) {
  function render(node) {
    if (!node) { container.innerHTML = '<p class="muted">Select a node to edit parameters. <br><b>Simulation only</b> — no ComfyUI/model execution.</p>'; return; }
    const def = node.def;
    let html = `<div class="ins-field"><b style="color:var(--ink)">${def.title}</b><div class="muted">Type: ${node.type}</div></div>`;
    def.fields.forEach(f => {
      const v = node.data[f.k];
      if (f.type === 'textarea') html += `<label class="ins-field">${f.label}<textarea data-ik="${f.k}" rows="4">${esc(v)}</textarea></label>`;
      else if (f.type === 'select') html += `<label class="ins-field">${f.label}<select data-ik="${f.k}">${f.options.map(o=>`<option value="${o}" ${o==v?'selected':''}>${o}</option>`).join('')}</select></label>`;
      else html += `<label class="ins-field">${f.label}<input data-ik="${f.k}" type="${f.type||'text'}" value="${esc(v)}" ${f.min!=null?`min="${f.min}"`:''} ${f.max!=null?`max="${f.max}"`:''} ${f.step!=null?`step="${f.step}"`:''}></label>`;
    });
    html += `<div class="muted" style="margin-top:6px">Ports in: ${def.inputs.map(p=>p.label).join(', ')||'—'} · out: ${def.outputs.map(p=>p.label).join(', ')||'—'}</div>`;
    container.innerHTML = html;
    container.querySelectorAll('[data-ik]').forEach(inp => {
      const sync = (commit) => {
        node.data[inp.dataset.ik] = inp.type==='number' ? Number(inp.value) : inp.value;
        // sync node body input
        const bodyInp = node.el.querySelector(`[data-k="${inp.dataset.ik}"]`);
        if (bodyInp && bodyInp !== inp) bodyInp.value = inp.value;
        if (commit) editor.commit(); else editor.onSelect?.(node,'live');
        onParam?.(node);
      };
      inp.addEventListener('change', ()=>sync(true));
      inp.addEventListener('input', ()=>sync(false));
    });
  }
  return { render };
}
function esc(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

export function setupAddMenu(editor, menuEl, anchorBtn, wrapEl) {
  menuEl.innerHTML = `<h4>ADD NODE</h4>` + Object.entries(NODE_TYPES).map(([k,v])=>`<button data-type="${k}">${v.title}</button>`).join('');
  const hide=()=>menuEl.classList.add('hidden');
  anchorBtn.addEventListener('click', (e)=>{
    const r = anchorBtn.getBoundingClientRect();
    menuEl.style.left = r.left+'px'; menuEl.style.top = (r.bottom+6)+'px';
    menuEl.classList.toggle('hidden');
  });
  menuEl.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    const rect = wrapEl.getBoundingClientRect();
    const wx = (rect.width/2 - editor.pan.x)/editor.scale;
    const wy = (rect.height/2 - editor.pan.y)/editor.scale;
    editor.addNode(b.dataset.type, wx-120, wy-40);
    hide();
  }));
  document.addEventListener('pointerdown', e=>{ if(!menuEl.classList.contains('hidden') && !menuEl.contains(e.target) && e.target!==anchorBtn) hide(); });
  return { hide };
}
