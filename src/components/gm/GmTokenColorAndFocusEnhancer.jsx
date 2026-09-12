import { useEffect } from "react";
import "./gmTokenColorAndFocusEnhancer.css";

const TOKEN_PALETTE = [
  "#78ff98",
  "#ffd166",
  "#62d9ff",
  "#ff7ad9",
  "#ff9b54",
  "#8da2ff",
  "#d6ff63",
  "#c58cff",
];

function hashIndex(value) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % TOKEN_PALETTE.length;
}

function tokenAccent(token) {
  const explicit = Number(token?.stats?.tokenColorIndex);
  const index = Number.isFinite(explicit)
    ? Math.abs(Math.floor(explicit)) % TOKEN_PALETTE.length
    : hashIndex(token?.stats?.hordeGroupId || token?.id || token?.name);
  return TOKEN_PALETTE[index];
}

function showLabel() {
  const lang = String(document?.documentElement?.lang || "en").toLowerCase().split("-")[0];
  if (lang === "ru") return "ПОКАЗАТЬ НА КАРТЕ";
  if (lang === "uk") return "ПОКАЗАТИ НА МАПІ";
  if (lang === "pl") return "POKAŻ NA MAPIE";
  return "SHOW ON MAP";
}

function focusToken(token) {
  const grid = document.querySelector(
    ".gm-tactical-map-core .gm-session-map__grid.tactical-grid"
  );
  if (!grid || !token) return;

  const cell =
    Number.parseFloat(grid.style.getPropertyValue("--battlemap-cell")) ||
    grid.querySelector(".gm-session-map__cell")?.offsetWidth ||
    1;
  const size = Math.max(1, Number(token?.stats?.footprint || token?.size || 1));
  const centerX = (Number(token.x || 0) + size / 2) * cell;
  const centerY = (Number(token.y || 0) + size / 2) * cell;
  grid.scrollTo({
    left: Math.max(0, centerX - grid.clientWidth / 2),
    top: Math.max(0, centerY - grid.clientHeight / 2),
    behavior: "smooth",
  });

  const node = grid.querySelector(
    `.gm-session-token[data-enhanced-token-id="${CSS.escape(String(token.id || ""))}"]`
  );
  if (!node) return;
  node.classList.remove("is-card-focus-pulse");
  void node.offsetWidth;
  node.classList.add("is-card-focus-pulse");
  window.setTimeout(() => node.classList.remove("is-card-focus-pulse"), 1400);
}

export default function GmTokenColorAndFocusEnhancer({ session }) {
  const scene = session?.tacticalScene || null;

  useEffect(() => {
    if (!scene || typeof document === "undefined") return undefined;
    const npcTokens = (Array.isArray(scene.tokens) ? scene.tokens : []).filter(
      (token) => token?.kind !== "player"
    );

    let scheduled = 0;
    const sync = () => {
      window.clearTimeout(scheduled);
      scheduled = window.setTimeout(() => {
        const root = document.querySelector(".gm-tactical-tabs-shell");
        if (!root) return;

        const tokenNodes = [...root.querySelectorAll(
          ".gm-session-map__grid.tactical-grid .gm-session-token.is-npc"
        )];
        const unused = new Set(npcTokens.map((token) => String(token.id)));
        tokenNodes.forEach((node, index) => {
          const name = String(node.querySelector("small")?.textContent || "").trim();
          let token = npcTokens.find(
            (item) => unused.has(String(item.id)) && String(item.name || "").trim() === name
          );
          if (!token) token = npcTokens.find((item) => unused.has(String(item.id))) || npcTokens[index];
          if (!token) return;
          unused.delete(String(token.id));
          const accent = tokenAccent(token);
          node.dataset.enhancedTokenId = String(token.id);
          node.style.color = accent;
          node.style.borderColor = accent;
          node.style.setProperty("--enemy-accent", accent);
        });

        const decorateCards = (selector) => {
          [...root.querySelectorAll(selector)].forEach((card, index) => {
            const token = npcTokens[index];
            if (!token) return;
            const accent = tokenAccent(token);
            card.classList.add("is-token-color-linked");
            card.style.setProperty("--enemy-accent", accent);

            const host =
              card.querySelector(".tactical-enemy-card__actions") ||
              card.querySelector(".gm-npc-token-row__actions") ||
              card.querySelector(".gm-npc-v4-compact-row") ||
              card;
            let button = card.querySelector(".gm-show-token-on-map");
            if (!button) {
              button = document.createElement("button");
              button.type = "button";
              button.className = "pip-btn gm-show-token-on-map";
              host.appendChild(button);
            }
            button.textContent = `◎ ${showLabel()}`;
            button.dataset.tokenId = String(token.id);
            button.onclick = (event) => {
              event.preventDefault();
              event.stopPropagation();
              focusToken(token);
            };
          });
        };

        decorateCards(".tactical-enemy-card");
        decorateCards(".gm-npc-v4-scene-card");
      }, 0);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => {
      window.clearTimeout(scheduled);
      observer.disconnect();
    };
  }, [scene, session]);

  return null;
}
