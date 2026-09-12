import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import wastelandBg from "../../assets/wasteland/backgrounds/wasteland-bg-1.png";
import swampBg from "../../assets/wasteland/backgrounds/wasteland-swamp-bg-1.png";
import urbanRuinsBg from "../../assets/wasteland/backgrounds/wasteland-urban-ruins-bg-1.png";

import car1 from "../../assets/wasteland/objects/car-1.png";
import car2 from "../../assets/wasteland/objects/car-2.png";
import car3 from "../../assets/wasteland/objects/car-3.png";

import carRetro1 from "../../assets/wasteland/objects/car-retro-1.png";
import carRetro2 from "../../assets/wasteland/objects/car-retro-2.png";
import carRetro3 from "../../assets/wasteland/objects/car-retro-3.png";
import carRetro4 from "../../assets/wasteland/objects/car-retro-4.png";
import carRetro5 from "../../assets/wasteland/objects/car-retro-5.png";
import carRetro6 from "../../assets/wasteland/objects/car-retro-6.png";

import pickupRetro1 from "../../assets/wasteland/objects/pickup-retro-1.png";
import motorcycleRetro1 from "../../assets/wasteland/objects/motorcycle-retro-1.png";

import cliff1 from "../../assets/wasteland/objects/cliff-1.png";
import cliff2 from "../../assets/wasteland/objects/cliff-2.png";
import cliff3 from "../../assets/wasteland/objects/cliff-3.png";

import crater1 from "../../assets/wasteland/objects/crater-1.png";
import crater2 from "../../assets/wasteland/objects/crater-2.png";
import crater3 from "../../assets/wasteland/objects/crater-3.png";

import deadTree1 from "../../assets/wasteland/objects/dead-tree-1.png";
import deadTree2 from "../../assets/wasteland/objects/dead-tree-2.png";
import deadTree3 from "../../assets/wasteland/objects/dead-tree-3.png";
import deadTree4 from "../../assets/wasteland/objects/dead-tree-4.png";

import hills1 from "../../assets/wasteland/objects/hills-1.png";
import hills2 from "../../assets/wasteland/objects/hills-2.png";

import lake1 from "../../assets/wasteland/objects/lake-1.png";
import ravine1 from "../../assets/wasteland/objects/ravine-1.png";

import rocks1 from "../../assets/wasteland/objects/rocks-1.png";
import rocks2 from "../../assets/wasteland/objects/rocks-2.png";
import rocks3 from "../../assets/wasteland/objects/rocks-3.png";

import ruins1 from "../../assets/wasteland/objects/ruins-1.png";
import ruins2 from "../../assets/wasteland/objects/ruins-2.png";
import ruins3 from "../../assets/wasteland/objects/ruins-3.png";

import swamp1 from "../../assets/wasteland/objects/swamp-1.png";

import truck1 from "../../assets/wasteland/objects/truck-1.png";
import truck2 from "../../assets/wasteland/objects/truck-2.png";
import truck3 from "../../assets/wasteland/objects/truck-3.png";

import roadStraight from "../../assets/wasteland/roads/road-straight.png";
import roadTJunction from "../../assets/wasteland/roads/road-t-junction.png";
import roadCross from "../../assets/wasteland/roads/road-cross.png";
import roadDeadEnd from "../../assets/wasteland/roads/road-dead-end.png";
import roadDamaged from "../../assets/wasteland/roads/road-damaged.png";
import railStraight from "../../assets/wasteland/rails/rail-straight.png";

import { buildOpenWastelandSite } from "../../utils/proceduralWastelandOpen.js";

const GRID = 24;

const OVERLAP_PAD = 0.08;

const ROAD_TILE = 8;

/**
 * Расстояние между центрами прямых сегментов.
 * Меньше ROAD_TILE -> сегменты немного перекрываются,
 * чтобы не было щелей.
 */
const ROAD_STEP = 5.6;

const ROAD_CLEARANCE = 0.8;

const RAIL_LENGTH = 8;
const RAIL_WIDTH = 2.67;
const RAIL_STEP = 7.2;
const RAIL_CLEARANCE = 0.35;

/**
 * Ручная настройка масштаба.
 *
 * straight — эталон.
 *
 * Эти значения можно менять вручную,
 * пока визуальная ширина дорог не совпадёт.
 */
