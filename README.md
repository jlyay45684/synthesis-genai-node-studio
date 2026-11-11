# SYNTHESIS — GenAI Node Studio (Simulation)

High-end GenAI visual workstation concept combining ComfyUI-style node editing, a low-density Three.js particle background, and a futuristic glass UI.

> **Simulation Notice:** Image generation and workflow execution are **explicitly simulated previews**. This project does **not** connect to ComfyUI and does **not** execute real AI models.

## Live Demo
- GitHub Pages: *(published after `main` is built by GitHub Actions with Pages source set to GitHub Actions)*

## Features
- Dark futuristic workstation, 3D spatial depth background (Three.js particles)
- DOM-based nodes + SVG Bézier connections (single SVG layer, no per-link animation loops)
- Dynamic energy links with flowing particle dots during execution animation
- Node execution pulse states and instant visual feedback on parameter edits
- Glass-morphism inspector panel, cyan/violet/pink neon palette
- Canvas pan/zoom, node drag, selection, parameter editing, add/delete nodes
- Connect ports by drag, insert by dropping on input (replaces existing input link), detach by dragging from linked input
- Workflow execution animation with **simulated** output preview
- Presets: FLUX / SDXL / SD 1.5 (Checkpoint, prompts, latent, KSampler seed/steps/CFG, VAE decode, output)
- JSON import/export, local save/load, undo/redo
- FPS monitor, quality selector (Auto/High/Medium/Low) with DPR & particle adaptation
- RWD layout and keyboard shortcuts
- `prefers-reduced-motion` support

## Node Types
Checkpoint Loader, Positive Prompt, Negative Prompt, LoRA Loader, CLIP Text Encode, Empty Latent Image, KSampler, VAE Decode, Output Preview.

## Tech Stack
Vite + JavaScript, Three.js (background only), SVG (connections), GSAP (flow/execution feedback), CSS 3D/Glass styling, GitHub Pages.

## Performance Notes
- Three.js used **only** for background particles (no node meshes)
- DOM nodes, SVG links; no per-connection animation loop (on-demand GSAP tweens during run)
- Quality presets adjust particle count and DPR (Auto scales by FPS)
- Background pauses when tab hidden; reduced-motion minimizes animation
- See `docs/PERFORMANCE.md`

## Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Controls
| Action | Input |
|---|---|
| Pan | Middle-drag or Space+drag (or drag empty canvas) |
| Zoom | Mouse wheel |
| Select | Click node |
| Connect | Drag output port dot to input port dot |
| Rewire/insert | Drag from linked input to detach, drop on target |
| Delete | Select node + Delete/Backspace |
| Undo/Redo | Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) |
| Save/Export/Run | Ctrl+S / Ctrl+E / Ctrl+Enter |
| Add node | Toolbar “＋ Node” |

## JSON Workflow
Export produces versioned JSON (`kind: synthesis-workflow-sim`) with nodes, positions, parameters, and links. Import restores the graph. **Simulation only.**

## Deployment
`.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on push to `main`. Set Pages source to **GitHub Actions**.

## License
MIT
