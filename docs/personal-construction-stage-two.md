# Personal construction — stage 2 (draft)

Base: production `8ec91817395dc5efa924afc0bad1a979e6d17503` (PR 39).
This is the isolated personal-ledger follow-up to the prototype in PR 40.
It must not be promoted automatically or overwrite concurrent PR 40 changes.

## Implemented

The shared campaign remains authoritative. Its ID, permission rules, buildings,
residents, daily accounting and Tiny Swords renderer are retained. New explicit
personal construction commands reuse the catalog costs, perks, skills and progress
rules. Existing stockpile-funded jobs keep their original payment/refund behavior.

A character must first be approved in the campaign, then explicitly linked ONLINE
to a local character identity and the campaign's device stream. The panel shows
both names before linking. One source can be bound to one account/campaign, and
one approved account source to one device. There is no silent ownership transfer.

### Atomic local inventory

IndexedDB upgrades the existing database from version 1 to 2 without erasing worlds
or lists. The new `characters` store holds the authoritative available form, holds,
refund-credit checkpoint and revision. The central character setter uses this
record, including the sheet, crafting and inventory-dependent consumers. The old
localStorage snapshot is only a mirror/launch pointer, not a payment authority.

The linked world and character participate in one transaction. Appending a paid
command removes its quoted costs from the AVAILABLE form and stores its exact
reserved stacks. A failed transaction cannot save a building without its hold.
Accepted acknowledgements remove the hold without a second debit. Rejections
restore the reserved stacks, including metadata; unknown outcomes retain the hold.
Crafting can consume only the remaining inventory. Whole-form writes and functional
setters that close over stale inventory results are checked against the rendered
revision, so another tab's reservation cannot be overwritten. Crafting waits for
its durable setter before showing a successful result.

This is not a standalone extra wallet. The displayed personal inventory is already
net of construction reservations. The settlement payment panel separately shows
held totals. The construction budget is additionally bounded by the APPROVED
campaign character balance: new local acquisitions are not silently accepted by the
server. A future approved inventory reconciliation workflow is needed to increase
that bound. Device/source transfer and automatic linking of existing characters
are not included; do not replace or clear a linked character with pending work.
Import/reset creates a different identity and does not transplant spending rights.

### Server and replay

`buildPersonal`, `roomPersonal` and `upgradePersonal` travel in the existing ordered
batch protocol. Each uses a stable operation ID, source ID and exact price quote.
The server recomputes cost and checks approval, membership, spending permission,
source/device, perks, skills, capacity, placement and actual campaign inventory.
Client balances are never accepted as the server balance. The campaign change and
stream receipt commit together. Lost-response retries return the original result.
Existing online deposits on a linked source are also locally reserved and retain
the original receipt request ID. Legacy stockpile build commands cannot bypass a
linked source's personal payment path.

### Conflicting placement and refunds

A valid, paid NEW building whose footprint was occupied during synchronization is
stored in `storedBuildings`; the earlier confirmed building is not moved. Invalid
coordinates or insufficient payment are rejected, never converted into free items.
Stored objects retain identity, paid cost, funding and confirmed progress. They are
excluded from active building/production/workforce calculations. `placeStored`
checks the complete footprint, moves the same object back to the map and does not
charge again. Repeated placement cannot clone it. Stored cancellation is online
and refunds its recorded original payer, not the operator or shared stockpile.
Normal personal cancellations use existing proportional refunds. A cumulative
per-source credit checkpoint applies confirmed refunds to local inventory once.

## Deliberately not claimed

- No territory purchases yet: the grid remains 24 x 24.
- No backdated offline labor or production. Paid drafts can be queued offline;
  on the server, construction begins on synchronization. The UI says so. Already
  agreed future time-ledger/brigade ownership work is not implemented here.
- No arbitrary offline cross-device spending. A primary-device binding mitigates
  accidental double use; it is not anti-cheat against modified clients of the
  same authenticated player.
- First-time campaign load and source activation still need a working backend.
  This release does not restore an already exhausted Firestore quota.
- Account inventory import/reapproval, source handoff, restoring exported journals,
  native Android storage/service behavior and precious live campaign testing are
  not included. Export now includes the available local form and its reservations,
  but it is not a tested restore/import UI.
- The old live lobby/GM session behavior is unchanged. It is not a daily-sync mode
  for chat, dice, battle maps or GM saves.

## Verification plan

Pure tests use the real catalog/command engines and explicit transaction doubles.
The native browser suite uses real IndexedDB and the real React setter with a
synthetic campaign. It checks offline append, stale crafting closures, spending
only available materials, two-tab contention, rollback, rejection/acceptance,
full browser restart, account isolation and exports. It uses no live Firebase data.

The CI workflow runs campaign/settlement regression tests, the production build,
the stage-one native IDB suite and the new React/payment browser suite. Record
actual CI results in the PR after running them; workflow existence is not a pass.
Full signed-in mobile/desktop, true storage-exhaustion, PWA installed-startup and
Android acceptance still require manual testing on a disposable campaign.
