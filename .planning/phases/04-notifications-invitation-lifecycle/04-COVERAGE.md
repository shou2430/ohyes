# API Coverage — Phase 04 Notifications & Invitation Lifecycle

No external API integration: in-process APScheduler job plus the existing PostgreSQL datastore and the local Railway volume; the `/api/notifications` endpoints are OhYes's own first-party REST surface, not a third-party API/SDK/service.

This declaration is the reasoned dismissal of the `api-coverage.verify-pre` detector's false positive (it matched the internal-REST noun "api" and the verb "integrates" in the phase prose). Recorded per the 04-04 plan's `<Flagged planner assumptions> → API coverage` note, which anticipated this gate firing at seal time.
