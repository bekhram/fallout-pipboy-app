import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";

const COPY = {
  en: {
    close: "CLOSE", player: "PLAYER", npc: "NPC", level: "LEVEL", hp: "HP", defense: "DEFENSE", initiative: "INITIATIVE", luck: "LUCK",
    resistances: "RESISTANCES", physical: "PHYSICAL", energy: "ENERGY", radiation: "RADIATION", poison: "POISON", weapons: "WEAPONS",
    attacks: "ATTACKS", abilities: "SPECIAL ABILITIES", special: "S.P.E.C.I.A.L.", perks: "PERKS / TRAITS", statuses: "STATUS",
    type: "TYPE", damage: "DAMAGE", rate: "ROF", range: "RANGE", effects: "EFFECTS / QUALITIES", skills: "CREATURE STATS",
    body: "BODY", mind: "MIND", melee: "MELEE", guns: "GUNS", other: "OTHER", tactics: "TACTICS", loot: "INVENTORY / LOOT",
    resistanceProfile: "FULL DR PROFILE", noWeapons: "No weapons synced.", noData: "No additional profile data."
  },
  ru: {
    close: "ЗАКРЫТЬ", player: "ИГРОК", npc: "NPC", level: "УРОВЕНЬ", hp: "HP", defense: "ЗАЩИТА", initiative: "ИНИЦИАТИВА", luck: "УДАЧА",
    resistances: "СОПРОТИВЛЕНИЯ", physical: "ФИЗИЧЕСКОЕ", energy: "ЭНЕРГЕТИЧЕСКОЕ", radiation: "РАДИАЦИЯ", poison: "ЯД", weapons: "ОРУЖИЕ",
    attacks: "АТАКИ", abilities: "ОСОБЫЕ СПОСОБНОСТИ", special: "S.P.E.C.I.A.L.", perks: "ПЕРКИ / ТРЕЙТЫ", statuses: "СТАТУСЫ",
    type: "ТИП", damage: "УРОН", rate: "СКОРОСТР.", range: "ДИСТАНЦИЯ", effects: "ЭФФЕКТЫ / СВОЙСТВА", skills: "ПОКАЗАТЕЛИ NPC",
    body: "BODY", mind: "MIND", melee: "БЛИЖНИЙ БОЙ", guns: "СТРЕЛЬБА", other: "ДРУГОЕ", tactics: "ТАКТИКА", loot: "ИНВЕНТАРЬ / ДОБЫЧА",
    resistanceProfile: "ПОЛНЫЙ ПРОФИЛЬ DR", noWeapons: "Оружие не синхронизировано.", noData: "Дополнительных данных нет."
  },
  uk: {
    close: "ЗАКРИТИ", player: "ГРАВЕЦЬ", npc: "NPC", level: "РІВЕНЬ", hp: "HP", defense: "ЗАХИСТ", initiative: "ІНІЦІАТИВА", luck: "УДАЧА",
    resistances: "ОПІР", physical: "ФІЗИЧНИЙ", energy: "ЕНЕРГЕТИЧНИЙ", radiation: "РАДІАЦІЯ", poison: "ОТРУТА", weapons: "ЗБРОЯ",
    attacks: "АТАКИ", abilities: "ОСОБЛИВІ ЗДІБНОСТІ", special: "S.P.E.C.I.A.L.", perks: "ПЕРКИ / РИСИ", statuses: "СТАТУСИ",
    type: "ТИП", damage: "ШКОДА", rate: "ТЕМП", range: "ДИСТАНЦІЯ", effects: "ЕФЕКТИ / ВЛАСТИВОСТІ", skills: "ПОКАЗНИКИ NPC",
    body: "BODY", mind: "MIND", melee: "БЛИЖНІЙ БІЙ", guns: "СТРІЛЬБА", other: "ІНШЕ", tactics: "ТАКТИКА", loot: "ІНВЕНТАР / ЗДОБИЧ",
    resistanceProfile: "ПОВНИЙ ПРОФІЛЬ DR", noWeapons: "Зброю не синхронізовано.", noData: "Додаткових даних немає."
  },
  pl: {
    close: "ZAMKNIJ", player: "GRACZ", npc: "NPC", level: "POZIOM", hp: "HP", defense: "OBRONA", initiative: "INICJATYWA", luck: "SZCZĘŚCIE",
    resistances: "ODPORNOŚCI", physical: "FIZYCZNE", energy: "ENERGETYCZNE", radiation: "RADIACJA", poison: "TRUCIZNA", weapons: "BROŃ",
    attacks: "ATAKI", abilities: "ZDOLNOŚCI SPECJALNE", special: "S.P.E.C.I.A.L.", perks: "PERKI / CECHY", statuses: "STATUSY",
    type: "TYP", damage: "OBRAŻENIA", rate: "SZYBKOSTRZ.", range: "ZASIĘG", effects: "EFEKTY / WŁAŚCIWOŚCI", skills: "STATYSTYKI NPC",
    body: "BODY", mind: "MIND", melee: "WALKA WRĘCZ", guns: "STRZELECTWO", other: "INNE", tactics: "TAKTYKA", loot: "EKWIPUNEK / ŁUP",
    resistanceProfile: "PEŁNY PROFIL DR", noWeapons: "Broń nie została zsynchronizowana.", noData: "Brak dodatkowych danych."
  },
};

