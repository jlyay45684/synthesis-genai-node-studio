const PRESETS = {
  low: { n: 1800, dpr: 0.75 },
  medium: { n: 4500, dpr: 1.0 },
  high: { n: 9000, dpr: 1.25 },
};
const ORDER = ["low", "medium", "high"];

export class ParticleBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = "medium";
    this.mode = "auto";
    this.running = false;
    this.visible = !document.hidden;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.fps = 0;
    this.acc = 0;
    this.frames = 0;
    this.fpsLast = performance.now();
    this.last = performance.now();
    this.samples = [];
    this.lastAdj = 0;
    this.onFps = null;
    this.onQuality = null;
    this.onError = null;
    this.raf = 0;
    this.clock = 0;
    this.THREE = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.points = null;
    this._initPromise = null;
    this._visHandler = () => {
      this.visible = !document.hidden;
      if (this.visible) this.start();
      else this.stop();
    };
    this._resizeHandler = () => this.resize();
    window.addEventListener("resize", this._resizeHandler);
    document.addEventListener("visibilitychange", this._visHandler);
    this.loop = this.loop.bind(this);
  }

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    try {
      this.THREE = await import("three");
      this._initRenderer();
      if (!this.renderer) {
        this._setFallback();
        return false;
      }
      this.scene = new this.THREE.Scene();
      this.camera = new this.THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
      this.camera.position.set(0, 0, 18);
      this.quality = "medium";
      this._applyPreset("medium");
      this._rebuild();
      this.start();
      return true;
    } catch (e) {
      this._setFallback();
      return false;
    }
  }

  _initRenderer() {
    try {
      const canvas = this.canvas;
      if (this.renderer) return;
      this.renderer = new this.THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
      if (!this.renderer || !this.renderer.getContext()) {
        this.renderer = null;
        this._setFallback();
        return;
      }
      // Register context events ONCE
      if (!this._ctxLostHandler) {
        this._ctxLostHandler = (e) => {
          e.preventDefault();
          this.stop();
          this._disposeScene();
          if (this.renderer) {
            try {
              this.renderer.dispose();
            } catch {}
            this.renderer = null;
          }
          this._setFallback();
        };
        this._ctxRestoredHandler = () => {
          this._clearFallback();
          try {
            this._initRenderer();
            if (this.renderer) {
              if (!this.scene) this.scene = new this.THREE.Scene();
              if (!this.camera) {
                this.camera = new this.THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
                this.camera.position.set(0, 0, 18);
              }
              this._applyPreset(this.quality);
              this._rebuild();
              this.start();
            } else {
              this._setFallback();
            }
          } catch {
            this._setFallback();
          }
        };
        canvas.addEventListener("webglcontextlost", this._ctxLostHandler, false);
        canvas.addEventListener("webglcontextrestored", this._ctxRestoredHandler, false);
      }
    } catch (e) {
      this.renderer = null;
      this._setFallback();
    }
  }

  _setFallback() {
    this.canvas.classList.add("bg-fallback");
    if (this.onError) this.onError("WebGL unavailable — CSS fallback background");
  }

  _clearFallback() {
    this.canvas.classList.remove("bg-fallback");
  }

  _rebuild() {
    if (!this.THREE || !this.scene) return;
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry?.dispose();
      this.points.material?.dispose();
      this.points = null;
    }
    const count = (PRESETS[this.quality] || PRESETS.medium).n;
    const geo = new this.THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = new this.THREE.Color(0x5de2ff),
      c2 = new this.THREE.Color(0xa78bff),
      c3 = new this.THREE.Color(0xff6bd6);
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.random() * 16;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t) - 6;
      const c = i % 7 === 0 ? c3 : i % 2 ? c2 : c1;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute("position", new this.THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new this.THREE.BufferAttribute(col, 3));
    const mat = new this.THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: this.THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.points = new this.THREE.Points(geo, mat);
    this.scene.add(this.points);
  }

  _applyPreset(q) {
    const p = PRESETS[q] || PRESETS.medium;
    this.quality = q in PRESETS ? q : "medium";
    if (this.renderer) {
      const dpr = Math.min(window.devicePixelRatio || 1, p.dpr);
      this.renderer.setPixelRatio(dpr);
      this.resize();
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === "auto") {
      this.samples = [];
      this.lastAdj = performance.now();
    } else {
      this._applyPreset(mode);
      this._rebuild();
    }
    if (this.onQuality) this.onQuality(this.quality, this.mode);
  }

  _maybeAuto(now) {
    if (this.mode !== "auto") return;
    const since = now - (this.lastAdj || 0);
    if (this.samples.length < 45) return;
    if (since < 5000) return;
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const idx = ORDER.indexOf(this.quality);
    if (avg < 45 && idx > 0) {
      this._applyPreset(ORDER[idx - 1]);
      this._rebuild();
      this.samples = [];
      this.lastAdj = now;
      if (this.onQuality) this.onQuality(this.quality, "auto", "down", avg);
    } else if (avg > 58 && idx < 2) {
      this._applyPreset(ORDER[idx + 1]);
      this._rebuild();
      this.samples = [];
      this.lastAdj = now;
      if (this.onQuality) this.onQuality(this.quality, "auto", "up", avg);
    }
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const w = innerWidth,
      h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  start() {
    if (this.running || !this.renderer || !this.visible) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  loop(now) {
    if (!this.running || !this.visible || !this.renderer) {
      this.stop();
      return;
    }
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.acc += dt;
    this.frames++;
    if (now - this.fpsLast >= 200) {
      this.fps = this.frames / this.acc;
      this.samples.push(this.fps);
      if (this.samples.length > 60) this.samples.shift();
      if (this.onFps) this.onFps(this.fps);
      this.acc = 0;
      this.frames = 0;
      this.fpsLast = now;
      this._maybeAuto(now);
    }
    const speed = this.reduced ? 0.05 : 0.18;
    this.clock += dt * speed;
    if (this.points) {
      this.points.rotation.y = this.clock * 0.35;
      this.points.rotation.x = Math.sin(this.clock * 0.4) * 0.08;
      this.points.position.y = Math.sin(this.clock * 0.6) * 0.2;
    }
    try {
      this.renderer.render(this.scene, this.camera);
    } catch {
      this.stop();
    }
  }

  _disposeScene() {
    if (this.points) {
      this.scene?.remove(this.points);
      this.points.geometry?.dispose();
      this.points.material?.dispose();
      this.points = null;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener("resize", this._resizeHandler);
    document.removeEventListener("visibilitychange", this._visHandler);
    if (this._ctxLostHandler) {
      this.canvas.removeEventListener("webglcontextlost", this._ctxLostHandler, false);
      this.canvas.removeEventListener("webglcontextrestored", this._ctxRestoredHandler, false);
      this._ctxLostHandler = null;
      this._ctxRestoredHandler = null;
    }
    this._disposeScene();
    if (this.renderer) {
      try {
        this.renderer.dispose();
      } catch {}
      this.renderer = null;
    }
  }
}
