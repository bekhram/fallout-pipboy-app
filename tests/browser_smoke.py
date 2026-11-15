"""Production smoke tests. Run after npm run verify with Python Playwright and Chromium."""

import argparse
import json
import os
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from statistics import median
from threading import Thread

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = ("en", "ru", "uk", "pl")
NAVIGATION = (
    "status", "special", "skills", "companion", "weapons", "inventory",
    "crafting", "vehicles", "armor", "perks", "bestiary", "notes", "map", "games",
)
POWER_ARMOR = {
    "en": ("POWER ARMOR", "Calibrated Shocks", "T-60b Chest Piece", "Common Materials"),
    "ru": ("СИЛОВАЯ БРОНЯ", "Калиброванные амортизаторы", "T-60b — Нагрудник", "Обычные материалы"),
    "uk": ("СИЛОВА БРОНЯ", "Калібровані амортизатори", "T-60b — Нагрудник", "Звичайні матеріали"),
    "pl": ("PANCERZ WSPOMAGANY", "Kalibrowane amortyzatory", "T-60b — Napierśnik", "Materiały pospolite"),
}
FIXTURE = {
    "characterName": "Pip2d20 QA",
    "level": "14",
    "special": {key: 8 for key in "SPECIAL"},
    "skills": {"Repair": {"rank": 6, "tagged": True}, "Science": {"rank": 6}},
    "perksAndTraits": [
        {"id": "armorer", "name": "Armorer", "rank": "4"},
        {"id": "science", "name": "Science!", "rank": "4"},
    ],
    "inventoryItems": [
        {"name": name, "category": "junk", "quantity": "30"}
        for name in ("Common Materials", "Uncommon Materials", "Rare Materials")
    ] + [
        {"name": "Stealth Boy", "category": "misc", "quantity": "1", "effect": "Invisibility"},
        {"name": "Camping Tent", "category": "tools", "quantity": "1",
         "effect": "Provides the Shelter campsite feature for two characters while camping."},
    ],
}


class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def resource_text(language):
    return json.loads((ROOT / "src" / "locales" / language / "common.json").read_text(encoding="utf-8"))


def launch(playwright):
    executable = os.environ.get("PIP_QA_CHROMIUM_EXECUTABLE")
    args = ["--single-process", "--no-zygote"] if os.environ.get("PIP_QA_SINGLE_PROCESS") else []
    return playwright.chromium.launch(executable_path=executable, args=args)


def create_page(browser, lang, mobile, fixture=True, service_workers="block"):
    width, height = (360, 800) if mobile else (1366, 768)
    context = browser.new_context(
        viewport={"width": width, "height": height},
        is_mobile=mobile, has_touch=mobile, service_workers=service_workers, reduced_motion="reduce",
    )
    page = context.new_page()
    page.route("https://**/*", lambda route: route.abort())
    initial = {"language": lang}
    if fixture:
        initial["record"] = {"data": FIXTURE, "updatedAt": "2026-01-01T00:00:00.000Z"}
    page.add_init_script(f"""(() => {{
      const state = {json.dumps(initial)};
      if (!localStorage.getItem('fallout_pipboy_language')) {{
        localStorage.setItem('fallout_pipboy_language', state.language);
        if (state.record) localStorage.setItem('fallout_pipboy_v4_last_character', JSON.stringify(state.record));
      }}
    }})()""")
    return page


def open_tab(page, name):
    menu = page.locator('[aria-controls="sheet-more-panel"]:visible')
    menu.first.click()
    page.locator("#sheet-more-panel nav button").nth(NAVIGATION.index(name)).click()
    expect(page.locator("#sheet-more-panel")).to_have_count(0)


def main_content(page):
    return page.locator(".pip-screen-slide")


def check_screen(page, name):
    open_tab(page, name)
    panel = main_content(page)
    expect(panel.locator("h1:visible, h2:visible, h3:visible, [role=tablist]:visible, canvas:visible, .games-screen:visible").first).to_be_visible()
    if name == "map":
        expect(panel.locator(".phaser-map__canvas canvas").first).to_be_visible(timeout=20000)
    if name == "crafting":
        expect(panel.locator(".crafting-recipe-card").first).to_be_visible()


