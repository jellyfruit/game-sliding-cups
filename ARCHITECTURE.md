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
│   ├─ Game      規則與狀態機：出杯、發射（冰壺式）、計分、勝負；update() 回傳事件
│   └─ Flow      畫面層級狀態機：menu / playing / paused / result（轉換表）
└─ APP（瀏覽器）
    ├─ Storage   有版本號的存檔（舊 slidingcups.best 自動遷移）
    ├─ Renderer  layout / project / toWorld / drawCupAt（之後換貼圖只改這裡）
    ├─ FX        粒子與浮動文字，由事件觸發
    ├─ Input     指標事件 → Game.beginDrag / dragTo / endDrag
    ├─ UI        HUD、按鈕、選單 / 暫停 / 結算覆蓋層（HTML，依 Flow 狀態顯示）
    └─ main      requestAnimationFrame 迴圈
```

## 2. 依賴規則

- CORE 不得使用 `document`、`window`、`canvas`、`performance`。時間一律由外部傳入（`dt`、事件時間戳）。
- Physics 不認識分數與勝負；Game 不認識畫面。
- APP 只透過 `Game.*` 與事件與 CORE 溝通。畫面特效、音效、存檔都是「事件的訂閱者」。

## 3. 事件（Game.update 的回傳值）

| type | 欄位 | 用途 |
|---|---|---|
| `hit` | v, tier | 杯子互撞（v = 撞擊速度，太輕不發）→ 撞擊音 |
| `wall` | v | 撞牆 → 悶響 |
| `merge` | kind, tier, x, y, combo, gain | 特效、音效、之後的關卡目標 |
| `checkmate` | kind, x, y, gain | 兩個國王合併 |
| `spawn` | — | 新杯子出現 |
| `fade` | x, y | 練習模式杯子淡出 |
| `gameover` | score | 存最高分、顯示結果 |

新增玩法（關卡、道具、成就）= 新增模式物件 + 訂閱事件，不改物理。

## 4. 遊戲狀態

`phase`：`ready`（等待發射）→ `flying`（杯子滑動中）→ 全停 0.25s 後 `spawn` → `ready`；經典模式危險計時滿 3 秒 → `over`。
畫面層級由 `Flow` 管：

```
menu ──kinds──▶ kinds ──menu──▶ menu
menu ──start──▶ playing ──pause──▶ paused ──resume/restart──▶ playing
                   │                  └──menu──▶ menu
                   └─gameover─▶ result ──restart──▶ playing
                                  └──menu──▶ menu
