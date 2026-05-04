# Roadmap: OhYes

**Created:** 2026-05-04
**Granularity:** Standard
**Total phases:** 5
**Total requirements:** 26

## Milestone 1: v1 Launch

### Phase 1: Foundation & Authentication

**Goal:** Scaffold the project, deploy infrastructure, and enable Google OAuth login so creators can sign in and maintain sessions.
**Requirements:** AUTH-01, AUTH-02, AUTH-03, INFR-01, INFR-02
**UI hint:** yes — login page and basic app shell
**Depends on:** none

**Success Criteria:**
1. User can click "Sign in with Google" and land on an authenticated dashboard shell
2. User can refresh the page and remain logged in (session persists)
3. User can log out and is returned to the public landing page
4. App is accessible at a Railway-hosted URL with backend and database connected

### Phase 2: Invitation Creation & Management

**Goal:** Let authenticated creators build personalized invitations with title, photo, and password, manage them from a dashboard, and share unique links.
**Requirements:** INV-01, INV-02, INV-03, INV-04, INV-05, INV-06
**UI hint:** yes — creator dashboard and invitation creation form
**Depends on:** Phase 1

**Success Criteria:**
1. User can create an invitation with a custom title, uploaded photo, and 4-8 character password and receive a unique shareable URL
2. User sees their active invitations listed on the dashboard and can delete any of them
3. User attempting to create a third invitation is blocked with a clear limit message
4. Shared invitation URL resolves to the correct invitation (no auth required to reach the password gate)

### Phase 3: Recipient Experience

**Goal:** Deliver the core product moment — recipient unlocks a personalized page, chases the escaping No button, and inevitably clicks Yes to send a message back to the creator.
**Requirements:** RCPT-01, RCPT-02, RCPT-03, RCPT-04, RCPT-05, RCPT-06, RCPT-07, RCPT-08
**UI hint:** yes — recipient password gate, invitation reveal page, celebration screen
**Depends on:** Phase 2

**Success Criteria:**
1. Recipient enters the correct password and sees the personalized page with title, photo, Yes button, and No button
2. No button dodges the cursor/finger with escalating intensity, leaves visual trail effects, and a dodge counter is visible
3. Clicking Yes triggers a celebration animation and prompts recipient for their name and a short message
4. After submitting Yes, the invitation data is deleted and the creator is notified

### Phase 4: Notifications & Invitation Lifecycle

**Goal:** Close the creator feedback loop with a notification system and ensure invitations auto-expire with full data cleanup after 7 days.
**Requirements:** NOTF-01, NOTF-02, NOTF-03, INV-07
**UI hint:** yes — notification indicator and notification list on dashboard
**Depends on:** Phase 3

**Success Criteria:**
1. Creator sees a red dot/heart indicator on the dashboard when a new notification arrives
2. Notification displays "[Name] said yes to your [title]" with the recipient's optional message
3. Creator can mark notifications as read and the indicator clears
4. An invitation older than 7 days is automatically deleted along with its photo file

### Phase 5: Internationalization & Responsive Polish

**Goal:** Ship bilingual support (Traditional Chinese default with English toggle), ensure mobile-first responsiveness across all pages, and meet the 3-second load target.
**Requirements:** UI-01, UI-02, UI-03
**UI hint:** yes — language toggle, responsive layout adjustments across all pages
**Depends on:** Phase 4

**Success Criteria:**
1. App defaults to Traditional Chinese and all user-facing text renders correctly in zh-TW
2. User can toggle to English and all text switches without page reload
3. All pages are usable on mobile viewports (375px+) with touch-friendly tap targets
4. Invitation page loads in under 3 seconds on a throttled mobile connection

## Requirement Coverage

| Requirement | Phase |
|-------------|-------|
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| INFR-01 | Phase 1 |
| INFR-02 | Phase 1 |
| INV-01 | Phase 2 |
| INV-02 | Phase 2 |
| INV-03 | Phase 2 |
| INV-04 | Phase 2 |
| INV-05 | Phase 2 |
| INV-06 | Phase 2 |
| RCPT-01 | Phase 3 |
| RCPT-02 | Phase 3 |
| RCPT-03 | Phase 3 |
| RCPT-04 | Phase 3 |
| RCPT-05 | Phase 3 |
| RCPT-06 | Phase 3 |
| RCPT-07 | Phase 3 |
| RCPT-08 | Phase 3 |
| NOTF-01 | Phase 4 |
| NOTF-02 | Phase 4 |
| NOTF-03 | Phase 4 |
| INV-07 | Phase 4 |
| UI-01 | Phase 5 |
| UI-02 | Phase 5 |
| UI-03 | Phase 5 |

**Coverage:** 26/26 ✓
