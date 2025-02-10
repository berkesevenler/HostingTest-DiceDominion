export let boardSize = 10;
export let board = []; // this will be initialized later

export function setBoardSize(newSize) {
  console.log("board size changed to "+newSize);
    boardSize = newSize;
  }
  export function getBoardSize() {
    return boardSize;
  }
/**
 * Creates the game board grid.
 * Accepts an object with callbacks for cell events.
 */
export function createBoard({ onCellMouseOver, onCellMouseOut, onCellClick }) {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";
  boardDiv.style.gridTemplateColumns = `repeat(${boardSize}, 40px)`;
  boardDiv.style.gridTemplateRows = `repeat(${boardSize}, 40px)`;
  boardDiv.style.width = `${boardSize * 40}px`;
  boardDiv.style.height = `${boardSize * 40}px`;
  boardDiv.style.margin = "auto";
  boardDiv.style.position = "relative";

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = row;
      cell.dataset.col = col;
      if (onCellMouseOver) cell.addEventListener("mouseover", onCellMouseOver);
      if (onCellMouseOut) cell.addEventListener("mouseout", onCellMouseOut);
      if (onCellClick) cell.addEventListener("click", onCellClick);
      boardDiv.appendChild(cell);
    }
  }
}

/**
 * Updates the color class of the cell (to reflect a claimed block).
 */
export function updateGridCell(row, col, playerCode) {
  const cellElement = document.querySelector(
    `[data-row="${row}"][data-col="${col}"]`
  );
  if (cellElement) {
    cellElement.classList.add(`player${playerCode}`);
  }
}
