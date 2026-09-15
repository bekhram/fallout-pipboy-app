import {
  WEAPON_EFFECT_OPTIONS,
  WEAPON_QUALITY_OPTIONS,
} from "../constants.js";

const addUnique = (target, entries) => {
  for (const entry of entries) {
    if (!target.some((item) => item.key === entry.key)) target.push(entry);
  }
};

// Game-only rules metadata from the supplemental equipment rules.
// Descriptions are paraphrased so the UI can show concise tooltips.
addUnique(WEAPON_EFFECT_OPTIONS, [
  {
    key: "arc",
    name: "Arc",
    description: "On an Effect, the attack also affects another nearby target. The extra target takes reduced damage, and no extra ammunition is spent for this additional hit.",
  },
  {
    key: "freeze",
    name: "Freeze",
    description: "A target can become Frozen when enough Effects are rolled compared with its END or BODY. A Frozen target loses its next turn.",
  },
]);

addUnique(WEAPON_QUALITY_OPTIONS, [
  {
    key: "ammo-hungry-x",
    name: "Ammo-Hungry (X)",
    description: "This quality uses an X value to represent unusually high ammunition consumption. Record the exact X value in Custom Qualities for the specific item.",
  },
  {
    key: "bombard",
    name: "Bombard",
    description: "An area-attack quality that can extend the attack into additional adjacent zones by spending extra ammunition, limited by Fire Rate.",
  },
  {
    key: "delay-x",
    name: "Delay (X)",
    description: "The item resolves after a delay measured in rounds. Record the exact X value in Custom Qualities for the specific item.",
  },
  {
    key: "placed",
    name: "Placed",
    description: "Represents an explosive device that is set in a chosen location before it is triggered.",
  },
  {
    key: "recoil-x",
    name: "Recoil (X)",
    description: "A parameterized recoil quality. Record the exact X value in Custom Qualities for the specific item.",
  },
  {
    key: "slow-load",
    name: "Slow Load",
    description: "After firing, the item requires a minor action to reload before it can be fired again.",
  },
  {
    key: "surge",
    name: "Surge",
    description: "The attack is especially effective against robotic, powered-armor, and other mechanical or electronic targets.",
  },
]);

export const ARROW_BOLT_VARIANTS = [
  { key: "cryo", name: "Cryo", costDelta: 8, rarityDelta: 3, effectSummary: "Adds the Freeze damage effect." },
  { key: "explosive", name: "Explosive", costDelta: 6, rarityDelta: 2, effectSummary: "Removes Suppressed and adds Blast." },
  { key: "flaming", name: "Flaming", costDelta: 2, rarityDelta: 1, effectSummary: "Adds a Persistent Energy effect." },
  { key: "serrated", name: "Serrated", costDelta: 4, rarityDelta: 1, effectSummary: "Adds Persistent Physical and Piercing 1." },
  { key: "plasma", name: "Plasma", costDelta: 9, rarityDelta: 4, effectSummary: "Adds extra damage and uses the lower of Physical or Energy resistance." },
  { key: "poison", name: "Poison", costDelta: 3, rarityDelta: 1, effectSummary: "Adds a Persistent Poison effect." },
];
