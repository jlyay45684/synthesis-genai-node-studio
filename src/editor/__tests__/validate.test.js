import { describe, it, expect, beforeEach } from 'vitest';
import { validateWorkflow } from '../validate.js';
import { KIND, VERSION } from '../validate.js';

function base() {
  return {
    kind: KIND, version: VERSION,
    nodes: [
      { id:'n1', type:'checkpoint-loader', x:0, y:0, data:{ckpt:'flux1-dev.safetensors'} },
      { id:'n2', type:'ksampler', x:10, y:10, data:{seed:1,steps:20,cfg:5,sampler:'euler',scheduler:'normal',denoise:1} },
    ],
    links: [{ id:'l1', fromNode:'n1', fromPort:'model', toNode:'n2', toPort:'model' }],
    nextId: 3
  };
}

describe('validateWorkflow', () => {
  it('accepts valid workflow and round-trips structure', () => {
    const r = validateWorkflow(JSON.stringify(base()));
    expect(r.ok).toBe(true);
    expect(r.value.nodes).toHaveLength(2);
    expect(r.value.links).toHaveLength(1);
  });
  it('rejects wrong kind/version', () => {
    expect(validateWorkflow({ ...base(), kind:'nope' }).ok).toBe(false);
    expect(validateWorkflow({ ...base(), version:999 }).ok).toBe(false);
  });
  it('rejects invalid/duplicate ids and types', () => {
    const b = base(); b.nodes[1].id='n1';
    expect(validateWorkflow(b).ok).toBe(false);
    const b2 = base(); b2.nodes[0].id='bad id!<>';
    expect(validateWorkflow(b2).ok).toBe(false);
    const b3 = base(); b3.nodes[0].type='unknown';
    expect(validateWorkflow(b3).ok).toBe(false);
  });
  it('rejects invalid link endpoints/ports and duplicate input', () => {
    const b = base(); b.links[0].toPort='nope';
    expect(validateWorkflow(b).ok).toBe(false);
    const b2 = base(); b2.links.push({id:'l2',fromNode:'n1',fromPort:'model',toNode:'n2',toPort:'model'});
    expect(validateWorkflow(b2).ok).toBe(false);
    const b3 = base(); b3.links[0].toNode='missing';
    expect(validateWorkflow(b3).ok).toBe(false);
  });
  it('enforces limits and sanitizes data', () => {
    const b = base(); b.nodes[1].data = { seed:'oops', steps:9999, cfg:1, sampler:'no', scheduler:'no', denoise:2, extra:'x' };
    const r = validateWorkflow(b);
    expect(r.ok).toBe(true);
    const ks = r.value.nodes.find(n=>n.id==='n2').data;
    expect(ks.seed).toBe(424242); // default fallback for NaN
    expect(ks.steps).toBe(150); // clamped max
    expect(ks.sampler).toBe('euler');
    expect(Object.prototype.hasOwnProperty.call(ks,'extra')).toBe(false);
  });
  it('rejects oversized node count', () => {
    const b = base();
    b.nodes = Array.from({length:101},(_,i)=>({id:`n${i}`,type:'output-preview',x:0,y:0,data:{note:'x'}}));
    b.links = [];
    expect(validateWorkflow(b).ok).toBe(false);
  });
  it('prevents SVG/HTML injection via ids by validation', () => {
    const b = base(); b.links[0].id = '"><script>alert(1)</script>';
    const r = validateWorkflow(b);
    expect(r.ok).toBe(true);
    expect(r.value.links[0].id).toMatch(/^l\d+$/); // sanitized fallback
  });
});
