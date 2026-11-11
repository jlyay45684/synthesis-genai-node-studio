# Architecture

## Overview
SYNTHESIS is a client-side, simulation-only GenAI node studio. No backend, no ComfyUI connection, no real model execution.

## Rendering Responsibilities
- **Three.js (`src/background/particles.js`)**: low-density particle cloud background only (Points + BufferGeometry). Adapts particle count/DPR by quality; pauses on hidden tab; respects reduced motion.
- **DOM (`src/editor/Editor.js`)**: node cards (headers, ports, parameter fields) positioned via CSS transforms/absolute layout inside a transformed world container for pan/zoom.
- **SVG (`#connections`)**: single SVG layer for all Bézier links (`path` per link) and transient flow dots during execution. No per-link animation loops; flow uses on-demand GSAP tweens.
- **CSS**: glass panels, neon theme, 3D-depth cues, responsive layout.

## Editor Model
- Nodes stored in a Map with `{id,type,x,y,data,def,el}`; links as `{id,fromNode,fromPort,toNode,toPort}`.
- Port positions resolved from DOM rects mapped into world coordinates for accurate SVG paths under pan/zoom.
- Input ports accept one link (replace-on-drop); detaching supported by dragging from linked input.
- Selection drives Inspector binding; parameter edits sync node DOM ↔ inspector and commit history.

## State & Persistence
- Snapshot/restore JSON for undo/redo stack (bounded) and for import/export/local save.
- Export schema: `version`, `kind: synthesis-workflow-sim`, nodes, links, nextId.

## Execution Simulation
- Iterates nodes with running/done visual states, pulses outgoing links with GSAP-driven SVG dots, then renders a deterministic canvas preview from sampler parameters. Explicitly labeled simulated.

## Quality & Adaptivity
- Auto FPS sampling adjusts High/Medium/Low (particles, DPR). Manual override via selector.
- `prefers-reduced-motion` dampens background and disables flow tweens.

## Build/Deploy
- Vite `base: './'` for Pages. GitHub Actions workflow builds and deploys `dist/`.