def verify_locale(playwright, url, language, dist):
    text = resource_text(language)
    armor, shocks, chest, materials = POWER_ARMOR[language]
    browser = launch(playwright)
    try:
        page = create_page(browser, language, mobile=language != "en")
        page.set_default_timeout(12000)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url)
        expect(page.locator("html")).to_have_attribute("lang", language)
        if language == "en":
            page.get_by_role("button", name="Join by code").click()
            expect(page.get_by_label("Session code", exact=True)).to_be_focused()
            page.get_by_role("button", name=re.compile("Back to home")).click()
        page.locator(".home-continue button").click()
        expect(page.locator(".sheet-overview")).to_be_visible()

        open_tab(page, "perks")
        perks = main_content(page)
        expect(perks.get_by_text(text["perksInfo"]["armorer"]["name"], exact=True)).to_be_visible()
        perks.get_by_role("button", name="+", exact=True).click()
        expect(perks.get_by_label(text["perksPanel"]["selectArchive"])).to_be_visible()
        perks.get_by_role("button", name=text["common"]["cancel"], exact=True).click()

        open_tab(page, "crafting")
        crafting = main_content(page)
        crafting.get_by_role("button", name=armor, exact=True).click()
        search = crafting.get_by_role("searchbox")
        search.fill(shocks)
        expect(crafting.get_by_role("heading", name=shocks, exact=True)).to_be_visible()
        search.fill("T-60b")
        crafting.get_by_role("button", name=re.compile("T-60b")).click()
        expect(crafting.get_by_text(f"{materials}: 30/4", exact=True)).to_be_visible()
        crafting.locator(".craft-section select").select_option("torso")
        uncommon = {"en": "Uncommon Materials", "ru": "Необычные материалы",
                    "uk": "Незвичайні матеріали", "pl": "Materiały niepospolite"}[language]
        expect(crafting.get_by_text(f"{uncommon}: 30/3", exact=True)).to_be_visible()
        craft = crafting.locator("button.crafting-recipe-card__craft")
        expect(craft).to_be_disabled()
        crafting.locator(".craft-bench-toggle").click()
        expect(craft).to_be_enabled()
        craft.click()
        expect(crafting.get_by_text(f"{materials}: 26/4", exact=True)).to_be_visible()
        expect(crafting.get_by_text(f"{uncommon}: 27/3", exact=True)).to_be_visible()

        open_tab(page, "inventory")
        inventory = main_content(page)
        expect(inventory.get_by_role("heading", name=chest, exact=True)).to_be_visible()
        tent = {"en": "Camping Tent", "ru": "Походная палатка",
                "uk": "Похідний намет", "pl": "Namiot turystyczny"}[language]
        expect(inventory.get_by_role("heading", name=tent, exact=True)).to_be_visible()
        page.reload()
        expect(main_content(page).get_by_role("heading", name=chest, exact=True)).to_be_visible()

        if language == "en":
            page.locator(".sheet-topbar button").click()
            drawer = page.locator(".pip-drawer--global.is-open")
            drawer.get_by_role("button", name="RU", exact=True).click()
            expect(page.locator("html")).to_have_attribute("lang", "ru")
            expect(main_content(page).get_by_role("heading", name=POWER_ARMOR["ru"][2], exact=True)).to_be_visible()
            drawer.get_by_role("button", name="EN", exact=True).click()
            expect(page.locator("html")).to_have_attribute("lang", "en")
            drawer.locator(".pip-drawer-close").click()
            for screen in NAVIGATION:
                check_screen(page, screen)
            worker = next((dist / "assets").glob("gmGeneration.worker-*.js")).name
            result = page.evaluate("""async (path) => {
              const worker = new Worker(path, { type: "module" });
              try {
                return await new Promise((resolve, reject) => {
                  const timer = setTimeout(() => reject(new Error("GM worker timed out")), 8000);
                  worker.onmessage = (event) => { clearTimeout(timer); resolve(event.data); };
                  worker.onerror = (event) => { clearTimeout(timer); reject(new Error(event.message)); };
                  worker.postMessage({ id: 42, spec: { type: "vault_tunnels" } });
                });
              } finally {
                worker.terminate();
              }
            }""", f"/assets/{worker}")
            assert result["id"] == 42 and result["encounter"]["totalEnemies"] >= 0, result

        assert not errors, f"{language}: uncaught browser errors: {errors}"
        print(f"{language}: perks, crafting, inventory and saved output verified", flush=True)
        if language == "en":
            print("Desktop: session lobby, all 14 character tabs and GM worker verified", flush=True)
    finally:
        browser.close()


