# Live construction — PR 38, stage 3

Based on `74513de21207b6dbe449ec8b1cbc7be0c2964a49`.

## Implemented

- A screen-sized progress strip above each construction site: percentage, crew
  count and waiting/confirmation marker. Tooltips show ETA for a single task.
  Multiple tasks at the same building use a work-weighted combined percentage;
  the selected building card shows each task separately.
- A live task card with remaining time at the current crew size and an explicit
  waiting state when no builders are assigned. Its assignment button focuses the
  existing resident picker. The stale-target fallback in its worker list now
  matches the existing construction queue.
- Three visual stages using existing assets: site/materials, partially revealed
  structure, finishing/scaffolding. Rooms and upgrades do not hide an active
  parent building. Saved completion restores the full building and resource icon.
- Confirmed completion notices with an Open Building button, EN/RU/UK/PL copy,
  and no replay of historical notifications on initial open or settlement switch.
- The completed building card identifies workplaces that need staff. Automatic
  water/power objects remain automatic; services are not described as production.

## State boundary

`settlementConstructionView` calls the existing `advanceConstruction` on a
read-only projection. It never persists that projection, spends materials,
credits resources, emits commands, or modifies the settlement prop. A predicted
100% remains **Awaiting saved confirmation**, with scaffolding still present,
until the authoritative/local persisted state actually changes. Notifications
come only from confirmed input events, never projected events.

ETA uses the current crew and does not promise the future contribution of workers
that might become free later. The existing engine still owns simultaneous tasks,
automatic queue fallback, room/upgrade completion and offline catch-up. No economic
or server command changes are introduced in this stage. Existing permission,
save-error and assignment commands remain in use.

Map progress is sampled locally at most once a second in a visible Phaser scene;
hover/zoom does not restart work or recreate all building sprites. The card clock
stops when hidden and cleans up on unmount. No per-frame persistence or extra
campaign requests are added. Static stages also support reduced-motion users.

## Validation

`node --test tests/settlementConstructionView.test.js tests/settlementConstructionDisplay.test.js`

Local result: **39 passed, 0 failed, 0 skipped**. All four added/modified JSX
modules also passed syntax parsing.

Limitations: the local environment could not resolve GitHub to clone the repo,
and agent-browser was not installed. Local tests used the fetched unchanged
construction functions with small catalog/workplace fixtures, plus Phaser
display-object doubles. These local fixtures were NOT committed. In the complete
repository the committed tests import its actual modules. This result is not a
full-repository integration, browser, live campaign, PWA or Android build test.
Earlier stage suites were not rerun locally. Remote deployment status is recorded
separately in the PR after verification. Keep PR 38 as a draft; no main merge or
production promotion is authorized by this change.

## Browser acceptance still required

Build a site; assign two builders; inspect its strip and task card; remove one
and check the ETA; remove the last and check waiting; reopen the save; complete
it and check its normal icon and notification. Check automatic queue transitions,
parallel sites, rooms, upgrades, failed campaign saves and read-only members.
On mobile, test badge/strip taps versus map drags, keyboard button activation,
edge tooltips, notification wrapping, zoom and panel scrolling. Confirm no extra
inventory credit, material charge or duplicate saved completion event occurs.
