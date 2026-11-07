# Claude 第三輪：手機／電腦排版、長文、Email（給 GPT）

日期：2026-11-07。範圍：目前上線的 `src/Mingshu.html`（dazhen-booking）＋ `LineCards.gs` 的 `mingshuBodyHtml_` ＋ Email（`TextReply.gs` 的 `buildTextReplyEmail_`、`Mail.gs` 的 `mailShell_`/`MUI_`）。

## 一、實測結果（Playwright，寬 320／360／390／768／1280，內容故意塞很長：25 段×480 字、120 字不斷行網址、很長的小標題）
- 沒有橫向捲動、沒有元素超出畫面（`overflow-wrap:anywhere` 有效）。
- 問題框、建議框的 9-slice（四角固定、只拉中間）在 320 也正常。
- 電腦寬螢幕：內頁固定 560px 置中，兩側是紙紋，沒有跑版。
- **會出問題的只有新標題**：`h1` 現在是 44px＋字距 16px。換成八個字的「紫微斗數文字諮詢」，在 ≤ 約 500px 寬會折成兩行（320 時 4＋4 字，右邊還多出一截字距）。
  → 新版要改成 `font-size:clamp(24px,7.2vw,44px)`、字距用 `.3em`、`text-indent` 同值，確保手機一行放得下。GPT 畫的版面請以「標題一行、約 8 字寬 ≈ 版心 85%」為準。
- 書眉「王小明文字諮詢」：姓名可能很長，書眉要能縮字或省略（`text-overflow:ellipsis`），不能撐寬。

## 二、會不會自動換頁？
- **不會。** 閱讀頁是一整條往下捲的長頁（`.stage.done{height:auto}`），沒有分頁。內容最多四段（問一、問二、命盤重點、建議），每段不限長度。
- 實測 25 段長文時約 3.5 萬 px 高（手機），仍順暢，沒有效能問題。
- 建議（Claude 的）：不做真的分頁（LINE 內建瀏覽器翻頁手勢容易誤觸，PDF 也會斷）。改成：維持長捲＋章節（壹貳參肆）是天然分頁點；若很長，可在最上面加一排小目錄（壹／貳／參／肆，點了捲到該章）。紙紋背景已是 `repeat-y`，長度無上限。
- 「GPT 畫的是一張 2:3 書頁」只是**第一屏的樣子**。往下是同一張紙紋延伸，頁碼、書眉不需要每頁重複（列印／存 PDF 才需要，`@media print` 已處理）。

## 三、Email
目前 Email：`mailShell_`（外層表格，`width:100%; max-width:580px; table-layout:fixed`，全部 inline style，`role=presentation`）＋最上面一張 240px 封面圖連到閱讀頁＋「打開你的命書」按鈕＋下面附全文。

幾個事實：
1. Email 客戶端**不吃** `border-image`（9-slice）、`mix-blend-mode`、`clamp()`、`::before`、自訂字型、`background-size`（Outlook）。所以信裡**不能**複製命書的版面，只能放「圖片」。
2. 信裡只放：封面圖（一張 `<img>`，絕對網址，附 alt）＋按鈕＋全文純文字（照現在 B 風格）。可選：一張小的水彩分隔線圖（`<img>`，不要做成背景）。
3. **「幽靈表格」**（Outlook 桌面版用 Word 引擎，無視 `max-width`，表格會撐滿整個視窗）的標準解法：在外層表格前後包 Outlook 專用條件註解：
   `<!--[if mso]><table role="presentation" width="580" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->` … 內容 … `<!--[if mso]></td></tr></table><![endif]-->`
   其他客戶端會把這段當註解略過，只有 Outlook 會多出這個「幽靈」固定寬表格，把版面鎖在 580px。目前 `mailShell_` **沒有**這段；Gmail／iOS 郵件沒問題，Outlook 桌面版會變很寬。
   → 如果大正說的「幽靈表格」是指別的症狀（例如信裡多出空白格、或 Gmail 多出一條線），請 GPT 回報是哪一封、截圖，再對症處理。
4. 暗色模式：封面圖是淺色紙紋，暗色下可能反白；建議封面圖外加 `bgcolor` 同色底，且不要用透明 PNG。

## 四、請 GPT 確認／回覆
- 同意：Email 不複製命書版面，只放「封面圖＋按鈕＋全文」。若要做信用封面，請出一張 **1200×1200（顯示 600）的 jpg**：標題「紫微斗數文字諮詢」＋客人名，不要有大面積透明。
- 標題 clamp 規格、書眉省略規格是否 OK？
- 對 V1／V2／V3 的限制（V1 平弧、V2 簡化如意、V3 星軌與山羊座分開）：Claude **接受**。星座依 NASA 星圖為準，不再堅持我先前描述的左右方向。
- 還在等大正指定 V1／V2／V3 其中之一，定了之後再處理徽章與標題位置。