const ROAD_VISUAL_CONFIG = {
  straight: {
    scale: 1,
    anchorX: 0.5,
    anchorY: 0.5,
  },

  damaged: {
    scale: 1,
    anchorX: 0.5,
    anchorY: 0.5,
  },

  "dead-end": {
    scale: 1,
    anchorX: 0.5,
    anchorY: 0.5,
  },

  cross: {
    scale: 1.75,
    anchorX: 0.5,
    anchorY: 0.5,
  },

  "t-junction": {
    scale: 1.5,

    // точка реального пересечения внутри PNG
    anchorX: 0.5,
    anchorY: 0.22,
  },
};

/**
 * Какие выходы есть у каждого node в базовом rotation=0.
 *
 * rotation потом автоматически поворачивает эти направления.
 */
const ROAD_NODE_CONNECTORS = {
  cross: ["top", "right", "bottom", "left"],

  "t-junction": [
    "left",
    "right",
    "bottom",
  ],
};

const ASSET_VARIANTS = {
  cliff: [
    cliff1,
    cliff2,
    cliff3,
  ],

  rocks: [
    rocks1,
    rocks2,
    rocks3,
  ],

  crater: [
    crater1,
    crater2,
    crater3,
  ],

  dead_tree: [
    deadTree1,
    deadTree2,
    deadTree3,
    deadTree4,
  ],

  wreck_car: [
    car1,
    car2,
    car3,
    carRetro1,
    carRetro2,
    carRetro3,
    carRetro4,
    carRetro5,
    carRetro6,
    motorcycleRetro1,
  ],

  wreck_truck: [
    truck1,
    truck2,
    truck3,
    pickupRetro1,
  ],

  ruins: [
    ruins1,
    ruins2,
    ruins3,
  ],

  ravine: [
    ravine1,
  ],

  lake: [
    lake1,
  ],

  swamp: [
    swamp1,
  ],

  hills: [
    hills1,
    hills2,
  ],
};

export function wastelandBackgroundForSpec(spec) {
  const terrain = String(
    spec?.terrain ||
    spec?.terrainType ||
    spec?.backgroundType ||
    "wasteland"
  ).toLowerCase();

  if (terrain === "swamp") {
    return swampBg;
  }

  if (terrain === "ruins") {
    return urbanRuinsBg;
  }

  return wastelandBg;
}

function assetForItem(item) {
  const variants = ASSET_VARIANTS[item.type];

  if (!variants?.length) {
    return null;
  }

  const index =
    Math.abs(Number(item.sprite || 0)) %
    variants.length;

  return {
    src: variants[index],
    index,
  };
}

function renderBoxForItem(item) {
  return {
    x: Number(item.x || 0),
    y: Number(item.y || 0),
    w: Number(item.w || 0),
    h: Number(item.h || 0),
  };
}

function resizeAroundCenter(
  item,
  nextW,
  nextH
) {
  const currentW = Number(item.w || 0);
  const currentH = Number(item.h || 0);

  return {
    ...item,

    x:
      Number(item.x || 0) -
      (nextW - currentW) / 2,

    y:
      Number(item.y || 0) -
      (nextH - currentH) / 2,

    w: nextW,
    h: nextH,
  };
}

function normalizeVisualSize(item) {
  const currentW =
    Number(item.w || 0);

  const currentH =
    Number(item.h || 0);

  if (item.type === "cliff") {
    return resizeAroundCenter(
      item,
      currentW * 2,
      currentH * 2
    );
  }

  if (item.type === "dead_tree") {
    return resizeAroundCenter(
      item,
      Math.max(
        3,
        currentW * 1.4
      ),
      Math.max(
        3,
        currentH * 1.4
      )
    );
  }

  if (item.type === "crater") {
    return resizeAroundCenter(
      item,
      Math.max(
        3.4,
        currentW
      ),
      Math.max(
        3.4,
        currentH
      )
    );
  }

  return item;
}

function visualBounds(item) {
  const box =
    renderBoxForItem(item);

  const scaleX =
    item.type === "wreck_car"
      ? 1.5
      : item.type === "wreck_truck"
        ? 1.25
        : 1;

  const scaleY =
    item.type === "wreck_car"
      ? 2
      : item.type === "wreck_truck"
        ? 1.5
        : 1;

  const finalW =
    box.w * scaleX;

  const finalH =
    box.h * scaleY;

  const cx =
    box.x +
    box.w / 2;

  const cy =
    box.y +
    box.h / 2;

  return {
    x:
      cx -
      finalW / 2,

    y:
      cy -
      finalH / 2,

    w: finalW,
    h: finalH,
  };
}

