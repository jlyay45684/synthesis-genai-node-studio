# SYNTHESIS — Operation Manual

## Overview
SYNTHESIS is a **simulation-only** GenAI node editor inspired by ComfyUI workflows. It does not connect to ComfyUI or run real models.

## Interface
- **Top bar:** brand, preset selector, Run (Sim), add/undo/redo/save/load/export/import, FPS monitor, quality selector.
- **Canvas:** DOM nodes over a Three.js particle background with SVG Bézier links. Pan/zoom for spatial navigation.
- **Inspector (right):** edit selected node parameters; view simulated output preview; control reference.

## Building a Workflow
1. **Add nodes:** click `＋ Node` and choose a type (or load a preset).
2. **Move nodes:** drag node headers.
3. **Connect:** drag from an output port dot to a compatible input port dot. Each input accepts one link (dropping replaces the existing one).
4. **Rewire/remove link:** drag from a linked input port to detach and drop on a new input; deleting a node removes its links.
5. **Edit parameters:** select a node and change fields in-node or in Inspector (Seed/Steps/CFG, dimensions, prompts, LoRA, sampler, etc.). Changes apply immediately.
6. **Delete:** select a node and press `Delete`/`Backspace` (not while typing in fields).

## Presets
Use the **Presets** menu to load FLUX, SDXL, or SD 1.5 graphs preconfigured with Checkpoint, prompts, latent size, KSampler, VAE Decode, and Output Preview. Presets are editable and exportable.

## Execution (Simulated)
Click **Run (Sim)** or press `Ctrl+Enter`. Nodes animate through running/done states and flow particles travel along SVG links. The Output Preview renders a deterministic **simulated** image canvas derived from sampler settings (e.g. seed) — **no ComfyUI, no model inference**.

## Save / Load / JSON
- **Save/Load:** stores workflow in browser localStorage.
- **Export:** downloads versioned JSON (`synthesis-workflow-sim`).
- **Import:** loads a JSON workflow file.
Round-trip: export then import restores nodes, positions, parameters, and links.

## History
Undo/Redo via buttons or `Ctrl+Z` / `Ctrl+Y` (`Ctrl+Shift+Z`). History captures structural and committed parameter changes.

## Performance & Accessibility
- Quality: Auto/High/Medium/Low adjusts background particle count and DPR.
- FPS monitor shown in top bar.
- Respects `prefers-reduced-motion` (reduced background/flow animation).
- Responsive layout: inspector stacks below canvas on small screens.
- Keyboard accessible toolbar and shortcuts (see README).

## Troubleshooting
- **No preview:** click Run (Sim); ensure Output Preview node exists in graph.
- **Import fails:** verify JSON is a SYNTHESIS workflow export.
- **Slow on low-end devices:** set Quality to Low and/or enable reduced motion in OS.
