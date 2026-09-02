# Phase 3: Recipient Experience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 03-recipient-experience
**Areas discussed:** No 按鈕行為, 慶祝動畫, 密碼門頁面, Yes 後的訊息流程

---

## No 按鈕行為

### 升級階段設計

| Option | Description | Selected |
|--------|-------------|----------|
| 3 階段漸進 | 溫柔躲開→緊張躲避→縮小消失 | |
| 4 階段經典 | 輕推→迫切躲避→瞬移→抖動 | |
| 你決定 | Claude 根據 Motion 彈簧物理引擎設計 | ✓ |

**User's choice:** 你決定
**Notes:** Claude has discretion on escalation design

### 拖尾特效

| Option | Description | Selected |
|--------|-------------|----------|
| 愛心 | 每次躲避留下淡淡的愛心 | |
| 星星火花 | 躲避軌跡留下閃爍的星星粒子 | ✓ |
| 混合 | 早期愛心，後期火花 | |
| 你決定 | Claude 選擇最適合的粒子效果 | |

**User's choice:** 星星火花

### 手機觸控

| Option | Description | Selected |
|--------|-------------|----------|
| 觸碰即躲 | 手指靠近就躲開 | |
| 點擊後躲 | 要實際點到才躲 | |
| 你決定 | Claude 選擇最好的方案 | ✓ |

**User's choice:** 你決定

---

## 慶祝動畫

| Option | Description | Selected |
|--------|-------------|----------|
| 撒花 confetti | 經典撒花效果 | |
| 愛心雨 | 滿屏愛心飄落 | |
| 爆炸特效 | 粒子從 Yes 按鈕位置爆開 | |
| 你決定 | Claude 選擇最有視覺衝擊的效果 | |

**User's choice:** Other — 只需要轉場就可以了，當前頁面右移退出，新頁面從左邊進來
**Notes:** User explicitly rejected celebration animations. Wants clean slide transition only.

---

## 密碼門頁面

### 視覺風格

| Option | Description | Selected |
|--------|-------------|----------|
| 簡潔卡片 | 置中白色卡片，密碼輸入框 + 解鎖按鈕 | |
| 神秘信封 | 信封圖示 + 打開動畫 | |
| 你決定 | Claude 設計最合適的密碼門視覺 | ✓ |

**User's choice:** 你決定

### 錯誤回饋

| Option | Description | Selected |
|--------|-------------|----------|
| 抖動提示 | 輸入框抖動 + 紅邊框，不限重試 | ✓ |
| 次數限制 | 最多 5 次嘗試 | |
| 你決定 | Claude 選擇 | |

**User's choice:** 抖動提示

---

## Yes 後的訊息流程

### 訊息輸入 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 滑入卡片 | 從左側滑入，配合轉場效果 | ✓ |
| 全屏新頁面 | 跳到新的全屏頁面 | |
| 你決定 | Claude 設計最流暢的體驗 | |

**User's choice:** 滑入卡片

### 送出後體驗

**User's choice:** Other — 自定義設計
**Notes:** User wants: (1) Postcard/letter folding into envelope animation after send (if feasible, else simple transition), (2) Final screen as a postcard-style keepsake with invitation title + photo, (3) If possible, make the postcard downloadable as image. Difficulty-based fallback allowed.

---

## Claude's Discretion

- No button escalation stages and physics parameters
- Mobile touch dodge mechanism
- Password gate visual design
- Postcard fold animation complexity (based on implementation effort)
- Postcard download implementation (canvas-to-image vs display only)

## Deferred Ideas

None