function fitVisualItemToGrid(item) {
  const bounds =
    visualBounds(item);

  let dx = 0;
  let dy = 0;

  if (bounds.x < 0) {
    dx = -bounds.x;
  } else if (
    bounds.x +
      bounds.w >
    GRID
  ) {
    dx =
      GRID -
      (
        bounds.x +
        bounds.w
      );
  }

  if (bounds.y < 0) {
    dy = -bounds.y;
  } else if (
    bounds.y +
      bounds.h >
    GRID
  ) {
    dy =
      GRID -
      (
        bounds.y +
        bounds.h
      );
  }

  if (!dx && !dy) {
    return item;
  }

  return {
    ...item,

    x:
      Number(item.x || 0) +
      dx,

    y:
      Number(item.y || 0) +
      dy,
  };
}

function boxesOverlap(
  a,
  b,
  pad = OVERLAP_PAD
) {
  return !(
    a.x +
      a.w +
      pad <=
      b.x ||

    b.x +
      b.w +
      pad <=
      a.x ||

    a.y +
      a.h +
      pad <=
      b.y ||

    b.y +
      b.h +
      pad <=
      a.y
  );
}

function removeVisualOverlaps(items) {
  const accepted = [];
  const occupied = [];

  for (const item of items) {
    const bounds =
      visualBounds(item);

    const isGroundDecal =
      item.type === "crater";

    const collides =
      !isGroundDecal &&
      occupied.some(
        (box) =>
          boxesOverlap(
            bounds,
            box
          )
      );

    if (collides) {
      continue;
    }

    accepted.push(item);

    if (!isGroundDecal) {
      occupied.push(
        bounds
      );
    }
  }

  return accepted;
}

function hashValue(value) {
  const text =
    String(value ?? "");

  let h = 2166136261;

  for (
    let i = 0;
    i < text.length;
    i += 1
  ) {
    h ^=
      text.charCodeAt(i);

    h =
      Math.imul(
        h,
        16777619
      );
  }

  return h >>> 0;
}

function pickRotation(seed) {
  return [
    0,
    90,
    180,
    270,
  ][seed % 4];
}

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

/**
 * ============================================================
 * ROAD NODE SYSTEM
 * ============================================================
 */

/**
 * Создаёт опорный node.
 *
 * centerX/centerY — настоящая точка центра дороги.
 * Именно от неё потом строятся все прямые ветки.
 */
function centeredRoadAsset(
  src,
  name,
  centerX,
  centerY,
  rotation = 0
) {
  return {
    src,
    name,
    centerX,
    centerY,
    w: ROAD_TILE,
    h: ROAD_TILE,
    rotation,
  };
}

/**
 * Поворачивает направление вместе с PNG.
 */
function rotateDirection(
  direction,
  rotation = 0
) {
  const directions = [
    "top",
    "right",
    "bottom",
    "left",
  ];

  const index =
    directions.indexOf(
      direction
    );

  if (index < 0) {
    return direction;
  }

  const normalizedRotation =
    (
      (
        Number(rotation || 0) %
        360
      ) +
      360
    ) %
    360;

  const steps =
    Math.round(
      normalizedRotation /
        90
    ) % 4;

  return directions[
    (
      index +
      steps
    ) %
      4
  ];
}

/**
 * Получаем реальное направление коннектора после rotation.
 */
function actualConnectorDirection(
  node,
  baseDirection
) {
  return rotateDirection(
    baseDirection,
    node.rotation
  );
}

/**
 * Координата точки выхода node.
 *
 * Эта точка находится на границе ROAD_TILE.
 */
function connectorPoint(
  node,
  baseDirection
) {
  const direction =
    actualConnectorDirection(
      node,
      baseDirection
    );

  const config =
    ROAD_VISUAL_CONFIG[node.name] || {
      scale: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    };

  const scale = config.scale ?? 1;
  const half = (ROAD_TILE * scale) / 2;

  if (direction === "top") {
    return {
      x: node.centerX,
      y: node.centerY - half,
      direction,
    };
  }

  if (direction === "bottom") {
    return {
      x: node.centerX,
      y: node.centerY + half,
      direction,
    };
  }

  if (direction === "left") {
    return {
      x: node.centerX - half,
      y: node.centerY,
      direction,
    };
  }

  return {
    x: node.centerX + half,
    y: node.centerY,
    direction: "right",
  };
}

