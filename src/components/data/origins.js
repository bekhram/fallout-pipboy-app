export const ORIGINS = {
  vault_dweller: {
    id: "vault_dweller",
    translationKey: "origins.vault_dweller",
    traits: ["origins.traits.vault_kid"],
    equipmentPacks: ["vault_tec_resident", "vault_tec_security"],
    tagSkillCount: 4,
    restrictedTagCount: 0,
    restrictedTagList: [], 
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: [] 
  },
  survivor: {
    id: "survivor",
    translationKey: "origins.survivor",
    traits: [], 
    availableTraits: ["educated", "fast_shot", "gifted", "heavy_handed", "small_frame"],
    equipmentPacks: ["mercenary", "raider", "settler", "trader", "wanderer"],
    traitSelectCount: 2, 
    tagSkillCount: 3, 
    restrictedTagCount: 0,
    restrictedTagList: [],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: []
  },
  brotherhood: {
    id: "brotherhood",
    translationKey: "origins.brotherhood",
    traits: ["origins.traits.chain_that_binds"],
    equipmentPacks: ["bos_initiate", "bos_scribe"],
    tagSkillCount: 3,
    restrictedTagCount: 1,
    restrictedTagList: ["Energy Weapons", "Science", "Repair", "Unarmed", "Melee Weapons", "Big Guns"],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: []
  },
  ghoul: {
    id: "ghoul",
    translationKey: "origins.ghoul",
    traits: ["origins.traits.necrotic_post_human"],
    equipmentPacks: ["mercenary", "raider", "settler", "trader", "wanderer"],
    tagSkillCount: 3,
    restrictedTagCount: 1,
    restrictedTagList: ["Survival"],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10, C: 8 },
    immunities: ["radiation"] 
  },
  super_mutant: {
    id: "super_mutant",
    translationKey: "origins.super_mutant",
    traits: ["origins.traits.forced_evolution"],
    equipmentPacks: ["brute", "skirmisher"],
    tagSkillCount: 3,
    restrictedTagCount: 0,
    restrictedTagList: [],
    skillRankLimit: 4,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 12, I: 6, C: 6, S: 12, E: 12 },
    immunities: ["radiation", "poison"] 
  },
  mister_handy: {
    id: "mister_handy",
    translationKey: "origins.mister_handy",
    traits: ["origins.traits.mister_handy_robot"],
    equipmentPacks: ["miss_nanny", "mister_farmhand", "mister_gutsy", "mister_handy_pack", "nurse_handy"],
    tagSkillCount: 3,
    restrictedTagCount: 0,
    restrictedTagList: [], 
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 4, max: 10 },
    immunities: ["radiation", "poison"] 
  }
};

export const ORIGINS_LIST = Object.values(ORIGINS);

export const TRAITS_DICTIONARY = {
  "origins.traits.vault_kid": "vault_kid",
  "origins.traits.survivor": "survivor",
  "origins.traits.chain_that_binds": "chain_that_binds",
  "origins.traits.necrotic_post_human": "necrotic_post_human",
  "origins.traits.forced_evolution": "forced_evolution",
  "origins.traits.mister_handy_robot": "mister_handy_robot",
  "educated": "educated",
  "fast_shot": "fast_shot",
  "gifted": "gifted",
  "heavy_handed": "heavy_handed",
  "small_frame": "small_frame"
};