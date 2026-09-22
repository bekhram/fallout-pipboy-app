import { useEffect, useState } from "react";
import { parseCSV } from "../utils/csvParser.js";
import {
  hydrateWeaponMetadata,
  needsWeaponMetadataHydration,
} from "../utils/weaponDatabase.js";

export function useGlobalGameDatabase({ setForm }) {
  const [globalWeapons, setGlobalWeapons] = useState([]);
  const [globalAmmo, setGlobalAmmo] = useState([]);

  useEffect(() => {
    fetch("/weapons.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.text();
      })
      .then((csvText) => {
        const parsed = parseCSV(csvText);
        setGlobalWeapons(parsed);
        console.log(`Loaded ${parsed.length} weapons from global database.`);
      })
      .catch((error) => console.error("Error loading weapons.csv:", error));

    fetch("/Ammo.csv")
      .then((response) => response.text())
      .then((csvText) => {
        const parsed = parseCSV(csvText);
        setGlobalAmmo(parsed);
        console.log(`Loaded ${parsed.length} ammo types from global database.`);
      })
      .catch((error) => console.error("Error loading ammo db:", error));
  }, []);

  useEffect(() => {
    if (globalWeapons.length === 0) return;

    setForm((prev) => {
      let didChange = false;
      const weapons = (prev.weapons || []).map((weapon) => {
        if (!needsWeaponMetadataHydration(weapon, globalWeapons)) return weapon;
        didChange = true;
        return hydrateWeaponMetadata(weapon, globalWeapons);
      });

      return didChange ? { ...prev, weapons } : prev;
    });
  }, [globalWeapons, setForm]);

  return { globalWeapons, globalAmmo };
}

export default useGlobalGameDatabase;
