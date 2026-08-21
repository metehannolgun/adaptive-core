# Identity and Data Security Design

**Date:** 2026-08-21
**Status:** Approved
**Scope:** Guest-first identity, permanent account linking, authorization,
server-authoritative writes, encrypted local persistence, privacy rights, and
security release gates for Adaptive Core V1

## 1. Purpose

Adaptive Core must deliver its first value without requiring an account while
still protecting workout history, adaptation state, and future entitlement
decisions from unauthorized access or client tampering.

This design defines the security boundary before profile UI or Supabase
persistence is implemented. It keeps the existing deterministic TypeScript
engine pure, moves authoritative state transitions to trusted server commands,
and minimizes the personal data collected by the product.

Security is treated as a verifiable release requirement, not as a claim based
only on architecture. The implementation must produce test evidence for every
applicable control. This design is not a legal certification.

## 2. Accepted Product Decisions

- The first-value flow remains guest-first.
- A guest receives a Supabase anonymous user identity and a unique UUID.
- V1 permanent sign-in uses email plus a six-digit OTP.
- Sign in with Apple and Google are added immediately after V1 through the same
  provider-neutral identity boundary.
- Completed workouts, progress, exclusions, and preferences sync across
  devices after permanent sign-in.
- The UI does not expose device-specific account concepts.
- Guest progress is merged automatically after successful authentication.
- Existing permanent-account data is never blindly overwritten.
- Active unfinished workouts remain local until completion.
- Account deletion is immediate and irreversible after explicit confirmation
  and recent reauthentication.
- V1 stores no name, username, date of birth, or profile photo.
- The user-facing profile contains only verified email, language, workout
  preferences, privacy controls, data export, and account deletion.

## 3. Security Baseline

### 3.1 Standards

The release baseline is:

- All applicable OWASP MASVS v2 controls for the mobile application.
- OWASP ASVS 5.0 Level 2 for Supabase, Edge Functions, and database-facing
  application behavior.
- Current Apple App Store and Google Play account-deletion and privacy
  requirements.
- Supabase's current production-security checklist.

MASVS v2 control groups cover storage, cryptography, authentication, network,
platform, code, resilience, and privacy. MASVS v2 no longer uses its former
L1/L2 verification levels. Each control is recorded as implemented, tested, or
not applicable with a written reason and compensating controls.

### 3.2 Defense in Depth

The mobile client is not a trusted enforcement boundary. A modified client
must not be able to:

- Read or change another user's data.
- Forge a workout prescription.
- Forge completion history or adaptation state.
- Remove pain exclusions.
- Change entitlement state.
- Merge data from an arbitrary guest.
- Delete an arbitrary account.

Authentication, RLS, narrow server commands, validation, database constraints,
and transaction boundaries protect the same assets at independent layers.

## 4. Identity Model

### 4.1 Guest Identity

On first use, Supabase Auth creates an anonymous authenticated user. Anonymous
users have a real UUID and use the PostgreSQL `authenticated` role. Policies
that distinguish guests from permanent users therefore check the verified
`is_anonymous` JWT claim rather than relying only on the database role.

The anonymous UUID owns all server-side guest records. The publishable client
key is not an identity and does not grant public access to user tables.

### 4.2 Permanent Identity

`IdentityService` is the single application-facing identity boundary. UI and
domain modules do not call provider-specific auth APIs directly. It exposes
provider-neutral operations for:

- Starting or restoring a guest session.
- Requesting and verifying an email OTP.
- Linking or signing in with a provider.
- Reporting the current identity state.
- Signing out.
- Preparing and completing secure data merge.
- Reauthenticating for sensitive operations.
- Exporting data and deleting the account.

Adding Apple or Google later changes the adapter behind this service, not the
profile, workout, or progress modules.

### 4.3 Session Storage

Supabase session material and refresh tokens are stored through an Expo
SecureStore-backed storage adapter. Tokens are never stored in plaintext
AsyncStorage, logs, analytics, source code, or committed environment files.

Normal sign-out clears the local session. Account deletion additionally clears
the encrypted workout cache, encryption key, pending sync state, and analytics
identity.

## 5. Secure Guest-to-Account Merge

### 5.1 New Permanent Account

When supported by the final Supabase flow, the anonymous identity is linked to
the new verified email identity while retaining the same UUID. If provider
behavior requires a different UUID, the existing-account merge path is used;
the client does not implement a second unsafe migration mechanism.

### 5.2 Existing Permanent Account

Before authentication replaces the guest session, the authenticated guest
requests a merge ticket from the server. The ticket is:

