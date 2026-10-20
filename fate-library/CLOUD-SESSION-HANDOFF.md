# 命運書庫｜雲端對話交接給桌面版 Claude

> 給桌面版 Claude：這份是大正在 claude.ai 雲端對話（2026-09-28～10-14）做的進度整理。
> 請依序讀：① 這份 → ② `fate-library/HANDOFF.md`（程式架構與已定案設計）→ ③ `dazhen-booking/HANDOFF.md`（預約系統、部署方式）。
> 回覆大正請用繁體中文、白話、少用術語；他用語音輸入，常有錯字，要推測原意，不確定就問一個問題。

## 1. 東西在哪裡

| 項目 | 位置 |
|---|---|
| 命運書庫原始碼 | GitHub `goatziwei-destiny/dazhen-site`，分支 **`claude/brand-webpage-community-features-gd4s2n`**，資料夾 `fate-library/` |
| 唯一要改的程式檔 | `fate-library/src/game-src.html` |
| 素材 | `fate-library/assets/sprites/`（遊戲用，已切好縮小）；`fate-library/assets/originals/`（大正上傳的 GPT 原圖） |
| 打包 | `python3 fate-library/tools/build.py` → `dist/game.html`（完整版）、`dist/duo.html`（抽牌小遊戲）、`dist/web-duo.html`（網站用） |
| 網站上的抽牌頁 | `static/draw/index.html`（＝ `dist/web-duo.html` 複製過去），上線後網址 `/draw/` |
| 參考影片 | 大正在 Threads 看到的動畫錄影（另外給你，沒有放進 GitHub） |

建置需要：`pip install fonttools brotli playwright pillow`。截圖檢查：`python3 tools/shots.py wide|tall '<plan>' local-game.html`（說明在 README）。

### 目前狀態（2026-10-14）
- 工作分支**還沒合併到 main**，正式網站沒有任何變動。
- main 之後有別的對話推了新東西（部落格改版等）。我測過，這個分支合併進現在的 main **沒有衝突**；分支在 fate-library 以外只多了 `static/draw/index.html` 一個檔案。
- dazhen-site 推到 main 會觸發 Netlify 建置、**消耗免費點數**，所以要等大正說「上線」才合併。
- dazhen-booking 的同名分支內容已經和 main 一樣（我改過舊版動畫後又撤回），沒有要合併的東西。

## 2. 這次做了什麼

### 抽牌小遊戲（duo，抽兩張星曜卡）
1. 牌一開始就在大正手上（不再從袖口飛出）→ 繞圈洗牌 → **在手上展開扇形**。
2. 扇形 7 種隨機（標準、寬、半圓、內外兩層、往左斜、往右斜、螺旋），不會連續一樣，牌的順序和攤開方向也隨機。半徑限制在下巴以下，不擋臉。
3. 扇形停住，**客人自己點兩張**（提示框顯示「還要選幾張」），兩張都選好才飛上去翻面。錄影模式 `?capture` 會自動選。
4. 結尾按鈕：「再抽一次」＋「預約諮詢」（連到 `/booking/`）。
5. 開場圖換成大正補的**滿版新圖**（直式 1080×1920、橫式 1920×1080），米白框位置 `IDBOX` 已重量；直式標題後加半透明深色底。
6. duo 只打包實際用到的圖：12 MB → 5.9 MB。
7. LINE 用法：圖文選單某一格設「連結」，網址填 `https://dazhen-site.netlify.app/draw/`（網站上線後才有效）。

### 羊的小佛堂（完整版 game）
1. 改名「羊的小佛堂」（選單、進門台詞、佛堂內）。
2. 選單分兩頁（`TMENU`／`TPAGE`），「回到命運書庫」移到左上角。
   - 第 1 頁：經典只能抄或念嗎？／持咒計數／迴向功德
   - 第 2 頁：抄好的經典怎麼處理？（tf）／迴向文要怎麼說？（tg）／做善事可以有目的嗎？（th）
