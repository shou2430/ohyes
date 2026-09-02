---
phase: 05
slug: internationalization-responsive-polish
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-01
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser localStorage → app | The `ohyes_lang` preference is client-owned storage; the user can edit it via DevTools. | UI-language preference (`en` / `zh-TW`) — no security role |
| static translation JSON → rendered DOM | Developer-authored `en.json` / `zh-TW.json` render as React children (auto-escaped). Not user input. | Static developer-authored strings |
| Vite lazy route chunks → app | Route code-splitting loads the app's own same-origin JS chunks on demand. | Same-origin static build artifacts |
| recipient photo `<img>` / preload → backend | Fetch-priority/decoding hints + `crossOrigin` on an already-authorized, password-gated same-origin photo request. | Photo the authenticated recipient is already authorized to view |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-05-01 | Tampering | `localStorage` key `ohyes_lang` | low | accept | Init validates the stored value against the `{en, zh-TW}` allow-list and falls back to `zh-TW` on any unexpected value — verified at `frontend/src/i18n/index.js:15` (`SUPPORTED_LANGUAGES.includes(stored) ? stored : "zh-TW"`). Tampering only changes which language renders (D-01). | closed |
| T-05-02 | Information Disclosure / Injection | translation strings rendered via `t()` | low | accept | Translation values are developer-authored static assets, not user input, and render as React children (React auto-escapes). No `dangerouslySetInnerHTML` anywhere in `frontend/src` (grep-verified) — no injection vector. | closed |
| T-05-02-01 | Information Disclosure / Injection | Tailwind class strings on existing components | low | accept | Pure presentation-class pass; no user input added, nothing rendered via `dangerouslySetInnerHTML`. No injection surface introduced. | closed |
| T-05-03-01 | Tampering | Dynamically imported route chunks (Vite lazy chunks) | low | accept | Lazy chunks are same-origin build artifacts served with the app; code-splitting adds no new input/endpoint/auth-flow. Recipient still authenticates via the existing password-gated fetch. No integrity boundary beyond existing same-origin static-asset trust. | closed |
| T-05-03-02 | Information Disclosure | Recipient photo `<img>` + `new Image()` preload fetch hints | low | accept | `fetchPriority`/`decoding` (and the `crossOrigin="anonymous"` cache-key alignment added in quick task 260901-ndt) are browser scheduling/cache hints on an already-existing same-origin request for a photo the authenticated recipient is already authorized to view. They change request priority/cache-keying only — no new data exposed, no cross-origin surface added (`/api/photos` remains scoped by `CORSMiddleware(allow_origins=[FRONTEND_URL])`). | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

No new package installs across any Phase-5 plan (React.lazy/Suspense are built-ins; Motion, Tailwind, react-i18next unchanged) → no supply-chain (T-05-SC) surface introduced.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-05-01 | T-05-01 | UI-language preference has no security role; allow-list validation + `zh-TW` fallback bounds any tampering to a rendering choice. | Phase 5 UAT (secure-phase) | 2026-09-01 |
| R-05-02 | T-05-02, T-05-02-01 | Developer-authored static strings/classes, React auto-escaped, no `dangerouslySetInnerHTML`. | Phase 5 UAT (secure-phase) | 2026-09-01 |
| R-05-03 | T-05-03-01, T-05-03-02 | Same-origin build artifacts + scheduling/cache hints on already-authorized requests; no new input/endpoint/auth-flow. | Phase 5 UAT (secure-phase) | 2026-09-01 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-01 | 5 | 5 | 0 | gsd-secure-phase (L1 short-circuit: all low-severity accepted, register authored at plan time, ASVS L1; mitigations spot-verified in code) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-01