/**
 * ============================================================
 * STRAIGHT ROAD BUILDER
 * ============================================================
 */

function lineTiles({
  axis,
  from,
  to,
  fixed,
  seed,
  damagedEvery = 0,
}) {
  const start =
    Math.min(
      from,
      to
    );

  const end =
    Math.max(
      from,
      to
    );

  const out = [];

  let i = 0;

  /**
   * Важно:
   * ROAD_STEP меньше ROAD_TILE,
   * поэтому PNG перекрываются и нет щелей.
   */
  for (
    let along =
      start +
      ROAD_TILE / 2;

    along <=
    end -
      ROAD_TILE / 2 +
      0.01;

    along += ROAD_STEP
  ) {
    const cx =
      axis === "v"
        ? fixed
        : along;

    const cy =
      axis === "v"
        ? along
        : fixed;

    const pieceSeed =
      hashValue(
        `${seed}:${i}`
      );

    const damaged =
      damagedEvery >
        0 &&
      pieceSeed %
        damagedEvery ===
        0;

    out.push(
      centeredRoadAsset(
        damaged
          ? roadDamaged
          : roadStraight,

        damaged
          ? "damaged"
          : "straight",

        cx,
        cy,

        axis === "v"
          ? 0
          : 90
      )
    );

    i += 1;
  }

  /**
   * Добавляем последний tile ближе к краю,
   * если до края осталось много пространства.
   */
  const tailCenter =
    end -
    ROAD_TILE / 2;

  if (
    tailCenter >=
    start +
      ROAD_TILE / 2
  ) {
    const last =
      out[
        out.length - 1
      ];

    const lastAlong =
      last
        ? axis === "v"
          ? last.centerY
          : last.centerX
        : -999;

    if (
      Math.abs(
        lastAlong -
          tailCenter
      ) > 1.25
    ) {
      const cx =
        axis === "v"
          ? fixed
          : tailCenter;

      const cy =
        axis === "v"
          ? tailCenter
          : fixed;

      out.push(
        centeredRoadAsset(
          roadStraight,
          "straight",
          cx,
          cy,
          axis === "v"
            ? 0
            : 90
        )
      );
    }
  }

  return out;
}

/**
 * Строит прямую дорогу ОТ КОННЕКТОРА node до края карты.
 */
function roadFromConnector(
  node,
  baseDirection,
  seed,
  {
    damagedEvery = 0,
  } = {}
) {
  const connector =
    connectorPoint(
      node,
      baseDirection
    );

  /**
   * Немного заводим straight под node,
   * чтобы скрыть прозрачные края PNG.
   */
  const overlap = 1.1;

  if (
    connector.direction ===
    "top"
  ) {
    return lineTiles({
      axis: "v",

      from: 0,

      to:
        connector.y +
        ROAD_TILE / 2 +
        overlap,

      fixed:
        connector.x,

      seed,

      damagedEvery,
    });
  }

  if (
    connector.direction ===
    "bottom"
  ) {
    return lineTiles({
      axis: "v",

      from:
        connector.y -
        ROAD_TILE / 2 -
        overlap,

      to: GRID,

      fixed:
        connector.x,

      seed,

      damagedEvery,
    });
  }

  if (
    connector.direction ===
    "left"
  ) {
    return lineTiles({
      axis: "h",

      from: 0,

      to:
        connector.x +
        ROAD_TILE / 2 +
        overlap,

      fixed:
        connector.y,

      seed,

      damagedEvery,
    });
  }

  return lineTiles({
    axis: "h",

    from:
      connector.x -
      ROAD_TILE / 2 -
      overlap,

    to: GRID,

    fixed:
      connector.y,

    seed,

    damagedEvery,
  });
}

/**
 * ============================================================
 * CROSS / T-JUNCTION
 * ============================================================
 */

function intersectionInfo(
  roads
) {
  const vertical =
    roads.find(
      (road) =>
        Number(
          road.h || 0
        ) >
        Number(
          road.w || 0
        )
    );

  const horizontal =
    roads.find(
      (road) =>
        Number(
          road.w || 0
        ) >=
        Number(
          road.h || 0
        )
    );

  if (
    !vertical ||
    !horizontal
  ) {
    return null;
  }

  return {
    vertical,
    horizontal,

    center: {
      x:
        Number(
          vertical.x ||
            0
        ) +
        Number(
          vertical.w ||
            0
        ) /
          2,

      y:
        Number(
          horizontal.y ||
            0
        ) +
        Number(
          horizontal.h ||
            0
        ) /
          2,
    },
  };
}