def verify_offline(playwright, url):
    browser = launch(playwright)
    try:
        page = create_page(browser, "pl", mobile=True, service_workers="allow")
        page.goto(url)
        page.locator(".home-continue button").click()
        expect(page.locator(".sheet-overview")).to_be_visible()
        page.wait_for_function("navigator.serviceWorker.controller !== null", timeout=30000)
        page.context.set_offline(True)
        page.reload()
        expect(page.locator(".sheet-overview")).to_be_visible()
        open_tab(page, "crafting")
        main_content(page).get_by_role("button", name=POWER_ARMOR["pl"][0], exact=True).click()
        main_content(page).get_by_role("searchbox").fill(POWER_ARMOR["pl"][1])
        expect(main_content(page).get_by_role("heading", name=POWER_ARMOR["pl"][1], exact=True)).to_be_visible()
        open_tab(page, "perks")
        name = resource_text("pl")["perksInfo"]["armorer"]["name"]
        expect(main_content(page).get_by_text(name, exact=True)).to_be_visible()
        print("Mobile PWA: offline reload, Polish crafting and perks verified", flush=True)
    finally:
        browser.close()


def trace_startup(playwright, url, repeat):
    samples = []
    for _ in range(repeat):
        browser = launch(playwright)
        try:
            page = create_page(browser, "en", mobile=True, fixture=False)
            session = page.context.new_cdp_session(page)
            session.send("Emulation.setCPUThrottlingRate", {"rate": 4})
            session.send("Network.enable")
            session.send("Network.emulateNetworkConditions", {
                "offline": False, "latency": 150, "downloadThroughput": 187500, "uploadThroughput": 93750,
            })
            page.goto(url, timeout=45000)
            expect(page.locator(".home-welcome h1")).to_be_visible(timeout=45000)
            page.wait_for_function("performance.getEntriesByName('first-contentful-paint').length > 0")
            samples.append(page.evaluate("performance.getEntriesByName('first-contentful-paint')[0].startTime"))
        finally:
            browser.close()
    print(f"Mobile 4× CPU, 1.5 Mbit/s, 150 ms: median FCP {median(samples):.0f} ms "
          f"({', '.join(str(round(ms)) for ms in samples)} ms)", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", type=Path, default=ROOT / "dist")
    parser.add_argument("--measure", type=int, default=0, metavar="RUNS")
    parser.add_argument("--language", choices=LANGUAGES)
    args = parser.parse_args()
    if not (args.dist / "index.html").is_file():
        parser.error("Build the app or pass a production directory via --dist.")

    handler = partial(SilentHandler, directory=str(args.dist.resolve()))
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server, sync_playwright() as playwright:
        Thread(target=server.serve_forever, daemon=True).start()
        url = f"http://127.0.0.1:{server.server_port}/"
        try:
            if args.measure:
                trace_startup(playwright, url, args.measure)
            else:
                for language in (args.language,) if args.language else LANGUAGES:
                    verify_locale(playwright, url, language, args.dist)
                if not args.language:
                    verify_offline(playwright, url)
        finally:
            server.shutdown()


if __name__ == "__main__":
    main()
