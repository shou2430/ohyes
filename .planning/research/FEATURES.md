# OhYes Feature Research

> Research date: 2026-05-04
> Sources: WillYouBeMyValentine.fun, AskYourValentine.com, WillYouBeMyValentine.io, ValentineProposal.com, various GitHub open-source valentine projects, Genially, Greetings Island, Kudoboard

---

## Competitive Landscape Summary

The "escaping No button" concept is well-established as a viral Valentine's Day trend, with 50,000+ users on the leading free platform alone. Nearly all existing implementations are **Valentine-specific** and **single-use static pages** (no accounts, no notifications). Most are free, many are open-source, and the feature set across competitors is remarkably similar. The opportunity for OhYes lies in being **occasion-agnostic**, **relationship-aware** (creator gets notified), and having **richer emotional payoff** than the current crop of link generators.

---

## Table Stakes

Features that ALL similar platforms have. Users will leave without these.

### TS-1: Escaping "No" Button
The core interaction. The "No" button must dodge the cursor/finger convincingly.
- **Complexity**: Medium (easy on desktop, harder on mobile touch)
- **Dependencies**: None (core feature)
- **Notes**: Every single competitor has this. Mobile behavior (touch dodge) is critical — most traffic will come from messaging app links opened on phones. Must feel responsive, not laggy.

### TS-2: Celebration on "Yes"
Confetti, hearts, fireworks, or similar visual celebration when the recipient clicks "Yes."
- **Complexity**: Low
- **Dependencies**: TS-1
- **Notes**: Every competitor does this. AskYourValentine uses a card-flip + confetti combo. WillYouBeMyValentine.fun uses fireworks + hearts. The absence of celebration would feel broken.

### TS-3: Shareable Unique Link
Each invitation gets a unique URL the creator can share via messaging apps.
- **Complexity**: Low
- **Dependencies**: None
- **Notes**: Universal across all competitors. The link IS the product — it must be short, clean, and work when pasted into WhatsApp/LINE/Instagram DMs.

### TS-4: Personalization (Title + Photo)
Creator can customize the question text and upload a photo.
- **Complexity**: Low (title) / Medium (photo upload + storage)
- **Dependencies**: Creator auth for management
- **Notes**: Most free competitors only offer name personalization. OhYes already plans title + photo, which is above the baseline. Photo makes it significantly more personal and harder for the recipient to dismiss.

### TS-5: Mobile-First Responsive Design
The page must work flawlessly on mobile since most recipients will open links from messaging apps.
- **Complexity**: Medium
- **Dependencies**: TS-1 (touch-based dodge behavior)
- **Notes**: This is where many open-source projects fail. Desktop hover-dodge does not translate to mobile. Need deliberate touch-dodge mechanics (button moves on tap attempt, or on proximity via touch-move events).

### TS-6: Fast Load Time
The page must load near-instantly. Recipients clicking a link from a chat app will abandon if it takes more than 2-3 seconds.
- **Complexity**: Low-Medium
- **Dependencies**: Photo optimization
- **Notes**: Compress/resize uploaded photos. Minimize JS bundle. Consider skeleton loading for the photo while the rest of the page is interactive immediately.

---

## Differentiators

Features that would make OhYes stand out from the crowd of valentine link generators.

### D-1: Occasion-Agnostic "Will You...?" Framework
Not just Valentine's Day. "Will you go to prom with me?", "Will you be my friend?", "Will you forgive me?", "Will you come to my party?", "Will you marry me?"
- **Complexity**: Low (it is a text field, not a dropdown)
- **Dependencies**: None
- **Notes**: Every competitor is Valentine-locked. OhYes is the only one designed for any occasion. This is the single biggest differentiator. The custom title field already enables this — marketing and templates/suggestions can amplify it.

### D-2: Escalating "No" Button Personality
Not just random dodging. The "No" button has a personality arc — it starts polite, gets nervous, then panics.
- **Complexity**: Medium-High
- **Dependencies**: TS-1
- **Suggested behaviors by stage**:
  - **Stage 1 (Polite)**: Gentle slide away. Button text stays "No."
  - **Stage 2 (Nervous)**: Faster dodges. Text changes: "Are you sure?", "Really?", "Think about it..."
  - **Stage 3 (Desperate)**: Button shrinks progressively. Text: "Please don't!", "I'm scared!", "Not the No!"
  - **Stage 4 (Frantic)**: Button teleports to random positions. Starts shaking/vibrating. Text: "HELP!", "NOOO!"
  - **Stage 5 (Surrender)**: Button becomes tiny, stops moving, text says "...fine" — but tapping it still triggers Yes.
- **Notes**: Competitors use random dodging with no arc. An escalating narrative makes people laugh AND want to share it. The text changes are the secret weapon — they create a mini-story.

