# Shared world and campaign settlements

The GM workspace now exposes Map → Battle map / Global map. Global map connects to the active permanent campaign. Quick sessions show a direct route to Campaigns with an explanation of how to open a shared world. Every member can also open the world from the campaign details, including while the GM is offline.

The world shows the five existing Fallout regions and their locations, member positions, and campaign settlements. Select a location or coordinates, move your marker, or found a settlement as GM. Settlements can be opened from markers or the list across all regions.

Settlement construction uses the existing Phaser screen and authoritative `/api/campaigns` commands. Building, rooms, moving, removal, worker actions and defense use server responses. Shared stockpile deposits and GM spending permissions are available in the settlement header. Existing character approval and resource/perk/skill requirements remain enforced by the server. Each actor can submit the current character once; the GM approves pending characters. Solo settlement storage is unchanged.

The world polls every five seconds while visible. Missing connectivity pauses mutations. Uncertain requests retain their request ID in session storage so retrying after a tab switch or reload uses the server's existing idempotency receipt. No whole settlement snapshot is uploaded as an edit.

Validation:
- Production Vite/PWA build.
- Campaign API tests: shared positions, settlement visibility, founding/build retry idempotency, spending permissions, and member isolation, alongside existing campaign tests.
- Chromium with the real campaign command reducer and a local transport fixture: region change, marker movement, founding, Phaser placement, member read-only view, failed-response retry after reload, and 360/390/768/1440px widths.
- Actual GM navigation: desktop/mobile global tab, hiding/restoring tactical content and opening Campaigns.

The authenticated production Firebase backend and a physical Android device were not exercised by these local checks.
