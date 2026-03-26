import React, { useEffect, useMemo, useRef, useState } from "react";
import { playSound } from "../../utils/soundManager";
import "./TerminalHackMiniGame.css";

const WORD_BANK = [
  "SYSTEM",
  "POCKET",
  "MARKET",
  "SPIRIT",
  "PLANET",
  "FALLOUT",
  "BOTTLE",
  "STATIC",
  "TARGET",
  "METHOD",
  "SHADOW",
  "VAULTS",
  "HUNTER",
  "SIGNAL",
  "BROKEN",
  "REPAIR",
  "ORANGE",
  "SILVER",
  "MUTANT",
  "RADIOS",
  "MEMORY",
  "NATION",
  "WINTER",
  "PYTHON",
  "SCREEN",
  "PLAYER",
  "DANGER",
  "MEDKIT",
  "SCANNER",
  "PROCESS",
  "CONTROL",
  "NETWORK",
  "SCIENCE",
  "HACKING",
  "SECURED",
  "MONITOR",
  "PRIVATE",
  "BALANCE",
  "COMMAND",
  "MACHINE",
  "MEDICAL",
  "VAULTED",
  "PLAYERS",
  "DANGERS",
  "FUSIONS",
  "MODULES",
  "OVERRIDE",
  "DEFENDER",
  "TERMINAL",
  "PASSWORD",
  "RADIATOR",
  "OUTCASTS",
  "SURVIVOR",
  "PROTOCOL",
  "CITADELX",
  "BROADCAST",
  "SECURITY",
  "HARDWARE",
  "SOFTWARE",
  "ARMATURE",
  "SHELTERS",
  "FORECAST",
  "MATERIAL",
  "FIREWALL",
  "DATABASE",
  "MONOLITH",
  "RIVETING",
];

const BRACKET_PAIRS = [
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
  ["<", ">"],
];

const GARBAGE_CHARS = `!@#$%^&*()-_=+[]{};:'",.<>?/\\|0123456789`;

const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    wordLength: 6,
    wordCount: 8,
    attempts: 5,
    rows: 34,
    cols: 14,
    bracketCount: 10,
    mobileRows: 34,
    mobileCols: 12,
  },
  medium: {
    label: "Medium",
    wordLength: 7,
    wordCount: 10,
    attempts: 4,
    rows: 34,
    cols: 14,
    bracketCount: 12,
    mobileRows: 34,
    mobileCols: 12,
  },
  hard: {
    label: "Hard",
    wordLength: 8,
    wordCount: 11,
    attempts: 4,
    rows: 38,
    cols: 14,
    bracketCount: 14,
    mobileRows: 38,
    mobileCols: 12,
  },
  veryHard: {
    label: "Very Hard",
    wordLength: 9,
    wordCount: 12,
    attempts: 3,
    rows: 40,
    cols: 14,
    bracketCount: 14,
    mobileRows: 40,
    mobileCols: 12,
  },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getLikeness(a, b) {
  let count = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === b[i]) count += 1;
  }
  return count;
}

function getRandomGarbageChar() {
  return GARBAGE_CHARS[randomInt(0, GARBAGE_CHARS.length - 1)];
}

function pickWords(wordLength, count) {
  const pool = WORD_BANK.filter((word) => word.length === wordLength);
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

function createEmptyBoard(rows, cols) {
  const total = rows * cols;
  return Array.from({ length: total }, () => ({
    type: "char",
    value: getRandomGarbageChar(),
    tokenId: null,
    token: null,
    word: null,
    indexInToken: -1,
    removed: false,
    used: false,
  }));
}

function canPlaceToken(board, start, tokenLength, cols) {
  if (start < 0 || start + tokenLength > board.length) return false;

  const row = Math.floor(start / cols);
  const endRow = Math.floor((start + tokenLength - 1) / cols);
  if (row !== endRow) return false;

  for (let i = 0; i < tokenLength; i += 1) {
    if (board[start + i].type !== "char") return false;
  }

  return true;
}

function placeToken(board, token, type, cols, extra = {}) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const start = randomInt(0, board.length - token.length);
    if (!canPlaceToken(board, start, token.length, cols)) continue;

    const tokenId = `${type}-${start}-${token}`;

    for (let i = 0; i < token.length; i += 1) {
      board[start + i] = {
        type,
        value: token[i],
        token,
        tokenId,
        indexInToken: i,
        removed: false,
        used: false,
        ...extra,
      };
    }
    return true;
  }

  return false;
}