```
只有 `playing` 時才呼叫 `Game.update`；切到背景分頁自動暫停；結算畫面延遲 0.9 秒出現，讓玩家先看到最後的桌面。不合法的轉換一律忽略。新增模式：在 `Modes` 加物件，並在選單加一顆按鈕（`start:<modeId>`）。

## 5. 發射規則（手感核心，勿隨意改）

杯子跟著手指，在發射區內不算發射；手指越過 `LINE_Y` 當下，用最近 100 ms 的手指軌跡算速度：
`out = sp ≤ KNEE ? sp·GAIN : KNEE·GAIN + (sp−KNEE)·GAIN_HI`，上限 `VMAX`。
低於 `VMIN` → 退回中間；放開手指在發射區 → 退回中間。數值見 `CONFIG.phys`。

## 6. 渲染與美術

`drawPiece(sx, sy, R, kind, tier, state)` 是唯一畫杯子的入口（桌面、「下一個」預覽、關卡目標都走它）：
- **有貼圖**：`art/<生物>/<生物>_t<1..6>.png`（768×768、錨點 (384,690)、杯口半徑 128 px，見 ASSET_SPEC.md）。顯示大小 = 圖 ×（杯子半徑 ÷ 128）。陰影與選取光圈由遊戲自己畫。
- **沒有貼圖**（還沒交、載入失敗、或網址加 `?art=0`）：退回 `drawCupAt` 程式繪製。以「種類 × 階級」為單位逐張判斷，所以美術可以一張一張慢慢加進來。
- **表情變體**：合併時優先用 `_t<n>_happy.png`、快速移動時用 `_t<n>_fast.png`，沒有就用預設圖。
- 載入：啟動與開始遊戲時預載該局使用的生物；圖片載入前先用程式繪製，不會空白。
- 碰撞永遠用邏輯圓形（半徑見 CONFIG.tiers），與美術無關。受擊的壓扁會套在貼圖上；閃白只用在程式繪製版。
- Service worker 對 `art/` 用「先給快取、背景更新」：換新圖後重開一次就是新圖，也能離線。
- **換圖流程**：把 PNG 放進 `art/<生物>/`、commit、push 即可，不需要改程式。

## 7. 存檔與玩家進度（Profile）

`localStorage['slidingcups.save'] = { v: 3, best: { classic }, vp, unlocked: [0,1], active: [0], cleared: [], lang: 'en', sound: true }`。要改格式就 `v+1` 並在 `Profile.migrate` 加遷移（v1 → v2 → v3 已實作，進度保留）。

**所有進度規則都在核心層的 `Profile`（不碰 DOM、Node 可測）**；APP 層的 `Storage` 只負責讀寫 localStorage，讀出後一律先過 `Profile.migrate`（任何壞資料都會被修正：負數、重複、越界、未解鎖的生物、不認得的語言；解鎖永遠從 0 連續）。
- `fresh / migrate / buy / toggleKind / nextLockedKind / levelOpen / clearLevel / recordBest / bankRun / finishRun / setLang / toggleSound`。
- `bankRun` 以 `game.banked` 保證每局只入帳一次；`clearLevel` 只在首次通關回傳獎勵。

## 7a. 模式規則（Modes 的 hook）

每個模式自己宣告規則，APP / Game 不再寫 `mode.id === 'xxx'`：`hud`（'best' | 'level'）、`banner`（畫面上的標示 key 或 null）、`goalKinds(g)`（過關目標或 null）、`givesVP`、`tracksBest`、`pickNext`、`assistForced`、`danger`。新增模式 = 在 `Modes` 加一個物件，並確認 `banner` 有翻譯。`Game.rematch(g, kinds)`：關卡重玩同一關，其他模式用指定生物重開。

## 7b. VP 與解鎖（CONFIG.vp，數值都在設定檔）

- 每局可得 VP = `floor(分數 / 500)` + `國王數 × 10`；練習模式 0。結束、或中途退出 / 重來時入帳（每局只一次）。
- 依序解鎖：龍、獨角獸免費；之後 100 / 200 / 350 / 550 / 800 VP。價格依「分數很輕鬆到 10000」的實測手感估計，之後再調。
- `active` = 下一局使用的生物（至少 1 種，預設只有龍；種類越多越難消除）。`?kinds=N` 可強制前 N 種（測試用）。

**跨裝置**：沒有後端，資料只存在「該瀏覽器該網址」；iPad Safari 分頁與加到主畫面的 PWA 儲存空間也是分開的。因此先不做同步；日後若需要，用「匯出 / 匯入存檔碼」即可，不必架伺服器。

## 7c. 關卡模式

- `CONFIG.levels[i] = { kinds, reward }`：目標是「kinds 裡每一種都做出國王」，生物與規則固定（不受解鎖影響）；輸法與經典相同（沒有步數 / 杯子數限制）。目前 3 關：龍 → 龍+獨角獸 → 龍+獨角獸+九頭蛇。
- 過關時 `Game.update` 回傳 `levelclear` 事件、`phase = 'won'`；Flow 用 `clear` 進入結算。
- 獎勵只在**首次通關**發放（`reward` VP），重玩不再給，避免刷 VP。依序解鎖：通過上一關才能玩下一關。
- 之後要加「不同限制的關卡」：在 level 設定裡加欄位（例如 `maxShots`、`timeLimit`），在 `Game.update` 檢查即可，不必動物理。

## 7d. 多語言

`STR = { en, zh }` + `t(key, {vars})`，預設英文，選單的「Language」切換繁體中文並存在存檔。核心層不含任何文字，事件只帶資料；所有畫面文字（HTML 覆蓋層、畫布上的文字、生物名稱）都走 `t()`。新增語言 = 加一個 `STR.xx` 並放進切換按鈕。缺的 key 會退回英文。

## 7e. 音效

`Sfx`（APP 層）用 Web Audio 即時合成，沒有音檔：撞擊（音量隨速度、音高隨杯子大小）、撞牆、發射風聲、合併和弦（五聲音階，階級越高音越高、連鎖每次升高）、將死 / 過關 / 結束的短旋律、出杯、按鈕點擊。全部由 `Game.update` 的事件驅動（`Sfx.event(ev)`），Physics 只負責發 `hit` / `wall` 事件，不認識音效；發事件不影響物理結果（已用舊版對照驗證逐位元相同）。
- iOS 要等第一次點擊才能啟動音訊（`pointerdown` 時 `Sfx.unlock()`）；並設 `navigator.audioSession.type = 'playback'` 讓靜音開關開著也能出聲（Safari 17+）。
- 底部「Sound」按鈕開關，存在存檔的 `sound`。切到背景時自動暫停音訊。
- 撞擊 / 撞牆有最小間隔，避免一幀多次碰撞變成噪音。

## 7f. 打擊感（Juice）

全部在 APP 層，由事件驅動，不影響物理結果：
- **聲音**：撞擊是「石塊碰石塊」——低頻「咚」的主體（音高快速下滑、衰減快、沒有拖長的高頻餘音）+ 低通雜訊的顆粒感 + 極小聲的表面「喀」；兩個杯子各一聲，杯子越大音越低越悶；音量隨撞擊速度。合併 / 將死疊一層石塊「咚」。總輸出過壓縮器，多顆同時撞擊不爆音。
- **畫面**：撞擊點石屑與衝擊環、受擊杯子微壓扁並閃白、桌面震動、重擊與高階合併的短暫停格（hitstop）；目前強度已調淡。
- `JUICE = { shake, hitstop, sparks, squash, rings }` 為強度倍率（目前 0.45 / 0.35 / 0.35 / 0.5 / 0.6）（設 0 即關閉該效果）；`Physics` 的 `hit` 事件帶 `x, y, ta, tb, a, b, v`，`wall` 事件帶 `x, y, id, v`。

## 7g. PWA

- `manifest.webmanifest`（standalone、直式、圖示 192 / 512，含 maskable）、`icons/`（由遊戲自己的杯子繪圖產生）、`sw.js`（service worker）。`index.html` 有 iOS 專用 meta（加到主畫面、全螢幕、深色狀態列）。
- 快取策略：頁面（`index.html`）有網路就拿最新版並更新快取，沒網路用快取；其他檔案（圖示、之後的 `art/` 貼圖）快取優先。**發布新版時把 `sw.js` 的 `VERSION` 加一**。
- 只在 http(s) 註冊 service worker（`file://` 不會），所以本機雙擊開檔案不受影響。
- 需要 HTTPS 才能安裝；目前用 GitHub Pages 部署（repo 設定 → Pages → main / root）。
- iPad：Safari 開網址 → 分享 → 加入主畫面。**主畫面版與 Safari 分頁的存檔是分開的**。

