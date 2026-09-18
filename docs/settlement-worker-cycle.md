# Phaser settlement: saved assignments → visual work cycles

Built on main `aaf00f5d606f72abe28156b73e56f76d41c55a47`.

The existing Residents panel remains the assignment UI. Construction targets use
`targetBuildingId` or `parentBuildingId` + `targetRoomId`; other actions use a
compatible active workplace or an offsite location. Legacy building assignments
cannot send a farmer back to a previous construction site.

The scene maintains one local actor per saved resident. Actors walk around
building footprints, show work tools, carry supplies/output, and wait when the
target is missing, completed, unavailable, or unreachable. Tapping a worker pins
its localized status. Reduced motion uses static assignment indicators.

This is a presentation-only increment, not a new economy. No animation frame
writes to the campaign or credits stockpile resources. Existing 24-hour production
and construction accounting remain authoritative. There is no new manual
building/resource-assignment UI in this increment. Resource capacity and daily
allocation formulas are unchanged. The existing Phaser geometric character art
is retained; this change does not introduce a new Tiny Swords sprite pack.

## Validation

`node --test tests/settlementWorkerRuntime.test.js tests/settlementWorkerActor.test.js`

Local result: 33 passed, 0 failed. Actor tests use a Phaser display-object double,
not a browser. Syntax checks passed for all three production modules.
A complete app build, real desktop/mobile rendering, and live campaign sync
were not verified locally: the environment could not clone the full repository.

## Manual acceptance

Assign crops or scavenging in Residents and observe work/carry/return; assign a
specific building or room construction target and observe its worker. Finish,
remove or block that target and check the waiting explanation. Switch assignments
mid-delivery: the old crate/path must disappear. Toggle reduced motion, zoom/hover
repeatedly, switch settlements and change population; confirm no duplicate actors
or motion restarts from unrelated UI updates. Confirm daily resources are credited
by the existing settlement day engine only, including after reopening the app.
