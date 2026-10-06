# 命運書庫｜開發交接

最後更新：2026-10-06

## 目前上線位置（claude.ai Artifact）
- 命運書庫：https://claude.ai/artifact/KJccMJZt65qsxRvqekxMVG （v21，任何有連結的人可看）
- 抽牌小遊戲：https://claude.ai/artifact/NoC8VTWHFnS5E5Wji7r6wq （v13，私人）

這兩個 Artifact 是從 `dist/game.html`、`dist/duo.html` 發布的。

## 工作慣例（大正的要求）
- 用中文溝通，說法要白話。
- 每次修改都要用截圖檢查**橫式和直式**，有問題先自己修，修好再發布。
- 回報時講清楚：改了什麼、自己修了什麼、還缺什麼、哪些需要大正判斷。
- 素材由大正用 GPT 繪製，原檔在大正電腦的 `羊的形象/素材庫-v01/像素風/`（場景／人物分鏡／道具／卡牌）。
- dazhen-site 推到 main 會觸發 Netlify 建置並消耗免費點數，所以修改要集中做，先給預覽再上線。

## 程式架構（src/game-src.html）
- **劇本**：`const S={場景:[beat…]}`。場景有 intro menu back booking shelf draw duo tgo temple tc td te palace faq basics rules star notes goat。
  每個 beat 可以有：`say`（台詞）、`pose:'名稱:幀>幀@秒'`、`fx`（特效／動畫）、`dur`、`stay`（停下來等使用者）、`dg`（圖解）、`ch`、`to`。
- **主要函式**：
  - 流程：`enter(sc)` 進場景、`act(id)` 按鈕／點擊、`update`、`render`、`poseFrame`、`dialog`。
  - 佛堂：`TP`／`tp()` 是座標表（橫 w／直 t）；`drawTempleBack`、`drawTempleFront`、`sceneTemple`（對話框內 2×2 選單）、`lampList`／`lampsLit`／`merit`。
  - 書庫的門：`drawDoor` 用背景本身的門板做開門動畫（門軸在左），範圍在 `LEAF`。
  - 抽牌小遊戲（近景）：`closeUp()`、`duoScene`、`CT`（動畫時間表）、`castGeo`、`cardAt`、`castCards`、`glowCard`、`duoPos`、`drawDuo`、`IDBOX`（開場對話框位置）。
- **截圖模式**：網址加 `?capture`（直式再加 `&tall`）。會開出 `window.__step(n)`、`__act(id)`、`__poke()`、`__sel`、`__state()`、`__regions()`。

## 已定案的設計
- **小佛堂**：
  - 背景用 32／33（準提佛母）。大正全程跪坐在右側，面向供桌。
  - 燈從大正那側（右）往書架那側（左）逐盞點亮。
  - 經典在「供經」之前，用 `tnsw`／`tnst` 補丁蓋成空經架；供經時，跟背景同一本的經書（`p_sutB`）飛上經架。
  - 選單放在底部對話框裡，2×2 排列；不放拜墊；名稱叫「宗教小學堂」。
- **抽牌小遊戲**：流程依序是：
  1. 開場用圖 36。台詞打在圖上的米白框裡；開場是正方形圖，兩側用模糊延伸補滿。
  2. 卡背（閉眼山羊，`cardk`）一張張從舉起的袖口飛出，落到手上。
  3. 魔法繞圈洗牌。
  4. 展開扇形。卡片本身發金光，不用虛線光環。
  5. 抽兩張飛到中間，翻面。
  6. 用主題提示和行動提示解說。

## 待辦／等大正決定
- 洗牌繞圈的速度和幅度是否要調整。
- 「開始抽牌」按鈕在橫式時放在右側模糊區；要不要改放進對話框右下角。
- 星曜卡面：卡面框 A（極簡金線）和定稿 01–13 已完成，破軍還是草稿。要等 14 張到齊一起換，還是先換。
- 直式佛堂：大正的手剛好在桌巾蓮花前面，看起來像拿著蓮花，待確認。
- 上線方式：要不要把 `dist/game.html` 放進 dazhen-site 的 `static/`，成為網站的一頁。