- Cryptographically random.
- Stored server-side only as a hash.
- Bound to the source guest UUID.
- Valid for ten minutes.
- Single-use.

After OTP sign-in, the authenticated permanent user redeems the ticket. The
source identity comes from the ticket and the target identity comes from the
verified permanent session. The client cannot submit either identity as an
authoritative value.

Merge runs atomically and idempotently:

- Completed sessions append by stable unique identity.
- Duplicate retries do not create duplicate history.
- Permanent-account preferences win over guest preferences when both exist.
- Active unfinished workouts remain local.
- Capability state and exclusions are recomputed from trusted merged history.
- Analytics identity changes only after the complete merge succeeds.
- Failure leaves no partially merged state.

Concurrent merge attempts lock the relevant identities and records. A consumed,
expired, or mismatched ticket always fails closed.

## 6. Authorization and Data Ownership

### 6.1 RLS Rules

RLS is enabled on every exposed user-owned table. Policies are explicit per
operation and default to denial. Ownership uses:

```sql
(select auth.uid()) = user_id
```

`INSERT` policies also enforce the same ownership condition with `WITH CHECK`.
Authorization never trusts editable user metadata or a `user_id` supplied by
the client.

RLS policies are tested independently for unauthenticated requests, two guest
users, and two permanent users. Where an anonymous-user restriction must always
apply, policy composition is designed and tested to avoid permissive-policy
`OR` behavior accidentally bypassing it.

### 6.2 Access Matrix

| Data | Mobile client | Trusted server |
| --- | --- | --- |
| Profile and locale | Read own; update allowlisted fields | Create and delete |
| Workout preferences | Read/update own constrained values | Validate |
| Workout prescriptions/items | Read own | Generate immutable records |
| Sessions/results | Read own | Validate and append |
| Capability/progression state | Read own | Recompute and update |
| Pain exclusions | Read own | Create through the feedback reducer |
| Adaptation events | Read own | Append with reason codes |
| Entitlements | Read own | Later update from RevenueCat webhook |
| Merge tickets | No direct table access | Create and consume |
| Auth user | Limited Supabase Auth operations | Delete with server secret |

Prescriptions and completed sessions are immutable. Corrections append an
explicit replacement or correction record rather than rewriting history.

## 7. Trusted Server Commands

The client can invoke five narrow Edge Functions. Every command:

1. Verifies the Supabase JWT signature and required claims.
2. Derives the user from the verified `sub` claim.
3. Validates the request against a strict schema.
4. Checks ownership and current state.
5. Runs pure domain logic where applicable.
6. Commits the database portion in one transaction.
7. Returns a stable, non-sensitive success or error contract.

The server secret is available only inside Edge Functions. Critical multi-table
writes use narrow private database functions rather than a general-purpose
administrative API. Database functions use row locks, unique constraints, and
transactions to protect invariants under concurrent requests.

### 7.1 `generate-next-workout`

- Accepts only duration and allowlisted workout preferences.
- Reads the reviewed catalog, history, capability state, and exclusions.
- Runs the existing pure deterministic generator server-side.
- Stores the prescription, immutable item snapshots, versions, seed, and
  explanation codes together.
- Uses an idempotency key so a retry cannot create a second prescription.
- Never returns or saves a partial workout after a generator failure.

### 7.2 `complete-workout`

- Requires an owned, active, incomplete prescription.
- Requires submitted item identities to match that prescription exactly.
- Accepts only `easy`, `appropriate`, `hard`, `incomplete`, or `pain`.
- Applies exercise-level pain/incomplete precedence.
- Writes the session, results, exclusions, capability state, and adaptation
  event atomically.
- Never progresses on pain.
- Uses the client's stable request ID only for idempotency, not authorization.

### 7.3 `merge-guest-progress`

- Issues and redeems the short-lived merge ticket.
- Never accepts source or target identity as authoritative request fields.
- Locks both sides, deduplicates history, and recomputes derived state.
- Changes analytics identity only after persistence succeeds.

### 7.4 `delete-account`

- Rejects anonymous users and requires an explicit irreversible confirmation.
- In V1, requires a verified JWT whose `amr` contains a recent `otp`
  authentication timestamp no older than ten minutes.
- Future Apple and Google adapters require an equivalently fresh provider
  reauthentication; an automatically refreshed token is not sufficient.
- Deletes owned application records and associated storage objects.
- Deletes associated processor data, including identified PostHog data.
- Deletes the Supabase Auth user with the server-only admin API.
- Is retry-safe when an earlier attempt stopped between application-data and
  Auth deletion.

