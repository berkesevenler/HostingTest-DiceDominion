import { writeData, readData } from "./networking.js";
import { cleanupPublicLobby } from "./lobbyManager.js";
import { updateGridCell } from "./board.js";

// Global game variables.
export let currentPlayer = 1;
export let dice1, dice2;
export let isPreviewing = false;
export let canPlaceBlockFlag = false;
export let rotation = 0;
export let hasRolledDice = false;

export const skipTurnLimit = 3;
export const skipTurnCount = {
  1: 0,
  2: 0,
};

export const REROLL_LIMIT = 3;
export const rerollCount = {
  1: 0,
  2: 0,
};

export function rotate(){
  rotation = (rotation + 90) % 360;
 clearPreview();
}

/**
 * Sets up a listener for turn changes.
 */
export function displayTurnStatus(lobbyCode) {
  setupLobbyTerminationListener(lobbyCode);
  const turnStatusElement = document.getElementById("turnStatusDisplay");
  import("./networking.js").then((module) => {
    module.listenToChanges(`lobbies/${lobbyCode}/turnStatus`, (turnStatus) => {
      currentPlayer = turnStatus;
      readData(`lobbies/${lobbyCode}/players/player${currentPlayer}/name`).then((name) => {
        turnStatusElement.innerText = `It's ${name || `Player ${currentPlayer}`}'s turn!`;
      });
      if (currentPlayer === window.myPlayerCode) {
        readData(`lobbies/${lobbyCode}/players/player${window.myPlayerCode}/name`).then((name) => {
          document.getElementById("status").innerText = `Your turn, ${name || `Player ${window.myPlayerCode}`}!`;
        });
      } else {
        readData(`lobbies/${lobbyCode}/players/player${currentPlayer}/name`).then((name) => {
          document.getElementById("status").innerText = `It's ${name || `Player ${currentPlayer}`}'s turn – please wait.`;
        });
      }
      fetchBoardFromServer(lobbyCode);
    });
  });
}

/**
 * Listens for updates to the board data from Firebase.
 */
export function fetchBoardFromServer(lobbyCode) {
  import("./networking.js").then((module) => {
    module.listenToChanges(`lobbies/${lobbyCode}/board`, (serverBoard) => {
      if (!serverBoard) return;
      for (let row = 0; row < window.boardSize; row++) {
        for (let col = 0; col < window.boardSize; col++) {
          const serverCell = serverBoard[row]?.[col];
          const localCell = window.board[row][col];
          if (serverCell && serverCell !== window.myPlayerCode && serverCell !== localCell) {
            window.board[row][col] = serverCell;
            updateGridCell(row, col, serverCell);
          }
        }
      }
    });
  });
}

/**
 * Rolls the dice if it is the current player’s turn.
 */
export function rollDice() {
  if (!isPlayerTurn()) return;
  if (hasRolledDice) {
    document.getElementById("status").innerText =
      "You have already rolled the dice. Place your block or skip your turn.";
    return;
  }
  dice1 = Math.floor(Math.random() * 6) + 1;
  dice2 = Math.floor(Math.random() * 6) + 1;
  document.getElementById("status").innerText = `You rolled ${dice1}x${dice2}`;
  document.getElementById("controls").style.display = "block";
  readData(`lobbies/${window.lobbyCode}/players/player${currentPlayer}/name`).then(
    (playerName) => {
      document.getElementById("currentPlayerDisplay").innerText = playerName || `Player ${currentPlayer}`;
    }
  );
  document.getElementById("diceResult").innerText = `${dice1}x${dice2}`;
  canPlaceBlockFlag = true;
  rotation = 0;
  hasRolledDice = true;
  showRerollButton();
  if (!canPlayerPlace()) {
    handleNoValidMoves();
  } else {
    hideSkipTurnButton();
    hideDeclareWinnerButton();
  }
}
window.rollDice = rollDice;

/**
 * Previews a block placement when the user hovers over a cell.
 */
export function previewBlock(event) {
  if (!dice1 || !dice2 || !canPlaceBlockFlag) return;
  clearPreview();
  const [width, height] = applyRotation(dice1, dice2);
  const clickedX = parseInt(event.target.dataset.col);
  const clickedY = parseInt(event.target.dataset.row);
  const { x: startX, y: startY } = getCenteredPosition(clickedX, clickedY, width, height);
  const previewClass = currentPlayer === 1 ? "preview-blue" : "preview-red";

  for (let row = startY; row < startY + height; row++) {
    for (let col = startX; col < startX + width; col++) {
      const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      if (cell && window.board[row][col] === null) {
        cell.classList.add(previewClass);
      }
    }
  }
  isPreviewing = true;
}

