import car1 from "../assets/wasteland/objects/car-retro-1.png";
import car2 from "../assets/wasteland/objects/car-retro-3.png";
import car3 from "../assets/wasteland/objects/car-retro-5.png";
import truck1 from "../assets/wasteland/objects/truck-1.png";
import truck2 from "../assets/wasteland/objects/truck-2.png";
import motorcycle from "../assets/wasteland/objects/motorcycle-retro-1.png";

export const VEHICLE_ASSETS = {
  car: car1,
  "sports-car": car2,
  motorcycle,
  "pickup-truck": truck1,
  bus: truck2,
  "armored-truck": truck2,
  apc: truck2,
  vertibird: car3,
  custom: car1,
};

export function vehicleAssetFor(vehicle = {}) {
  return vehicle?.image || VEHICLE_ASSETS[vehicle?.sourceId] || VEHICLE_ASSETS[vehicle?.id] || VEHICLE_ASSETS.custom;
}
