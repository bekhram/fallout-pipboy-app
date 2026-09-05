from pathlib import Path

api_path = Path("api/auto-gm.js")
api_text = api_path.read_text()
actual = '    "Treat the supplied character sheet as the source of truth for SPECIAL, skills, HP, Defense, statuses, injuries, perks, inventory, weapons, armor and resistances whenever those fields are present. Never silently change these values. Resolve combat and hazards using the actual sheet values instead of generic assumptions.",'
expected = '    "Treat the supplied character sheet as the source of truth for SPECIAL, skills, HP, Defense, statuses, injuries, perks, inventory, weapons, armor and resistances whenever those fields are present. Never silently change these values.",'
if actual in api_text:
    api_path.write_text(api_text.replace(actual, expected, 1))

exec(compile(Path("scripts/apply-travel-gm-survival.py").read_text(), "scripts/apply-travel-gm-survival.py", "exec"))

api_text = api_path.read_text()
if expected in api_text:
    api_path.write_text(api_text.replace(expected, actual, 1))