/**
 * Clears any preview highlights.
 */
export function clearPreview() {
  if (!isPreviewing) return;
  document.querySelectorAll(".preview-blue, .preview-red").forEach((cell) =>
    cell.classList.remove("preview-blue", "preview-red")
  );
  isPreviewing = false;
}

/**
 * Helper: Calculates a centered starting position given a clicked cell and block dimensions.
 */
function getCenteredPosition(clickedX, clickedY, width, height) {
  return {
    x: clickedX - Math.floor(width / 2),
    y: clickedY - Math.floor(height / 2),
  };
}

/**
 * Attempts to place a block on the board.
 */
export function placeBlock(event) {
  if (!canPlaceBlockFlag) return;
  const [width, height] = applyRotation(dice1, dice2);
  const clickedX = parseInt(event.target.dataset.col);
  const clickedY = parseInt(event.target.dataset.row);
  const { x: startX, y: startY } = getCenteredPosition(clickedX, clickedY, width, height);
  if (
    isWithinBounds(startX, startY, width, height) &&
    isConnected(startX, startY, width, height) &&
    canPlaceBlock(startX, startY, width, height)
  ) {
    for (let row = startY; row < startY + height; row++) {
      for (let col = startX; col < startX + width; col++) {
        window.board[row][col] = currentPlayer;
        writeData(`lobbies/${window.lobbyCode}/board/${row}/${col}`, currentPlayer);
        document
          .querySelector(`[data-row="${row}"][data-col="${col}"]`)
          .classList.add(`player${currentPlayer}`);
      }
    }
    if (checkWinCondition()) {
      declareWinner(currentPlayer);
    } else {
      endTurn();
    }
  } else {
    document.getElementById("status").innerText = "You cannot place block here.";
  }
}

/**
 * Adjusts the width/height values based on the current rotation.
 */
export function applyRotation(width, height) {
  if (rotation === 90 || rotation === 270) {
    return [height, width];
  }
  return [width, height];
}

/**
 * Checks if the block placement is within the board boundaries.
 */
export function isWithinBounds(x, y, width, height) {
  return x >= 0 && y >= 0 && x + width <= window.boardSize && y + height <= window.boardSize;
}

/**
 * Checks if the block placement is connected to an existing block.
 */
export function isConnected(x, y, width, height) {
  if (getPlacedBlocks(currentPlayer).length === 0) {
    return (
      (currentPlayer === 1 && x === 0 && y === 0) ||
      (currentPlayer === 2 && x + width - 1 === window.boardSize - 1 && y + height - 1 === window.boardSize - 1)
    );
  }
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      if (isAdjacentToCurrentPlayer(row, col)) return true;
    }
  }
  return false;
}

/**
 * Checks whether the specified cell is adjacent to any block already placed by the current player.
 */
export function isAdjacentToCurrentPlayer(row, col) {
  const adjacentPositions = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ];
  return adjacentPositions.some(
    ([r, c]) => window.board[r] && window.board[r][c] === currentPlayer
  );
}

/**
 * Returns an array of all cells occupied by the specified player.
 */
export function getPlacedBlocks(player) {
  return window.board.flat().filter((cell) => cell === player);
}

/**
 * Checks if a block can be placed at the given position (i.e. cells are empty).
 */
export function canPlaceBlock(x, y, width, height) {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      if (row >= window.boardSize || col >= window.boardSize || window.board[row][col] !== null)
        return false;
    }
  }
  return true;
}

/**
 * Checks whether the current player has claimed at least half of the board.
 */
export function checkWinCondition() {
  const totalCells = window.boardSize * window.boardSize;
  const playerCells = window.board.flat().filter((cell) => cell === currentPlayer).length;
  return playerCells >= totalCells / 2;
}

/**
 * Declares a winner, writes the result to Firebase, and reloads the page.
 */
export function declareWinner(winner) {
  readData(`lobbies/${window.lobbyCode}/players/player${winner}/name`).then((name) => {
    alert(`${name || `Player ${winner}`} wins!`);
    handleGameOver(window.lobbyCode, winner);
    location.reload();
  });
}

/**
 * Sets up a listener to display a game-over message when a winner is declared.
 */
