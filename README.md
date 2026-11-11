# SYNTHESIS — GenAI Node Studio (Simulation)

High-end GenAI visual workstation concept combining ComfyUI-style node editing, a low-density Three.js particle background, and a futuristic glass UI.

> **Simulation Notice:** Image generation and workflow execution are **explicitly simulated previews**. This project does **not** connect to ComfyUI and does **not** execute real AI models.

## Live Demo
- GitHub Pages (after merge to `main` with Pages source = GitHub Actions): https://jlyay45684.github.io/synthesis-genai-node-studio/

## v0.3 Quality Hardening (PR #1)
- **Undo/Redo (P1):** Refactored history with `beginOp/endOp`, `beginBatch/endBatch`; single undo step per user action; covers add/delete/move/param-edit; batch ops (presets) produce one history entry.
- **Node Port Type Safety (P1):** Explicit port types (MODEL, CLIP, VAE, CONDITIONING, LATENT, IMAGE) on all nodes; connection-time and import-time type checking; incompatible links rejected with clear error; presets validated.
- **Link ID Integrity (P1):** Unique link IDs enforced on import; duplicate IDs rejected; SVG rendering uses `createElementNS`/`setAttribute` for safe attribute binding.
- **WebGL Lifecycle (P1):** Dynamic Three.js import; `webglcontextlost`/`webglcontextrestored` handlers registered once; single RAF loop; CSS fallback background on failure; editor remains fully operable.
- **Performance (P2):** Auto starts at **Medium**; downgrade <45 FPS; upgrade >58 FPS only after stable window + cooldown (hysteresis); RAF pauses on `visibilitychange`; dynamic Three.js import reduces initial blocking.
- **Workflow Correctness (P2):** Execution via topological sort; cycle detection blocks run; invalid links rejected on import without corrupting existing workflow.

## Features
- DOM nodes + SVG Bézier connections (single SVG layer). Nodes: Checkpoint Loader, Positive Prompt, Negative Prompt, LoRA Loader, CLIP Text Encode, Empty Latent Image, KSampler, VAE Decode, Output Preview.
- Drag/add/delete, connect/rewire/replace input links, pan/zoom, selection & inspector, run animation with flow pulses, presets (FLUX/SDXL/SD 1.5), Seed/Steps/CFG, JSON import/export, local save/load, undo/redo.
- FPS monitor, quality selector (Auto/High/Medium/Low), `prefers-reduced-motion`, RWD, keyboard shortcuts.

## CI / Tests
- PR CI (`.github/workflows/ci.yml`, not Pages): `npm ci`, `npm run build`, `npm test` (Vitest + jsdom).
- Coverage: JSON validation/sanitization/limits/injection, import/export round-trip + atomic failure, inspector live-input behavior, SVG-safe link rendering, topo sort/cycles, port type compatibility, link ID uniqueness, undo/redo integration.

## Development
```bash
npm ci
npm run dev
```
## Build & Test
```bash
npm run build
npm test
```

## Notes
- FPS results are **not** marked PASS unless measured on the stated device (see `docs/PERFORMANCE.md`).
- Draft PR; do not merge.
