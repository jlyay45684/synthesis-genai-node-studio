import { describe, it, expect } from 'vitest';
import { setupInspector } from '../ui.js';

function makeEnv() {
  document.body.innerHTML = `<div id="ins"></div><div id="node"><input data-k="text" value="hello"></div>`;
  const container = document.getElementById('ins');
  const nodeEl = document.getElementById('node');
  const committed = [];
  const editor = {
    commit: () => committed.push('c'),
    syncInspectorField: (id,k,v) => { const inp=nodeEl.querySelector(`[data-k="${k}"]`); if(inp) inp.value=v; }
  };
  const inspector = setupInspector(editor, container);
  const node = {
    id:'n1', type:'positive-prompt',
    def: { title:'Positive Prompt', fields:[{k:'text',label:'Prompt',type:'textarea',def:''}], inputs:[{id:'clip',label:'CLIP'}], outputs:[{id:'cond',label:'COND+'}] },
    data:{ text:'hello' }, el: nodeEl
  };
  return { inspector, container, node, committed, nodeEl };
}

describe('Inspector input behavior', () => {
  it('does not rebuild DOM on live input and preserves focus/caret', () => {
    const { inspector, container, node } = makeEnv();
    inspector.render(node, 'select');
    const ta = container.querySelector('textarea[data-ik="text"]');
    expect(ta).toBeTruthy();
    ta.focus();
    ta.value = 'hello world';
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    const ta2 = container.querySelector('textarea[data-ik="text"]');
    expect(ta2).toBe(ta); // same element, not rebuilt
    expect(document.activeElement).toBe(ta2);
    expect(ta2.selectionStart).toBe('hello world'.length);
    expect(node.data.text).toBe('hello world');
  });
  it('commits on change and syncs node body', () => {
    const { inspector, container, node, committed, nodeEl } = makeEnv();
    inspector.render(node, 'select');
    const ta = container.querySelector('textarea[data-ik="text"]');
    ta.value = 'updated';
    ta.dispatchEvent(new Event('change', { bubbles:true }));
    expect(node.data.text).toBe('updated');
    expect(committed.length).toBe(1);
    expect(nodeEl.querySelector('[data-k="text"]').value).toBe('updated');
  });
  it('updates values on undo/redo selection render without breaking focus', () => {
    const { inspector, container, node } = makeEnv();
    inspector.render(node, 'select');
    node.data.text = 'from-undo';
    inspector.render(node, 'commit');
    const ta = container.querySelector('textarea[data-ik="text"]');
    expect(ta.value).toBe('from-undo');
  });
});