export function displayGameOver(lobbyCode) {
  import("./networking.js").then((module) => {
    module.listenToChanges(`lobbies/${lobbyCode}/gameOver`, (gameOver) => {
      if (gameOver) {
        readData(`lobbies/${lobbyCode}/players/player${gameOver}/name`).then((winnerName) => {
          document.getElementById("status").innerText = `Game Over! ${winnerName || `Player ${gameOver}`} has won!`;
          alert(`Game Over! ${winnerName || `Player ${gameOver}`} has won! Please start a new game.`);
        });
      }
    });
  });
}

/**
 * Writes the game-over state to Firebase.
 */
export function handleGameOver(lobbyCode, winningPlayer) {
  readData(`lobbies/${lobbyCode}/players/player${winningPlayer}/name`).then((winnerName) => {
    console.log(`Game over! ${winnerName || `Player ${winningPlayer}`} has won.`);
    cleanupPublicLobby(lobbyCode);
    writeData(`lobbies/${lobbyCode}/gameOver`, winningPlayer);
  }).catch((error) => {
    console.error("Failed to set game over state:", error);
  });
}

/**
 * Allows the current player to skip their turn.
 */
export function skipTurn() {
  const skipButton = document.getElementById("skipTurnButton");
  skipButton.disabled = true;
  readData(`lobbies/${window.lobbyCode}/players/player${currentPlayer}/name`).then((playerName) => {
    if (skipTurnCount[currentPlayer] < skipTurnLimit) {
      skipTurnCount[currentPlayer]++;
      document.getElementById("status").innerText =
        `${playerName || `Player ${currentPlayer}`} skipped their turn. ${skipTurnLimit - skipTurnCount[currentPlayer]} skips remaining.`;
      setTimeout(() => {
        endTurn();
        skipButton.disabled = false;
      }, 2500);
    } else {
      handleNoValidMoves();
      skipButton.disabled = false;
    }
  }).catch(() => {
    skipButton.disabled = false;
  });
}
window.skipTurn = skipTurn;

/**
 * Called when the current player has no valid moves.
 */
export function handleNoValidMoves() {
  readData(`lobbies/${window.lobbyCode}/players/player${currentPlayer}/name`).then((currentPlayerName) => {
    const otherPlayer = currentPlayer === 1 ? 2 : 1;
    readData(`lobbies/${window.lobbyCode}/players/player${otherPlayer}/name`).then((otherPlayerName) => {
      if (skipTurnCount[currentPlayer] >= skipTurnLimit && !canPlayerPlace()) {
        document.getElementById("status").innerText =
          `You cannot place block and have exhausted all skips. ${otherPlayerName || `Player ${otherPlayer}`} wins.`;
        showDeclareWinnerButton();
      } else {
        if (skipTurnCount[currentPlayer] < skipTurnLimit) {
          document.getElementById("status").innerText = "You cannot place block. You may skip your turn.";
          showSkipTurnButton();
        }
      }
    });
  });
}

/**
 * Ends the current turn and updates Firebase.
 */
export function endTurn() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  writeData(`lobbies/${window.lobbyCode}/turnStatus`, currentPlayer);
  canPlaceBlockFlag = false;
  hasRolledDice = false;
  document.getElementById("controls").style.display = "none";
  hideSkipTurnButton();
  hideDeclareWinnerButton();
  hideRerollButton();
  clearPreview();
}

/**
 * Shows the skip-turn button.
 */
export function showSkipTurnButton() {
  const skipButton = document.getElementById("skipTurnButton");
  if (skipTurnCount[currentPlayer] < skipTurnLimit) {
    skipButton.style.display = "block";
    skipButton.disabled = false;
  }
}

/**
 * Hides the skip-turn button.
 */
export function hideSkipTurnButton() {
  document.getElementById("skipTurnButton").style.display = "none";
}

/**
 * Shows the “declare winner” button so that the opponent can be declared the winner.
 */
export function showDeclareWinnerButton() {
  const otherPlayer = currentPlayer === 1 ? 2 : 1;
  document.getElementById("declareWinnerButton").style.display = "block";
  readData(`lobbies/${window.lobbyCode}/players/player${otherPlayer}/name`).then((winnerName) => {
    document.getElementById("winnerPlayerDisplay").innerText = winnerName || `Player ${otherPlayer}`;
  });
}

/**
 * Hides the “declare winner” button.
 */
export function hideDeclareWinnerButton() {
  document.getElementById("declareWinnerButton").style.display = "none";
}

/**
 * Declares the opponent as the winner.
 */
export function declareOtherPlayerWinner() {
  const otherPlayer = currentPlayer === 1 ? 2 : 1;
  declareWinner(otherPlayer);
}
window.declareOtherPlayerWinner = declareOtherPlayerWinner;

/**
 * Checks whether there is at least one valid placement for the current dice roll.
 */