function makeCrossRoads(
  roads,
  seed
) {
  const info =
    intersectionInfo(
      roads
    );

  if (!info) {
    return [];
  }

  const {
    center,
  } = info;

  const useT =
    seed % 4 === 0;

  const rotation =
    useT
      ? pickRotation(
          seed
        )
      : 0;

  /**
   * 1.
   * СНАЧАЛА создаём node.
   */
  const node =
    centeredRoadAsset(
      useT
        ? roadTJunction
        : roadCross,

      useT
        ? "t-junction"
        : "cross",

      center.x,
      center.y,

      rotation
    );

  /**
   * 2.
   * Берём его реальные connectors.
   */
  const connectors =
    useT
      ? ROAD_NODE_CONNECTORS[
          "t-junction"
        ]
      : ROAD_NODE_CONNECTORS.cross;

  /**
   * 3.
   * И только после этого строим straight.
   */
  const arms =
    connectors.flatMap(
      (
        direction,
        index
      ) =>
        roadFromConnector(
          node,
          direction,

          `${seed}:node-arm:${index}:${direction}`,

          {
            damagedEvery:
              10,
          }
        )
    );

  /**
   * node идёт ПОСЛЕДНИМ,
   * поэтому визуально он лежит поверх прямых сегментов.
   */
  return [
    ...arms,
    node,
  ];
}

/**
 * ============================================================
 * CURVES
 * ============================================================
 */

function makeBentSingleRoad(
  road,
  seed
) {
  const vertical =
    Number(road.h || 0) >=
    Number(road.w || 0);

  const fixed =
    vertical
      ? Number(road.x || 0) + Number(road.w || 0) / 2
      : Number(road.y || 0) + Number(road.h || 0) / 2;

  return lineTiles({
    axis: vertical ? "v" : "h",
    from: 0,
    to: GRID,
    fixed,
    seed,
    damagedEvery: 7,
  });
}

/**
 * ============================================================
 * FRAGMENTS
 * ============================================================
 */

function makeFragments(
  roads,
  seed
) {
  return roads.flatMap(
    (
      road,
      index
    ) => {
      const vertical =
        Number(
          road.h || 0
        ) >=
        Number(
          road.w || 0
        );

      const fixed =
        vertical
          ? Number(
              road.x ||
                0
            ) +
            Number(
              road.w ||
                0
            ) /
              2
          : Number(
              road.y ||
                0
            ) +
            Number(
              road.h ||
                0
            ) /
              2;

      const start =
        vertical
          ? Number(
              road.y ||
                0
            )
          : Number(
              road.x ||
                0
            );

      const end =
        start +
        (
          vertical
            ? Number(
                road.h ||
                  0
              )
            : Number(
                road.w ||
                  0
              )
        );

      const pieces =
        lineTiles({
          axis:
            vertical
              ? "v"
              : "h",

          from: start,
          to: end,

          fixed,

          seed:
            `${seed}:fragment:${index}`,

          damagedEvery:
            2,
        });

      if (
        pieces.length
      ) {
        const lastIndex =
          pieces.length -
          1;

        const last =
          pieces[
            lastIndex
          ];

        pieces[
          lastIndex
        ] = {
          ...last,

          src:
            roadDeadEnd,

          name:
            "dead-end",

          rotation:
            (
              last.rotation ||
              0
            ) +
            180,
        };
      }

      return pieces;
    }
  );
}

/**
 * ============================================================
 * ROAD PLAN
 * ============================================================
 */

function planRoadAssets(
  site,
  spec
) {
  const roads =
    site?.roads || [];

  if (
    !roads.length ||
    site?.profile
      ?.type === "none"
  ) {
    return [];
  }

  const seed =
    hashValue(
      `${spec?.seed || "1"}:${site.profile.type}:${site.terrainType}`
    );

  if (
    site.profile
      .type === "cross"
  ) {
    return makeCrossRoads(
      roads,
      seed
    );
  }

  if (
    site.profile
      .type ===
    "fragments"
  ) {
    return makeFragments(
      roads,
      seed
    );
  }

  return makeBentSingleRoad(
    roads[0],
    seed
  );
}

