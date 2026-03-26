import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const STORAGE_KEY = "fallout_pipboy_v4_last_character";

function makeSafeFileName(name) {
  return (name || "Character")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Character";
}

export function useCharacterStorage(initialForm) {
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return initialForm;
      const parsed = JSON.parse(raw);
      return parsed?.data || initialForm;
    } catch {
      return initialForm;
    }
  });

  const [saveStatus, setSaveStatus] = useState("");
  const [loadStatus, setLoadStatus] = useState("");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() =>
    JSON.stringify(form)
  );

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        data: form,
      })
    );
  }, [form]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== lastSavedSnapshot,
    [form, lastSavedSnapshot]
  );

  const exportJson = async () => {
    try {
      const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        data: form,
      };

      const json = JSON.stringify(payload, null, 2);
      const safeName = makeSafeFileName(form.characterName);
      const fileName = `${safeName}_pipboy_v4.json`;

      if (Capacitor.getPlatform() === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setLastSavedSnapshot(JSON.stringify(form));
        setSaveStatus("Character JSON exported");
        return;
      }

      const result = await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      await Share.share({
        title: "Export character",
        text: "Fallout 2d20 character export",
        url: result.uri,
        dialogTitle: "Export character JSON",
      });

      setLastSavedSnapshot(JSON.stringify(form));
      setSaveStatus(`Character JSON exported: ${fileName}`);
    } catch (error) {
      console.error("Export failed:", error);
      setSaveStatus("Could not export character JSON");
    }
  };

  const importJson = (event, fallbackFactory) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result || "{}");
        const loaded = parsed?.data;
        if (!loaded) throw new Error("Invalid import");

        const next = { ...fallbackFactory(), ...loaded };
        setForm(next);
        setLastSavedSnapshot(JSON.stringify(next));
        setLoadStatus("Character loaded from JSON file");
      } catch (error) {
        console.error("Import failed:", error);
        setLoadStatus("Could not import character file");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const loadLastCharacterMeta = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return { updatedAt: parsed?.updatedAt, ...(parsed?.data || {}) };
    } catch {
      return null;
    }
  };

  const resetToNewCharacter = (factory) => {
    const fresh = factory();
    setForm(fresh);
    setLastSavedSnapshot(JSON.stringify(fresh));
    setSaveStatus("");
    setLoadStatus("");
  };

  const continueLastCharacter = (factory) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const next = { ...factory(), ...(parsed?.data || {}) };
      setForm(next);
      setLastSavedSnapshot(JSON.stringify(next));
      setLoadStatus("Last character loaded");
    } catch {
      setLoadStatus("Could not load last character");
    }
  };

  return {
    form,
    setForm,
    saveStatus,
    loadStatus,
    exportJson,
    importJson,
    hasUnsavedChanges,
    loadLastCharacterMeta,
    resetToNewCharacter,
    continueLastCharacter,
  };
}