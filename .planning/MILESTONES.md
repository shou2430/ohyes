# Milestones

## v1.0 v1 Launch (Shipped: 2026-09-01)

**Phases completed:** 5 phases, 17 plans, 32 tasks

**Delivered:** A complete playful-invitation platform — Google OAuth creators build password-gated "Will you...?" pages with an escaping No button, recipients say Yes and send a 30-char message, creators get notified, and everything auto-expires after 7 days. Bilingual (zh-TW/en), mobile-first, deployed on Railway.

**Stats:** 216 commits · 191 files changed (+30,825 / −15) · 2026-05-04 → 2026-09-01 (~120 days)

**Key accomplishments (one per phase):**

- **Phase 1 — Foundation & Auth:** Google OAuth end-to-end with localStorage JWT persistence + Bearer auth on all API calls; `OAuthError` handling redirects cleanly on CSRF mismatch, expired state, or denied consent. Deployed to Railway (FastAPI + React + PostgreSQL + volume).
- **Phase 2 — Invitation Creation & Management:** Backend invitation model + Pillow photo pipeline + 5 API endpoints, and a frontend creation form, dashboard cards (max-2 limit), and recipient password gate with unique shareable URLs.
- **Phase 3 — Recipient Experience:** The signature moment — password gate → personalized reveal → escalating 5-stage escaping No button with sparkle trails + dodge counter → Yes celebration → 30-char message dialog → invitation deletion + creator notification.
- **Phase 4 — Notifications & Lifecycle:** Owner-scoped `GET/POST /api/notifications` wired to a heart-icon bell/panel/row surface (30s poll, one-shot bounce, unread highlight), plus an advisory-lock-guarded hourly APScheduler sweep that deletes expired invitations (row + photo) and prunes notifications past the 30-day retention window in one transaction.
- **Phase 5 — i18n & Responsive Polish:** 繁/EN toggle via i18next (zh-TW default, no-reload, 79/79 key parity), a 375px Tailwind audit-and-fix with ≥44px tap targets (No button left byte-for-byte exempt), and route code-splitting (main bundle 148.71 → 93.15 kB gzip) for the sub-3s mobile load target.

---
