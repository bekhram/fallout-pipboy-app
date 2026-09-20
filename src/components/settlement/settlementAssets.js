import barracks from "../../assets/settlement/barracks.webp";
import armorWorkbench from "../../assets/settlement/armor_workbench.webp";
import chemistryStation from "../../assets/settlement/chemistry_station.webp";
import clinicV2 from "../../assets/settlement/clinic-v2.webp";
import cookingStation from "../../assets/settlement/cooking_station.webp";
import fusionReactor from "../../assets/settlement/fusion_reactor.webp";
import generatorLargeV2 from "../../assets/settlement/generator_large-v2.webp";
import generatorMedium from "../../assets/settlement/generator_medium.webp";
import guardPostV2 from "../../assets/settlement/guard_post-v2.webp";
import largeHouseV2 from "../../assets/settlement/large_house-v2.webp";
import lights from "../../assets/settlement/lights.webp";
import powerArmorStation from "../../assets/settlement/power_armor_station.webp";
import powerPylon from "../../assets/settlement/power_pylon.webp";
import robotWorkbench from "../../assets/settlement/robot_workbench.webp";
import siren from "../../assets/settlement/siren.webp";
import surgeryCenter from "../../assets/settlement/surgery_center.webp";
import tradingEmporium from "../../assets/settlement/trading_emporium.webp";
import tradingPostV2 from "../../assets/settlement/trading_post-v2.webp";
import wallCornerReverse from "../../assets/settlement/wall_corner_reverse.webp";
import waterPurifierV2 from "../../assets/settlement/water_purifier-v2.webp";
import weaponsWorkbench from "../../assets/settlement/weapons_workbench.webp";
import windmill from "../../assets/settlement/windmill.webp";
import brahminPen from "../../assets/settlement/brahmin_pen.webp";
import caravanPost from "../../assets/settlement/caravan_post.webp";
import clinic from "../../assets/settlement/clinic.webp";
import constructionLarge from "../../assets/settlement/construction_large.webp";
import constructionMedium from "../../assets/settlement/construction_medium.webp";
import constructionSmall from "../../assets/settlement/construction_small.webp";
import cropField from "../../assets/settlement/crop_field.webp";
import gate from "../../assets/settlement/gate.webp";
import generatorSmall from "../../assets/settlement/generator_small.webp";
import greenhouse from "../../assets/settlement/greenhouse.webp";
import radioBeacon from "../../assets/settlement/radio_beacon.webp";
import scrapYard from "../../assets/settlement/scrap_yard.webp";
import settlementHq from "../../assets/settlement/settlement_hq.webp";
import smallHouse from "../../assets/settlement/small_house.webp";
import turret from "../../assets/settlement/turret.webp";
import wallCorner from "../../assets/settlement/wall_corner.webp";
import wallStraight from "../../assets/settlement/wall_straight.webp";
import warehouse from "../../assets/settlement/warehouse.webp";
import waterPump from "../../assets/settlement/water_pump.webp";
import waterTower from "../../assets/settlement/water_tower.webp";

export const SETTLEMENT_ASSETS = {
  "armor_workbench.png": armorWorkbench,
  "chemistry_station.png": chemistryStation,
  "clinic-v2.png": clinicV2,
  "cooking_station.png": cookingStation,
  "fusion_reactor.png": fusionReactor,
  "generator_large-v2.png": generatorLargeV2,
  "generator_medium.png": generatorMedium,
  "guard_post-v2.png": guardPostV2,
  "large_house-v2.png": largeHouseV2,
  "lights.png": lights,
  "power_armor_station.png": powerArmorStation,
  "power_pylon.png": powerPylon,
  "robot_workbench.png": robotWorkbench,
  "siren.png": siren,
  "surgery_center.png": surgeryCenter,
  "trading_emporium.png": tradingEmporium,
  "trading_post-v2.png": tradingPostV2,
  "wall_corner_reverse.png": wallCornerReverse,
  "water_purifier-v2.png": waterPurifierV2,
  "weapons_workbench.png": weaponsWorkbench,
  "windmill.png": windmill,
  "barracks.png": barracks,
  "brahmin_pen.png": brahminPen,
  "caravan_post.png": caravanPost,
  "clinic.png": clinic,
  "crop_field.png": cropField,
  "gate.png": gate,
  "generator_small.png": generatorSmall,
  "greenhouse.png": greenhouse,
  "radio_beacon.png": radioBeacon,
  "scrap_yard.png": scrapYard,
  "settlement_hq.png": settlementHq,
  "small_house.png": smallHouse,
  "turret.png": turret,
  "wall_corner.png": wallCorner,
  "wall_straight.png": wallStraight,
  "warehouse.png": warehouse,
  "water_pump.png": waterPump,
  "water_tower.png": waterTower,
};

export const CONSTRUCTION_ASSETS = {
  small: constructionSmall,
  medium: constructionMedium,
  large: constructionLarge,
};

export function getSettlementAsset(name) {
  return SETTLEMENT_ASSETS[name] || null;
}

export function getConstructionAsset(size = "medium") {
  return CONSTRUCTION_ASSETS[size] || CONSTRUCTION_ASSETS.medium;
}