function languageOf(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "?";
}

function ProfileSection({ title, children }) {
  if (!children) return null;
  return <section className="session-profile-section"><h3>[ {title} ]</h3>{children}</section>;
}

function TextBlock({ children }) {
  if (!children || !String(children).trim()) return null;
  return <div className="session-profile-text">{String(children)}</div>;
}

function WeaponList({ weapons, copy }) {
  if (!Array.isArray(weapons) || !weapons.length) return <div className="pip-logbox">{copy.noWeapons}</div>;
  return (
    <div className="session-profile-weapons">
      {weapons.map((weapon, index) => (
        <div className="session-profile-weapon" key={`${weapon.name || "weapon"}-${index}`}>
          <div className="session-profile-weapon-head"><strong>{weapon.name || "Weapon"}</strong><span>{weapon.skill || ""}</span></div>
          <div className="session-profile-weapon-stats">
            {weapon.damage !== "" && weapon.damage !== undefined && <span>{copy.damage}: <strong>{weapon.damage} CD</strong></span>}
            {weapon.damageType && <span>{copy.type}: <strong>{weapon.damageType}</strong></span>}
            {weapon.rate !== "" && weapon.rate !== undefined && <span>{copy.rate}: <strong>{weapon.rate}</strong></span>}
            {weapon.range && <span>{copy.range}: <strong>{weapon.range}</strong></span>}
          </div>
          {(weapon.effects || weapon.qualities) && <div className="stat-sub">{copy.effects}: {[weapon.effects, weapon.qualities].filter(Boolean).join(" · ")}</div>}
        </div>
      ))}
    </div>
  );
}

