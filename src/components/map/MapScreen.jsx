import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import MapScreenCore from "./MapScreenCore.jsx";
import SettlementScreen from "../settlement/SettlementScreen.jsx";
import useSettlementStorage from "../../hooks/useSettlementStorage.js";
import "./mapSettlement.css";

const COPY = {
  en: { found: "FOUND SETTLEMENT", open: "OPEN SETTLEMENT", name: "Settlement name", fallback: "New Settlement", menu: "SETTLEMENT" },
  ru: { found: "ОСНОВАТЬ ПОСЕЛЕНИЕ", open: "ОТКРЫТЬ ПОСЕЛЕНИЕ", name: "Название поселения", fallback: "Новое поселение", menu: "ПОСЕЛЕНИЕ" },
  uk: { found: "ЗАСНУВАТИ ПОСЕЛЕННЯ", open: "ВІДКРИТИ ПОСЕЛЕННЯ", name: "Назва поселення", fallback: "Нове поселення", menu: "ПОСЕЛЕННЯ" },
  pl: { found: "ZAŁÓŻ OSADĘ", open: "OTWÓRZ OSADĘ", name: "Nazwa osady", fallback: "Nowa osada", menu: "OSADA" },
};

function readCharisma(character) {
  const candidates = [
    character?.special?.charisma,
    character?.special?.Charisma,
    character?.special?.CHA,
    character?.special?.cha,
    character?.charisma,
  ];
  const value = candidates.find((item) => Number.isFinite(Number(item)));
  return Math.max(0, Number(value || 0));
}

export default function MapScreen(props) {
  const { i18n } = useTranslation();
  const language = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const text = COPY[language] || COPY.en;
  const settlements = useSettlementStorage();
  const [activeSettlementId, setActiveSettlementId] = useState(null);

  const position = useMemo(() => {
    const offset = props.mapState?.worldOffset || { x: 0, y: 0 };
    const player = props.mapState?.playerPosition || { x: 0, y: 0 };
    return {
      regionId: props.mapState?.regionId || "commonwealth",
      worldX: Number(offset.x || 0) * 8 + Number(player.x || 0),
      worldY: Number(offset.y || 0) * 8 + Number(player.y || 0),
    };
  }, [props.mapState?.regionId, props.mapState?.worldOffset, props.mapState?.playerPosition]);

  const currentSettlement = settlements.byPosition(position.regionId, position.worldX, position.worldY);
  const activeSettlement = settlements.settlements.find((item) => item.id === activeSettlementId) || null;

  if (activeSettlement) {
    return <SettlementScreen settlement={activeSettlement} onUpdate={(updater) => settlements.update(activeSettlement.id, updater)} onBack={() => setActiveSettlementId(null)} />;
  }

  function handleSettlementButton() {
    if (currentSettlement) {
      setActiveSettlementId(currentSettlement.id);
      return;
    }
    const name = window.prompt(text.name, text.fallback);
    if (name === null) return;
    const character = props.character || {};
    const created = settlements.create({
      name: String(name || text.fallback).trim() || text.fallback,
      regionId: position.regionId,
      worldX: position.worldX,
      worldY: position.worldY,
      ownerCharacterId: character.id || character.characterId || character.name || null,
      leaderCharisma: readCharisma(character),
    });
    setActiveSettlementId(created.id);
  }

  return <div className="pip-map-with-settlement-menu">
    <div className="pip-map-settlement-toolbar">
      <span className="pip-map-settlement-toolbar__title">⌂ {text.menu}</span>
      <span className="pip-map-settlement-toolbar__coords">X:{position.worldX} · Y:{position.worldY}</span>
      <button type="button" className="pip-action-button pip-map-settlement-toolbar__button" onClick={handleSettlementButton}>
        {currentSettlement ? text.open : text.found}
      </button>
    </div>
    <MapScreenCore {...props} />
  </div>;
}
