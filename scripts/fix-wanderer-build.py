from pathlib import Path
import re

p = Path('src/components/characterCreation/QuickCharacterWizard.jsx')
s = p.read_text(encoding='utf-8')

# Normalize to one component-scope INT+9 budget regardless of what earlier patches inserted.
s = re.sub(r'^\s*const skillPointBudget\s*=.*?;\n', '', s, flags=re.MULTILINE)
anchor = '  const usedSkillPoints = SKILL_KEYS.reduce(\n'
if anchor not in s:
    raise SystemExit('usedSkillPoints anchor not found')
s = s.replace(
    anchor,
    '  const skillPointBudget = Math.max(9, Number(special?.I || 0) + 9);\n' + anchor,
    1,
)

# Normalize other component-scope declarations if a prior patch duplicated them.
for variable in ['specialBudget', 'requiredPerkCount']:
    pattern = re.compile(rf'^  const {variable} = .*?;\n', re.MULTILINE)
    matches = list(pattern.finditer(s))
    if len(matches) > 1:
        for match in reversed(matches[:-1]):
            s = s[:match.start()] + s[match.end():]

p.write_text(s, encoding='utf-8')
print('Quick-create budget declarations normalized')
