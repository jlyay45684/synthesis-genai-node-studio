import * as THREE from 'three';

export class ParticleBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = 'medium';
    this.running = true;
    this.visible = true;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.last = performance.now();
    this.fps = 0; this.acc = 0; this.frames = 0; this.fpsLast = performance.now();
    this.onFps = null;
    this.preset = { high: 9000, medium: 4500, low: 1800 }[this.quality];

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 18);
    this.clock = 0;

    this.build();
    this.applyQuality('auto-init');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { this.visible = !document.hidden; if (this.visible) this.last = performance.now(); });
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  build() {
    const count = this.preset;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const c1 = new THREE.Color(0x5de2ff), c2 = new THREE.Color(0xa78bff), c3 = new THREE.Color(0xff6bd6);
    for (let i=0;i<count;i++){
      const r = 6 + Math.random()*16;
      const t = Math.random()*Math.PI*2;
      const p = Math.acos(2*Math.random()-1);
      pos[i*3] = r*Math.sin(p)*Math.cos(t);
      pos[i*3+1] = (Math.random()-0.5)*14;
      pos[i*3+2] = r*Math.sin(p)*Math.sin(t) - 6;
      const c = i%7===0?c3:(i%2?c2:c1);
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
      seed[i]=Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    geo.setAttribute('color', new THREE.BufferAttribute(col,3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed,1));
    const mat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite:false });
    this.points = new THREE.Points(geo, mat);
    this.scene.add(this.points);
  }

  setQuality(q) {
    const map = { high: {n:9000,dpr:1.25}, medium:{n:4500,dpr:1.0}, low:{n:1800,dpr:0.75} };
    const m = map[q] || map.medium;
    this.quality = q;
    const dpr = Math.min(window.devicePixelRatio||1, m.dpr);
    this.renderer.setPixelRatio(dpr);
    if (m.n !== this.preset) {
      this.preset = m.n;
      this.scene.remove(this.points); this.points.geometry.dispose(); this.points.material.dispose();
      this.build();
    }
    this.resize();
  }

  applyQuality(mode) {
    if (mode === 'auto-init') {
      const mem = navigator.deviceMemory || 4;
      const cores = navigator.hardwareConcurrency || 4;
      this.setQuality((mem <= 4 || cores <= 4) ? 'medium' : 'high');
    }
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w/h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w,h);
  }

  loop(now) {
    requestAnimationFrame(this.loop);
    if (!this.visible) return;
    const dt = Math.min((now - this.last)/1000, 0.1); this.last = now;
    this.acc += dt; this.frames++;
    if (now - this.fpsLast >= 500) {
      this.fps = this.frames / this.acc;
      if (this.onFps) this.onFps(this.fps);
      this.acc=0; this.frames=0; this.fpsLast=now;
    }
    const speed = this.reduced ? 0.05 : 0.18;
    this.clock += dt * speed;
    if (this.points) {
      this.points.rotation.y = this.clock * 0.35;
      this.points.rotation.x = Math.sin(this.clock*0.4)*0.08;
      this.points.position.y = Math.sin(this.clock*0.6)*0.2;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