/**
 * ============================================================
 * ROAD COLLISIONS
 * ============================================================
 */

function roadBounds(road) {
  const config =
    ROAD_VISUAL_CONFIG[road.name] || {
      scale: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    };

  const scale = config.scale ?? 1;
  const anchorX = config.anchorX ?? 0.5;
  const anchorY = config.anchorY ?? 0.5;

  const visualW = ROAD_TILE * scale;
  const visualH = ROAD_TILE * scale;

  return {
    x: road.centerX - visualW * anchorX,
    y: road.centerY - visualH * anchorY,
    w: visualW,
    h: visualH,
  };
}

function removeRoadOverlaps(
  items,
  roadAssets
) {
  if (
    !roadAssets.length
  ) {
    return items;
  }

  const roadBoxes =
    roadAssets.map(
      roadBounds
    );

  return items.filter(
    (item) => {
      const bounds =
        visualBounds(
          item
        );

      return !roadBoxes.some(
        (roadBox) =>
          boxesOverlap(
            bounds,
            roadBox,
            ROAD_CLEARANCE
          )
      );
    }
  );
}

/**
 * ============================================================
 * ROAD RENDER
 * ============================================================
 */

function RoadAsset({ road }) {
  const config =
    ROAD_VISUAL_CONFIG[road.name] || {
      scale: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    };

  const scale = config.scale ?? 1;
  const anchorX = config.anchorX ?? 0.5;
  const anchorY = config.anchorY ?? 0.5;

  const visualSize = ROAD_TILE * scale;

  const left =
    road.centerX -
    visualSize * anchorX;

  const top =
    road.centerY -
    visualSize * anchorY;

  return (
    <img
      src={road.src}
      alt=""
      draggable={false}
      data-wasteland-road={road.name}
      data-road-center-x={road.centerX}
      data-road-center-y={road.centerY}
      data-road-rotation={road.rotation || 0}
      style={{
        position: "absolute",
        left: `${(left / GRID) * 100}%`,
        top: `${(top / GRID) * 100}%`,
        width: `${(visualSize / GRID) * 100}%`,
        height: `${(visualSize / GRID) * 100}%`,
        objectFit: "contain",
        transform: `rotate(${road.rotation || 0}deg)`,
        transformOrigin: `${anchorX * 100}% ${anchorY * 100}%`,
        pointerEvents: "none",
        userSelect: "none",
        filter: "drop-shadow(0 2px 2px rgba(0,0,0,.35))",
      }}
    />
  );
}


/**
 * ============================================================
 * RAILS
 * ============================================================
 */

function centeredRailAsset(
  centerX,
  centerY,
  rotation = 0
) {
  return {
    src: railStraight,
    name: "rail-straight",
    centerX,
    centerY,
    rotation,
  };
}

function railLineTiles({
  axis,
  fixed,
}) {
  const out = [];
  const half = RAIL_LENGTH / 2;

  for (
    let along = half;
    along <= GRID - half + 0.01;
    along += RAIL_STEP
  ) {
    const cx = axis === "v" ? fixed : along;
    const cy = axis === "v" ? along : fixed;

    out.push(
      centeredRailAsset(
        cx,
        cy,
        axis === "v" ? 90 : 0
      )
    );
  }

  const tailCenter = GRID - half;
  const last = out[out.length - 1];

  if (last) {
    const lastAlong =
      axis === "v"
        ? last.centerY
        : last.centerX;

    if (Math.abs(lastAlong - tailCenter) > 0.75) {
      const cx = axis === "v" ? fixed : tailCenter;
      const cy = axis === "v" ? tailCenter : fixed;

      out.push(
        centeredRailAsset(
          cx,
          cy,
          axis === "v" ? 90 : 0
        )
      );
    }
  }

  return out;
}

function planRailAssets(spec) {
  const seed =
    hashValue(
      `rail:${spec?.seed || "1"}:${spec?.terrain || "wasteland"}`
    );

  const axis =
    (seed & 1) === 0
      ? "h"
      : "v";

  const fixed =
    clamp(
      6 + ((seed >>> 3) % 13),
      6,
      18
    );

  return railLineTiles({
    axis,
    fixed,
  });
}

