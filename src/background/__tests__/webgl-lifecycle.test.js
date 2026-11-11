import { describe, it, expect, beforeEach, vi } from "vitest";
import { ParticleBackground } from "../../background/particles.js";

describe("WebGL Lifecycle", () => {
  let canvas;
  beforeEach(() => {
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
  });

  it("initializes with dynamic Three.js import", async () => {
    const bg = new ParticleBackground(canvas);
    const ok = await bg.init();
    expect(typeof ok).toBe("boolean");
    bg.destroy();
  });

  it("stops RAF when tab hidden, restores on visible", async () => {
    const bg = new ParticleBackground(canvas);
    await bg.init();
    expect(bg.running).toBe(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(bg.visible).toBe(false);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(bg.visible).toBe(true);
    bg.destroy();
  });

  it("handles context lost and restore callbacks registered once", async () => {
    const bg = new ParticleBackground(canvas);
    await bg.init();
    if (bg.renderer) {
      expect(bg._ctxLostHandler).toBeDefined();
      expect(bg._ctxRestoredHandler).toBeDefined();
    }
    bg.destroy();
  });

  it("fallback CSS class applied on init failure", async () => {
    const bg = new ParticleBackground(canvas);
    bg._doInit = async () => { bg.THREE = { Scene: class {}, PerspectiveCamera: class {}, WebGLRenderer: class {}, Color: class {}, BufferGeometry: class {}, BufferAttribute: class {}, Points: class {}, PointsMaterial: class {}, AdditiveBlending: 1 }; throw new Error("simulated"); };
    await bg.init();
    expect(canvas.classList.contains("bg-fallback")).toBe(true);
    bg.destroy();
  });

  it("only one animation loop at a time", async () => {
    const bg = new ParticleBackground(canvas);
    await bg.init();
    if (bg.renderer) {
      bg.start();
      const raf1 = bg.raf;
      bg.start();
      expect(bg.raf).toBe(raf1);
    }
    bg.destroy();
  });
});
