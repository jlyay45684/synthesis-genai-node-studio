# 架構文件 (v0.3)

## 概覽
SYNTHESIS 為純客戶端、僅模擬的 GenAI 節點工作站。無後端、不連接 ComfyUI、不執行真實模型。

## 渲染職責
- **Three.js (`src/background/particles.js`)**：僅負責低密度粒子雲背景 (Points + BufferGeometry)。依品質調整粒子數/DPR；分頁隱藏暫停；支援 reduced motion。動態匯入降低初始封裝阻塞。
- **DOM (`src/editor/Editor.js`)**：節點卡片 (標題、埠、參數欄位) 以 CSS transform/absolute 定位於可平移縮放的世界容器內。
- **SVG (`#connections`)**：單一 SVG 層承載所有貝茲曲線連線 (`path` per link) 與執行時的暫態流動粒子。無逐連線動畫迴圈；流動效果以按需 GSAP tween 實現。
- **CSS**：玻璃面板、霓虹主題、3D 深度線索、響應式佈局。

## 編輯器模型
- 節點以 Map 儲存 `{id,type,x,y,data,def,el}`；連線為 `{id,fromNode,fromPort,toNode,toPort}`。
- 埠位置由 DOM rect 映射至世界座標，確保平移縮放下 SVG 路徑精準。
- 輸入埠單一連線 (放開替換)；拖曳已連接的輸入埠可拆離重接。
- 選取驅動屬性面板綁定；參數編輯同步節點 DOM ↔ inspector 並提交歷史。
- **埠型別**：每個埠宣告型別 (MODEL, CLIP, VAE, CONDITIONING, LATENT, IMAGE)。連線與匯入驗證型別相容 (嚴格相等)。
- **連線 ID**：每個工作流唯一；匯入時驗證；以 `createElementNS`/`setAttribute` 渲染。

## 狀態與持久化
- 快照/還原 JSON 供 undo/redo 堆疊 (有上限) 與 import/export/本地儲存使用。
- 匯出綱要：`version`、`kind: synthesis-workflow-sim`、nodes、links、nextId。
- **歷史**：`beginOp/endOp` 對應單一動作；`beginBatch/endBatch` 供多步驟操作 (如預設)。Atomic import：完整驗證通過後才替換狀態。

## 執行模擬
- 依拓撲順序 (Kahn 演算法) 疊代節點，偵測循環，脈衝輸出連線 (GSAP 驅動 SVG 點)，再由採樣器參數確性渲染畫布預覽。明確標示模擬。

## 品質與適應性
- 自動 FPS 採樣調整 High/Medium/Low (粒子數、DPR)。選擇器可手動覆寫。
- `prefers-reduced-motion` 降低背景動畫並停用流動 tween。
- 背景在 `document.hidden` 及畫布離開視口時暫停。

## WebGL 生命週期
- Three.js 動態匯入 (`import("three")`)。
- `WebGLRenderer` 初始化有防護；失敗或 `webglcontextlost` → CSS 降級，編輯器仍可操作。
- `webglcontextrestored` 嘗試重新初始化。
- Context 事件處理器只註冊一次；單一 RAF 循環。

## 建置/部署
- Vite `base: './'` 供 Pages。GitHub Actions workflow 建置並部署 `dist/`。
- PR CI (`.github/workflows/ci.yml`)：`npm ci`、`npm run build`、`npm test` (Vitest + jsdom)。PR CI 不含 Pages 部署。
