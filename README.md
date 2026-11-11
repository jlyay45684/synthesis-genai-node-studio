# SYNTHESIS — GenAI 節點工作站 (模擬)

結合 ComfyUI 風格節點編輯、Three.js 粒子背景與未來感玻璃介面的高階 GenAI 視覺工作站概念。

> **模擬聲明：** 圖像生成與工作流執行為**明確標示的模擬預覽**。本專案**不連接 ComfyUI**，**不執行真實 AI 模型**。

## 線上展示
- GitHub Pages (合併至 `main` 且 Pages 來源設為 GitHub Actions 後)：https://jlyay45684.github.io/synthesis-genai-node-studio/

## v0.3 品質強化 (PR #1)
- **復原/重做 (P1)**  
  重構歷史機制：`beginOp/endOp`、`beginBatch/endBatch`、`commit`；單次使用者操作對應一步歷史；批次操作 (預設) 產生單一步驟。涵蓋：新增/刪除/移動節點、參數編輯。新增整合測試 (`src/editor/__tests__/integration.test.js`)。

- **節點埠型別安全 (P1)**  
  所有輸入/輸出埠具備明確型別：MODEL、CLIP、VAE、CONDITIONING、LATENT、IMAGE。連線時與 JSON 匯入皆執行型別檢查，不相容連線拒絕並給出錯誤。FLUX/SDXL/SD1.5 預設通過驗證。測試：`src/editor/__tests__/port-types.test.js`。

- **連線 ID 完整性 (P1)**  
  匯入時檢查 ID 唯一性，重複拒絕。SVG 渲染改用 `createElementNS` + `setAttribute`，避免不可信 ID 注入。測試：port-types.test.js (Link ID Uniqueness)。

- **WebGL 生命週期 (P1)**  
  Three.js 動態載入 (`import("three")`)；`webglcontextlost` / `webglcontextrestored` 各註冊一次；單一 RAF 循環；context lost 降級 CSS 背景；restored 可重新初始化。編輯器在無 WebGL 時仍可完整操作。測試：`src/background/__tests__/webgl-lifecycle.test.js` (jsdom 環境受限，邏輯已覆蓋)。

- **效能 (P2)**  
  Auto 起始為 **中**；<45 FPS 降級、>58 FPS 穩定後升級（滯後/冷卻）；`visibilitychange` 隱藏時真正停止 RAF；Three.js 動態載入降低首屏阻塞。

- **工作流正確性 (P2)**  
  執行採拓撲排序 (Kahn)；偵測循環依賴並阻擋；匯入驗證拒絕無效連線/埠/型別，不破壞既有工作流。

## 功能特色
- DOM 節點 + SVG 貝茲曲線連線 (單一 SVG 層)。節點：Checkpoint Loader、Positive Prompt、Negative Prompt、LoRA Loader、CLIP Text Encode、Empty Latent Image、KSampler、VAE Decode、Output Preview。
- 拖曳/新增/刪除、連線建立/替換輸入/重接移除、畫布平移/縮放、節點選取與屬性編輯、執行動畫與流動粒子/節點脈衝、參數即時回饋、FLUX/SDXL/SD 1.5 預設、Seed/Steps/CFG 控制、JSON 匯入/匯出、本地儲存/載入、復原/重做。
- FPS 監控、品質選擇器 (自動/高/中/低)、`prefers-reduced-motion`、RWD、鍵盤快捷鍵。

## CI / 測試
- PR CI (`.github/workflows/ci.yml`，不含 Pages 部署)：`npm ci`、`npm run build`、`npm test` (Vitest + jsdom)。
- 涵蓋：JSON 驗證/清理/上限/注入、atomic import/export 往返 + 原子失敗、inspector 即時輸入行為、SVG 安全渲染、拓撲排序/循環偵測、埠型別相容性、連線 ID 唯一性、復原/重做整合。

## 開發
```bash
npm ci
npm run dev
```
## 建置與測試
```bash
npm run build
npm test
```

## 備註
- FPS 結果**不**標記 PASS，除非在指定裝置實測 (見 `docs/PERFORMANCE.md`)。
- Draft PR；請勿合併。