Database, Auth, and external processors cannot share one transaction. Deletion
therefore uses a server-only **saga**: a durable deletion job records each
idempotent step, immediately blocks normal account use, removes application
data, requests processor deletion, and deletes Auth last. The job contains no
email or fitness payload. A retry continues only unfinished steps rather than
restoring or duplicating data.

### 7.5 `export-user-data`

- Rejects anonymous users and requires recent OTP authentication.
- Derives the exported identity only from the verified token.
- Returns the user's data as machine-readable JSON.
- Does not create a public Storage object or long-lived download link.
- Does not include secrets, internal security fields, or another user's data.

## 8. Local Data Protection and Offline Behavior

### 8.1 Storage Boundaries

- Expo SecureStore stores session secrets and a random local database key.
- Expo SQLite with SQLCipher stores the active workout, pending completion,
  and minimum synchronization metadata.
- Plain AsyncStorage may store only non-sensitive UI preferences.

SQLCipher requires a development/production build and is not available in
Expo Go. The project can continue using Expo Go until encrypted persistence is
implemented, then moves deliberately to a development build. The encrypted
database is small and asynchronous access must not block the UI thread.

SQL is always parameterized. The encryption key is generated on-device and is
never stored in the database, source, environment file, logs, or analytics.

### 8.2 Offline Rules

- A cached active prescription can continue offline.
- Completion is queued locally with its stable request ID when offline.
- Retry never creates a duplicate session.
- No new authoritative workout is generated offline.
- Sensitive feedback is retained only as long as necessary to complete sync.
- Account deletion removes both the SQLCipher database and its SecureStore
  key.

### 8.3 Network and Logging

Production permits only TLS-protected endpoints and contains no development
override that disables platform trust checks. Certificate pinning against the
Supabase-managed endpoint is not improvised because certificate ownership and
rotation are outside the app's control; the MASVS applicability record must
document this decision and its TLS/platform-trust compensating controls.

Application and server logs exclude email, OTPs, tokens, free-form health
content, pain location, and detailed fitness results. Error reporting uses
stable codes and request correlation IDs that are not user identities.

## 9. Privacy and Retention

### 9.1 Data Minimization

The product collects only:

- Verified email in Supabase Auth.
- Locale and workout preferences.
- Prescriptions, completion outcomes, adaptation state, and exclusions needed
  to provide the product.
- The approved analytics properties only after consent.

It does not collect name, username, birth date, profile photo, contacts,
location, camera, microphone, device fingerprint, free-form health text, pain
location, or diagnosis.

PostHog remains consent-first with exactly the approved explicit events. It
does not receive email, tokens, Supabase records, or detailed workout/health
content. Revoking consent stops future capture.

### 9.2 Retention

- Inactive unlinked guest identities and records: 90 days after last use.
- Permanent-account product data: while the account remains active, subject to
  the published privacy policy and valid legal requirements.
- Security logs: no more than 90 days unless a documented active incident
  requires a lawful extension.
- Completed deletion reconciliation record: 30 days, containing only a keyed
  user-identity hash, completion timestamp, and step status.
- Local active workout: until completion, cancellation, or account deletion.
- Deleted active data: removed immediately; encrypted backups age out under the
  documented provider backup lifecycle.

A restore procedure includes deletion reconciliation so a previously deleted
account cannot silently reappear from an older backup.

### 9.3 Privacy Center

The profile exposes one clear Privacy Center where a permanent user can:

- See a plain-language summary of collected data and purposes.
- Change analytics consent.
- Export personal data.
- Initiate permanent account deletion.

Apple's in-app deletion path is easy to find. Google Play additionally receives
a functional external deletion-request URL that remains usable after the app is
uninstalled. Provider data-deletion requests are included when account data was
shared with a processor.

Privacy-policy and store declarations must match actual runtime behavior.

## 10. Authentication Abuse Controls

- Email OTP length is six digits for V1.
- OTP lifetime is configured to a short period appropriate for the flow, with
  a ten-minute application target.
- Resend has a minimum cooldown and server rate limits.
- Repeated suspicious requests trigger CAPTCHA or equivalent bot protection.
- Verification attempts are rate limited.
- Responses do not reveal whether an email address is registered.
- Redirect URLs are allowlisted; future OAuth uses PKCE and approved app links.
- Founder and Supabase organization access requires MFA.
- Server secrets are rotated after suspected exposure.

## 11. Verification and Release Gate

### 11.1 Automated Checks

Every release runs:

- Full Jest suite, strict TypeScript checking, lint, and Expo Doctor.
- Clean local Supabase migration/reset verification.
- RLS negative tests across no-session, guest A/B, and permanent A/B actors.
- Edge Function authentication, validation, authorization, replay, transaction,
  and idempotency tests.
