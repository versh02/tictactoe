// ---------------------------------------------------------------
// Tic-Tac-Toe — real-time two-player logic
// Uses Firebase Realtime Database as the sync layer. No server
// code of your own is required — this file runs entirely in the
// browser of each player.
// ---------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  onValue,
  onDisconnect,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

// ---------- Firebase setup ----------

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const CONFIG_NOT_SET = String(firebaseConfig.apiKey || "").includes("PASTE_YOUR");

// ---------- Constants ----------

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
];
const CENTERS = [50, 150, 250]; // cell-center coordinates for a 0-300 viewBox

// ---------- DOM refs ----------

const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const joinCodeInput = document.getElementById("joinCodeInput");
const lobbyError = document.getElementById("lobbyError");

const roomCodeLabel = document.getElementById("roomCodeLabel");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const leaveBtn = document.getElementById("leaveBtn");
const statusLine = document.getElementById("statusLine");
const turnDot = document.getElementById("turnDot");
const statusText = document.getElementById("statusText");
const boardEl = document.getElementById("board");
const winOverlay = document.getElementById("winOverlay");
const resultText = document.getElementById("resultText");
const footerActions = document.getElementById("footerActions");
const rematchHint = document.getElementById("rematchHint");

// ---------- State ----------

let myId = getPlayerId();
let mySymbol = null;
let currentRoomCode = null;
let latestState = null;
let unsubscribeRoom = null;
let activePresenceRef = null;

// ---------- Helpers ----------

function getPlayerId() {
  let id = sessionStorage.getItem("ttt_player_id");
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : "p-" + Math.random().toString(36).slice(2) + Date.now());
    sessionStorage.setItem("ttt_player_id", id);
  }
  return id;
}

function generateRoomCode(len = 5) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

function computeWinner(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return null;
}

function markSVG(mark) {
  if (mark === "X") {
    return `<svg class="mark-x" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M22 22 L78 78" />
      <path d="M78 22 L22 78" />
    </svg>`;
  }
  if (mark === "O") {
    return `<svg class="mark-o" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="32" />
    </svg>`;
  }
  return "";
}

function showLobbyError(msg) {
  lobbyError.textContent = msg;
}

function setLobbyBusy(busy) {
  createRoomBtn.disabled = busy || CONFIG_NOT_SET;
  joinRoomBtn.disabled = busy || CONFIG_NOT_SET;
}

// ---------- Presence (best-effort "is my opponent still around") ----------

onValue(ref(db, ".info/connected"), (snap) => {
  if (snap.val() === true && activePresenceRef) {
    onDisconnect(activePresenceRef).set(false).catch(() => {});
    set(activePresenceRef, true).catch(() => {});
  }
});

function setupPresence(code, mark) {
  activePresenceRef = ref(db, `rooms/${code}/presence/${mark}`);
  set(activePresenceRef, true);
  onDisconnect(activePresenceRef).set(false);
}

// ---------- Board rendering ----------

function buildBoard() {
  boardEl.innerHTML = "";
  for (let i = 0; i < 9; i++) {
    const btn = document.createElement("button");
    btn.className = "cell";
    btn.type = "button";
    btn.setAttribute("aria-label", `Cell ${i + 1}`);
    btn.dataset.index = String(i);
    btn.addEventListener("click", () => handleCellClick(i));
    boardEl.appendChild(btn);
  }
}

function pointFor(i) {
  return { x: CENTERS[i % 3], y: CENTERS[Math.floor(i / 3)] };
}

function drawWinLine(line, winner) {
  winOverlay.innerHTML = "";
  if (!line || !winner || winner === "draw") return;

  const p1 = pointFor(line[0]);
  const p2 = pointFor(line[2]);
  const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);

  const lineEl = document.createElementNS("http://www.w3.org/2000/svg", "line");
  lineEl.setAttribute("x1", p1.x);
  lineEl.setAttribute("y1", p1.y);
  lineEl.setAttribute("x2", p2.x);
  lineEl.setAttribute("y2", p2.y);
  lineEl.style.stroke = winner === "X" ? "var(--x-color)" : "var(--o-color)";
  lineEl.style.strokeDasharray = String(length);
  lineEl.style.strokeDashoffset = String(length);
  winOverlay.appendChild(lineEl);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      lineEl.style.strokeDashoffset = "0";
    });
  });
}

