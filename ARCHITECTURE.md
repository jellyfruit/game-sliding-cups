# Sliding Cups — 架構 v0.1

目標：**好維護、好測試、好換美術**。單一 `index.html`（原生 JS + Canvas 2D，無建置工具、無後端）；圖片放 `art/`（唯一例外）。以 iPad 為主。

## 1. 分層

```
index.html
├─ CORE（/*#core-start*/ … /*#core-end*/，不碰 DOM，Node 可直接測）
│   ├─ CONFIG    所有資料與手感參數（世界尺寸、物理、階級、種類、計分、出杯機率）
│   ├─ RNG       mulberry32 有種子亂數 → 可重播、每日挑戰、自動測試
│   ├─ Physics   純物理：固定步長 1/120s、摩擦、撞牆、圓形碰撞、合併；只「產生事件」
│   ├─ Modes     模式物件：pickNext（出什麼杯）、danger（lose / fade）、assistForced
│   └─ Game      規則與狀態機：出杯、發射（冰壺式）、計分、勝負；update() 回傳事件
└─ APP（瀏覽器）
    ├─ Storage   有版本號的存檔（舊 slidingcups.best 自動遷移）
    ├─ Renderer  layout / project / toWorld / drawCupAt（之後換貼圖只改這裡）
    ├─ FX        粒子與浮動文字，由事件觸發
    ├─ Input     指標事件 → Game.beginDrag / dragTo / endDrag
    ├─ UI        HUD 與按鈕
    └─ main      requestAnimationFrame 迴圈
```

## 2. 依賴規則

- CORE 不得使用 `document`、`window`、`canvas`、`performance`。時間一律由外部傳入（`dt`、事件時間戳）。
- Physics 不認識分數與勝負；Game 不認識畫面。
- APP 只透過 `Game.*` 與事件與 CORE 溝通。畫面特效、音效、存檔都是「事件的訂閱者」。

## 3. 事件（Game.update 的回傳值）

| type | 欄位 | 用途 |
|---|---|---|
| `merge` | kind, tier, x, y, combo, gain | 特效、音效、之後的關卡目標 |
| `checkmate` | kind, x, y, gain | 兩個國王合併 |
| `spawn` | — | 新杯子出現 |
| `fade` | x, y | 練習模式杯子淡出 |
| `gameover` | score | 存最高分、顯示結果 |

新增玩法（關卡、道具、成就）= 新增模式物件 + 訂閱事件，不改物理。

## 4. 遊戲狀態

`phase`：`ready`（等待發射）→ `flying`（杯子滑動中）→ 全停 0.25s 後 `spawn` → `ready`；經典模式危險計時滿 3 秒 → `over`。
（Step 2 會加上 menu / paused / result 畫面層級的狀態機。）

## 5. 發射規則（手感核心，勿隨意改）

杯子跟著手指，在發射區內不算發射；手指越過 `LINE_Y` 當下，用最近 100 ms 的手指軌跡算速度：
`out = sp ≤ KNEE ? sp·GAIN : KNEE·GAIN + (sp−KNEE)·GAIN_HI`，上限 `VMAX`。
低於 `VMIN` → 退回中間；放開手指在發射區 → 退回中間。數值見 `CONFIG.phys`。

## 6. 渲染與美術

`drawCupAt(sx, sy, R, kind, tier, state)` 是唯一畫杯子的入口。Step 5 會在這裡先查 `art/<kind>/<kind>_t<tier>.png`（規格見 ASSET_SPEC.md），有圖就畫圖，沒有就用目前的程式繪製當後備。碰撞永遠用邏輯圓形，與美術無關。

## 7. 存檔

`localStorage['slidingcups.save'] = { v: 1, best: { classic: n } }`。要改格式就 `v+1` 並寫遷移。

**跨裝置**：沒有後端，資料只存在「該瀏覽器該網址」；iPad Safari 分頁與加到主畫面的 PWA 儲存空間也是分開的。因此先不做同步；日後若需要，用「匯出 / 匯入存檔碼」即可，不必架伺服器。

## 8. 測試

- `node tests/core.test.js`：29 項（RNG 可重現、合併規則、連鎖計分、將死、物理、最大力度不彈回越線、發射門檻、經典 / 練習勝負、重新開始）。測試從 `index.html` 的 core 標記區間直接取出核心程式碼執行。
- 重構時另以舊版原型對照：16 顆隨機杯子、5 組種子 × 3 種長度，物理結果逐位元相同。
- 網址參數：`?kinds=N`（種類數，預設 1）、`?seed=N`（固定出杯順序）。除錯掛鉤：`window.SC`、`window.__game`。

## 9. 開發順序

1. ✅ 分層重構（手感不變）+ 測試 + 本文件
2. 狀態機與模式物件：選單 / 暫停 / 結算（HTML 覆蓋層）
3. 存檔、VP（勝利點）、解鎖
4. 關卡模式（目標：每種做出國王），3 關
5. 貼圖渲染（ChatGPT 圖片到位後），程式繪製為後備
6. 之後：PWA（離線、主畫面）、Web Audio 合成音效（iOS 無震動）、道具