### D-3: Creator Notification ("They Said Yes!")
Creator gets notified when the recipient clicks "Yes," with the recipient's optional message.
- **Complexity**: Medium
- **Dependencies**: Creator auth, invitation data model
- **Notes**: No free competitor does this. Most are fire-and-forget link generators. The notification closes the loop and makes the creator feel the payoff. The red dot/heart indicator in the dashboard creates anticipation.

### D-4: Password-Protected Pages
A 4-8 character password the creator sets, adding a personal touch ("use our anniversary date", "use our inside joke").
- **Complexity**: Low
- **Dependencies**: None
- **Notes**: No competitor does this. It adds a layer of intimacy — the password itself becomes part of the experience. Also prevents random link-clickers from seeing private content.

### D-5: Recipient Reply Message (30 chars)
After clicking "Yes," the recipient can type a short message back to the creator.
- **Complexity**: Low
- **Dependencies**: D-3 (notification system)
- **Notes**: AskYourValentine has a "love letter" feature but it is premium. The 30-char limit is smart — forces something punchy like "I thought you'd never ask!" rather than a wall of text. The constraint IS the feature.

### D-6: Dodge Counter / Attempt Tracker
Count how many times the recipient tried to click "No" and display it as part of the celebration.
- **Complexity**: Low
- **Dependencies**: TS-1, TS-2
- **Notes**: AskYourValentine does this with their thermal receipt. It is genuinely funny — "You tried to say no 47 times." Simple to implement, high shareability. Could be shown to both recipient (on celebration screen) and creator (in notification).

### D-7: Auto-Expiry with Data Deletion
Invitations expire and are fully deleted (including photos) after 7 days.
- **Complexity**: Medium
- **Dependencies**: Photo storage, scheduled jobs
- **Notes**: This is both a feature and a trust signal. "Your data is automatically deleted after 7 days" addresses privacy concerns without requiring a complex privacy infrastructure. Competitors that are simple link generators keep data indefinitely (or until their free tier runs out).

### D-8: Bilingual UI (Traditional Chinese + English)
Default zh-TW with English toggle.
- **Complexity**: Medium
- **Dependencies**: All UI text must be externalized
- **Notes**: Opens up the Taiwanese/HK market which is underserved by English-only competitors. Must be implemented early — retrofitting i18n is painful.

### D-9: Sound Effects on "No" Button Interactions
Subtle, playful sound effects as the No button dodges — squeaks, whooshes, a tiny scream.
- **Complexity**: Low
- **Dependencies**: TS-1
- **Notes**: Must be opt-in or triggered after first interaction (browsers block autoplay audio). A toggle to mute. Small audio files, big emotional impact. The tiny scream when the button is cornered would be memorable.

### D-10: "No" Button Trail Effects
Visual trail or particle effects as the button moves — sparkles, small hearts, motion blur.
- **Complexity**: Low-Medium
- **Dependencies**: TS-1
- **Notes**: Adds visual delight without affecting core mechanics. Keep it subtle so it does not impact performance on low-end phones.

---

## Anti-Features

Things that seem like good ideas but should be deliberately excluded.

### AF-1: Public Gallery / Social Feed
Showing other people's invitations publicly.
- **Why not**: The entire value proposition is PRIVATE, personal moments between two people. A public gallery undermines intimacy and trust. It also creates moderation headaches (inappropriate photos/titles). Every design decision should reinforce "this is just between you two."
- **Complexity it would add**: High (moderation, reporting, content policy, abuse)

### AF-2: Custom Themes / Extensive Visual Customization
Letting creators pick colors, fonts, backgrounds, layouts, animations.
- **Why not**: Decision fatigue kills completion rate. The fewer choices, the faster someone creates and shares an invitation. The magic is in the interaction, not the visual design. One beautiful default is better than 20 mediocre options. Competitors that offer themes see most users stick with the default anyway.
- **Complexity it would add**: Medium-High (theme engine, preview system, mobile testing per theme)

### AF-3: Analytics Dashboard for Creators
Showing creators when the link was opened, how many times, from what device, etc.
- **Why not**: Turns a playful gesture into surveillance. "They opened it 3 times but didn't click Yes" creates anxiety, not joy. The only data point that matters is "they said Yes" + their message. WillYouBeMyValentine.fun offers a tracking dashboard, but it conflicts with the emotional tone OhYes aims for.
- **Complexity it would add**: Medium (event tracking, dashboard UI, real-time updates)

### AF-4: Multiple "No" Button Behavior Options
Letting the creator pick from different dodge styles (teleport vs. shrink vs. spin).
- **Why not**: Same as AF-2 — more choices slow down creation. The curated escalating behavior (D-2) is better than letting creators pick individual moves. Trust the design. The surprise of not knowing what the button will do next is part of the fun for the recipient.
- **Complexity it would add**: Medium (behavior system, preview per option)

