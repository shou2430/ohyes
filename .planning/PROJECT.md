# OhYes — Say Yes to Connection

## What This Is

A playful invitation platform where anyone can create a personalized "Will you...?" webpage with a custom title, photo, and a mischievous "No" button that runs away from the cursor. Designed for couples, friends, and family to spark joy, repair relationships, or simply make someone smile. Creators log in, customize their page, and share a unique link — recipients enter a password to see the page and (inevitably) click "Yes."

## Core Value

The moment of delight when someone sees a personalized page made just for them and realizes they can't say no — literally.

## Requirements

### Validated

- [x] Google OAuth login for creators — Validated in Phase 01: Foundation & Authentication
- [x] Creator dashboard to manage invitations (max 2 active) — Validated in Phase 02: Invitation Creation & Management
- [x] Create invitation: custom title, photo upload, set 4-8 character password for recipient — Validated in Phase 02: Invitation Creation & Management
- [x] Each invitation generates a unique shareable URL (with unique ID) — Validated in Phase 02: Invitation Creation & Management

### Active
- None — all v1 requirements shipped across Phases 01–05 (milestone v1.0 complete)

### Validated in Phase 03: Recipient Experience
- [x] Recipient enters password to unlock the personalized page
- [x] Personalized page displays: title, photo, Yes button, and a "No" button that increasingly frantically dodges the cursor
- [x] Clicking "Yes" triggers a 30-character message dialog for the recipient
- [x] Clicking "Yes" deletes the invitation data and notifies the creator

### Validated in Phase 04: Notifications & Invitation Lifecycle
- [x] Creator notification box with red dot/heart indicator showing "[Recipient] said yes to your [title]" + optional message
- [x] Invitations auto-expire and are deleted after 1 week (hourly APScheduler sweep, advisory-lock guarded)

### Validated in Phase 05: Internationalization & Responsive Polish
- [x] Bilingual UI (Traditional Chinese default with English toggle, no page reload) — UI-02
- [x] Mobile-first responsive design usable at 375px with ≥44px tap targets — UI-01
- [x] Invitation page loads in under 3 seconds on a throttled mobile connection — UI-03

### Out of Scope

- Real-time chat between creator and recipient — not core to the invitation moment
- Social features (following, sharing, public gallery) — this is private between two people
- Mobile native app — web-first, responsive design covers mobile
- Payment/premium tiers — keep it free and simple for v1
- Email notifications — in-app only for v1

## Context

- Inspired by a viral Instagram Reel where an engineer built a "Will you date me?" page with an escaping "No" button
- Target audience: anyone who wants a playful way to invite someone — not just romantic, also friendship and family
- Deploy on Railway (frontend + backend + PostgreSQL + persistent volume for photos)
- The "No" button behavior is the signature feature — it should feel fun, not frustrating. Starts with gentle dodges, escalates to frantic escapes

**Current state (after v1.0, 2026-09-01):**
- Shipped all 27 v1 requirements across 5 phases (216 commits, ~120 days). Stack: React 19 + Vite + Tailwind v4 + Motion frontend; FastAPI + SQLAlchemy async + asyncpg + PostgreSQL 16 backend; Authlib Google OAuth; Pillow photo pipeline; APScheduler cleanup — all on Railway.
- Backend has a real test suite (throwaway docker/podman postgres:16, ~28 tests green); frontend has a first vitest harness (9 i18n tests). No CI yet — tests run locally, Railway build does not run them.
- **Known tech debt / next-milestone lead:** photo storage on the single-mount Railway volume pins the backend to one container (INFR-V2-01 — migrate to Storage Buckets to unblock horizontal scale). Several Phase 3/5 UAT items remain human-verify-only (no headless OAuth/browser harness). Gateway model-routing for Opus 4.8 unresolved.

## Constraints

- **Tech stack**: React (frontend) + FastAPI (backend) + PostgreSQL (database)
- **Photo storage**: Railway persistent volume (simplest setup, sufficient for v1)
- **Invitation limit**: Max 2 active invitations per user
- **Invitation TTL**: 7 days, then auto-deleted (data + photo)
- **Password**: 4-8 characters, set by creator (not a security feature, just a personal touch)
- **Message limit**: 30 characters max after clicking Yes
- **Deployment**: Railway (single platform for all services)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Google OAuth for auth | Low friction, no password management needed for a casual app | ✓ Validated (Phase 01) |
| PostgreSQL over MongoDB | Structured data, clear relations, better for expiry queries and Railway support | ✓ Validated (v1.0 — powers users/invitations/notifications + expiry sweep) |
| Railway volume for photos | Simplest option, avoids external service dependency for v1 | ⚠️ Revisit (works, but single-mount pins backend to 1 container — INFR-V2-01 migrates to Storage Buckets next milestone) |
| Bilingual (zh-TW + en) | Broaden audience, default Traditional Chinese with toggle | ✓ Validated (Phase 05 — no-reload toggle, 79/79 key parity) |
| Increasingly frantic No button | Starts gentle, escalates — fun without being frustrating | ✓ Validated (Phase 03) |
| 2 invitation limit per user | Prevent abuse, keep it meaningful | ✓ Validated (Phase 02) |
| 7-day expiry | Keep data fresh, auto-cleanup, prevent stale invitations | ✓ Validated (Phase 04 — hourly advisory-lock APScheduler sweep, row + photo) |
| APScheduler in-process over Celery/Redis | A separate worker can't mount the single Railway volume; one hourly job doesn't justify a broker | ✓ Validated (Phase 04) |
| NOTF-V2-02 pulled forward to v1 | 30-day notification retention was cheap to add alongside the expiry sweep | ✓ Validated (Phase 04, D-07) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-01 after Phase 05 (milestone v1.0 complete — all 5 phases shipped)*
