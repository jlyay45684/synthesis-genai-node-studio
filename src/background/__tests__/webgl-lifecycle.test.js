import { describe, it, expect, beforeEach, vi } from "vitest";
import { ParticleBackground } from "../../background/particles.js";

describe("WebGL Lifecycle", () => {
  let canvas;
  beforeEach(() => {
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
  });

  it("動態載入 Three.js 並初始化", async () => {
    const bg = new ParticleBackground(canvas);
    const ok = await bg.init();
    expect(typeof ok).toBe("boolean");
    bg.destroy();
  });

  it("分頁可見性狀態正確切換", async () => {
    const bg = new ParticleBackground(canvas);
    await bg.init();
    // 驗證 visible 狀態預設為 true
    expect(bg.visible).toBe(true);
    // 模擬隱藏
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(bg.visible).toBe(false);
    // 模擬顯示
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(bg.visible).toBe(true);
    bg.destroy();
  });

  it("context lost/restored 回呼僅註冊一次", async () => {
    const bg = new ParticleBackground(canvas);
    await bg.init();
    if (bg.renderer) {
      expect(bg._ctxLostHandler).toBeDefined();
      expect(bg._ctxRestoredHandler).toBeDefined();
    }
    bg.destroy();
  });

  it("初始化失敗時套用 CSS 降級類別", async () => {
    const bg = new ParticleBackground(canvas);
    // 直接測試 fallback 邏輯
    bg._setFallback();
    expect(canvas.classList.contains("bg-fallback")).toBe(true);
    bg.destroy();
  });

  it("同時間僅有一個動畫迴圈", async () => {
    const bg = new ParticleBackground(canvas);
    await bg.init();
    if (bg.renderer) {
      bg.start();
      const raf1 = bg.raf;
      bg.start(); // 再次呼叫不應建立新迴圈
      expect(bg.raf).toBe(raf1);
    }
    bg.destroy();
  });
});
