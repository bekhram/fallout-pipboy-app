from pathlib import Path
import re

p = Path('src/components/characterCreation/QuickCharacterWizard.jsx')
s = p.read_text(encoding='utf-8')

# Remove every skillPointBudget declaration, including multiline variants.
lines = s.splitlines(keepends=True)
out = []
skipping = False
for line in lines:
    if not skipping and re.search(r'\bconst\s+skillPointBudget\s*=', line):
        skipping = ';' not in line
        continue
    if skipping:
        if ';' in line:
            skipping = False
        continue
    out.append(line)
s = ''.join(out)

# Inline the budget expression everywhere. This avoids collisions with legacy
# patches that may also declare a skillPointBudget in the same component scope.
s = re.sub(r'\bskillPointBudget\b', '(Math.max(9, Number(special?.I || 0) + 9))', s)

# Normalize other simple component-scope declarations if a prior patch duplicated them.
for variable in ['specialBudget', 'requiredPerkCount']:
    pattern = re.compile(rf'^  const {variable} = .*?;\n', re.MULTILINE)
    matches = list(pattern.finditer(s))
    if len(matches) > 1:
        for match in reversed(matches[:-1]):
            s = s[:match.start()] + s[match.end():]

p.write_text(s, encoding='utf-8')
print('Quick-create budget declarations normalized')
