# Architecture (v0.3)

## Overview
SYNTHESIS is a client-side, simulation-only GenAI node studio. No backend, no ComfyUI connection, no real model execution.

## Rendering Responsibilities
- **Three.js (`src/background/particles.js`)**: low-density particle cloud background only (Points + BufferGeometry). Adapts particle count/DPR by quality; pauses on hidden tab; respects reduced motion. Dynamic import reduces initial bundle blocking.
- **DOM (`src/editor/Editor.js`)**: node cards (headers, ports, parameter fields) positioned via CSS transforms/absolute layout inside a transformed world container for pan/zoom.
- **SVG (`#connections`)**: single SVG layer for all Bézier links (`path` per link) and transient flow dots during execution. No per-link animation loops; flow uses on-demand GSAP tweens.
- **CSS**: glass panels, neon theme, 3D-depth cues, responsive layout.

## Editor Model
- Nodes stored in a Map with `{id,type,x,y,data,def,el}`; links as `{id,fromNode,fromPort,toNode,toPort}`.
- Port positions resolved from DOM rects mapped into world coordinates for accurate SVG paths under pan/zoom.
- Input ports accept one link (replace-on-drop); detaching supported by dragging from linked input.
- Selection drives Inspector binding; parameter edits sync node DOM ↔ inspector and commit history.
- **Port Types**: every port declares a type (MODEL, CLIP, VAE, CONDITIONING, LATENT, IMAGE). Connection and import validate type compatibility (strict equality).
- **Link IDs**: unique per workflow; validated on import; rendered via `createElementNS`/`setAttribute`.

## State & Persistence
- Snapshot/restore JSON for undo/redo stack (bounded) and for import/export/local save.
- Export schema: `version`, `kind: synthesis-workflow-sim`, nodes, links, nextId.
- **History**: `beginOp/endOp` for single actions; `beginBatch/endBatch` for multi-step ops (e.g., presets). Atomic import: validate fully before replacing state.

## Execution Simulation
- Iterates nodes in topological order (Kahn algorithm), detects cycles, pulses outgoing links with GSAP-driven SVG dots, then renders a deterministic canvas preview from sampler parameters. Explicitly labeled simulated.

## Quality & Adaptivity
- Auto FPS sampling adjusts High/Medium/Low (particles, DPR). Manual override via selector.
- `prefers-reduced-motion` dampens background and disables flow tweens.
- Background pauses on `document.hidden` and when canvas not intersecting viewport.

## WebGL Lifecycle
- Three.js dynamically imported (`import("three")`).
- `WebGLRenderer` init guarded; on failure or `webglcontextlost` → CSS fallback, editor remains operable.
- `webglcontextrestored` attempts reinitialization.
- Context event handlers registered once; single RAF loop.

## Build/Deploy
- Vite `base: './'` for Pages. GitHub Actions workflow builds and deploys `dist/`.
- PR CI (`.github/workflows/ci.yml`): `npm ci`, `npm run build`, `npm test` (Vitest + jsdom). No Pages deploy in PR CI.
