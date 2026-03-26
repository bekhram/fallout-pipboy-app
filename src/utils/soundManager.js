import { Howl, Howler } from "howler";

import diceRollSound from "../assets/sounds/dice-roll.mp3";
import uiTabSound from "../assets/sounds/ui-tab.mp3";

import breakSound from "../assets/sounds/lockpick/break.wav";
import jam1Sound from "../assets/sounds/lockpick/jam1.wav";
import jam2Sound from "../assets/sounds/lockpick/jam2.wav";
import jam3Sound from "../assets/sounds/lockpick/jam3.wav";
import jam4Sound from "../assets/sounds/lockpick/jam4.wav";
import jam5Sound from "../assets/sounds/lockpick/jam5.wav";
import jam6Sound from "../assets/sounds/lockpick/jam6.wav";
import openSound from "../assets/sounds/lockpick/open.wav";
import sweetSpotSound from "../assets/sounds/lockpick/sweetspot.wav";
import turnPressSound from "../assets/sounds/lockpick/turn_press.wav";
import turnPressBadSound from "../assets/sounds/lockpick/turn_press_bad.wav";

const sounds = {
  diceRoll: new Howl({
    src: [diceRollSound],
    volume: 0.7,
    preload: true,
  }),

  uiTab: new Howl({
    src: [uiTabSound],
    volume: 0.45,
    preload: true,
  }),

  lockpickBreak: new Howl({
    src: [breakSound],
    volume: 0.7,
    preload: true,
  }),

  lockpickOpen: new Howl({
    src: [openSound],
    volume: 0.7,
    preload: true,
  }),

  lockpickSweetSpot: new Howl({
    src: [sweetSpotSound],
    volume: 0.65,
    preload: true,
  }),

  lockpickTurnPress: new Howl({
    src: [turnPressSound],
    volume: 0.55,
    preload: true,
  }),

  lockpickJam1: new Howl({
    src: [jam1Sound],
    volume: 0.45,
    preload: true,
  }),

  lockpickJam2: new Howl({
    src: [jam2Sound],
    volume: 0.45,
    preload: true,
  }),

  lockpickJam3: new Howl({
    src: [jam3Sound],
    volume: 0.45,
    preload: true,
  }),

  lockpickJam4: new Howl({
    src: [jam4Sound],
    volume: 0.45,
    preload: true,
  }),

  lockpickJam5: new Howl({
    src: [jam5Sound],
    volume: 0.45,
    preload: true,
  }),
  
  lockpickTurnPressBad: new Howl({
  src: [turnPressBadSound],
  volume: 0.6,
  preload: true,
}),

  lockpickJam6: new Howl({
    src: [jam6Sound],
    volume: 0.45,
    preload: true,
  }),
};

export function playSound(name) {
  const sound = sounds[name];
  if (!sound) return;
  sound.stop();
  sound.play();
}

export function playSoundVariant(name, options = {}) {
  const sound = sounds[name];
  if (!sound) return null;

  const {
    volume,
    rate,
    seek = 0,
    stopFirst = true,
  } = options;

  if (stopFirst) {
    sound.stop();
  }

  const id = sound.play();

  if (typeof volume === "number") {
    sound.volume(Math.max(0, Math.min(1, volume)), id);
  }

  if (typeof rate === "number") {
    sound.rate(rate, id);
  }

  if (typeof seek === "number" && seek > 0) {
    sound.seek(seek, id);
  }

  return id;
}

export function stopSound(name) {
  const sound = sounds[name];
  if (!sound) return;
  sound.stop();
}

export function setGlobalVolume(volume) {
  Howler.volume(Math.max(0, Math.min(1, volume)));
}

export function muteAllSounds(isMuted) {
  Howler.mute(!!isMuted);
}