function buildBracketToken() {
  const [open, close] = BRACKET_PAIRS[randomInt(0, BRACKET_PAIRS.length - 1)];
  const middleLength = randomInt(2, 6);

  let middle = "";
  for (let i = 0; i < middleLength; i += 1) {
    middle += getRandomGarbageChar();
  }
  return `${open}${middle}${close}`;
}

function generateBoard(words, rows, cols, bracketCount) {
  const board = createEmptyBoard(rows, cols);

  words.forEach((word) => {
    placeToken(board, word, "word", cols, { word });
  });

  for (let i = 0; i < bracketCount; i += 1) {
    placeToken(board, buildBracketToken(), "bracket", cols, {
      effectId: `effect-${i}`,
    });
  }

  return {
    left: board.slice(0, board.length / 2),
    right: board.slice(board.length / 2),
    rows,
    cols,
  };
}

function createInitialLog(attempts) {
  return [
    "ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL",
    "WARNING: LOCKOUT IMMINENT",
    `${attempts} ATTEMPT(S) LEFT`,
  ];
}

function makeGameState(difficulty = "medium") {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  const isMobile =
    typeof window !== "undefined" ? window.innerWidth <= 640 : false;

  const rows = isMobile ? config.mobileRows : config.rows;
  const cols = isMobile ? config.mobileCols : config.cols;

  const words = pickWords(config.wordLength, config.wordCount);
  const safeWords = words.length ? words : pickWords(6, 8);
  const password = safeWords[randomInt(0, safeWords.length - 1)];

  return {
    difficulty,
    config: {
      ...config,
      rows,
      cols,
    },
    words: safeWords,
    password,
    board: generateBoard(safeWords, rows, cols, config.bracketCount),
    attemptsLeft: config.attempts,
    removedWords: [],
    usedBracketIds: [],
    status: "playing",
    log: createInitialLog(config.attempts),
  };
}

function appendLog(oldLog, ...newLines) {
  return [...oldLog, ...newLines].slice(-24);
}

function markWordRemoved(cells, wordToRemove) {
  return cells.map((cell) => {
    if (cell.type === "word" && cell.word === wordToRemove) {
      return { ...cell, removed: true };
    }
    return cell;
  });
}

function markBracketUsed(cells, tokenId) {
  return cells.map((cell) => {
    if (cell.tokenId === tokenId) {
      return { ...cell, used: true };
    }
    return cell;
  });
}

function findTokenText(cells, tokenId) {
  const tokenCells = cells.filter((cell) => cell.tokenId === tokenId);
  if (!tokenCells.length) return "";
  return tokenCells.map((cell) => cell.value).join("");
}

function removeRandomDud(words, password, removedWords) {
  const dudCandidates = words.filter(
    (word) => word !== password && !removedWords.includes(word)
  );
  if (!dudCandidates.length) return null;
  return dudCandidates[randomInt(0, dudCandidates.length - 1)];
}

function Cell({
  cell,
  hoveredTokenId,
  hoveredCellKey,
  cellKey,
  onHoverStart,
  onHoverEnd,
  onClick,
}) {
  const isTokenHighlighted = Boolean(
    cell.tokenId && cell.tokenId === hoveredTokenId
  );
  const isCharHighlighted = !cell.tokenId && hoveredCellKey === cellKey;

  let className = "terminal-cell clickable";
  if (isTokenHighlighted || isCharHighlighted) className += " cursor";
  if (cell.removed) className += " removed";
  if (cell.used) className += " used";

  return (
    <span
      className={className}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onClick={onClick}
    >
      {cell.removed ? "." : cell.value}
    </span>
  );
}

