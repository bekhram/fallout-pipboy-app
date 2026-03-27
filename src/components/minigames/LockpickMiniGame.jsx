import React, { useEffect, useMemo, useRef, useState } from "react";
import { playSound } from "../../utils/soundManager";
import lockBgImg from "../../assets/lockpick/lock-bg.png";
import lockCoreImg from "../../assets/lockpick/lock-core.png";
import lockpickImg from "../../assets/lockpick/lockpick.png";
import screwdriverImg from "../../assets/lockpick/screwdriver.png";
import "./lockpick.css";

const MAX_ANGLE = 180;
const MAX_PICK_HP = 100;
const TURN_INTERVAL = 90;
const MAX_CORE_ROTATION = 90;

const JAM_SOUND_KEYS = [
  "lockpickJam1",
  "lockpickJam2",
  "lockpickJam3",
  "lockpickJam4",
  "lockpickJam5",
  "lockpickJam6",
];

const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    tolerance: 18,
    picks: 5,
    jamDamage: 10,
    falseSpots: 0,
    driftRange: 0,
    pressurePerSecond: 0,
    pickJitter: 0,
    angleShifts: 0,
  },
  medium: {
    label: "Medium",
    tolerance: 12,
    picks: 3,
    jamDamage: 16,
    falseSpots: 2,
    driftRange: 2,
    pressurePerSecond: 0,
    pickJitter: 0.8,
    angleShifts: 0,
  },
  hard: {
    label: "Hard",
    tolerance: 8,
    picks: 2,
    jamDamage: 24,
    falseSpots: 3,
    driftRange: 4,
    pressurePerSecond: 2.5,
    pickJitter: 1.6,
    angleShifts: 2,
  },
  veryHard: {
    label: "Very Hard",
    tolerance: 5,
    picks: 1,
    jamDamage: 32,
    falseSpots: 4,
    driftRange: 6,
    pressurePerSecond: 4,
    pickJitter: 2.4,
    angleShifts: 3,
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

function buildFalseSpots(correctAngle, count, tolerance) {
  const spots = [];
  if (!count) return spots;

  let attempts = 0;
  while (spots.length < count && attempts < 50) {
    attempts += 1;
    const angle = randomInt(12, 168);
    const tooCloseToCorrect = Math.abs(angle - correctAngle) < tolerance * 2.2;
    const tooCloseToOther = spots.some(
      (spot) => Math.abs(spot.angle - angle) < tolerance * 1.8
    );

    if (tooCloseToCorrect || tooCloseToOther) continue;

    spots.push({
      angle,
      tolerance: Math.max(2, Math.floor(tolerance * 0.45)),
    });
  }

  return spots;
}

function buildGameState(difficultyKey, skillBonus = 0, perkRank = 0) {
  const config = DIFFICULTY_CONFIG[difficultyKey] || DIFFICULTY_CONFIG.medium;
  const tolerance = clamp(config.tolerance + skillBonus + perkRank, 3, 28);
  const correctAngle = randomInt(10, 170);

  return {
    correctAngle,
    tolerance,
    picks: Math.max(1, config.picks + Math.floor(perkRank / 2)),
    jamDamage: Math.max(6, config.jamDamage - perkRank * 2),
    label: config.label,
    falseSpots: buildFalseSpots(correctAngle, config.falseSpots, tolerance),
    driftRange: config.driftRange,
    pressurePerSecond: config.pressurePerSecond,
    pickJitter: config.pickJitter,
    angleShifts: config.angleShifts,
  };
}

function getPickDragResistance(angle, difficultyKey) {
  const centerDistance = Math.abs(angle - 90) / 90;
  const edgeResistance = 1 - centerDistance * 0.55;

  const difficultyMultiplierMap = {
    easy: 1,
    medium: 0.9,
    hard: 0.78,
    veryHard: 0.68,
  };

  const difficultyMultiplier = difficultyMultiplierMap[difficultyKey] ?? 0.9;
  return Math.max(0.22, edgeResistance * difficultyMultiplier);
}

export default function LockpickMiniGame({
  difficulty = "medium",
  skillBonus = 0,
  perkRank = 0,
  onUnlock,
  onFail,
  onExit,
}) {
  const [seed, setSeed] = useState(1);

  const game = useMemo(() => {
    return buildGameState(difficulty, skillBonus, perkRank);
  }, [difficulty, skillBonus, perkRank, seed]);

  const [pickAngle, setPickAngle] = useState(90);
  const [pickHp, setPickHp] = useState(MAX_PICK_HP);
  const [picksLeft, setPicksLeft] = useState(game.picks);
  const [coreRotation, setCoreRotation] = useState(0);
  const [isTurning, setIsTurning] = useState(false);
  const [status, setStatus] = useState("LOCKED");
  const [hintText, setHintText] = useState("Move the pick.");
  const [shake, setShake] = useState(false);
  const [pressure, setPressure] = useState(0);
  const [pickVisualOffset, setPickVisualOffset] = useState(0);
  const [lockDrift, setLockDrift] = useState(0);
  const [remainingAngleShifts, setRemainingAngleShifts] = useState(
    game.angleShifts
  );

  const turnTimerRef = useRef(null);
  const pressureTimerRef = useRef(null);
  const jitterTimerRef = useRef(null);

  const lastJamSoundAtRef = useRef(0);
  const lastSweetSpotSoundAtRef = useRef(0);
  const lastDragJamSoundAtRef = useRef(0);
  const hasPlayedSweetSpotRef = useRef(false);

  const dragClientXRef = useRef(0);
  const isDraggingPickRef = useRef(false);

  const realCorrectAngle = game.correctAngle + lockDrift;
  const distanceToCorrect = Math.abs(pickAngle - realCorrectAngle);
  const inSuccessZone = distanceToCorrect <= game.tolerance;
  const sweetSpotDistance = Math.max(2, Math.floor(game.tolerance / 3));

  const falseSpotMatch = game.falseSpots.find(
    (spot) => Math.abs(pickAngle - spot.angle) <= spot.tolerance
  );
  const inFalseSpot = Boolean(falseSpotMatch);

  function playRandomJamSound() {
    const now = Date.now();
    if (now - lastJamSoundAtRef.current < 140) return;

    lastJamSoundAtRef.current = now;
    const key =
      JAM_SOUND_KEYS[Math.floor(Math.random() * JAM_SOUND_KEYS.length)];
    playSound(key);
  }

  function playDragJamSound() {
    const now = Date.now();
    if (now - lastDragJamSoundAtRef.current < 120) return;

    lastDragJamSoundAtRef.current = now;
    const key =
      JAM_SOUND_KEYS[Math.floor(Math.random() * JAM_SOUND_KEYS.length)];
    playSound(key);
  }

  function playSweetSpotOnce() {
    const now = Date.now();

    if (hasPlayedSweetSpotRef.current) return;
    if (now - lastSweetSpotSoundAtRef.current < 200) return;

    hasPlayedSweetSpotRef.current = true;
    lastSweetSpotSoundAtRef.current = now;
    playSound("lockpickSweetSpot");
  }

  function resetSweetSpotSound() {
    hasPlayedSweetSpotRef.current = false;
  }

  function stopTurning() {
    if (turnTimerRef.current) {
      clearInterval(turnTimerRef.current);
      turnTimerRef.current = null;
    }
    if (pressureTimerRef.current) {
      clearInterval(pressureTimerRef.current);
      pressureTimerRef.current = null;
    }
    if (jitterTimerRef.current) {
      clearInterval(jitterTimerRef.current);
      jitterTimerRef.current = null;
    }
    setIsTurning(false);
    setPickVisualOffset(0);
  }

  function breakPick() {
    playSound("lockpickBreak");

    setPickHp(MAX_PICK_HP);
    setPressure(0);
    setPickVisualOffset(0);

setPicksLeft((prev) => {
  const next = prev - 1;

  if (next <= 0) {
    setStatus("FAILED");
    setHintText("No bobby pins left.");
    stopTurning();
    return 0;
  }

  setHintText("Bobby pin broke. Try another.");
  return next;
});
  }

  function applyLockDrift() {
    if (!game.driftRange) return;

    const drift = randomInt(1, game.driftRange) * randomSign();
    setLockDrift((prev) => clamp(prev + drift, -18, 18));
    setHintText("The lock shifts slightly...");
  }

  function shiftCorrectAngle() {
    if (remainingAngleShifts <= 0) return false;

    const shiftAmount =
      difficulty === "veryHard"
        ? randomInt(10, 18) * randomSign()
        : randomInt(8, 14) * randomSign();

    setLockDrift((prev) => clamp(prev + shiftAmount, -35, 35));
    setRemainingAngleShifts((prev) => Math.max(0, prev - 1));
    setCoreRotation(0);
    setPressure(0);
    setHintText("The sweet spot shifts!");
    playRandomJamSound();

    return true;
  }

  function handleTurnStart() {
    if (status !== "LOCKED") return;

    if (inSuccessZone) {
      playSound("lockpickTurnPress");
    } else {
      playSound("lockpickTurnPressBad");
    }

    if (isTurning) return;
    setIsTurning(true);
  }

  function handleTurnEnd() {
    stopTurning();
  }

  function handleReset() {
    stopTurning();
    resetSweetSpotSound();
    setPicksLeft(game.picks);

    lastJamSoundAtRef.current = 0;
    lastSweetSpotSoundAtRef.current = 0;
    lastDragJamSoundAtRef.current = 0;
    isDraggingPickRef.current = false;

    setPickAngle(90);
    setPickHp(MAX_PICK_HP);
    setCoreRotation(0);
    setStatus("LOCKED");
    setHintText("Move the pick.");
    setPressure(0);
    setPickVisualOffset(0);
    setLockDrift(0);
    setRemainingAngleShifts(game.angleShifts);
    setSeed((prev) => prev + 1);

    playSound("uiTab");
  }

  function handleAngleChange(nextAngle) {
    if (status !== "LOCKED") return;

    const clamped = clamp(nextAngle, 0, MAX_ANGLE);
    setPickAngle(clamped);

    const nextDistance = Math.abs(clamped - realCorrectAngle);

    if (nextDistance <= sweetSpotDistance) {
      setHintText("A tiny click...");
      playSweetSpotOnce();
    } else if (inFalseSpot) {
      setHintText("A suspicious click...");
      playSweetSpotOnce();
    } else if (nextDistance <= game.tolerance + 6) {
      setHintText("Maybe this angle...");
      resetSweetSpotSound();
      playDragJamSound();
    } else {
      setHintText("No feedback.");
      resetSweetSpotSound();
      playDragJamSound();
    }
  }

  function handlePickPointerDown(event) {
    if (status !== "LOCKED") return;

    isDraggingPickRef.current = true;
    dragClientXRef.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePickPointerMove(event) {
    if (!isDraggingPickRef.current || status !== "LOCKED") return;

    const delta = event.clientX - dragClientXRef.current;
    dragClientXRef.current = event.clientX;

    const resistance = getPickDragResistance(pickAngle, difficulty);
    const outsideSweetSpotPenalty =
      Math.abs(pickAngle - realCorrectAngle) > game.tolerance ? 0.82 : 1;

    const weightedDelta =
      delta * 0.45 * resistance * outsideSweetSpotPenalty;

    const maxStepMap = {
      easy: 8,
      medium: 6,
      hard: 4.5,
      veryHard: 3,
    };

    const maxStep = maxStepMap[difficulty] ?? 6;
    const limitedDelta = Math.max(-maxStep, Math.min(maxStep, weightedDelta));

    handleAngleChange(pickAngle + limitedDelta);
  }

  function handlePickPointerUp(event) {
    isDraggingPickRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  useEffect(() => {
    if (!isTurning || status !== "LOCKED") return;

    if (game.pressurePerSecond > 0) {
      pressureTimerRef.current = setInterval(() => {
        setPressure((prev) => clamp(prev + game.pressurePerSecond * 0.1, 0, 100));
      }, 100);
    }

    if (game.pickJitter > 0) {
      jitterTimerRef.current = setInterval(() => {
        if (!inSuccessZone) {
          const jitter = (Math.random() - 0.5) * 2 * game.pickJitter;
          setPickVisualOffset(jitter);
        } else {
          setPickVisualOffset(0);
        }
      }, 70);
    }

    turnTimerRef.current = setInterval(() => {
      const distanceRatio = distanceToCorrect / Math.max(game.tolerance, 1);

      if (inSuccessZone) {
        const proximity = 1 - distanceToCorrect / Math.max(game.tolerance, 1);
        const gain = clamp(2 + proximity * 16, 2, 18);

        setCoreRotation((prev) => {
          const next = clamp(prev + gain, 0, MAX_CORE_ROTATION);

          if (proximity > 0.82) {
            setHintText("Almost there...");
          } else {
            setHintText("The cylinder turns...");
          }

if (next >= MAX_CORE_ROTATION) {
  if (
    (difficulty === "hard" || difficulty === "veryHard") &&
    remainingAngleShifts > 0
  ) {
    const shifted = shiftCorrectAngle();
    if (shifted) {
      stopTurning();
      return 0;
    }
  }

  setStatus("OPENED");
  setHintText("Lock opened.");
  playSound("lockpickOpen");
  stopTurning();
  return MAX_CORE_ROTATION;
}

          return next;
        });

        return;
      }

      if (distanceRatio <= 1.7) {
        setCoreRotation((prev) => Math.max(0, prev - 2));
        setHintText("It gives a little...");
      } else if (distanceRatio <= 3) {
        setCoreRotation((prev) => Math.max(0, prev - 5));
        setHintText("The lock resists.");
      } else {
        setCoreRotation((prev) => Math.max(0, prev - 8));
        setHintText("The lock jams.");
      }

      setShake(true);
      playRandomJamSound();

      if (difficulty === "hard") {
        if (distanceRatio > 1) {
          if (distanceRatio > 3.2 && game.driftRange > 0) {
            applyLockDrift();
          }
          breakPick();
          return;
        }
      }

      if (difficulty === "veryHard") {
        if (distanceRatio > 1.45) {
          if (distanceRatio > 3.2 && game.driftRange > 0) {
            applyLockDrift();
          }
          breakPick();
          return;
        }
      }

      const baseDamage = Math.ceil(
        game.jamDamage + Math.min(distanceToCorrect / 2, 12)
      );
      const pressureBonus = Math.floor(pressure / 20);
      const finalDamage = baseDamage + pressureBonus;

      setPickHp((prev) => {
        const next = prev - finalDamage;

        if (distanceRatio > 3.2 && game.driftRange > 0) {
          applyLockDrift();
        }

        if (next <= 0) {
          breakPick();
          return 0;
        }

        return next;
      });
    }, TURN_INTERVAL);

    return () => {
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
        turnTimerRef.current = null;
      }
      if (pressureTimerRef.current) {
        clearInterval(pressureTimerRef.current);
        pressureTimerRef.current = null;
      }
      if (jitterTimerRef.current) {
        clearInterval(jitterTimerRef.current);
        jitterTimerRef.current = null;
      }
    };
  }, [
    isTurning,
    status,
    inSuccessZone,
    distanceToCorrect,
    game.tolerance,
    game.jamDamage,
    game.pressurePerSecond,
    game.pickJitter,
    game.driftRange,
    pressure,
    difficulty,
    remainingAngleShifts,
    onUnlock,
    onFail,
  ]);

  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(false), 120);
    return () => clearTimeout(t);
  }, [shake]);

  useEffect(() => {
    setPicksLeft(game.picks);
    setRemainingAngleShifts(game.angleShifts);
  }, [game.picks, game.angleShifts]);

  useEffect(() => {
    return () => stopTurning();
  }, []);

  const pickRotation = pickAngle - 90 + pickVisualOffset;
  const hpPercent = Math.max(0, Math.round((pickHp / MAX_PICK_HP) * 100));
  const progressPercent = Math.round((coreRotation / MAX_CORE_ROTATION) * 100);
  const pressurePercent = Math.round(pressure);

  const hintClassName = inSuccessZone
    ? "is-good"
    : isTurning
      ? "is-bad"
      : "is-warn";

  return (
    <section className="pip-panel lockpick-screen">
      <div className="lockpick-header">
        <div>
          <div className="lockpick-title">LOCKPICK</div>
          <div className="lockpick-subtitle">
            {game.label} · Picks: {picksLeft}
          </div>
        </div>

        <div className="lockpick-header-actions">
          <button
            type="button"
            className="pip-action-btn"
            onClick={handleReset}
          >
            RESET
          </button>

          <button
            type="button"
            className="pip-action-btn"
            onClick={() => {
              playSound("uiTab");
              onExit?.();
            }}
          >
            EXIT
          </button>
        </div>
      </div>

      <div className="lockpick-layout">
        <div className={`lockpick-visual ${shake ? "is-shaking" : ""}`}>
          <div className="lockpick-stage-wrap">
            <div className="lockpick-stage">
              <img
                src={lockBgImg}
                alt=""
                className="lockpick-layer lockpick-bg"
                draggable="false"
              />

              <img
                src={lockCoreImg}
                alt=""
                className="lockpick-layer lockpick-core-img"
                style={{
                  transform: `translate(-50%, -50%) rotate(${coreRotation}deg)`,
                }}
                draggable="false"
              />

              <img
                src={lockpickImg}
                alt=""
                className={`lockpick-layer lockpick-pick-img ${
                  isTurning && !inSuccessZone ? "is-stressed" : ""
                } ${inSuccessZone ? "is-sweetspot" : ""}`}
                style={{
                  transform: `translateX(-50%) rotate(${pickRotation}deg)`,
                }}
                draggable="false"
                onPointerDown={handlePickPointerDown}
                onPointerMove={handlePickPointerMove}
                onPointerUp={handlePickPointerUp}
                onPointerLeave={handlePickPointerUp}
                onPointerCancel={handlePickPointerUp}
              />

              <img
                src={screwdriverImg}
                alt=""
                className={`lockpick-layer lockpick-screwdriver-img ${
                  isTurning ? "is-active" : ""
                }`}
                style={{
                  transform: `scale(1.15) rotate(${-coreRotation * 0.5}deg)`,
                }}
                draggable="false"
              />

              <div
                className="lockpick-screwdriver-hitbox"
                onPointerDown={handleTurnStart}
                onPointerUp={handleTurnEnd}
                onPointerLeave={handleTurnEnd}
                onPointerCancel={handleTurnEnd}
              />
            </div>
          </div>
        </div>

 
      </div>
    </section>
  );
}