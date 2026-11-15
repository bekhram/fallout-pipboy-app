---
name: pip2d20-test
description: Run and diagnose the full Pip2d20 regression suite and browser checks for the character sheet, inventory, crafting, armor, maps, sessions and offline persistence. Use for release testing, app regressions, or requests to test the entire Pip2d20 project.
---

# Test Pip2d20

1. Resolve the current checkout of `bekhram/fallout-pipboy-app` and record the branch or commit. Install dependencies with `npm ci`. Run `npm run verify` and record passed, failed and skipped tests separately. The suite includes the settlement workplace integration tests via Node’s VM modules flag.
2. Test production output with `python tests/browser_smoke.py`. The script needs Python Playwright and Chromium. Inspect its output for all four language runs, mobile and desktop navigation, catalog visibility, a real crafting attempt and persistence after reload.
3. Exercise changed workflows through the real UI with a disposable profile. For a broad release check, cover character creation and import/export, all sheet tabs, dice and combat, armor repair, inventory edits, crafting and ammunition dismantling, session host/join and reconnection, maps, settlement work and offline reload. Use a test session and local fixtures for network and persistence cases.
4. Reproduce failures with the smallest valid fixture and compare against the base branch when needed. Check browser errors and verify the resulting saved state after successful actions.
5. Report the tested commit, commands, counts, browser sizes and any unverified scenarios. Use `pip2d20-i18n-perf` for deeper locale or weak-device checks.
