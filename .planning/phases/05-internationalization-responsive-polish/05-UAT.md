---
status: testing
phase: 05-internationalization-responsive-polish
source: [05-VERIFICATION.md]
started: 2026-08-19T02:04:47Z
updated: 2026-08-19T02:04:47Z
---

## Current Test

number: 1
name: Dashboard + Create signed-in language toggle (no-reload)
expected: |
  Signed in, LanguageToggle is visible top-right on both Dashboard and Create, and clicking it flips ALL t()-driven text zh-TW<->en instantly with no navigation/reload; document.documentElement.lang syncs.
awaiting: user response

## Tests

### 1. Dashboard + Create signed-in language toggle (no-reload)
expected: All t()-driven text on Dashboard/Create flips zh-TW<->en instantly, no navigation/reload; toggle visible top-right on both; document.documentElement.lang syncs.
why_human: Requires a signed-in Google OAuth session + running backend to reach Dashboard/Create.
result: [pending]

### 2. 375px overflow + tap targets on creator/gate pages
expected: At 375px (DevTools device toolbar), no horizontal scrollbar on Dashboard (empty + populated invitation states), Create form, and InvitationGatePage loading/expired states; computed box of logout, Back link, show/hide-password eye icon, and goHome link each >=44x44px.
why_human: Computed box sizes + live overflow at 375px are not provable by static grep; signed-in pages need the backend.
result: [pending]

### 3. Recipient flow 375px walkthrough + No-button dodge unchanged
expected: At 375px, on a live /i/:code, walk PasswordGate -> InvitationReveal -> DodgeCounter -> MessageCard -> PostcardKeepsake -> expired state; no horizontal overflow anywhere; Unlock/Download/Yes tap targets >=44px; the No button still dodges with unchanged escalating behavior (STAGES 1-5).
why_human: Requires a live password-gated invitation with a real photo; dodge "feel" is a runtime/tactile judgment.
result: [pending]

### 4. Fast-3G <3s recipient load (D-10)
expected: Under DevTools Fast 3G throttling, hard-reload a live /i/:code, enter the password; the personalized page (title + photo, LCP) is VISIBLE and Yes/No are CLICKABLE within 3 seconds.
why_human: Flagged, human-timed measurement (D-10); requires live backend + real invitation + real photo; no automated load-test harness exists.
result: [pending]

### 5. Recipient photo is WebP ~100-200 KB (D-09)
expected: In DevTools Network, the recipient photo request has Content-Type image/webp and transferred size roughly 100-200 KB (backend pipeline output; no code added this phase).
why_human: Requires the backend to serve a real uploaded photo; not producible by static analysis.
result: [pending]

### 6. Photo fade-in has no layout shift (CLS ~ 0, D-07a)
expected: With a real photo, the InvitationReveal photo loads (skeleton -> fade) and the Yes/No row below does NOT visually jump; the aspect-[4/3] box holds its footprint throughout.
why_human: Requires a live photo to observe the actual load transition; class/attribute presence is code-confirmed but the visual no-jump outcome is not.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
