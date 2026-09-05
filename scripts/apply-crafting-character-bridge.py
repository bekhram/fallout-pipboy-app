from pathlib import Path

path = Path("src/App.jsx")
text = path.read_text(encoding="utf-8")
old = '''        <PipboyShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onToggleMenu={() => setSideMenuOpen(true)}
        >'''
new = '''        <PipboyShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onToggleMenu={() => setSideMenuOpen(true)}
          character={form}
          setCharacter={setForm}
        >'''
if old not in text:
    raise SystemExit("PipboyShell anchor not found")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