function railBounds(rail) {
  const vertical =
    Math.abs((rail.rotation || 0) % 180) === 90;

  const w =
    vertical
      ? RAIL_WIDTH
      : RAIL_LENGTH;

  const h =
    vertical
      ? RAIL_LENGTH
      : RAIL_WIDTH;

  return {
    x: rail.centerX - w / 2,
    y: rail.centerY - h / 2,
    w,
    h,
  };
}

function removeRailOverlaps(
  items,
  railAssets
) {
  if (!railAssets.length) {
    return items;
  }

  const railBoxes =
    railAssets.map(
      railBounds
    );

  return items.filter(
    (item) => {
      const bounds =
        visualBounds(item);

      return !railBoxes.some(
        (railBox) =>
          boxesOverlap(
            bounds,
            railBox,
            RAIL_CLEARANCE
          )
      );
    }
  );
}

function RailAsset({ rail }) {
  return (
    <img
      src={rail.src}
      alt=""
      draggable={false}
      data-wasteland-rail={rail.name}
      style={{
        position: "absolute",
        left: `${(rail.centerX / GRID) * 100}%`,
        top: `${(rail.centerY / GRID) * 100}%`,
        width: `${(RAIL_LENGTH / GRID) * 100}%`,
        height: `${(RAIL_WIDTH / GRID) * 100}%`,
        objectFit: "fill",
        transform: `translate(-50%, -50%) rotate(${rail.rotation || 0}deg)`,
        transformOrigin: "50% 50%",
        pointerEvents: "none",
        userSelect: "none",
        filter: "drop-shadow(0 2px 2px rgba(0,0,0,.3))",
      }}
    />
  );
}


/**
 * ============================================================
 * DECOR
 * ============================================================
 */

function SpriteImage({
  item,
  preview = false,
}) {
  const asset =
    assetForItem(item);

  if (!asset) {
    return null;
  }

  const box =
    renderBoxForItem(
      item
    );

  const isGroundTerrain =
    [
      "lake",
      "swamp",
      "ravine",
    ].includes(
      item.type
    );

  const depth =
    isGroundTerrain
      ? 2
      : 10 +
        Math.round(
          (
            Number(
              item.y ||
                0
            ) +
            Number(
              item.h ||
                0
            ) /
              2
          ) *
            10
        );

  const scaleX =
    item.type ===
    "wreck_car"
      ? 1.5
      : item.type ===
        "wreck_truck"
        ? 1.25
        : 1;

  const scaleY =
    item.type ===
    "wreck_car"
      ? 2
      : item.type ===
        "wreck_truck"
        ? 1.5
        : 1;

  return (
    <img
      src={asset.src}
      alt=""
      draggable={false}

      data-wasteland-asset={
        item.type
      }

      data-wasteland-sprite={
        asset.index
      }

      style={{
        position:
          "absolute",

        left:
          `${
            (
              box.x /
              GRID
            ) *
            100
          }%`,

        top:
          `${
            (
              box.y /
              GRID
            ) *
            100
          }%`,

        width:
          `${
            (
              box.w /
              GRID
            ) *
            100
          }%`,

        height:
          `${
            (
              box.h /
              GRID
            ) *
            100
          }%`,

        transform:
          `scale(${scaleX}, ${scaleY})`,

        transformOrigin:
          "50% 50%",

        pointerEvents:
          "none",

        userSelect:
          "none",

        zIndex:
          depth,

        objectFit:
          "contain",

        overflow:
          "visible",

        filter:
          preview
            ? "none"
            : "drop-shadow(0 3px 4px rgba(0,0,0,.5))",
      }}
    />
  );
}

/**
 * ============================================================
 * LAYER
 * ============================================================
 */

