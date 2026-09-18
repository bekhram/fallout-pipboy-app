# Local-first campaigns — stage 1

Base: `f7f6d2cadf16c580ec832db0f96e900117c456e5` (PR 38 production).

## Implemented scope

- One shared campaign/settlement ID and one rules engine; no retired personal
  settlement store, fallback world or separate local economy is reintroduced.
- Account/campaign-scoped IndexedDB snapshots and campaign summaries. Cached worlds
  open directly through the shared map entry even when list/read calls hit a quota.
- Synchronous read-modify-write IDB transactions commit the complete queue before a
  local action returns success. Cross-tab appends and ACKs cannot replace each other.
- Offline commands in this increment: resident action, construction target,
  workplace assignment, queue priority and moving an existing building. They are
  DRAFT orders, validated against the saved rules and permissions. Server time at
  synchronization determines when they take effect. No backdated work is awarded.
- Pending draft assignments freeze speculative construction projection so a new
  crew is not shown as having worked since the previous server snapshot.
- Financial and administrative commands remain on the existing online API and
  existing economy. They are journaled durably before HTTP and retain their original
  request ID after an uncertain failure. Another purchase cannot replace them.
- A legacy `sessionStorage` pending command migrates only after an IDB commit and
  retries through its original receipt API, never through the new batch protocol.
- Daily automatic eligibility (24h since successful sync), manual sync, bounded
  multi-chunk draining and persisted exponential backoff/Retry-After. The one-minute
  client timer checks LOCAL eligibility; it does not issue periodic Firestore ticks.
  Closing a PWA is not a guaranteed background schedule; overdue sync runs on reopen.
- EN/RU/UK/PL status, pending count, last/next attempt, rejection history, backup
  export and an explicit persistent-storage request. No auth tokens are exported.
- The original campaign lobby stays available for session/invite/deletion controls.
  Its live presence poller is not mounted in the offline/world-only hub. Combat,
  chat and dice transports are not moved to daily synchronization.

## Backend protocol

`POST /api/settlement-sync` authenticates using the existing Firebase Admin setup.
A request has `protocol`, `campaignId`, `deviceId`, immutable `requestId`, and up to
32 sequential nonfinancial operations. The total payload is bounded. The server
rechecks membership, permissions, exact command shape, object preconditions and
existing gameplay validation. It computes shared time progression at server time.

A transaction reads the campaign and its account/campaign/device stream checkpoint
before any writes. It writes the resulting campaign once (when changed) and the
stream checkpoint once. An identical retry returns the stored results without
reapplying or writing. A reused batch ID with different content and any sequence
gap/reuse are rejected. A client keeps at most one immutable in-flight batch;
all appends during HTTP remain after the confirmed prefix is removed atomically.

The stream cursor is durable. Do not add a TTL or delete a stream checkpoint while
an old device could still replay operations. This stage exports backups but does
not import/clone device stream identities. Per-object preconditions let changes to
different workers merge; competing orders for one worker are explicitly rejected,
not silently resolved by last-write-wins. Rejections remain in the local journal.

## Not implemented in stage 1

- Personal-inventory payment/reservations across character sheet, crafting and trade.
  Existing stockpile-funded online construction is intentionally NOT changed yet.
- Autonomous paid construction, territory purchase, warehouse conflict resolution,
  free warehouse placement, brigade ownership, device spending handoff, or offline
  production/time ledgers. These are the next implementation stages, not enabled
  hidden features in this preview.
- Precise PWA background timing, Android native background service, P2P host,
  Redis, database migration or an always-on socket server.
- First-time offline loading of a campaign that has never been cached.
- Automatic acceptance of stale membership or client-supplied balances/timestamps.

## Verification

Local standalone protocol/controller/batch tests use a small explicit gameplay
adapter fixture. Native IDB tests use a real Chromium profile and test reload,
concurrent tabs, transaction rollback and full browser restart. Real-game tests
separately import the repository's actual command/day/construction engines and API.
The workflow runs all `campaign*.test.js` and `settlement*.test.js`, `npm ci`, the
production build, and the native IDB test. Record actual CI results in the PR.

Local environment limitations: GitHub/npm DNS was unavailable for a full clone;
the system Chromium blocked loopback HTTP navigation. Do not describe those local
attempts as a full build or browser success. Remote CI is required for those checks.

Manual acceptance still required on an authenticated preview: load an existing
campaign once; reopen it during quota/offline failure; change an assignment and move
a building; close/reopen; synchronize; verify both clients, rejected conflicting
orders, role revocation, storage failure, translations, responsive panels and the
installed PWA/Android build. The backup export is not a tested restore/import path.

Keep this change in a draft preview. No production merge/promotion is authorized
by the request to begin implementation.
