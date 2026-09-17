import { useEffect, useRef, useState } from "react";
import { getActiveCharacterId } from "../utils/characterProfiles.js";

const LEGACY_PORTRAIT_STORAGE_KEY = "fallout_pipboy_v4_portrait_preview";
const PROFILE_PORTRAIT_PREFIX = "fallout_pipboy_v5_portrait_";

function portraitStorageKey() {
  const characterId = getActiveCharacterId();
  return characterId ? `${PROFILE_PORTRAIT_PREFIX}${characterId}` : LEGACY_PORTRAIT_STORAGE_KEY;
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function getCroppedImage(src, cropPixels, targetWidth = 240, targetHeight = 320) {
  const image = await createImage(src);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    targetWidth,
    targetHeight
  );
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function usePortraitCropper(onApplyMeta) {
  const inputRef = useRef(null);
  const [portraitPreview, setPortraitPreview] = useState("");
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSource, setCropSource] = useState("");
  const [cropFileName, setCropFileName] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    try {
      const key = portraitStorageKey();
      let saved = localStorage.getItem(key);
      if (!saved && key !== LEGACY_PORTRAIT_STORAGE_KEY) {
        saved = localStorage.getItem(LEGACY_PORTRAIT_STORAGE_KEY);
        if (saved) localStorage.setItem(key, saved);
      }
      setPortraitPreview(saved || "");
    } catch {
      setPortraitPreview("");
    }
  }, []);

  useEffect(() => {
    const refreshPortrait = () => {
      try { setPortraitPreview(localStorage.getItem(portraitStorageKey()) || ""); }
      catch { setPortraitPreview(""); }
    };
    window.addEventListener("pipboy:character-profiles-changed", refreshPortrait);
    return () => window.removeEventListener("pipboy:character-profiles-changed", refreshPortrait);
  }, []);

  const openFileDialog = () => inputRef.current?.click();

  const openCropper = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSource(String(reader.result || ""));
      setCropFileName(file.name || "portrait.jpg");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) openCropper(file);
    event.target.value = "";
  };

  const applyCroppedPortrait = async () => {
    if (!cropSource || !croppedAreaPixels) return;
    try {
      const dataUrl = await getCroppedImage(cropSource, croppedAreaPixels);
      localStorage.setItem(portraitStorageKey(), dataUrl);
      setPortraitPreview(dataUrl);
      setCropModalOpen(false);
      onApplyMeta?.({ portraitName: cropFileName || "Portrait" });
    } catch {
      // ignore silently
    }
  };

  const clearPortrait = () => {
    try {
      localStorage.removeItem(portraitStorageKey());
    } catch {
      // ignore
    }
    setPortraitPreview("");
    onApplyMeta?.({ portraitName: "" });
  };

  return {
    inputRef,
    portraitPreview,
    cropModalOpen,
    cropSource,
    cropFileName,
    crop,
    zoom,
    setCrop,
    setZoom,
    setCroppedAreaPixels,
    setCropModalOpen,
    openFileDialog,
    handleInputChange,
    applyCroppedPortrait,
    clearPortrait,
  };
}
