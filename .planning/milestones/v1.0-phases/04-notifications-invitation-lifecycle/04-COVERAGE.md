# API Coverage — Phase 04 Notifications & Invitation Lifecycle

No external API integration: in-process APScheduler + PostgreSQL + local Railway volume; /api/notifications is OhYes's own first-party REST surface, not a third-party API/SDK.

Reasoned dismissal of the `api-coverage.verify-pre` detector's false positive (it matched the internal-REST noun "api" and the verb "integrates" in the phase prose). Anticipated by the 04-04 plan's "Flagged planner assumptions -> API coverage" note.
