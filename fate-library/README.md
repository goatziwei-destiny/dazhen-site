# 命運書庫（fate-library）

大正命理諮詢的像素風互動頁。整個網站是**一個 HTML 檔**：canvas 遊戲引擎，所有圖片、字型和音樂都內嵌在裡面。同一份原始碼可以建出兩個版本：

| 版本 | 輸出 | 說明 |
|---|---|---|
| 命運書庫 | `dist/game.html` | 完整互動頁：書庫、十二宮圖鑑、抽卡、預約、小佛堂、FAQ… |
| 大正的抽牌小遊戲 | `dist/duo.html` | 只有雙卡抽牌，近景版（`DUO_GAME=true`） |

> 這個資料夾**不會**被 Hugo 發佈，放在 dazhen-site 只是為了保存和開發。要上線時，把 `dist/game.html` 複製到 `static/` 底下（會觸發一次 Netlify 建置）。

## 資料夾

```
fate-library/
├─ src/game-src.html        原始碼（唯一要改的程式檔），內含 __SPR__ __FM__ __FONT__ __AUDIO__ 佔位
├─ assets/
│  ├─ sprites/*.webp|png    所有圖片（背景、角色動作、道具、卡牌…），檔名＝程式裡的 sprite key
│  ├─ manifest.json         main / duo 兩個版本各用哪些圖（duo 的半身圖 h1_0… 用 *_duo 版本）
│  ├─ frames-main.json      每張圖的尺寸與錨點（w,h,hx,sh；部分有 x,y,cx,cy,hpx,hpy…）
│  ├─ frames-duo.json       duo 版本用的同一份資料
│  └─ media/                Cubic 11 像素字型、背景音樂 loop.mp3
├─ tools/
│  ├─ build.py              打包 → dist/
│  └─ shots.py              用 Playwright 自動截圖檢查（橫式 1920×1080／直式 1080×1920）
└─ HANDOFF.md               開發交接：架構、慣例、已做決定、待辦
```

## 建置與檢查

```bash
pip install fonttools brotli playwright
python3 tools/build.py              # 產生 dist/game.html、dist/duo.html（以及可直接開的 local-*.html）
python3 tools/shots.py wide '[{"act":"temple","t":3,"shot":"a"}]'
python3 tools/shots.py tall '[{"act":"duogo","t":5,"shot":"b"}]' local-duo.html
```

`dist/` 和 `shots/` 不進版控。

## 新增或替換圖片

1. 把圖轉成 webp（背景 quality 約 86–90，角色和道具約 92），放進 `assets/sprites/<key>.webp`
2. 在 `manifest.json` 的 `main`（和需要的話 `duo`）加上 `"<key>": "<檔名>"`
3. 在 `frames-*.json` 加上 `"<key>": {"w":…, "h":…, "hx":…, "sh":…}`
4. 程式裡用 `sprite('<key>', x, y, w, h)` 畫出來

## 網站版（LINE 用，2026-10-15）

`python3 tools/build.py web` → `dist/web/library/`（index.html＋img/＋音樂）。整個資料夾複製到 `dazhen-site/static/library/`，上線後網址是 `/library/`，LIFF 的 Endpoint URL 填這個網址。

- 圖片拆成獨立檔，開場只載入 `assets/groups.json` 的 `core`（約 1.8 MB），進場景前才載入該場景的 group，畫面右下角會短暫出現「載入中」。
- 新增圖片：放進 manifest 後，也要加進 groups.json 對應的 group（例如佛堂的圖放 `temple`）。忘了加也不會壞，第一次畫到時會自動補載，只是會晚一點出現。
- 圖片在網站版會重新壓成 webp quality 80（肉眼看不出差別），原檔不動。檔名含內容雜湊，搭配 netlify.toml 的長期快取設定，客人第二次打開幾乎不用重新下載。
- 網站版的連結用本站網址、在同一個視窗開（LINE 裡不會跳出去）。