### AF-5: Recipient Account / Login
Requiring the recipient to create an account or log in to see the page.
- **Why not**: Instant friction death. The recipient gets a link in a chat, taps it, and must see the page within seconds. Any login wall destroys the moment. The password (D-4) is the right amount of gating — personal but instant.
- **Complexity it would add**: Medium (auth flow, account management, data linkage)

### AF-6: Email / SMS Notifications
Sending email or SMS when the recipient clicks "Yes."
- **Why not**: Requires email collection, delivery infrastructure, spam compliance, and adds attack surface. In-app notification (creator checks their dashboard) is simpler and sufficient for v1. The creator WANTS to check the dashboard — it builds anticipation.
- **Complexity it would add**: High (email service integration, deliverability, unsubscribe, templates)

### AF-7: GIF / Video Upload Instead of Photo
Letting creators upload animated GIFs or video clips.
- **Why not**: Massively increases storage requirements, load times, and complexity. A single photo is intimate and fast. Video adds encoding, streaming, format compatibility, and storage cost concerns — all for marginal emotional uplift over a great photo. Could revisit post-v1 if validated.
- **Complexity it would add**: High (transcoding, streaming, storage, mobile playback)

### AF-8: Unlimited Invitations per User
Removing the 2-invitation cap.
- **Why not**: The limit is a feature, not a constraint. It forces creators to be intentional about who they send invitations to. "I only have 2 and I'm using one on you" is more meaningful than spam-blasting 50 links. It also naturally limits storage and abuse.
- **Complexity it would add**: Low technically, but high in abuse potential

### AF-9: Real "No" Option That Works
Actually letting the recipient click "No" and send a rejection.
- **Why not**: The ENTIRE premise is that they cannot say no. A working "No" button turns a playful moment into a genuine rejection mechanism that could cause real hurt. The escapable No button is comedic precisely because it is futile. Some competitors let "No" eventually work and show a sad GIF — but this undercuts the joy and creates an awkward outcome for the creator.
- **Complexity it would add**: Low technically, but high in emotional damage potential

### AF-10: Collaborative / Group Invitations
Multiple people contributing to one invitation.
- **Why not**: This is a 1-to-1 intimate gesture. Making it group-oriented dilutes the personal touch. Kudoboard does group cards well, but that is a completely different product and emotional context.
- **Complexity it would add**: High (permissions, contributor management, merge UX)

---

## Feature Priority Matrix

| Feature | Category | Complexity | Dependencies | Priority |
|---------|----------|-----------|--------------|----------|
| TS-1: Escaping No Button | Table Stakes | Medium | None | Must have |
| TS-2: Celebration on Yes | Table Stakes | Low | TS-1 | Must have |
| TS-3: Shareable Link | Table Stakes | Low | None | Must have |
| TS-4: Title + Photo | Table Stakes | Medium | Auth | Must have |
| TS-5: Mobile-First | Table Stakes | Medium | TS-1 | Must have |
| TS-6: Fast Load | Table Stakes | Low-Med | TS-4 | Must have |
| D-1: Any Occasion | Differentiator | Low | None | Must have |
| D-2: Escalating No Personality | Differentiator | Med-High | TS-1 | Should have |
| D-3: Creator Notification | Differentiator | Medium | Auth | Must have |
| D-4: Password Protection | Differentiator | Low | None | Must have |
| D-5: Reply Message | Differentiator | Low | D-3 | Should have |
| D-6: Dodge Counter | Differentiator | Low | TS-1, TS-2 | Nice to have |
| D-7: Auto-Expiry + Deletion | Differentiator | Medium | Storage | Must have |
| D-8: Bilingual (zh-TW + en) | Differentiator | Medium | All UI | Should have |
| D-9: Sound Effects | Differentiator | Low | TS-1 | Nice to have |
| D-10: Trail Effects | Differentiator | Low-Med | TS-1 | Nice to have |

---

## Key Insights

1. **The market is Valentine-locked.** Every competitor is a Valentine's Day tool. Being occasion-agnostic is a wide-open lane.

2. **The notification loop is unserved.** Free competitors are fire-and-forget link generators. The creator-notification + reply-message flow is a meaningful differentiator that no free platform offers.

3. **Privacy is a feature.** Password protection + auto-expiry + data deletion is a compelling trust story, especially in markets (Taiwan, HK) where data sensitivity is high.

4. **The "No" button personality is the brand.** Random dodging is commoditized. An escalating narrative arc with text changes, shrinking, and eventually surrendering — that is what people will screenshot and share.

5. **Simplicity is the moat.** The urge to add themes, analytics, and customization should be resisted. The fastest path from "I want to ask someone something" to "they received a delightful page" wins. Every extra option is friction.

6. **Mobile is the primary platform.** Links are shared via messaging apps and opened on phones. The No button touch behavior and page load speed on mobile are more important than any desktop experience.