function renderState(state) {
  latestState = state;
  const { board, turn, players, presence, status, winner, winLine, rematch } = state;

  if (players?.X === myId) mySymbol = "X";
  else if (players?.O === myId) mySymbol = "O";

  // Cells
  const cells = boardEl.children;
  for (let i = 0; i < 9; i++) {
    const cellEl = cells[i];
    const val = board[i];
    if (val && !cellEl.classList.contains("placed")) {
      cellEl.innerHTML = markSVG(val);
      requestAnimationFrame(() => cellEl.classList.add("placed"));
    } else if (!val) {
      cellEl.innerHTML = "";
      cellEl.classList.remove("placed");
    }
    const canPlay = status === "playing" && !val && turn === mySymbol;
    cellEl.disabled = !canPlay;
  }

  // Status line
  statusLine.classList.remove("you-x", "you-o");
  if (mySymbol === "X") statusLine.classList.add("you-x");
  if (mySymbol === "O") statusLine.classList.add("you-o");
  turnDot.classList.toggle("pulse", status === "playing");

  if (status === "waiting") {
    statusText.textContent = "Waiting for opponent to join…";
  } else if (status === "playing") {
    const opponentMark = mySymbol === "X" ? "O" : "X";
    const opponentOnline = presence ? presence[opponentMark] : true;
    if (turn === mySymbol) {
      statusText.textContent = `Your turn — you're ${mySymbol}`;
    } else {
      statusText.textContent = `Opponent's turn (${turn})` + (opponentOnline === false ? " — they appear to be offline" : "");
    }
  } else if (status === "finished") {
    statusText.textContent =
      winner === "draw" ? "It's a draw." : winner === mySymbol ? "You won!" : `${winner} won.`;
  }

  // Result + footer actions
  resultText.className = "result-text";
  resultText.textContent = "";
  footerActions.innerHTML = "";
  rematchHint.textContent = "";

  if (status === "finished") {
    if (winner === "draw") {
      resultText.textContent = "DRAW";
      resultText.classList.add("draw");
    } else if (winner === mySymbol) {
      resultText.textContent = "YOU WIN";
      resultText.classList.add("win");
    } else {
      resultText.textContent = "YOU LOSE";
      resultText.classList.add("loss");
    }

    const iVoted = !!(rematch && rematch[mySymbol]);
    const rematchBtn = document.createElement("button");
    rematchBtn.className = "primary";
    rematchBtn.textContent = iVoted ? "Waiting for opponent…" : "Play again";
    rematchBtn.disabled = iVoted;
    rematchBtn.addEventListener("click", requestRematch);
    footerActions.appendChild(rematchBtn);

    const otherMark = mySymbol === "X" ? "O" : "X";
    if (rematch && rematch[otherMark] && !iVoted) {
      rematchHint.textContent = "Your opponent wants a rematch.";
    }
  }

  drawWinLine(winLine, winner);
}

// ---------- Room actions ----------

async function createRoom() {
  showLobbyError("");
  setLobbyBusy(true);
  try {
    let code = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateRoomCode();
      const existing = await get(ref(db, `rooms/${candidate}`));
      if (!existing.exists()) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      showLobbyError("Couldn't find a free room code — please try again.");
      return;
    }
    const initial = {
      board: Array(9).fill(null),
      turn: "X",
      players: { X: myId, O: null },
      presence: { X: true, O: false },
      status: "waiting",
      winner: null,
      winLine: null,
      rematch: { X: false, O: false },
      createdAt: Date.now()
    };
    await set(ref(db, `rooms/${code}`), initial);
    mySymbol = "X";
    currentRoomCode = code;
    setupPresence(code, "X");
    enterGame(code);
  } catch (err) {
    console.error(err);
    showLobbyError("Couldn't create a room. Check your Firebase config and try again.");
  } finally {
    setLobbyBusy(false);
  }
}

