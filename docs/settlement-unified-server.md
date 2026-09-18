# One persistent settlement system

The personal map previously mounted `useSettlementStorage`, with its own
`pip2d20:settlements:v1` localStorage records and a one-minute simulation timer.
The campaign world separately used server commands and saved campaign settlements.
Identical screens therefore edited different buildings, residents and stockpiles.

## Now

- The personal-map button opens `CampaignPanel` in `worldOnly` mode. Selecting the
  same campaign opens the same `CampaignWorldMap` and `SettlementScreen` as the GM
  and player campaign screens. The personal travel map itself is retained.
- The local settlement hook/creation path is removed. Campaign commands, membership,
  spending permissions, daily production, construction, defense and saving remain
  authoritative. A live GM connection is not required to manage a saved campaign.
- No automatic local fallback exists on a server quota/network error. Existing
  offline/read-only and retry behavior belongs to `useCampaignWorld`.
- The world-only entry does not start the lobby's extra presence poller and does
  not expose live-session or campaign-deletion controls. Campaign deletion remains
  in the original lobby, where the active-session safety check is available.
- Old browser records are not erased, modified, simulated or automatically merged.
  An export-only archive is available below the campaign panel. Automatic merging
  would guess ownership/campaign mapping and could duplicate server resources.

## Tiny Swords workers

The bundled legacy Pixel Frog pawn sheet has 36 frames, each 192 x 192, six per
row: idle, walk, build, chop, carry-idle, carry-walk. Frame duration is 100 ms.
See `src/assets/settlement/workers/ATTRIBUTION.md` for source and license provenance.

The Phaser scene preloads the local Vite asset before creating residents. Each
saved resident still has one actor, uses the existing routes/workplace resolver,
and retains the existing activity badge, building badge and localized tooltip.
Sprites mirror horizontally; camera/grid orientation is not changed.

Hammering only plays while actually working on construction or salvaging. The
legacy sheet has no farming/shopkeeping animation; these jobs keep the idle pose
at the workplace and their existing truthful task indicator. Carrying and walking
use separate strips. Reduced motion freezes pose and position. Frame playback
never awards resources, updates saves or makes network requests.

## Checks

- Local: 10 pure frame-selection/archive tests; JS/JSX parse checks.
- CI workflow: actor/runtime, frame, archive and shared-entry wiring regressions,
  plus the production web/PWA build. Read the workflow result before calling it
  passed. Source-wiring tests are not a two-client integration test.
- Still verify in an authenticated preview: select the same campaign from both
  entry points, compare settlement IDs/buildings/stockpiles, assign a builder,
  watch walking/hammer/carry transitions, zoom and tap badges on mobile, confirm
  read-only behavior on a disconnected client and reconnect safely.
- Do not merge or promote to production until reviewed.
