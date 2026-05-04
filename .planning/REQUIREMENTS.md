# Requirements: OhYes

**Defined:** 2026-05-04
**Core Value:** The moment of delight when someone sees a personalized page made just for them and realizes they can't say no — literally.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can log in with Google OAuth (one-click)
- [ ] **AUTH-02**: User session persists via JWT (24h TTL)
- [ ] **AUTH-03**: User can log out from dashboard

### Invitation

- [ ] **INV-01**: User can create invitation with custom title text
- [ ] **INV-02**: User can upload a photo for the invitation
- [ ] **INV-03**: User can set a 4-8 character password for the recipient
- [ ] **INV-04**: Each invitation generates a unique shareable URL
- [ ] **INV-05**: User can have max 2 active invitations at a time
- [ ] **INV-06**: User can delete their own invitations
- [ ] **INV-07**: Invitations auto-expire and are fully deleted (data + photo) after 7 days

### Recipient Experience

- [ ] **RCPT-01**: Recipient enters password to unlock the invitation page
- [ ] **RCPT-02**: Page displays title, photo, Yes button, and escaping No button
- [ ] **RCPT-03**: No button increasingly frantically dodges cursor/finger (desktop + mobile touch)
- [ ] **RCPT-04**: No button leaves trail effects (sparkles/hearts) as it moves
- [ ] **RCPT-05**: Dodge attempt counter tracks how many times recipient tried to click No
- [ ] **RCPT-06**: Clicking Yes triggers celebration animation (confetti/hearts)
- [ ] **RCPT-07**: After Yes, a dialog appears asking for recipient's name and a 30-character message
- [ ] **RCPT-08**: Clicking Yes deletes the invitation data and notifies the creator

### Notification

- [ ] **NOTF-01**: Creator sees red dot/heart indicator when a notification arrives
- [ ] **NOTF-02**: Notification shows "[Name] said yes to your [title]" with optional message
- [ ] **NOTF-03**: Creator can mark notifications as read

### UI/UX

- [ ] **UI-01**: Mobile-first responsive design
- [ ] **UI-02**: Bilingual UI — Traditional Chinese (default) with English toggle
- [ ] **UI-03**: Page loads in under 3 seconds on mobile

### Infrastructure

- [ ] **INFR-01**: Deployed on Railway (FastAPI + React + PostgreSQL)
- [ ] **INFR-02**: Photos stored on Railway persistent volume

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Recipient Experience Enhancements

- **RCPT-V2-01**: Sound effects on No button dodge (squeaks, whooshes, tiny scream)
- **RCPT-V2-02**: Escalating No button text changes across 5 stages (polite → nervous → desperate → frantic → surrender)

### Notifications

- **NOTF-V2-01**: Email notification when recipient says Yes
- **NOTF-V2-02**: Notification retention policy (auto-delete after 30 days)

### Customization

- **CUST-V2-01**: Preset themes/colors for invitation pages
- **CUST-V2-02**: Custom celebration animations

## Out of Scope

| Feature | Reason |
|---------|--------|
| Public gallery / social feed | Privacy is core to the product — invitations are between two people |
| Custom visual themes | Decision fatigue kills completion rate; one beautiful default wins |
| Analytics dashboard for creators | Turns a playful gesture into surveillance; creates anxiety |
| Recipient account / login | Instant friction death; password gate is the right amount of gating |
| Real-time chat | Not core to the invitation moment |
| GIF / video upload | Storage/bandwidth costs, load time impact |
| Unlimited invitations | The limit makes each invitation more meaningful |
| Working "No" button | The entire premise is they can't say no |
| Group / collaborative invitations | This is a 1-to-1 intimate gesture |
| Mobile native app | Web-first, responsive design covers mobile |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| INV-01 | Phase 2 | Pending |
| INV-02 | Phase 2 | Pending |
| INV-03 | Phase 2 | Pending |
| INV-04 | Phase 2 | Pending |
| INV-05 | Phase 2 | Pending |
| INV-06 | Phase 2 | Pending |
| INV-07 | Phase 4 | Pending |
| RCPT-01 | Phase 3 | Pending |
| RCPT-02 | Phase 3 | Pending |
| RCPT-03 | Phase 3 | Pending |
| RCPT-04 | Phase 3 | Pending |
| RCPT-05 | Phase 3 | Pending |
| RCPT-06 | Phase 3 | Pending |
| RCPT-07 | Phase 3 | Pending |
| RCPT-08 | Phase 3 | Pending |
| NOTF-01 | Phase 4 | Pending |
| NOTF-02 | Phase 4 | Pending |
| NOTF-03 | Phase 4 | Pending |
| UI-01 | Phase 5 | Pending |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 5 | Pending |
| INFR-01 | Phase 1 | Pending |
| INFR-02 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-04 after roadmap creation (phase traceability mapped)*