## 7h. 穩定性與診斷（iOS）

- **迴圈永不停**：`frame()` 用 try/catch/finally，任何錯誤都只顯示、不會讓畫面凍結。
- **尺寸保護**：`layout()` 遇到桌面區域尺寸過小（iOS 從主畫面啟動時可能短暫是 0）就先不畫；`ResizeObserver`、`resize`、`pageshow`、`visualViewport` 任一觸發都會重算。
- 不使用 `inset` 縮寫（舊版 iOS 不支援）。
- **畫面底部紅色錯誤條**：任何錯誤都會顯示（附版本號），點一下關閉；右下角小字是版本號，方便確認 iPad / iPhone 是否已更新。發布請用 `node tools/release.js v8`（同時更新 `APP_VERSION` 與 `sw.js` 的 `VERSION`）。

## 8. 測試

`npm test`（或 `./tests/run.sh`）跑全部 Node 測試；`npm run test:e2e`（或 `./tests/run.sh --e2e`）加跑瀏覽器端到端。
- `tests/core.test.js`（79 項）：RNG、合併、計分、將死、物理、發射、模式規則（hook）、Profile（遷移 / 買 / 選 / 入帳 / 破紀錄 / 通關）、Flow 轉換、關卡、音效事件。
- `tests/golden.test.js` + `tests/golden/physics.json`：**物理基準回歸**（5 組種子 × 3 種長度，每組 16 顆杯子，精度 1e-6）。基準已與最早的原型逐位元對照過；若是刻意改手感才用 `node tests/golden.test.js --update` 重新產生。
- `tests/i18n.test.js`（7 項）：中英 key 一致、`{變數}` 一致、程式用到的 key 都有翻譯、每種生物都有名稱、英文不含中文。
- `tests/e2e/run.py`（34 項，Playwright + Chrome，可用 `CHROME_PATH` 指定）：選單 / 暫停 / 輸 / 重玩、發射與音效、VP 入帳與解鎖、存檔損壞、關卡（首次獎勵只一次）、語言記憶、PWA 與離線、iPhone 觸控、桌面尺寸為 0 時迴圈不死、錯誤條行為。
- `tests/_load.js`：從 `index.html` 取出核心（`loadCore()`）與 `STR`（`extractObject`）。
- 網址參數：`?kinds=N`、`?seed=N`。除錯掛鉤：`window.SC`、`window.__game`。

## 9. 開發順序

1. ✅ 分層重構（手感不變）+ 測試 + 本文件
2. ✅ Flow 狀態機、選單 / 暫停 / 結算覆蓋層
3. ✅ 存檔 v2、VP（勝利點）、依序解鎖、生物選擇頁
4. ✅ 關卡模式（目標：每種做出國王），3 關；多語言（英文預設 / 繁體中文）
5. ✅ 貼圖渲染（有圖就用、沒圖退回程式繪製）；等 ChatGPT 的龍圖片放進 `art/dragon/`
6. ✅ Web Audio 合成音效
7. ✅ PWA（離線、加到主畫面）
8. 之後：道具、貼圖（Step 5）
