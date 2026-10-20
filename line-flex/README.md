# LINE 服務方案卡片（Flex Message）

> 2026-10-20 已接進預約系統並部署（dazhen-booking `src/ServiceCards.gs`＋`handleLineTextMessage_`）。客人在 LINE 傳「服務方案／價格／收費…」就回一對一兩張卡片。文字版還沒開放（`LINE_TEXT_PLAN_OPEN_ = false`）。

## 是什麼
客人在 LINE 傳「服務方案」（或點圖文選單），大正自動回兩張可左右滑的卡片：
1. **服務與收費**：插圖（大正戴耳機視訊）、四個重點、60 分鐘 NT$3,600、「立即預約」按鈕。
2. **預約與準備**：插圖（客人用平板付款回報）、四個步驟、特別注意事項（退費那條粗體加底線）、「填寫預約表單」按鈕。

內容照大正給的兩張設計稿（服務與收費 01/02、預約與準備 02/02）抄的；配色沿用設計稿的米白、墨綠、金色。LINE 卡片只能用手機內建字型，所以沒有設計稿的書法標題字。

## 檔案
| 檔案 | 用途 |
|---|---|
| `service-cards.flex.json` | **真正的 Flex Message 資料**（`type: flex`，carousel 兩張 mega bubble），接進預約系統時直接用 |
| `preview.html` | 仿 LINE 聊天室的預覽頁（插圖內嵌），瀏覽器直接打開；有左右箭頭和「兩張並排」 |
| `preview-template.html` | 預覽頁原始檔（插圖用 `__HERO1__`／`__HERO2__` 佔位，改完要重新嵌圖） |
| `../static/images/line/service-1.jpg`、`service-2.jpg` | 兩張插圖（從設計稿裁出、1040px 寬、16:9）。JSON 裡的網址是 `https://dazhen-site.netlify.app/images/line/service-1.jpg`，**網站部署後才讀得到** |

預覽連結（claude.ai Artifact，只有大正看得到）：https://claude.ai/artifact/JTdVJaUF9suU7MiveNAWqL

## 接進預約系統的做法（還沒做）
- `dazhen-booking/src/Code.gs` 的 `doPost` → `handleLineTextMessage_` 已經在處理 LINE 文字訊息（訂單編號、改約、末五碼），用 `sendLineReply_(replyToken, [...])` 回覆。
- 加一條規則：文字是「服務方案」（可再加「方案」「價格」「收費」等）時，`sendLineReply_(replyToken, [這份 JSON])`。用 reply 不扣 LINE 訊息額度。
- 圖文選單可以加一格「服務方案」，動作設「傳送文字：服務方案」。
- 價格、文字以後要改：只改 JSON（或在 Apps Script 裡的同一份物件），不用重畫圖。

## 等大正決定
1. 文字、顏色、順序有沒有要改。
2. 第 1 張「確認**你**的命盤」要不要統一成「您」（其他地方都用「您」）。
3. 確認後：插圖要隨網站部署一次（消耗 Netlify 點數），再改預約系統。

## 2026-10-20 現況
- 檔案：`service-cards.flex.json`（一對一）、`text-cards.flex.json`（文字版）、`choose-card.flex.json`（方案選擇卡）。三份都由 `preview-template.html` 產生（改完執行 `python3 build.py`，再用瀏覽器開 `preview.html#one`／`#text`／`#choose` 取出 JSON）。
- 預約系統裡的版本在 `dazhen-booking/src/ServiceCards.gs`，插圖網址改成 `raw.githubusercontent.com/.../main/static/images/line/`（公開 GitHub，不經 Netlify；4 張圖用 `[skip ci]` 推到 main，沒有觸發網站部署）。改文字要兩邊都改。
- 文字版開放時：把 `LINE_TEXT_PLAN_OPEN_` 改成 `true` 並部署，「服務方案」會先出選擇卡；文字版表單做好後，把 `text-cards` 第 2 張按鈕網址換成表單網址（目前暫連預約頁）。
- 圖文選單：建議改小尺寸（2500×843），加一格「服務方案」，動作設「傳送文字：服務方案」。
