# SYNTHESIS — GenAI Node Studio (Simulation)

High-end GenAI visual workstation concept combining ComfyUI-style node editing, a low-density Three.js particle background, and a futuristic glass UI.

> **Simulation Notice:** Image generation and workflow execution are **explicitly simulated previews**. This project does **not** connect to ComfyUI and does **not** execute real AI models.

## Live Demo
- GitHub Pages (after merge to `main` with Pages source = GitHub Actions): https://jlyay45684.github.io/synthesis-genai-node-studio/

## v0.2 Quality Hardening (PR #1)
- **Inspector (P1):** live parameter edits update values without rebuilding inspector DOM (preserves focus/caret/continuous typing); committed changes update history; undo/redo restores values.
- **JSON Import Safety (P1):** strict validation of `kind`/`version`, node types/IDs/coords/fields, link endpoints/ports, duplicate IDs/inputs, and size limits; sanitized data; **atomic import** (existing workflow unchanged on failure). SVG links rendered via `createElementNS`/`setAttribute` (no untrusted IDs in `innerHTML`). Malicious/invalid JSON test cases included.
- **WebGL Fallback (P1):** `WebGLRenderer` init guarded with try/catch; CSS fallback background if WebGL unavailable; `webglcontextlost` handled and background can reinitialize on restore. **DOM node editor remains fully operable without WebGL.**
- **Performance (P2):** Three.js background dynamically imported (reduced first-paint blocking). Auto quality **starts at Medium**; downgrade below ~45 FPS; upgrade above ~58 FPS only after sustained stable window with cooldown/hysteresis (no oscillation). RAF stops when tab hidden and resumes on visibility.
- **Workflow Correctness (P2):** run uses topological sort by dependencies; cycle detection blocks execution with clear message; invalid links rejected on import.

## Features
- DOM nodes + SVG Bézier connections (single SVG layer). Nodes: Checkpoint Loader, Positive Prompt, Negative Prompt, LoRA Loader, CLIP Text Encode, Empty Latent Image, KSampler, VAE Decode, Output Preview.
- Drag/add/delete, connect/rewire/replace input links, pan/zoom, selection & inspector, run animation with flow pulses, presets (FLUX/SDXL/SD 1.5), Seed/Steps/CFG, JSON import/export, local save/load, undo/redo.
- FPS monitor, quality selector (Auto/High/Medium/Low), `prefers-reduced-motion`, RWD, keyboard shortcuts.

## CI / Tests
- PR CI (`.github/workflows/ci.yml`, not Pages): `npm ci`, `npm run build`, `npm test` (Vitest + jsdom).
- Coverage: JSON validation/sanitization/limits/injection cases, import/export round-trip + atomic failure, inspector live-input behavior (no DOM rebuild, commit, undo restore), SVG-safe link rendering, topo sort/cycle detection.

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
