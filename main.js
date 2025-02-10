import "./theme.js";
import { startGame } from "./gameSetup.js";
import { rollDice, skipTurn, handleReroll, declareOtherPlayerWinner, clearPreview, rotate } from "./gameLogic.js";
import { sendMessage } from "./chat.js";


window.startGame = startGame;
window.rollDice = rollDice;
window.skipTurn = skipTurn;
window.handleReroll = handleReroll;
window.declareOtherPlayerWinner = declareOtherPlayerWinner;
window.sendMessage = sendMessage;

//to rotate using r
document.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    // Import the module and update the rotation.
    import("./gameLogic.js").then((module) => {
      module.rotate();
    });
  }
});
