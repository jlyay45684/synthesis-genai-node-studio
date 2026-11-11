const PRESETS = {
  low: { n: 1800, dpr: 0.75, layers: 1 },
  medium: { n: 4500, dpr: 1.0, layers: 2 },
  high: { n: 9000, dpr: 1.25, layers: 3 },
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
    this.particleSystems = [];
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
      this._rebuildAll();
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
      if (!this._ctxLostHandler) {
        this._ctxLostHandler = (e) => {
          e.preventDefault();
          this.stop();
          this._disposeScene();
          if (this.renderer) {
            try { this.renderer.dispose(); } catch {}
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
              this._rebuildAll();
              this.start();
            } else { this._setFallback(); }
          } catch { this._setFallback(); }
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
    if (this.onError) this.onError("WebGL 不可用 — 已切換至 CSS 背景備援");
  }

  _clearFallback() {
    this.canvas.classList.remove("bg-fallback");
  }

  _rebuildAll() {
    if (!this.THREE || !this.scene) return;
    this.particleSystems.forEach(sys => {
      this.scene.remove(sys.points);
      sys.points.geometry?.dispose();
      sys.points.material?.dispose();
    });
    this.particleSystems = [];

    const preset = PRESETS[this.quality] || PRESETS.medium;
    const layerCount = preset.layers;

    // 主粒子雲層
    this._createLayer("main", preset.n, {
      radiusMin: 6, radiusMax: 22,
      heightRange: 14,
      depthOffset: -6,
      size: 0.06,
      opacity: 0.7,
      colorStops: [
        { ratio: 0, color: 0x5de2ff },
        { ratio: 0.5, color: 0xa78bff },
        { ratio: 1, color: 0xff6bd6 }
      ],
      speed: { rotationY: 0.35, rotationX: 0.08, floatY: 0.2 },
      noiseScale: 0.5
    });

    if (layerCount >= 2) {
      // 能量流層
      this._createLayer("energy", Math.floor(preset.n * 0.3), {
        radiusMin: 8, radiusMax: 18,
        heightRange: 10,
        depthOffset: -4,
        size: 0.08,
        opacity: 0.5,
        colorStops: [
          { ratio: 0, color: 0x5de2ff },
          { ratio: 1, color: 0x7cf7c8 }
        ],
        speed: { rotationY: -0.5, rotationX: 0.12, floatY: 0.15 },
        noiseScale: 0.8,
        isEnergy: true
      });
    }

    if (layerCount >= 3) {
      // 幾何光環層
      this._createLayer("ring", Math.floor(preset.n * 0.15), {
        radiusMin: 10, radiusMax: 12,
        heightRange: 2,
        depthOffset: 0,
        size: 0.12,
        opacity: 0.4,
        colorStops: [
          { ratio: 0, color: 0xa78bff },
          { ratio: 1, color: 0xff6bd6 }
        ],
        speed: { rotationY: 0.8, rotationX: 0, floatY: 0 },
        noiseScale: 0,
        isRing: true
      });
    }
  }

  _createLayer(name, count, opts) {
    const geo = new this.THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const phase = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      let r, t, p;
      if (opts.isRing) {
        r = opts.radiusMin + Math.random() * (opts.radiusMax - opts.radiusMin);
        t = Math.random() * Math.PI * 2;
        p = Math.PI / 2 + (Math.random() - 0.5) * opts.heightRange * 0.1;
      } else {
        r = opts.radiusMin + Math.random() * (opts.radiusMax - opts.radiusMin);
        t = Math.random() * Math.PI * 2;
        p = Math.acos(2 * Math.random() - 1);
      }
      pos[i * 3] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = (Math.random() - 0.5) * opts.heightRange;
      pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t) + opts.depthOffset;
      seed[i] = Math.random();
      phase[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute("position", new this.THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new this.THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aPhase", new this.THREE.BufferAttribute(phase, 1));

    const colorStops = opts.colorStops;
    const getColor = (t) => {
      const idx = Math.floor(t * (colorStops.length - 1));
      const next = Math.min(idx + 1, colorStops.length - 1);
      const localT = (t * (colorStops.length - 1)) - idx;
      const c1 = new this.THREE.Color(colorStops[idx].color);
      const c2 = new this.THREE.Color(colorStops[next].color);
      return c1.clone().lerp(c2, localT);
    };

    for (let i = 0; i < count; i++) {
      const c = getColor(seed[i]);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new this.THREE.BufferAttribute(col, 3));

    const mat = new this.THREE.PointsMaterial({
      size: opts.size,
      vertexColors: true,
      transparent: true,
      opacity: opts.opacity,
      blending: this.THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new this.THREE.Points(geo, mat);
    points.userData = {
      name,
      opts,
      basePositions: pos.slice(),
      clockOffset: Math.random() * 100
    };
    this.scene.add(points);
    this.particleSystems.push({ points, geo, mat, opts });
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
      this._rebuildAll();
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
      this._rebuildAll();
      this.samples = [];
      this.lastAdj = now;
      if (this.onQuality) this.onQuality(this.quality, "auto", "down", avg);
    } else if (avg > 58 && idx < 2) {
      this._applyPreset(ORDER[idx + 1]);
      this._rebuildAll();
      this.samples = [];
      this.lastAdj = now;
      if (this.onQuality) this.onQuality(this.quality, "auto", "up", avg);
    }
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const w = innerWidth, h = innerHeight;
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

    this.particleSystems.forEach(sys => {
      const opts = sys.opts;
      const positions = sys.points.geometry.attributes.position.array;
      const seeds = sys.points.geometry.attributes.aSeed.array;
      const phases = sys.points.geometry.attributes.aPhase.array;
      const basePos = sys.points.userData.basePositions;

      if (opts.isRing) {
        sys.points.rotation.y = this.clock * opts.speed.rotationY + sys.points.userData.clockOffset;
      } else if (opts.isEnergy) {
        sys.points.rotation.y = this.clock * opts.speed.rotationY;
        sys.points.rotation.x = Math.sin(this.clock * opts.speed.rotationX) * 0.15;
        sys.points.position.y = Math.sin(this.clock * opts.speed.floatY) * 0.3;
        // 能量粒子脈動
        const time = this.clock + sys.points.userData.clockOffset;
        for (let i = 0; i < positions.length; i += 3) {
          const pulse = Math.sin(time * 3 + phases[i / 3]) * 0.02;
          positions[i] = basePos[i] + pulse * Math.cos(phases[i / 3]);
          positions[i + 1] = basePos[i + 1] + pulse * Math.sin(phases[i / 3]);
          positions[i + 2] = basePos[i + 2];
        }
        sys.points.geometry.attributes.position.needsUpdate = true;
      } else {
        sys.points.rotation.y = this.clock * opts.speed.rotationY;
        sys.points.rotation.x = Math.sin(this.clock * opts.speed.rotationX) * 0.08;
        sys.points.position.y = Math.sin(this.clock * opts.speed.floatY) * 0.2;
        // 主層噪聲擾動
        if (opts.noiseScale > 0) {
          const time = this.clock + sys.points.userData.clockOffset;
          for (let i = 0; i < positions.length; i += 3) {
            const n = Math.sin(time * 0.5 + seeds[i / 3] * 10) * opts.noiseScale * 0.15;
            positions[i] += n * Math.cos(phases[i / 3]);
            positions[i + 1] += n * 0.5;
            positions[i + 2] += n * Math.sin(phases[i / 3]);
          }
          sys.points.geometry.attributes.position.needsUpdate = true;
        }
      }
    });

    try {
      this.renderer.render(this.scene, this.camera);
    } catch {
      this.stop();
    }
  }

  _disposeScene() {
    this.particleSystems.forEach(sys => {
      this.scene?.remove(sys.points);
      sys.points.geometry?.dispose();
      sys.points.material?.dispose();
    });
    this.particleSystems = [];
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
      try { this.renderer.dispose(); } catch {}
      this.renderer = null;
    }
  }
}
