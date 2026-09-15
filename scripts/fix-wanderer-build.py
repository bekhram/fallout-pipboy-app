from pathlib import Path
import re

p = Path('src/components/characterCreation/QuickCharacterWizard.jsx')
s = p.read_text(encoding='utf-8')

# The app already gained INT+9 support on main; the Wanderer patch may add a second declaration.
# Keep the last/current implementation and remove earlier duplicates in the same component scope.
for variable in ['skillPointBudget', 'specialBudget', 'requiredPerkCount']:
    pattern = re.compile(rf'^  const {variable} = .*?;\n', re.MULTILINE)
    matches = list(pattern.finditer(s))
    if len(matches) > 1:
        for match in reversed(matches[:-1]):
            s = s[:match.start()] + s[match.end():]

p.write_text(s, encoding='utf-8')
print('Quick-create duplicate declarations normalized')