export default function SessionActorProfile({ actor, onClose }) {
  const { i18n } = useTranslation();
  const copy = COPY[languageOf(i18n.resolvedLanguage || i18n.language)];
  const isNpc = actor?.kind === "npc";
  const bestiary = useMemo(() => {
    if (!isNpc) return null;
    const wanted = normalizeName(actor?.name);
    return BESTIARY_ENTRIES.find((entry) => normalizeName(entry?.name) === wanted) || null;
  }, [actor?.name, isNpc]);
  const profile = isNpc ? (bestiary || actor?.profile || {}) : (actor?.profile || {});
  const avatar = actor?.avatar || profile?.avatar || "";
  const resistance = profile?.resistances || profile?.armor || {};
  const hpCurrent = actor?.currentHp ?? profile?.currentHp ?? profile?.hp ?? 0;
  const hpMax = actor?.maxHp ?? profile?.maxHp ?? profile?.hp ?? 0;
  const defense = actor?.defense ?? profile?.defense ?? bestiary?.defense ?? 0;
  const initiative = actor?.initiative ?? profile?.initiative ?? bestiary?.initiative ?? 0;
  const luck = profile?.luck ?? profile?.luckPoints ?? bestiary?.luckPoints ?? "—";

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!actor) return null;

  return (
    <div className="session-profile-overlay" role="dialog" aria-modal="true" aria-label={actor.name} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <div className="session-profile-modal pip-panel">
        <header className="session-profile-header">
          <div className="session-profile-identity">
            <div className={`session-profile-avatar${isNpc ? " is-npc" : ""}`}>
              {avatar ? <img src={avatar} alt="" /> : <span>{initials(actor.name)}</span>}
            </div>
            <div>
              <div className="session-turn-kind">{isNpc ? copy.npc : copy.player}</div>
              <h2>{actor.name || "—"}</h2>
              <div className="stat-sub">{profile?.creatureType || profile?.origin || ""}</div>
            </div>
          </div>
          <button type="button" className="pip-btn" onClick={onClose}>{copy.close}</button>
        </header>

        <div className="session-profile-core-stats">
          <div><span>{copy.hp}</span><strong>{hpCurrent}/{hpMax || "—"}</strong></div>
          <div><span>{copy.defense}</span><strong>{defense}</strong></div>
          <div><span>{copy.initiative}</span><strong>{initiative}</strong></div>
          <div><span>{copy.luck}</span><strong>{luck}</strong></div>
          {(profile?.level || bestiary?.level) && <div><span>{copy.level}</span><strong>{profile?.level || bestiary?.level}</strong></div>}
        </div>

        <div className="session-profile-columns">
          <div>
            {!isNpc && (
              <ProfileSection title={copy.resistances}>
                <div className="session-profile-resistance-grid">
                  <div><span>{copy.physical}</span><strong>{resistance.physical ?? actor.armorPhysical ?? 0}</strong></div>
                  <div><span>{copy.energy}</span><strong>{resistance.energy ?? actor.armorEnergy ?? 0}</strong></div>
                  <div><span>{copy.radiation}</span><strong>{resistance.radiation ?? 0}</strong></div>
                  <div><span>{copy.poison}</span><strong>{resistance.poison ?? 0}</strong></div>
                </div>
              </ProfileSection>
            )}

            {isNpc && (
              <ProfileSection title={copy.resistances}>
                <div className="session-profile-resistance-grid">
                  <div><span>{copy.physical}</span><strong>{actor.armorPhysical ?? 0}</strong></div>
                  <div><span>{copy.energy}</span><strong>{actor.armorEnergy ?? 0}</strong></div>
                </div>
                <TextBlock>{bestiary?.drBlock}</TextBlock>
              </ProfileSection>
            )}

            {!isNpc && profile?.special && (
              <ProfileSection title={copy.special}>
                <div className="session-profile-special-grid">
                  {Object.entries(profile.special).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}
                </div>
              </ProfileSection>
            )}

            {isNpc && (
              <ProfileSection title={copy.skills}>
                <div className="session-profile-special-grid">
                  {[[copy.body, bestiary?.body], [copy.mind, bestiary?.mind], [copy.melee, bestiary?.melee], [copy.guns, bestiary?.guns], [copy.other, bestiary?.other]].filter(([, value]) => value !== undefined && value !== "").map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
                </div>
              </ProfileSection>
            )}

            {!isNpc && (
              <ProfileSection title={copy.weapons}>
                <WeaponList weapons={profile?.weapons} copy={copy} />
              </ProfileSection>
            )}
          </div>

          <div>
            {isNpc && <ProfileSection title={copy.attacks}><TextBlock>{bestiary?.attacks || profile?.attacks}</TextBlock></ProfileSection>}
            {isNpc && <ProfileSection title={copy.abilities}><TextBlock>{bestiary?.abilities || profile?.abilities}</TextBlock></ProfileSection>}
            {isNpc && <ProfileSection title={copy.tactics}><TextBlock>{bestiary?.tactics || profile?.tactics}</TextBlock></ProfileSection>}
            {isNpc && <ProfileSection title={copy.loot}><TextBlock>{bestiary?.loot || profile?.loot}</TextBlock></ProfileSection>}

            {!isNpc && Array.isArray(profile?.perks) && profile.perks.length > 0 && (
              <ProfileSection title={copy.perks}>
                <div className="session-profile-tags">{profile.perks.map((perk, index) => <span key={`${perk.name}-${index}`}>{perk.name}{Number(perk.rank || 1) > 1 ? ` ${perk.rank}` : ""}</span>)}</div>
              </ProfileSection>
            )}
            {!isNpc && Array.isArray(profile?.statuses) && profile.statuses.length > 0 && (
              <ProfileSection title={copy.statuses}>
                <div className="session-profile-tags">{profile.statuses.map((status) => <span key={status}>{status}</span>)}</div>
              </ProfileSection>
            )}
            {isNpc && !bestiary && !profile?.attacks && !profile?.abilities && <div className="pip-logbox">{copy.noData}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