3. tc（經典）：抄經動畫照舊；第二句改「抄好的經典，請收在乾淨的地方。」（**不再捧經**）；經典**一直在供桌上**；供養文案「可以供奉任何購買、結緣來的經典，安放在清淨的地方，點上香、燈、花，每天禮拜，也是一種修持的方式。」
4. tf（抄好的經典怎麼處理）：圖解框裡
   - 包好丟棄：經書淡出換成包好的經典 → 飛進竹編紙簍。
   - 焚燒：放進香爐 → 小火苗 → 大火在書後、小火在書腳 → 經書換成燒到一半的樣子並往下沉 → 火星、煙 → 餘火 → 灰燼（三張輪播當餘燼閃）。
   - 念心經偈頌「揭諦揭諦，波羅揭諦，波羅僧揭諦，菩提薩婆訶。」時大正張嘴念，打字放慢（beat 可設 `cps`）。
5. tg（迴向文）：沒有固定格式；「你祈禱的對象，是世界上最慈愛、最有智慧的人，一定能明白你的意思。」示範時跪坐閉眼合掌（kneel1）：「我希望我有好吃的牧草，也希望大家都跟我一樣。」光點飄向佛像。
6. th（做善事有目的）：「帶著目的做善事，是可以的。」「完全不求回報，那不是凡人的境界。」「所以，不需要因為有私心，就覺得愧疚。」

### 素材（大正用 GPT 畫，2026-10-07）
p_parcel 包好的經典、p_basket 紙簍、p_burner 香爐、p_bookHalf 燒到一半、p_ash／p_ash0–2 灰燼、p_fireL/S/E0–3 大火／小火苗／餘火各 4 格、p_smoke0–2 煙、cidt／cidw 開場圖。`RIM` 是香爐／紙簍口緣前緣的高度比例。

## 3. 預覽連結（claude.ai Artifact，只有大正看得到）
- 命運書庫完整版（含佛堂）：https://claude.ai/artifact/YX6qSojF53yfRTFUJihPn9
- 抽牌小遊戲（LINE 版）：https://claude.ai/artifact/BEKJKvKFpGWkp48jkmW35D
- 原本公開的命運書庫 https://claude.ai/artifact/KJccMJZt65qsxRvqekxMVG **還沒更新**，等大正確認。

## 4. 待辦／等大正決定
1. **網站上線**：大正說「上線」才把分支合併到 main（會用掉一次 Netlify 點數）。上線後再設 LINE 圖文選單。也可以等搬 Cloudflare 再一起上。
2. **更新公開的命運書庫連結**：要大正同意。
3. ~~檔案大小~~：2026-10-14 已減肥，`game.html` 15.9 → 12.2 MB（詳見 HANDOFF.md）。
4. ~~完整版的「抽兩張」是白卡~~：查過了，那個場景只有預覽模式才進得去，訪客看不到，不需處理。
5. **破軍牌面**還是草稿，等大正補定稿。
6. 參考影片裡的「紙偶動畫」做法（角色手臂分層擺動、整張畫慢慢推近、換場淡入淡出）：大正有興趣，若要套用，需請 GPT 把要動的部位分開畫。
7. 長期：網站搬 Cloudflare（預約系統先不搬；搬網站那天要同時改 `dazhen-booking/src/Code.gs` 的 `BRAND_SITE_URL` 和預約表單字體網址）。

## 5. 大正的工作習慣
- 先給預覽、大正確認後才上線；每次修改都要截圖檢查**橫式和直式**，有問題先自己修。
- 回報講清楚：改了什麼、自己修了什麼、還缺什麼、哪些要大正決定。
- 素材由大正用 GPT 畫；ChatGPT 不能直接寫進 GitHub，大正會自己用網頁上傳到 `fate-library/assets/sprites/`。
- 給 GPT 的提示詞要附參考圖、要求透明背景（做不到就用純綠 #00FF00）、火焰等動畫請它在同一張圖並排畫 4 格。

## 6. 後來加的：LINE 服務方案卡片（2026-10-20）
雲端對話又做了 LINE Flex Message 的「服務與收費／預約與準備」兩張卡片，只到預覽、還沒接進預約系統。說明、JSON、預覽頁在 `line-flex/`（先讀 `line-flex/README.md`），插圖在 `static/images/line/`。
