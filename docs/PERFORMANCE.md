# Performance Test Record (v0.2)

## Baseline
- Reference target: **GTX 1050 Ti 4GB** (and low-end/mobile). No FPS values marked PASS without measurement on target hardware.

## Quality Presets (background particles)
| Preset | Particles | DPR cap | Notes |
|---|---:|---:|---|
| High | 9,000 | 1.25 | Reached only via Auto after sustained >58 FPS |
| Medium | 4,500 | 1.0 | **Auto initial** |
| Low | 1,800 | 0.75 | Low-end/mobile fallback |

## Auto Quality Policy (P2)
- Start: **Medium**.
- Upgrade to High: only if FPS > 58 sustained over stable sample window and cooldown elapsed (hysteresis).
- Downgrade: if FPS < 45 (step down), with cooldown to avoid oscillation.
- Background RAF pauses when tab hidden; resumes on visibility.

## Build / Test Validation (this environment)
- `npm ci`: PASS (dependencies installed)
- `npm run build`: **PASS** (Vite 8.3.8). Output: `index.html` 3.56 kB gzip 1.37 kB, CSS 8.02 kB gzip 2.48 kB, app JS 105.07 kB gzip 38.86 kB, **Three.js chunk 742.88 kB gzip 187.81 kB** (dynamically imported; separate from initial app chunk; chunk warning expected).
- `npm test`: **PASS** — 3 files, 14 tests (validation/safety/round-trip/atomic import, inspector live input & history behavior, SVG-safe rendering, topo sort/cycles).

## Runtime / Device Observations
> **Not measured on GTX 1050 Ti 4GB in this run — do not mark FPS PASS.**

| Device/Browser | Quality | Avg FPS | Status |
|---|---|---:|---|
| GTX 1050 Ti 4GB (target) | Auto/Med/High | _TBD_ | **UNMEASURED** |
| Low-end / integrated | Auto/Low | _TBD_ | **UNMEASURED** |
| Mobile | Low | _TBD_ | **UNMEASURED** |

## Manual Verification Checklist
- [ ] Continuous text input in Inspector preserves cursor/caret (live, no DOM rebuild) — covered by automated test; manual confirm recommended.
- [ ] JSON export → import restores workflow (round-trip) — covered by automated test.
- [ ] WebGL unavailable/lost: editor remains operable with CSS fallback — logic implemented & handled; manual confirm recommended.
- [ ] Cycle detection blocks run with message — covered by automated test.

## Simulation Compliance
- [x] All execution/preview labeled Simulation; no ComfyUI, no real model.

## Sign-off
- Build: PASS
- Tests/CI logic: PASS locally
- Target-device FPS: **NOT MEASURED / NOT PASS**
