# GM workspace redesign

Prepared from the approved desktop/mobile references. This branch implements the adaptive workspace and reorganizes existing tools; production publishing is a separate step.

## Navigation

| Section | Existing tools |
| --- | --- |
| Map | Tactical map, initiative, collapsible environment effects |
| Screens | Environment, scene library, procedural encounters, Auto GM |
| Creatures | Bestiary, custom NPC editor, placed NPCs, players |
| Supplies | Loot and merchant generators |

The desktop rail includes direct access to players, chat and dice. Below 900px the five-item bottom navigation is Map / Chat / Screens / Dice / More; More contains creatures, supplies and players. Session menu and language selection remain in the header. Permanent campaigns remain accessible through Session menu.

## Design

- Near-black green background `#071411`, surface `#0d211b`, elevated surface `#132c24`.
- Text `#c3ddce`, secondary text `#8baa9b`, action accent `#8ce8ad`, border `#29493d`.
- System typography, 8px control corners, 12px panels, 16–20px desktop spacing.
- Desktop chat docks at 1280px; smaller screens retain an overlay.
- Mobile controls use at least 44px height; bottom safe-area and scroll clearance protect form actions.
- Existing GM-only scene controls, item generation, NPC editor and map layers remain connected to their existing handlers. Panels stay mounted so local drafts survive tab changes.
- The current bestiary picker is restyled, with a compact mobile group select. The illustrated portrait gallery from the concept is not part of this branch.

## Implementation

`GmWorkspaceNavigation` owns grouped navigation and localized labels (EN/RU/UK/PL). `gmOrganicWorkspace.css` scopes the visual system to the GM host, leaving player/character/settlement layouts intact. `SessionChatDrawer` can portal into the desktop dock and exposes chat/dice actions to the mobile navigation. The existing initiative HUD portals above the map.

Session menu rendering now lives directly in `SessionScreen`; the obsolete Vite string replacement is no longer loaded. The existing tactical-tab storage key is retained for compatibility.

## Validation

- Production Vite/PWA build.
- Chromium: entry from home → quick session → GM workspace; all four main sections.
- Desktop dock, mobile chat open/close, dice modal, custom NPC section.
- Auto GM draft preserved across navigation; selected tab written to the existing storage key.
- Loot generation and accessible mobile action after scrolling.
- No document overflow at 360, 390, 768, 1024 and 1440px in the checked views.
- Live network synchronization and reconnect after reload require the session backend, which was unavailable in the local test environment. Android device testing is still required.
