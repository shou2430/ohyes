---
status: complete
phase: 05-internationalization-responsive-polish
source: [05-VERIFICATION.md]
started: 2026-08-19T02:04:47Z
updated: 2026-09-01T10:29:08Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard + Create signed-in language toggle (no-reload)
expected: All t()-driven text on Dashboard/Create flips zh-TW<->en instantly, no navigation/reload; toggle visible top-right on both; document.documentElement.lang syncs.
why_human: Requires a signed-in Google OAuth session + running backend to reach Dashboard/Create.
result: pass
evidence: "2026-09-01 UAT on dev :5173 (JWT-injected session). Toggling 繁->EN on Dashboard flipped ALL text (登出->Log out, 剩餘 7 天->7 days remaining, 複製連結->Copy link, 刪除->Delete, 建立邀請->Create Invitation) with NO page reload — Network panel (Preserve log on) showed only XHR fetches (notifications, invitations), zero document/JS/CSS re-requests. The invitations XHR is the known [t]-dep data refetch, an in-place update, not a navigation. Create page uses the identical LanguageToggle + t() mechanism."

### 2. 375px overflow + tap targets on creator/gate pages
expected: At 375px (DevTools device toolbar), no horizontal scrollbar on Dashboard (empty + populated invitation states), Create form, and InvitationGatePage loading/expired states; computed box of logout, Back link, show/hide-password eye icon, and goHome link each >=44x44px.
why_human: Computed box sizes + live overflow at 375px are not provable by static grep; signed-in pages need the backend.
result: pass
evidence: "Verified in the 2026-08-19 UAT session (Dashboard + Create visually clean at 375px via screenshots; tap targets meet 44px)."

### 3. Recipient flow 375px walkthrough + No-button dodge unchanged
expected: At 375px, on a live /i/:code, walk PasswordGate -> InvitationReveal -> DodgeCounter -> MessageCard -> PostcardKeepsake -> expired state; no horizontal overflow anywhere; Unlock/Download/Yes tap targets >=44px; the No button still dodges with unchanged escalating behavior (STAGES 1-5).
why_human: Requires a live password-gated invitation with a real photo; dodge "feel" is a runtime/tactile judgment.
result: pass
evidence: "Verified in the 2026-08-19 UAT session (reveal 375px clean; No button dodges on desktop hover AND touch tap — Phase 3 behavior, unchanged by Phase 5, NoButton untouched since commit 3dfbce6)."

### 4. Fast-3G <3s recipient load (D-10)
expected: Under DevTools Fast 3G throttling, hard-reload a live /i/:code, enter the password; the personalized page (title + photo, LCP) is VISIBLE and Yes/No are CLICKABLE within 3 seconds.
why_human: Flagged, human-timed measurement (D-10); requires live backend + real invitation + real photo; no automated load-test harness exists.
result: pass
evidence: "2026-09-01 UAT on production preview :4173 (VITE_API_URL baked), invitation mafv10W / photo 147 KB webp. Chrome renamed the old 'Fast 3G' preset to 'Slow 4G' (same 1.6 Mbps / 562ms RTT profile). Under Slow 4G (= Fast 3G): verify 611ms, photo 1.39s single request; title + Yes/No visible at ~0.6s, photo fully visible ~2.0s — well under 3s. (Harsher 'Slow 3G'-equivalent '3G' preset measured 4.97s, outside the D-10 target, not a failure.) Backend access log corroborates a single photo GET per reveal (photo-GET count == verify count), confirming the double-fetch is gone."

### 5. Recipient photo is WebP ~100-200 KB (D-09)
expected: In DevTools Network, the recipient photo request has Content-Type image/webp and transferred size roughly 100-200 KB (backend pipeline output; no code added this phase).
why_human: Requires the backend to serve a real uploaded photo; not producible by static analysis.
result: pass
evidence: "2026-09-01: /api/photos/mafv10W.webp served Content-Type image/webp, 147,508 bytes (~144 KB), within the 100-200 KB target (curl -D and DevTools both 148 kB). Matches the prior CmmUrna.webp 143 KB result."

### 6. Photo fade-in has no layout shift (CLS ~ 0, D-07a)
expected: With a real photo, the InvitationReveal photo loads (skeleton -> fade) and the Yes/No row below does NOT visually jump; the aspect-[4/3] box holds its footprint throughout.
why_human: Requires a live photo to observe the actual load transition; class/attribute presence is code-confirmed but the visual no-jump outcome is not.
result: pass
evidence: "Verified 2026-08-19 (photo in aspect-[4/3] box, no visible jump in reveal) and re-confirmed 2026-09-01 (reveal screenshots on :4173 show the photo filling the fixed 4/3 box with Yes/No stable below)."

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — all 6 items passed]
