# Hushly App Documentation

**Purpose**
Hushly is an AI-assisted, privacy-forward dating and social connection app built for Kenyan nightlife and weekend culture. It blends curated matches, real-time chat, voice intros, and optional premium experiences such as weekend plans and an escort marketplace.

**Tech Stack & Integrations**
- React (Vite) single-page app with hash-based routing.
- Firebase Auth (email/password + email verification) and Firestore for real-time data.
- Cloudinary for image and audio uploads.
- WebRTC for video calls and live rooms, with STUN (and optional TURN) servers.
- MediaPipe Tasks Vision for face masking/blur in video calls.
- Lottie animations and Canvas Confetti for UX moments.

**Core Data Models**
- `UserProfile`: id, realName (private), nickname (public unique), email + verified, intents, bio, area, ageRange, gender, interestedIn, occupation + visibility, photoUrl (live selfie), voiceIntro info, isAnonymous, isOnline, premium flags, followerCount, optional escort rate.
- `UserSettings`: discoverable, showOnlineStatus, allowMessageRequests, readReceipts, locationPrecision, dataSharing, loginAlerts.
- `LikeRecord` / `DislikeRecord`: fromUserId, toUserId, nicknames, createdAt.
- `Follow`: followerId, followingId; drives followerCount on the target profile.
- `Conversation`: member IDs, memberProfiles snapshot, lastMessage + timestamp, lastReadAt per user, pinned/archived/muted/deleted states per user.
- `ChatMessage`: senderId, text/image/audio, reactions, createdAt.
- `AppNotification`: toUserId, fromUserId, type (message/like/system), body, read, conversationId.
- `WeekendPlan`: creatorId, title, description, location, time, category, rsvpCount.
- `RSVP`: subdoc with attendee answers (name, contact, availability, group size, note).
- `PaymentRequest`: userId, email, mpesa proof, status, decision metadata.
- `LiveRoom`: hostId, title, type, privacy, chat/join access, moderation settings, viewerCount, likeCount, status, timestamps.
- `LiveMessage`, `LiveGuest`, `LiveJoinRequest`, `LiveAchievement`: live chat/events/guests/like milestones.
- `VideoCallRecord`: conversationId, caller/callee, status, offer/answer, candidates.
- `EscortListing` (+ draft): owner info, services, pricing, availability, photos, location, video call settings, socials, verificationStatus, isActive.

**Primary Data Collections (Firestore)**
- `user`, `user_settings`, `public_nicknames`
- `conversations/{id}/messages`
- `notifications`
- `likes`, `dislikes`, `follows`, `blocks`
- `weekend_plans/{id}/rsvps`
- `payment_requests`
- `video_calls/{id}/callerCandidates` and `calleeCandidates`
- `live_rooms/{id}` with `messages`, `viewers`, `guests`, `join_requests`, `connections`, `muted`
- `live_achievements`
- `escort_listings`

**App Lifecycle & Session Logic**
1. On launch, Firebase Auth is checked.
2. Unauthenticated or unverified users stay on Landing/Onboarding.
3. Verified users get a session token stored in `sessionStorage` and profile cached in `localStorage`.
4. The app listens to real-time profile updates and keeps cache in sync.
5. A privacy shield activates to blur the UI and block screenshots/copy actions when needed.

**Onboarding Flow**
1. Collect real name, email, and password.
2. Create public persona: nickname (unique), gender, interests, age range, and area.
3. Pick intents with optional AI suggestions.
4. Capture a live selfie, run AI quality + duplicate checks, upload to Cloudinary.
5. Write a bio with AI draft/rewrite and record a 10-20s voice intro.
6. Create Firebase Auth user and Firestore profile, then send verification email.
7. After verification, enforce an 18+ age gate before granting access.

**Login Flow**
1. Email check then password login.
2. Email verification enforced before access.
3. Optional biometric login via WebAuthn (encrypted password stored locally).
4. Password reset flow via email.

**Discovery & Matching Flow**
1. Load all profiles + settings, filter by discoverable and email-verified, exclude self.
2. Apply filters: intent, age range, area, and gender preferences.
3. Rank profiles using AI signals (likes, skips, dwell time, chat) and semantic search.
4. Likes and dislikes are stored; mutual likes trigger a match modal with local suggestions.
5. Starting a chat ensures a deterministic conversation ID and opens the chat view.

**Notifications**
- Message, like, and system notifications are stored and shown in real time.
- Notifications can be marked read, cleared, or deleted.

**Messaging & Calls**
- Conversations are real-time with text, image, and voice note support.
- Reactions can be added to messages.
- AI helpers: icebreakers, smart replies, and conversation summaries.
- Blocking prevents messaging and call actions.
- Video calls use Firestore as signaling plus WebRTC for media.
- Optional face masking/blur during calls using MediaPipe.

**Live Rooms**
- Hosts create live rooms; viewers join and chat.
- Guests request to join the stage and are approved/declined by the host.
- Live chat includes reactions, moderation, and host mute tools.
- WebRTC multi-peer connections power the stage.
- Like milestones trigger achievements and celebration overlays.
- Follow/unfollow status is tracked for hosts.
- Note: the Discover 'Live' tab currently displays a rebuild notice, but the live room infrastructure exists.

**Weekend Plans (Premium)**
- Premium users can create weekend plans, optionally using AI templates.
- Plans are listed in a feed; others RSVP with contact details.
- RSVP updates counts and is visible to the plan creator.

**Premium & Payments**
- Premium is 30 days and stored via `isPremium` + `premiumExpiresAt`.
- Payment flow is manual: users submit M-Pesa confirmation text.
- Admin (owner email) approves or rejects payments and sends notifications.

**Escort Portal**
- Separate confidential entry point with an 18+ gate.
- Browse escort listings with filters (verified, travel, video call, etc.).
- Users can submit a request to a listing owner via in-app notification.
- Premium users can publish/manage listings and view X photos.
- Listing builder is multi-step with AI draft support and risk detection.
- Location pinning uses device geolocation.

**Profile, Settings & Analytics**
- Profile shows intents, bio, and voice intro; voice intro can be re-recorded.
- Personal info lets users edit details and update selfie with AI checks.
- Security & privacy offers password/email change, verification checks, and safety scan.
- Privacy settings include discoverability, online status, and anonymity.
- Likes analytics show totals, mutuals, achievements, and AI insights.

**Privacy & Safety Controls**
- Screenshot and copy/paste blocking in sensitive views.
- Focus/visibility-based privacy shield.
- Voice intro reporting to admin.
- Safety scan detects risky bio patterns and offers tips.

**Local Storage & Client State**
- `kipepeo_user` caches the last loaded profile.
- `kipepeo_session` stores session tokens.
- AI signals and photo hashes stored for ranking and duplicate detection.
- Biometric login data stored locally (encrypted).
- Age-gate and install prompt flags stored in local/session storage.

**Current Roadmap Notes**
- Some privacy settings are stored but not yet enforced beyond discoverability and online status.
- The 'Hub' experience is UI-first and can be expanded with real-time activities.
- The Discover 'Live' tab shows a rebuild notice even though LiveRoom functionality is implemented.
