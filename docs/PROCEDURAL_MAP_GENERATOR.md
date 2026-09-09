# PIP 2D20 Procedural Map Generator

## Goal
Replace the growing library of full-size encounter background images with a deterministic Fallout 2d20 location generator. Keep custom user background upload as a first-class alternative.

## Core rules
- Generated maps are deterministic: same seed + parameters = same map.
- The tactical grid is independent from map artwork.
- Generated maps must support all tactical grid sizes without separate image assets.
- Generated maps must not be stored as large PNG/JPEG files in the app bundle.
- Custom background upload remains available from the tactical scene editor.
- Generated locations should eventually expose semantic data to Auto GM, not just pixels.

## Phase 1 — Generator V1
- [x] Seeded PRNG and deterministic map generation.
- [x] Dynamic output aspect ratio from scene grid size.
- [x] SVG generated in-browser instead of bundled full-size images.
- [x] Generator UI in GM Scenes.
- [x] Grid presets: 8x8, 12x12, 16x12, 16x16.
- [x] Density control.
- [x] V1 location archetypes:
  - Wasteland
  - Red Rocket
  - Super-Duper Mart
  - Raider Camp
  - Military Bunker
- [x] Preserve custom background upload.
- [x] Update tactical environment location type when a generated location is applied.

## Phase 2 — Semantic map model
- [ ] Generate structured map data alongside visuals.
- [ ] Object types: wall, door, cover, obstacle, terminal, container, hazard, spawn point.
- [ ] Rooms / named areas: garage, store, office, storage, bunker corridor, etc.
- [ ] Walkability and blocked-cell mask.
- [ ] Door states: open, closed, locked.
- [ ] Loot/search points.
- [ ] GM-only hidden points.

## Phase 3 — Encounter integration
- [ ] Auto GM receives generated map structure and named areas.
- [ ] Encounter generator can request a location type and suitable layout.
- [ ] Suggested enemy spawn zones based on map topology.
- [ ] Suggested player starting area.
- [ ] Suggested loot and hazard positions.
- [ ] "Random suitable map" uses current encounter/environment instead of choosing from all maps.

## Phase 4 — More Fallout location archetypes
- [ ] Settlement
- [ ] Factory
- [ ] Mine
- [ ] Tunnel
- [ ] Amusement Park
- [ ] Railway Station
- [ ] Bus Station
- [ ] Police Station
- [ ] Hospital
- [ ] Substation
- [ ] Cave
- [ ] Metro Station
- [ ] Airport
- [ ] Ship
- [ ] Super Mutant Camp
- [ ] Vault

## Phase 5 — Visual tile/object library
- [ ] Small reusable terrain textures rather than full maps.
- [ ] Roads, cracked asphalt, dirt, concrete, radioactive ground.
- [ ] Modular walls, doors and floors.
- [ ] Cars, barricades, furniture, shelves, pumps, machinery, rubble.
- [ ] Biome-aware prop pools.
- [ ] Day/night lighting variants.

## Phase 6 — Scene editor UX
- [ ] Generator / Custom Background source selector.
- [ ] Custom X × Y grid size.
- [ ] Layout presets: open, dense, linear, compound, interior-heavy.
- [ ] Regenerate while keeping seed or generate a new seed.
- [ ] Lock parts of a generated map before regeneration.
- [ ] Manual object placement/removal.
- [ ] Preview before applying to live scene.

## Phase 7 — Storage and caching
- [ ] Store procedural scene specification instead of rendered image where session protocol allows it.
- [ ] Rebuild generated background locally on each client.
- [ ] Avoid generated maps in PWA precache.
- [ ] Cache only recently used generated renders.
- [ ] Move optional full-size curated maps to external object storage/CDN.
- [ ] Keep only small thumbnails/catalog metadata in the app.

## Phase 8 — Testing
- [ ] Determinism tests for seed output.
- [ ] Test every supported grid size.
- [ ] Mobile performance tests.
- [ ] Multiplayer scene synchronization tests.
- [ ] Generated map + token drag/drop regression tests.
- [ ] Auto GM semantic-context tests.
