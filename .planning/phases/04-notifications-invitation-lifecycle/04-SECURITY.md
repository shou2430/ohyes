---
phase: 04
slug: notifications-invitation-lifecycle
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on (high) severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-15
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Verified at ASVS L1 (grep-depth), `block_on = high`. Register authored at plan time across all four PLAN.md threat models; verified against the implementation on `main` @ `ce497aa`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser (creator) → `GET`/`POST /api/notifications` | Untrusted request carrying a bearer JWT from `localStorage`; requester identity is derived server-side, never from the request body | Session token; owner identity |
| FastAPI router → PostgreSQL `notifications` table | The `user_id == current_user.id` filter is the only thing between one creator's session and another creator's recipient messages | Recipient name/message (per-creator PII) |
| API response → React render tree | `recipient_name`, `recipient_message`, `invitation_title` are recipient-authored — the phase's only attacker-controlled strings — and cross into the DOM here | Attacker-controlled text |
| PyPI registry → backend dependency set | `uv add apscheduler` pulls a third-party distribution into the production dependency set | Executable code |
| Scheduler process → PostgreSQL / volume | The hourly sweep issues whole-table `DELETE`s and `os.remove` with no request context | Invitation rows + photo files |
| Poll timer → backend | Unattended 30s fetch must fail closed (401 → logout), not fail open | Session token |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-04-IDOR | Info Disclosure / Tampering | `GET`/`POST /api/notifications` (`routers/notifications.py`) | high | mitigate | Both handlers take only `current_user` (`Depends(get_current_user)`) + `db`; queries filter `Notification.user_id == current_user.id`; no `user_id` read from any body/query. **Verified:** `current_user.id`×2, `get_current_user`×3, body-identity read=0; tests `test_list_scoped_to_owner` + `test_mark_all_read_scoped_to_owner` pass (2 real principals). | closed |
| T-04-02-AUTHN | Spoofing | `GET`/`POST /api/notifications` | high | mitigate | `Depends(get_current_user)` rejects missing/expired token 401 before handler body (Phase 1 dependency). **Verified:** dependency present on both handlers. | closed |
| T-04-01-SC | Tampering | `apscheduler` PyPI supply chain | high | mitigate | Blocking human legitimacy checkpoint (04-01 Task 4) approved `agronholm/apscheduler`, exact name, MIT, 3.x; pinned in `uv.lock`. **Verified:** `apscheduler` present in `backend/uv.lock` (3 refs); live PyPI check recorded in `04-COVERAGE.md`/`04-01-SUMMARY.md`. | closed |
| T-04-SILENT | Denial of Service | `run_cleanup()` / `main.py` lifespan | high | mitigate | Every sweep emits an INFO/WARNING record on `app.tasks.cleanup`; hourly job registered + asserted. **Verified:** 3 logger lines in `cleanup.py`; `id="cleanup_sweep"` in `main.py`; `test_scheduler_registers_hourly_cleanup_job` passes. | closed |
| T-04-LOCKKEY | Denial of Service | `CLEANUP_LOCK_KEY` in `cleanup.py` | high | mitigate | One distinctive project-wide constant, documented as non-reusable. **Verified:** `CLEANUP_LOCK_KEY = 727100401` present exactly once. | closed |
| T-04-01-DB | Denial of Service | `db_session` fixture / `alembic upgrade head` | high | mitigate | `user_setup` mandates a LOCAL dev `DATABASE_URL` (never Railway prod); rollback fixture commits nothing to the outer txn. Test-infra only; no runtime/prod surface. | closed |
| T-04-02-SC | Tampering | frontend package installs | high | accept | Plan runs no install; `lucide-react`/`motion`/`react-i18next` already locked. The phase's only install (`apscheduler`) is covered by T-04-01-SC. | closed (accepted) |
| T-04-02-XSS | Tampering | `NotificationRow/Panel/Bell.jsx` | medium | mitigate | Recipient strings rendered only as React text children / i18next interpolation (both escape); no raw-HTML API. **Verified:** `dangerouslySetInnerHTML`=0 across all three components. | closed |
| T-04-PATH | Tampering | `_remove_photo_files()` | medium | mitigate | `pathlib.Path` join of a server-generated `String(255)` filename (never request-supplied), `os.remove` wrapped in `try/except OSError`. **Verified:** `Path(settings.PHOTO_STORAGE_PATH)` join + `except OSError` present. | closed |
| T-04-XACT | Denial of Service | advisory lock acquisition | medium | mitigate | Transaction-scoped `pg_try_advisory_xact_lock` (auto-releases at COMMIT) — never the session-scoped variant that strands on pooled-conn recycle. **Verified:** `pg_try_advisory_xact_lock`×2; session-scoped `pg_try_advisory_lock(`=0; `test_advisory_lock_blocks_concurrent_run` passes. | closed |
| T-04-DBLRUN | Tampering | multi-worker/replica scheduler | medium | mitigate | Advisory lock serializes sweeps across processes/instances (D-19). | closed |
| T-04-02-DOS | Denial of Service | unbounded `GET /api/notifications` (D-06) | medium | accept | Temporal bound: 30-day notification sweep (04-04, now shipped) + 2-invitation-per-user product cap. The bound now exists (04-04 landed in-phase). | closed (accepted) |
| T-04-01-FS | Tampering | photo files under `PHOTO_STORAGE_PATH` | medium | mitigate | Tests monkeypatch `PHOTO_STORAGE_PATH` to `tmp_path`; the real volume dir is never a test target. | closed |
| T-04-01-JWT | Info Disclosure | `auth_headers` minting real JWTs | low | accept | In-process dev-secret tokens, never logged/committed, 24h expiry; production signing path used deliberately to catch access-control defects. | closed (accepted) |
| T-04-POLL-DISC | Info Disclosure | poll response | low | accept | Already authenticated + owner-scoped; polling adds no new exposure over the same Bearer channel. | closed (accepted) |
| T-04-POLL-DOS | Denial of Service | 30s full-list poll | low | accept | Same temporal bound as T-04-02-DOS; low v1 traffic. | closed (accepted) |
| T-04-SILENT-FAIL | Repudiation | silent mark-read failure (D-10) | low | accept | Deliberate UX: server is source of truth, dot self-heals on next poll. | closed (accepted) |
| T-04-02-TOKEN | Info Disclosure | JWT in `localStorage` | low | accept | Pre-existing Phase 1 design, unchanged; httpOnly-cookie migration is a whole-app decision, not Phase 4. | closed (accepted) |
| T-04-02-PII | Info Disclosure | recipient messages in panel/response | low | accept | 30 chars the recipient knowingly wrote for this creator, delivered only to that creator over an authenticated request; handler logs nothing. | closed (accepted) |
| T-04-INFO | Info Disclosure | cleanup log lines | low | accept | Logs name opaque server-generated filenames + counts, never recipient names/messages. | closed (accepted) |
| T-04-04-SC | Tampering | package installs (04-04) | low | transfer | 04-04 installs nothing; `apscheduler` legitimacy owned by T-04-01-SC. | closed (transfer) |

*Status: closed for all — 0 open at or above the `high` block threshold.*
*Disposition: mitigate (implementation verified) · accept (documented risk) · transfer (covered by another threat).*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-02-SC | No install in the frontend plan; deps already locked | plan author (ratified) | 2026-08-15 |
| AR-04-02 | T-04-02-DOS / T-04-POLL-DOS | Temporal bound via 30-day sweep + 2-invitation cap; revisit if volume grows | plan author (ratified) | 2026-08-15 |
| AR-04-03 | T-04-01-JWT | Dev-secret in-process tokens, never persisted; production signing path is deliberate | plan author (ratified) | 2026-08-15 |
| AR-04-04 | T-04-02-TOKEN | `localStorage` JWT is a pre-existing whole-app decision, out of Phase 4 scope | plan author (ratified) | 2026-08-15 |
| AR-04-05 | T-04-02-PII / T-04-INFO / T-04-POLL-DISC / T-04-SILENT-FAIL | Owner-scoped, authenticated delivery; no message body logged | plan author (ratified) | 2026-08-15 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-15 | 21 | 21 | 0 | Claude (secure-phase, ASVS L1 grep-depth) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-15