- Cross-user read/write/delete attack tests.
- Merge and deletion recovery tests after forced partial failures.
- SQLCipher checks on real iOS and Android development builds.
- Secret scanning of source and Git history.
- Production dependency vulnerability scanning.

Unresolved high or critical production dependency vulnerabilities block
release. Findings are reviewed individually; destructive forced dependency
upgrades are not used as an automatic fix.

### 11.2 Manual Checks

- Record evidence for every applicable MASVS control.
- Record evidence for ASVS 5.0 Level 2 backend controls.
- Verify App Store privacy labels and Google Data Safety declarations.
- Exercise account export and deletion on both platforms.
- Confirm through network inspection that analytics consent rejection sends no
  analytics events.
- Inspect application and server logs for prohibited data.
- Review Supabase RLS, SSL enforcement, rate limits, CAPTCHA, Security Advisor,
  backup configuration, and organization MFA.
- Test backup restoration plus deletion reconciliation.
- Review dependency and exercise-media licenses.

A failed critical control blocks the store submission.

## 12. Incident Readiness

The project maintains a short operational response checklist:

1. Stop the affected release or disable the narrow affected function.
2. Rotate exposed secrets and revoke sessions where required.
3. Determine affected identities and data from privacy-safe audit evidence.
4. Correct the control and add a regression test.
5. Restore safely if integrity was affected.
6. Record the event without copying sensitive payloads into the report.
7. Perform required user or authority notifications when applicable.

Independent penetration testing is not a V1 implementation prerequisite. It
is planned as an additional assurance layer after revenue, while the documented
MASVS/ASVS verification and release gates remain mandatory from V1.

## 13. Planned Application Boundaries

The implementation plan may introduce these conceptual modules without
changing the pure engine:

```text
src/
├── auth/
│   ├── identity-service.ts
│   └── secure-session-storage.ts
├── database/
│   ├── profile-repository.ts
│   ├── workout-repository.ts
│   └── progress-repository.ts
├── persistence/
│   └── encrypted-workout-store.ts
└── features/profile/
    └── privacy-center/

supabase/
├── migrations/
├── tests/
└── functions/
    ├── generate-next-workout/
    ├── complete-workout/
    ├── merge-guest-progress/
    ├── delete-account/
    └── export-user-data/
```

Exact filenames are implementation-plan decisions. There remains one Supabase
client, one application-facing `IdentityService`, small domain repositories,
consistent ownership policies, and no Supabase imports in the pure engine.

## 14. Implementation Order

The later implementation plan must preserve this dependency order:

1. Local Supabase project configuration and security-test harness.
2. Schema, constraints, grants, and RLS policies with failing-first tests.
3. Secure session adapter and anonymous identity bootstrap.
4. Server-authoritative generation and completion commands.
5. Encrypted local active-workout persistence and retry queue.
6. Email OTP linking and secure existing-account merge.
7. Profile Privacy Center, export, and deletion.
8. Apple and Google provider adapters after V1.
9. Full MASVS/ASVS evidence review and store privacy declarations.

Each slice is test-first and must leave the complete existing test suite green.

## 15. Non-goals

- Password authentication in V1.
- Mandatory end-user MFA in V1.
- Social profiles or public workout sharing.
- Collecting medical diagnoses or giving medical treatment advice.
- Client-authoritative workout generation, progression, exclusions, or
  entitlements.
- A general-purpose administrative Edge Function.
- Public export files or permanent download links.
- Adding Apple, Google, RevenueCat, or profile UI before their approved slice.

## 16. Primary References

- OWASP MASVS: <https://mas.owasp.org/MASVS/>
- OWASP ASVS: <https://owasp.org/www-project-application-security-verification-standard/>
- Supabase production checklist:
  <https://supabase.com/docs/guides/deployment/going-into-prod>
- Supabase anonymous sign-ins:
  <https://supabase.com/docs/guides/auth/auth-anonymous>
- Supabase RLS:
  <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase JWT claims:
  <https://supabase.com/docs/guides/auth/jwt-fields>
- Expo SecureStore:
  <https://docs.expo.dev/versions/latest/sdk/securestore/>
- Expo SQLite and SQLCipher:
  <https://docs.expo.dev/versions/latest/sdk/sqlite/>
- Apple account deletion:
  <https://developer.apple.com/support/offering-account-deletion-in-your-app/>
- Google Play account deletion:
  <https://support.google.com/googleplay/android-developer/answer/13327111>
- European Commission GDPR principles:
  <https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en>
