from pathlib import Path

path = Path('src/components/characterCreation/QuickCharacterWizard.jsx')
text = path.read_text()

old = '''  const origin = originId ? ORIGINS[originId] : null;\n  const originTraitRequired = Number(origin?.traitSelectCount || 0);\n  const selectedTraitReady =\n    !origin?.availableTraits?.length || selectedTraits.length === originTraitRequired;\n'''
new = '''  const origin = originId ? ORIGINS[originId] : null;\n  const originTraitRequired = Number(origin?.traitSelectCount || 0);\n  const hasFlexibleTraitPerkChoice = Boolean(origin?.flexibleTraitPerkChoice);\n  const minFlexibleTraits = hasFlexibleTraitPerkChoice ? 1 : originTraitRequired;\n  const selectedTraitReady = !origin?.availableTraits?.length || (\n    hasFlexibleTraitPerkChoice\n      ? selectedTraits.length >= minFlexibleTraits && selectedTraits.length <= originTraitRequired\n      : selectedTraits.length === originTraitRequired\n  );\n  const flexibleBonusPerkCount = hasFlexibleTraitPerkChoice && selectedTraits.length === 1 ? 1 : 0;\n'''
if old not in text:
    raise SystemExit('origin trait logic insertion point not found')
text = text.replace(old, new, 1)

old = '''  const requiredPerkCount = 1 + Number(origin?.bonusPerkCount || 0);\n  const perkReady = perkIds.length === requiredPerkCount;\n'''
new = '''  const requiredPerkCount = 1 + Number(origin?.bonusPerkCount || 0) + flexibleBonusPerkCount;\n  const perkReady = perkIds.length === requiredPerkCount;\n'''
if old not in text:
    raise SystemExit('required perk count insertion point not found')
text = text.replace(old, new, 1)

old = '''                      <strong>{copy.traits} ({selectedTraits.length}/{originTraitRequired})</strong>\n                      <div className="quick-trait-list">\n'''
new = '''                      <strong>{copy.traits} ({selectedTraits.length}/{originTraitRequired})</strong>\n                      {hasFlexibleTraitPerkChoice && (\n                        <div className="pip-logbox" style={{ margin: "8px 0 10px" }}>\n                          {selectedTraits.length === 1\n                            ? "NCR: 1 trait selected — you will choose 1 additional Perk on the final step."\n                            : "NCR: choose 2 traits, or choose 1 trait and gain 1 additional Perk."}\n                        </div>\n                      )}\n                      <div className="quick-trait-list">\n'''
if old not in text:
    raise SystemExit('trait UI insertion point not found')
text = text.replace(old, new, 1)

old = '''                <h3>{copy.perkTitle} ({perkIds.length}/{requiredPerkCount})</h3>\n                <p>{copy.perkHelp}</p>\n'''
new = '''                <h3>{copy.perkTitle} ({perkIds.length}/{requiredPerkCount})</h3>\n                <p>{copy.perkHelp}</p>\n                {flexibleBonusPerkCount > 0 && (\n                  <div className="pip-logbox" style={{ marginTop: 8 }}>\n                    NCR origin bonus: because you selected only 1 trait, choose 1 additional Perk.\n                  </div>\n                )}\n'''
if old not in text:
    raise SystemExit('perk UI insertion point not found')
text = text.replace(old, new, 1)

path.write_text(text)
print('Patched NCR flexible trait/perk creation logic')
