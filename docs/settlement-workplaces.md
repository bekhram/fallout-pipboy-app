# Building assignments and map indicators (PR 38, stage 2)

## User flow

Select a building on the map (or tap its overhead badge), choose a resident in
its Workers section and assign / reassign them. Remove an assignment from the
same section. Construction buildings and unfinished rooms use the existing
construction task commands; upgrades and automatic queue fallback are also reflected by the worker renderer. Automatic water/power objects do not gain invented
worker requirements. Existing action-only residents retain automatic allocation.

A building badge shows its resource/function, with a separate construction or
unavailable marker. A worker badge always shows the occupation; cargo / waiting
is a separate small marker. Badge size is independent of camera zoom. Tapping a
worker pins its localized task/status; hovering a building explains its output.
All new UI copy is supplied in English, Russian, Ukrainian and Polish.

## Accounting

`settlementWorkplacePlan.js` is the pure shared allocation model. Manual targets
reserve a specific workplace first; automatic farmers still cover up to six
plants across fields. Per-building food values sum to the daily pooled integer.
Stores use their assigned workers rather than taking the first stores in the
building array. Unavailable explicit targets do not silently earn resources.

The `workplace` command uses the existing spending permission check and validates
resident/target/availability/capacity on the server as well as in the UI. It clears
a previous task in a single assignment update. Animation contains no network
calls or inventory writes. The existing daily clock and construction timer remain
authoritative. Income is shown as the existing income rating, NOT a guaranteed
number of caps added to stockpile. Scavenging shows a shared daily dice result,
not a made-up fixed output per yard. Crafting facilities show a service icon.

## Verification

Run:

```sh
node --experimental-vm-modules --test tests/settlementWorkplacePlan.test.js tests/settlementWorkplaceIntegration.test.js
```

Local result: 47 passed, 0 failed, 0 skipped. This comprises pure allocation /
indicator tests and changed-module integration tests with unchanged catalog,
power, construction, attack and Phaser services represented by test doubles.
The integration tests require Node's `--experimental-vm-modules` flag; without it
those tests explicitly skip. JSX syntax was checked with TypeScript locally.
These checks are NOT a complete app build, a real Phaser browser test, an Android
build, or proof of live campaign synchronization. The full repository was not
available in the local container (GitHub DNS access failed).

Manual acceptance: desktop and mobile building selection; reassign/remove;
full and unavailable sites; multiple field/store allocations; construction rooms;
map panning/zooming; badge taps versus drags; quota-related command failure;
read-only members; reopening the settlement and processing each day only once.