export function canPlayerPlace() {
  for (let row = 0; row < window.boardSize; row++) {
    for (let col = 0; col < window.boardSize; col++) {
      for (let rot of [0, 90, 180, 270]) {
        const [width, height] = applyRotation(dice1, dice2);
        if (canPlaceBlock(col, row, width, height) && isConnected(col, row, width, height)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Called when the player chooses to exit the game.
 */
export function exitGame() {
  const confirmation = confirm("Are you sure you want to be a loser? Your enemy will win if you leave.");
  if (confirmation) {
    declareWinner(currentPlayer === 1 ? 2 : 1);
    document.getElementById("container").style.display = "none";
    document.getElementById("menu").style.display = "block";
    window.board = [];
    currentPlayer = 1;
    dice1 = null;
    dice2 = null;
    isPreviewing = false;
    canPlaceBlockFlag = false;
    rotation = 0;
    hasRolledDice = false;
    const boardDiv = document.getElementById("board");
    boardDiv.innerHTML = "";
    document.getElementById("status").innerText = "Waiting for the game to start...";
    document.getElementById("lobbyCodeDisplay").innerText = "";
    if (window.lobbyCode) {
      writeData(`lobbies/${window.lobbyCode}/turnStatus`, null);
      writeData(`lobbies/${window.lobbyCode}/gameOver`, null);
      writeData(`lobbies/${window.lobbyCode}/board`, null);
      writeData(`lobbies/${window.lobbyCode}/players`, null);
    }
    console.log("Game exited. Returning to menu.");
  } else {
    console.log("Exit game canceled by the player.");
  }
}
document.getElementById("exitButton").addEventListener("click", exitGame);

/**
 * Listens for termination of the lobby (for example, if the host leaves).
 */
export function setupLobbyTerminationListener(lobbyCode) {
  import("./networking.js").then((module) => {
    module.listenToChanges(`lobbies/${lobbyCode}`, (data) => {
      if (!data) {
        alert("The lobby has been terminated because the host left.");
        location.reload();
      }
    });
  });
}

/**
 * Handles re-rolling the dice.
 */
export function handleReroll() {
  if (!isPlayerTurn()) return;
  readData(`lobbies/${window.lobbyCode}/players/player${currentPlayer}/name`).then((playerName) => {
    if (!hasRolledDice) {
      document.getElementById("status").innerText = `${playerName || `Player ${currentPlayer}`}, you need to roll the dice first.`;
      return;
    }
    if (rerollCount[currentPlayer] >= REROLL_LIMIT) {
      document.getElementById("status").innerText = `${playerName || `Player ${currentPlayer}`}, you have used all your re-rolls.`;
      return;
    }
    rerollCount[currentPlayer]++;
    dice1 = Math.floor(Math.random() * 6) + 1;
    dice2 = Math.floor(Math.random() * 6) + 1;
    const remaining = REROLL_LIMIT - rerollCount[currentPlayer];
    let statusMessage = `${playerName || `Player ${currentPlayer}`} re-rolled: ${dice1}x${dice2}`;
    statusMessage += ` (${remaining} re-roll${remaining !== 1 ? 's' : ''} remaining)`;
    if (remaining <= 0) {
      statusMessage = `${playerName || `Player ${currentPlayer}`}, you have used all your re-rolls.`;
    }
    document.getElementById("status").innerText = statusMessage;
    document.getElementById("diceResult").innerText = `${dice1}x${dice2}`;
    rotation = 0;
    clearPreview();
    if (!canPlayerPlace()) {
      handleNoValidMoves();
    } else {
      hideSkipTurnButton();
      hideDeclareWinnerButton();
    }
    showRerollButton();
  });
}
function showRerollButton() {
  const rerollBtn = document.getElementById("rerollButton");
  const remaining = REROLL_LIMIT - rerollCount[currentPlayer];
  if (remaining > 0) {
    rerollBtn.style.display = "block";
  } else {
    rerollBtn.style.display = "none";
  }
}
function hideRerollButton() {
  document.getElementById("rerollButton").style.display = "none";
}
window.handleReroll = handleReroll;

/**
 * Helper: Checks if it is the current player’s turn.
 */
function isPlayerTurn() {
  if (currentPlayer !== window.myPlayerCode) {
    readData(`lobbies/${window.lobbyCode}/players/player${currentPlayer}/name`).then((opponentName) => {
      document.getElementById("status").innerText = `It's not your turn! ${opponentName || `Player ${currentPlayer}`} is playing.`;
    });
    return false;
  }
  return true;
}