async function joinRoom(codeRaw) {
  const code = (codeRaw || "").trim().toUpperCase();
  showLobbyError("");
  if (!code) {
    showLobbyError("Enter a room code.");
    return;
  }
  setLobbyBusy(true);
  try {
    const roomSnap = await get(ref(db, `rooms/${code}`));
    if (!roomSnap.exists()) {
      showLobbyError("No room with that code.");
      return;
    }
    const room = roomSnap.val();

    if (room.players?.X === myId) {
      // Reopening the room you created
      mySymbol = "X";
      currentRoomCode = code;
      setupPresence(code, "X");
      enterGame(code);
      return;
    }

    const txResult = await runTransaction(ref(db, `rooms/${code}/players/O`), (current) => {
      if (current === null || current === myId) return myId;
      return; // abort — seat already taken by someone else
    });

    if (!txResult.committed) {
      showLobbyError("That room already has two players.");
      return;
    }

    await update(ref(db, `rooms/${code}`), { status: "playing" });
    mySymbol = "O";
    currentRoomCode = code;
    setupPresence(code, "O");
    enterGame(code);
  } catch (err) {
    console.error(err);
    showLobbyError("Something went wrong. Check your Firebase config and try again.");
  } finally {
    setLobbyBusy(false);
  }
}

function attachRoomListener(code) {
  if (unsubscribeRoom) unsubscribeRoom();
  unsubscribeRoom = onValue(ref(db, `rooms/${code}`), (snap) => {
    if (!snap.exists()) {
      statusText.textContent = "This room no longer exists.";
      return;
    }
    renderState(snap.val());
  });
}

function enterGame(code) {
  lobbyScreen.classList.add("hidden");
  gameScreen.classList.add("visible");
  roomCodeLabel.textContent = code;
  attachRoomListener(code);
}

async function handleCellClick(i) {
  if (!latestState || !currentRoomCode) return;
  const { board, turn, status } = latestState;
  if (status !== "playing" || turn !== mySymbol || board[i]) return;

  const newBoard = board.slice();
  newBoard[i] = mySymbol;
  const result = computeWinner(newBoard);

  const updates = { board: newBoard };
  if (result) {
    updates.status = "finished";
    updates.winner = result.winner;
    updates.winLine = result.line;
  } else if (newBoard.every(Boolean)) {
    updates.status = "finished";
    updates.winner = "draw";
    updates.winLine = null;
  } else {
    updates.turn = mySymbol === "X" ? "O" : "X";
  }

  try {
    await update(ref(db, `rooms/${currentRoomCode}`), updates);
  } catch (err) {
    console.error(err);
  }
}

async function requestRematch() {
  if (!currentRoomCode || !mySymbol) return;
  await update(ref(db, `rooms/${currentRoomCode}/rematch`), { [mySymbol]: true });

  const roomSnap = await get(ref(db, `rooms/${currentRoomCode}`));
  const room = roomSnap.val();
  if (room?.rematch?.X && room?.rematch?.O) {
    await update(ref(db, `rooms/${currentRoomCode}`), {
      board: Array(9).fill(null),
      turn: "X",
      status: "playing",
      winner: null,
      winLine: null,
      rematch: { X: false, O: false }
    });
  }
}

function leaveRoom() {
  if (currentRoomCode && mySymbol) {
    set(ref(db, `rooms/${currentRoomCode}/presence/${mySymbol}`), false).catch(() => {});
  }
  if (unsubscribeRoom) {
    unsubscribeRoom();
    unsubscribeRoom = null;
  }
  currentRoomCode = null;
  mySymbol = null;
  latestState = null;
  gameScreen.classList.remove("visible");
  lobbyScreen.classList.remove("hidden");
  joinCodeInput.value = "";
  showLobbyError("");
}

// ---------- Wiring ----------

buildBoard();

createRoomBtn.addEventListener("click", createRoom);
joinRoomBtn.addEventListener("click", () => joinRoom(joinCodeInput.value));
joinCodeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinRoom(joinCodeInput.value);
});
leaveBtn.addEventListener("click", leaveRoom);
copyCodeBtn.addEventListener("click", async () => {
  if (!currentRoomCode) return;
  try {
    await navigator.clipboard.writeText(currentRoomCode);
    copyCodeBtn.textContent = "Copied";
    setTimeout(() => (copyCodeBtn.textContent = "Copy"), 1200);
  } catch {
    /* clipboard API unavailable — silently ignore */
  }
});

if (CONFIG_NOT_SET) {
  showLobbyError("Add your Firebase project keys to firebase-config.js first (see README.md).");
  setLobbyBusy(false);
}
