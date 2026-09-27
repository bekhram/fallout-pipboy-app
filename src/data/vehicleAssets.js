export const VEHICLE_ASSETS = {
  car: "https://cdn.creativeclaw.co/u/e2d59740/images/850730f8-f77c-4a1e-b410-d80b853443a2.png",
  "sports-car": "https://cdn.creativeclaw.co/u/e2d59740/images/850730f8-f77c-4a1e-b410-d80b853443a2.png",
  motorcycle: "https://cdn.creativeclaw.co/u/e2d59740/images/80bbceef-a318-4af5-a7aa-49126c467743.png",
  "wasteland-scrambler": "https://cdn.creativeclaw.co/u/e2d59740/images/f6b2593f-9049-4927-864c-2e464082680b.png",
  "pickup-truck": "https://cdn.creativeclaw.co/u/e2d59740/images/6896586e-9fc7-48f3-80e7-1773d7cacd1b.png",
  "gun-jeep": "https://cdn.creativeclaw.co/u/e2d59740/images/a408993a-a0e9-48e0-b0ca-85bc33dde604.png",
  bus: "https://cdn.creativeclaw.co/u/e2d59740/images/9712d129-1ea6-4d6b-a5df-03e116d4772b.png",
  "armored-truck": "https://cdn.creativeclaw.co/u/e2d59740/images/3663132a-20ae-4581-a414-9cad4cba4d3f.png",
  "cargo-truck-6x6": "https://cdn.creativeclaw.co/u/e2d59740/images/ff656301-f863-4af7-b540-e9eb26e4a65b.png",
  apc: "https://cdn.creativeclaw.co/u/e2d59740/images/bf2966bd-7a80-42f7-828f-0e73d567d79e.png",
  vertibird: "https://cdn.creativeclaw.co/u/e2d59740/images/12ab66e5-b1d4-43a0-9a49-c1191a40d75b.png",
  custom: "https://cdn.creativeclaw.co/u/e2d59740/images/850730f8-f77c-4a1e-b410-d80b853443a2.png",
};

export function vehicleAssetFor(vehicle = {}) {
  return vehicle?.image || VEHICLE_ASSETS[vehicle?.sourceId] || VEHICLE_ASSETS[vehicle?.id] || VEHICLE_ASSETS.custom;
}
