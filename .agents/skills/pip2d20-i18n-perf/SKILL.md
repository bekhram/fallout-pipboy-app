---
name: pip2d20-i18n-perf
description: Audit Pip2d20 localization in English, Russian, Ukrainian and Polish and measure startup and interaction costs on weak mobile devices. Use for untranslated perks, crafting recipes, inventory, mixed-language screens, heavy bundles or slow maps.
---

# Audit localization and performance

1. Run `npm run verify` on production output. Check locale key and interpolation parity, then inspect catalog coverage. Compare name, description, group, ingredients, skill, perk, effect and metadata where applicable. Exercise both new and existing records and switch languages without changing identifiers or user-entered text. Check localized search and the visibility of longer labels at 360 px width.
2. Run `python tests/browser_smoke.py` for English, Russian, Ukrainian and Polish. Inspect the changed screens with a real save/reload. Treat an untranslated brand or caliber as a deliberate choice only where its localized edition uses the same form.
3. Compare identical production builds on a clean browser. Run `node scripts/check-initial-bundle.mjs BASE_DIST CURRENT_DIST` to measure gzipped startup JavaScript and CSS and `python tests/browser_smoke.py --dist PATH --measure 3` for mobile first contentful paint at 4× CPU slowdown and 1.5 Mbit/s. Run `node scripts/check-initial-bundle.mjs` to check the current startup budget.
4. Profile the slow interaction as well as startup. Inspect network waterfalls, long tasks, map frame rate and list rendering. Repeat key interactions after a service worker controls the page, then disconnect and reopen the tested local workflows.
5. Report before and after using the same device profile, cache settings and artifact type. Include failed strings and slow interactions with the screen, language and reproduction steps.
