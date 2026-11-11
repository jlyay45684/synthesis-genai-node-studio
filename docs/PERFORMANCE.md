# Performance Test Record

## Baseline
- Target consideration: low-end GPU/laptop and mobile-class devices; integrated GPUs.
- Validation environment (this run): Node v22.22.0, npm 10.9.4, Vite production build.

## Quality Presets (background particles)

| Preset | Particles | DPR cap | Target |
|---|---:|---:|---|
| High | 9,000 | 1.25 | Smooth on capable GPUs |
| Medium | 4,500 | 1.0 | Balanced default |
| Low | 1,800 | 0.75 | Low-end/mobile |

Auto mode samples FPS and downgrades/upgrades with cooldown.

## Build Validation
- `npm run build`: **PASS**
- Output (Vite 8.3.8): `dist/index.html` ~2.59 kB (gzip 1.00 kB), CSS ~5.58 kB (gzip 1.71 kB), JS ~681.42 kB (gzip 181.31 kB). Large chunk due to Three.js; acceptable for demo (no node 3D meshes).

## Design Measures
- [x] Three.js limited to background particles (BufferGeometry Points)
- [x] Nodes are DOM; links are SVG (single layer)
- [x] No per-link animation loop; GSAP tweens only during run
- [x] No per-frame allocations in background hot path
- [x] DPR/particle adaptation + manual quality selector + FPS monitor
- [x] Pauses rendering work when tab hidden (`visibilitychange`)
- [x] `prefers-reduced-motion` support
- [x] RWD layout (stacked on narrow screens)

## Runtime Observations
> Capture on target hardware/browsers:

| Device/Browser | Quality | Avg FPS | Notes |
|---|---|---:|---|
| Desktop (target) | Auto/High | _TBD_ |  |
| Low-end / integrated | Auto/Low | _TBD_ |  |
| Mobile | Low | _TBD_ |  |

## Simulation Compliance
- [x] Run/preview labeled **Simulation/Simulated** in UI and docs
- [x] No ComfyUI connection, no real model execution

## JSON Round-trip
- [x] Export/import implemented (schema `synthesis-workflow-sim`); presets load/exportable. Manual round-trip verification recommended in browser.

## Sign-off
- Build: PASS
- Manual interactive/FPS/device capture: _pending target-device run_