export function WastelandAssetLayer({
  spec,
  preview = false,
  showBackground = true,
}) {
  const site =
    useMemo(
      () =>
        buildOpenWastelandSite({
          ...spec,

          cols:
            GRID,

          rows:
            GRID,
        }),

      [
        spec?.seed,
        spec?.terrain,
        spec?.backgroundType,
        spec?.terrainType,
      ]
    );

  const background =
    useMemo(
      () =>
        wastelandBackgroundForSpec(
          spec
        ),

      [
        spec?.terrain,
        spec?.backgroundType,
        spec?.terrainType,
      ]
    );

  const roadAssets =
    useMemo(
      () =>
        planRoadAssets(
          site,
          spec
        ),

      [
        site,
        spec?.seed,
      ]
    );

  const railAssets =
    useMemo(
      () =>
        planRailAssets(spec),

      [
        spec?.seed,
        spec?.terrain,
      ]
    );

  const items =
    useMemo(
      () => {
        const normalized =
          [
            ...(
              site.terrain ||
              []
            ).map(
              normalizeVisualSize
            ),

            ...site.obstacles.map(
              normalizeVisualSize
            ),

            ...site.vehicles,

            ...site.trees.map(
              normalizeVisualSize
            ),
          ].map(
            fitVisualItemToGrid
          );

        return removeRailOverlaps(
          removeRoadOverlaps(
            removeVisualOverlaps(
              normalized
            ),
            roadAssets
          ),
          railAssets
        );
      },

      [
        site,
        roadAssets,
        railAssets,
      ]
    );

  return (
    <div
      className={
        preview
          ? "gm-wasteland-assets is-preview"
          : "gm-wasteland-assets"
      }

      aria-hidden="true"

      style={{
        position:
          "absolute",

        inset: 0,

        width:
          preview
            ? "100%"
            : "var(--battlemap-world-width, 100%)",

        height:
          preview
            ? "100%"
            : "var(--battlemap-world-height, 100%)",

        pointerEvents:
          "none",

        zIndex:
          preview
            ? 2
            : 0,

        overflow:
          "hidden",

        gridColumn:
          "1 / -1",

        gridRow:
          "1 / -1",
      }}
    >
      {showBackground ? (
        <img
          src={
            background
          }

          alt=""

          draggable={
            false
          }

          data-wasteland-background="true"

          style={{
            position:
              "absolute",

            inset: 0,

            width:
              "100%",

            height:
              "100%",

            objectFit:
              "fill",

            pointerEvents:
              "none",

            userSelect:
              "none",

            zIndex: 0,
          }}
        />
      ) : null}

      <div
        style={{
          position:
            "absolute",

          inset: 0,

          zIndex: 1,

          pointerEvents:
            "none",
        }}
      >
        {roadAssets.map(
          (
            road,
            index
          ) => (
            <RoadAsset
              key={`${road.name}-${road.centerX}-${road.centerY}-${road.rotation}-${index}`}

              road={
                road
              }
            />
          )
        )}
      </div>

      <div
        style={{
          position:
            "absolute",

          inset: 0,

          zIndex: 2,

          pointerEvents:
            "none",
        }}
      >
        {railAssets.map(
          (rail, index) => (
            <RailAsset
              key={`${rail.name}-${rail.centerX}-${rail.centerY}-${rail.rotation}-${index}`}
              rail={rail}
            />
          )
        )}
      </div>

      <div
        style={{
          position:
            "absolute",

          inset: 0,

          zIndex: 3,

          pointerEvents:
            "none",
        }}
      >
        {items.map(
          (
            item,
            index
          ) => (
            <SpriteImage
              key={`${item.type}-${item.sprite ?? "x"}-${item.x}-${item.y}-${index}`}

              item={
                item
              }

              preview={
                preview
              }
            />
          )
        )}
      </div>
    </div>
  );
}

/**
 * ============================================================
 * GM PORTAL
 * ============================================================
 */

export default function WastelandAssetPortal({
  session,
}) {
  const scene =
    session?.tacticalScene ||
    null;

  const spec =
    scene?.environment
      ?.proceduralMapSpec ||
    null;

  const [
    target,
    setTarget,
  ] = useState(null);

  useEffect(
    () => {
      let cancelled =
        false;

      let tries = 0;

      const findTarget =
        () => {
          if (
            cancelled
          ) {
            return;
          }

          const node =
            document.querySelector(
              ".gm-tactical-map-core .gm-session-map__grid"
            );

          if (node) {
            setTarget(
              node
            );

            return;
          }

          tries += 1;

          if (
            tries < 30
          ) {
            window.setTimeout(
              findTarget,
              50
            );
          }
        };

      findTarget();

      return () => {
        cancelled =
          true;

        setTarget(
          null
        );
      };
    },

    [
      scene?.sceneId,
      scene?.backgroundName,
      spec?.seed,
      spec?.type,
      spec?.terrain,
    ]
  );

  if (
    !target ||
    !spec ||
    String(
      spec.type || ""
    ) !== "wasteland"
  ) {
    return null;
  }

  return createPortal(
    <WastelandAssetLayer
      spec={spec}
    />,

    target
  );
}