export default function TerminalHackMiniGame({
  difficulty = "medium",
  onUnlock,
  onFail,
  onExit,
}) {
  const [game, setGame] = useState(() => makeGameState(difficulty));
  const [hoveredTokenId, setHoveredTokenId] = useState(null);
  const [hoveredCellKey, setHoveredCellKey] = useState(null);
  const [typedLog, setTypedLog] = useState([]);
  const logRef = useRef(null);

const halfRows = useMemo(
  () => Math.floor(game.board.left.length / game.board.cols),
  [game.board.left.length, game.board.cols]
);

  useEffect(() => {
    let cancelled = false;
    const target = game.log;
    setTypedLog([]);

    async function typeLines() {
      const built = [];
      for (const line of target) {
        let current = "";
        for (let i = 0; i < line.length; i += 1) {
          if (cancelled) return;
          current += line[i];
          const next = [...built, current];
          setTypedLog(next);
          await new Promise((resolve) => setTimeout(resolve, 8));
        }
        built.push(line);
        setTypedLog([...built]);
        await new Promise((resolve) => setTimeout(resolve, 18));
      }
    }

    typeLines();
    return () => {
      cancelled = true;
    };
  }, [game.log]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [typedLog]);

  useEffect(() => {
    function handleResize() {
      setGame((prev) => makeGameState(prev.difficulty));
      setHoveredTokenId(null);
      setHoveredCellKey(null);
    }

    let timer = null;
    function debouncedResize() {
      clearTimeout(timer);
      timer = setTimeout(handleResize, 120);
    }

    window.addEventListener("resize", debouncedResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", debouncedResize);
    };
  }, []);

  function resetGame(nextDifficulty = difficulty) {
    playSound?.("uiTab");
    setHoveredTokenId(null);
    setHoveredCellKey(null);
    setGame(makeGameState(nextDifficulty));
  }

  function handleWin(word) {
    playSound?.("uiOK");
    setGame((prev) => ({
      ...prev,
      status: "won",
      log: appendLog(prev.log, `> ${word}`, "ACCESS GRANTED"),
    }));
    onUnlock?.();
  }

  function handleLose(word, likeness) {
    playSound?.("uiError");
    setGame((prev) => ({
      ...prev,
      attemptsLeft: 0,
      status: "lost",
      log: appendLog(
        prev.log,
        `> ${word}`,
        "ENTRY DENIED",
        `${likeness}/${prev.password.length} CORRECT`,
        "LOCKED OUT"
      ),
    }));
    onFail?.();
  }

  function handleWrongGuess(word) {
    const likeness = getLikeness(word, game.password);
    const nextAttempts = game.attemptsLeft - 1;

    if (nextAttempts <= 0) {
      handleLose(word, likeness);
      return;
    }

    playSound?.("uiError");
    setGame((prev) => ({
      ...prev,
      attemptsLeft: nextAttempts,
      log: appendLog(
        prev.log,
        `> ${word}`,
        "ENTRY DENIED",
        `${likeness}/${prev.password.length} CORRECT`
      ),
    }));
  }

  function handleWordClick(word) {
    if (game.status !== "playing") return;
    if (game.removedWords.includes(word)) return;

    if (word === game.password) {
      handleWin(word);
      return;
    }
    handleWrongGuess(word);
  }

  function handleBracketClick(tokenId) {
    if (game.status !== "playing") return;
    if (game.usedBracketIds.includes(tokenId)) return;

    const tokenText =
      findTokenText(game.board.left, tokenId) ||
      findTokenText(game.board.right, tokenId);

    const doResetAttempts = Math.random() < 0.5;
    let nextAttemptsLeft = game.attemptsLeft;
    let nextRemovedWords = [...game.removedWords];
    let nextLeft = game.board.left;
    let nextRight = game.board.right;
    let resultText = "ATTEMPTS RESET";

    if (doResetAttempts) {
      nextAttemptsLeft = game.config.attempts;
      resultText = "ATTEMPTS RESET";
      playSound?.("uiOK");
    } else {
      const dud = removeRandomDud(game.words, game.password, game.removedWords);
      if (dud) {
        nextRemovedWords = [...game.removedWords, dud];
        nextLeft = markWordRemoved(nextLeft, dud);
        nextRight = markWordRemoved(nextRight, dud);
        resultText = "DUD REMOVED";
        playSound?.("uiOK");
      } else {
        nextAttemptsLeft = game.config.attempts;
        resultText = "ATTEMPTS RESET";
        playSound?.("uiOK");
      }
    }

    nextLeft = markBracketUsed(nextLeft, tokenId);
    nextRight = markBracketUsed(nextRight, tokenId);

    setGame((prev) => ({
      ...prev,
      attemptsLeft: nextAttemptsLeft,
      removedWords: nextRemovedWords,
      usedBracketIds: [...prev.usedBracketIds, tokenId],
      board: {
        ...prev.board,
        left: nextLeft,
        right: nextRight,
      },
      log: appendLog(prev.log, `> ${tokenText}`, resultText),
    }));
  }

  function handleGarbageClick(cell) {
    if (game.status !== "playing") return;
    playSound?.("uiTab");
    setGame((prev) => ({
      ...prev,
      log: appendLog(prev.log, `> ${cell.value}`),
    }));
  }

  function renderColumn(cells, startAddress, sideKey) {
    const rows = [];

    for (let rowIndex = 0; rowIndex < halfRows; rowIndex += 1) {
      const rowStart = rowIndex * game.board.cols;
      const rowCells = cells.slice(rowStart, rowStart + game.board.cols);
      const addr = `0x${(startAddress + rowIndex * game.board.cols)
        .toString(16)
        .toUpperCase()}`;

      rows.push(
        <div key={addr} className="terminal-row">
          <span className="terminal-address">{addr}</span>
          <span className="terminal-data">
            {rowCells.map((cell, index) => {
              const cellKey = `${sideKey}-${rowIndex}-${index}`;
              return (
                <Cell
                  key={`${addr}-${index}`}
                  cell={cell}
                  cellKey={cellKey}
                  hoveredTokenId={hoveredTokenId}
                  hoveredCellKey={hoveredCellKey}
                  onHoverStart={() => {
                    setHoveredCellKey(cellKey);
                    setHoveredTokenId(cell.tokenId || null);
                  }}
                  onHoverEnd={() => {
                    setHoveredTokenId(null);
                    setHoveredCellKey(null);
                  }}
                  onClick={() => {
                    if (cell.type === "word" && !cell.removed) {
                      handleWordClick(cell.word);
                    } else if (cell.type === "bracket" && !cell.used) {
                      handleBracketClick(cell.tokenId);
                    } else {
                      handleGarbageClick(cell);
                    }
                  }}
                />
              );
            })}
          </span>
        </div>
      );
    }

    return rows;
  }

  const statusText =
    game.status === "won"
      ? "ACCESS GRANTED"
      : game.status === "lost"
      ? "LOCKED OUT"
      : "PASSWORD REQUIRED";

  const cursorVisible = game.status === "playing";

  return (
    <div className="terminal-hack-wrap crt-screen">
      <div className="terminal-hack-header">
        <div>
          <div className="terminal-title">ROBCO TERMLINK</div>
          <div className="terminal-subtitle">
            Difficulty: {game.config.label} · Word length: {game.config.wordLength}
          </div>
        </div>

        <div className="terminal-status">{statusText}</div>
      </div>

      <div className="terminal-attempts">
        ATTEMPTS LEFT:&nbsp;
        {Array.from({ length: game.config.attempts }, (_, i) => (
          <span
            key={i}
            className={`attempt-block ${i < game.attemptsLeft ? "active" : ""}`}
          >
            ■
          </span>
        ))}
      </div>

      <div className="terminal-main">
        <div className="terminal-board-wrap">
          <div className="terminal-board">
            <div className="terminal-column">
              {renderColumn(game.board.left, 0xf000, "left")}
            </div>
            <div className="terminal-column">
              {renderColumn(game.board.right, 0xf121, "right")}
            </div>
          </div>
        </div>

        <div ref={logRef} className="terminal-log">
          {typedLog.map((line, index) => (
            <div key={`${line}-${index}`} className="terminal-log-line">
              {line}
            </div>
          ))}
          {cursorVisible ? <div className="terminal-log-cursor">█</div> : null}
        </div>
      </div>

      <div className="terminal-actions">
        <button
          type="button"
          className="terminal-btn"
          onClick={() => resetGame(difficulty)}
        >
          RESTART
        </button>

        <button
          type="button"
          className="terminal-btn"
          onClick={() => {
            playSound?.("uiTab");
            onExit?.();
          }}
        >
          EXIT
        </button>
      </div>
    </div>
  );
}