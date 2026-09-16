import barracks from "../../assets/settlement/barracks.png";
import brahminPen from "../../assets/settlement/brahmin_pen.png";
import caravanPost from "../../assets/settlement/caravan_post.png";
import clinic from "../../assets/settlement/clinic.png";
import constructionLarge from "../../assets/settlement/construction_large.png";
import constructionMedium from "../../assets/settlement/construction_medium.png";
import constructionSmall from "../../assets/settlement/construction_small.png";
import cropField from "../../assets/settlement/crop_field.png";
import gate from "../../assets/settlement/gate.png";
import generatorLarge from "../../assets/settlement/generator_large.png";
import generatorSmall from "../../assets/settlement/generator_small.png";
import greenhouse from "../../assets/settlement/greenhouse.png";
import guardPost from "../../assets/settlement/guard_post.png";
import largeHouse from "../../assets/settlement/large_house.png";
import radioBeacon from "../../assets/settlement/radio_beacon.png";
import scrapYard from "../../assets/settlement/scrap_yard.png";
import settlementHq from "../../assets/settlement/settlement_hq.png";
import smallHouse from "../../assets/settlement/small_house.png";
import tradingPost from "../../assets/settlement/trading_post.png";
import turret from "../../assets/settlement/turret.png";
import wallCorner from "../../assets/settlement/wall_corner.png";
import wallStraight from "../../assets/settlement/wall_straight.png";
import warehouse from "../../assets/settlement/warehouse.png";
import watchtower from "../../assets/settlement/watchtower.png";
import waterPump from "../../assets/settlement/water_pump.png";
import waterPurifier from "../../assets/settlement/water_purifier.png";
import waterTower from "../../assets/settlement/water_tower.png";
import workshop from "../../assets/settlement/workshop.png";

export const SETTLEMENT_ASSETS = {
  "barracks.png": barracks,
  "brahmin_pen.png": brahminPen,
  "caravan_post.png": caravanPost,
  "clinic.png": clinic,
  "crop_field.png": cropField,
  "gate.png": gate,
  "generator_large.png": generatorLarge,
  "generator_small.png": generatorSmall,
  "greenhouse.png": greenhouse,
  "guard_post.png": guardPost,
  "large_house.png": largeHouse,
  "radio_beacon.png": radioBeacon,
  "scrap_yard.png": scrapYard,
  "settlement_hq.png": settlementHq,
  "small_house.png": smallHouse,
  "trading_post.png": tradingPost,
  "turret.png": turret,
  "wall_corner.png": wallCorner,
  "wall_straight.png": wallStraight,
  "warehouse.png": warehouse,
  "watchtower.png": watchtower,
  "water_pump.png": waterPump,
  "water_purifier.png": waterPurifier,
  "water_tower.png": waterTower,
  "workshop.png": workshop,
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
