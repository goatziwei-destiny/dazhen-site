# LINE 素材總目錄（大正）

所有 LINE 相關素材的索引。**網站實際引用的圖不要搬位置**（搬了卡片和閱讀頁會破圖），所以這裡是「分類說明＋原始檔備份」。

## 一、網站實際用的圖（照原路徑，不要動）
| 類別 | 路徑 | 用在哪 |
|---|---|---|
| 歡迎輪播／歡迎卡 | `static/images/line/welcome-*`、`wc-*` | 加好友歡迎訊息（傳「歡迎訊息」可重看） |
| 服務方案卡 | `static/images/line/service-*`、`title-*` | 客人傳「服務方案／價格」 |
| 文字版方案卡 | `static/images/line/text-*`、`btn-text`、`btn-one` | 文字版諮詢介紹卡 |
| 圖文選單 | `static/images/line/menu-*` | LINE 下方選單 |
| 加好友 QR | `static/images/line-qr.png`、`static/line-qr.js` | 網站、名片 |
| 文字版諮詢（閱讀頁＋開場動畫） | `static/images/mingshu/` | 預約系統 `Mingshu.html`、LINE 卡片、Email |

## 二、文字版諮詢素材原始檔：`text-consult/`（2026-11-08 動畫定稿）
- `animation-frames/`：開場動畫六張（closed 闔書、half 半開、open 全開、t1–t3 翻頁）
- `page-art/`：內頁用圖（圓章花飾、星形分隔線、淡綠底、紙紋、羊印、問題水彩、章節圓環、線）
- `covers/`：Email 封面 1200×1200、LINE 卡片 1040×688、燙金闔書去背原檔
- `design-samples/`：定稿設計樣張（第一頁 A3-V1 捲角紋、第二頁 P2A 留白）
- `animation-preview-final.html`：定稿動畫預覽，直接用瀏覽器打開就能播
- `tools/overlay-gold-logo.py`：把燙金標誌疊到 GPT 畫的書上

## 三、影片與其他
- LINE 預約影片、官網影片：專案文件 `claude/videos/line-booking-promo-*`、`LINE預約與官網影片_交接.md`
- 背景音樂：`claude/videos/背景音樂_*`
- 設計過程與三方討論（GPT／Codex／Claude）：分支 `mingshu-drafts` 的 `drafts/mingshu/`

## 改名紀錄
「命書」→「紫微斗數文字諮詢」（2026-11-08）。雲端硬碟語音資料夾仍叫「命書語音」，沒改。
