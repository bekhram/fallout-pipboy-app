import React, { useEffect, useMemo, useRef } from "react";
import { Peer } from "peerjs";

const MAP_HOST_PREFIX = "pip2d20-map-";
const SESSION_CODE_RE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;

function getActivePlayerSessionCode() {
  const value = document.querySelector(".session-chat-drawer-toggle-code")?.textContent?.trim()?.toUpperCase() || "";
  return SESSION_CODE_RE.test(value) ? value : "";
}

function characterName(character) {
  return String(character?.characterName || character?.name || character?.playerName || "Player").trim().slice(0, 60) || "Player";
}

function makePacket({ character, mapData, playerPosition, region }) {
  const offset = mapData?.worldOffset || { x: 0, y: 0 };
  return {
    type: "map_position",
    name: characterName(character),
    regionId: String(region?.id || character?.mapData?.regionId || "commonwealth").slice(0, 60),
    worldOffset: {
      x: Number(offset.x || 0),
      y: Number(offset.y || 0),
    },
    playerPosition: {
      x: Number(playerPosition?.x || 0),
      y: Number(playerPosition?.y || 0),
    },
    cols: Math.max(1, Number(mapData?.cols || 8)),
    rows: Math.max(1, Number(mapData?.rows || 8)),
    updatedAt: new Date().toISOString(),
  };
}

export default function SessionMapPositionSync({ character, mapData, playerPosition, region }) {
  const peerRef = useRef(null);
  const connectionRef = useRef(null);
  const retryRef = useRef(null);
  const packetRef = useRef(null);

  const packetSignature = useMemo(() => JSON.stringify(makePacket({ character, mapData, playerPosition, region })), [
    character?.characterName,
    character?.name,
    character?.playerName,
    character?.mapData?.regionId,
    mapData?.worldOffset?.x,
    mapData?.worldOffset?.y,
    mapData?.cols,
    mapData?.rows,
    playerPosition?.x,
    playerPosition?.y,
    region?.id,
  ]);

  useEffect(() => {
    packetRef.current = JSON.parse(packetSignature);
    if (connectionRef.current?.open) {
      connectionRef.current.send(packetRef.current);
    }
  }, [packetSignature]);

  useEffect(() => {
    let disposed = false;

    const cleanupPeer = () => {
      try { connectionRef.current?.close?.(); } catch { /* best effort */ }
      connectionRef.current = null;
      try { peerRef.current?.destroy?.(); } catch { /* best effort */ }
      peerRef.current = null;
    };

    const scheduleRetry = () => {
      if (disposed || retryRef.current) return;
      retryRef.current = window.setTimeout(() => {
        retryRef.current = null;
        connect();
      }, 1600);
    };

    const connect = () => {
      if (disposed) return;
      const code = getActivePlayerSessionCode();
      if (!code) {
        scheduleRetry();
        return;
      }

      cleanupPeer();
      const peer = new Peer(undefined, { debug: 0 });
      peerRef.current = peer;

      peer.on("open", () => {
        if (disposed) return;
        const connection = peer.connect(`${MAP_HOST_PREFIX}${code.toLowerCase()}`, { reliable: true });
        connectionRef.current = connection;
        connection.on("open", () => {
          if (packetRef.current) connection.send(packetRef.current);
        });
        connection.on("close", scheduleRetry);
        connection.on("error", scheduleRetry);
      });

      peer.on("disconnected", scheduleRetry);
      peer.on("close", scheduleRetry);
      peer.on("error", scheduleRetry);
    };

    connect();
    return () => {
      disposed = true;
      if (retryRef.current) window.clearTimeout(retryRef.current);
      retryRef.current = null;
      cleanupPeer();
    };
  }, []);

  return null;
}
