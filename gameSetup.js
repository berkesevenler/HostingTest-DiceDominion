import {
    writeData,
    readData,
    auth,
    isLobbyActive,
    listenToChanges,
  } from "./networking.js";
  import { handlePublicLobby } from "./lobbyManager.js";
  import { setupPresenceMonitoring } from "./networking.js";
  import { createBoard, getBoardSize } from "./board.js";
  import { initializeChat } from "./chat.js";
  import { setBoardSize } from "./board.js";
  
 
  export let lobbyCode = "TESTLOBBY";
  export let myPlayerCode = 0;
  
  /**
   * Generates a random six‐character lobby code.
   */
  export function generateLobbyCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
    return code;
  }
  
  /**
   * Called when starting the game.
   * If join === true, a lobby code is read from the input.
   * Otherwise a new lobby is created.
   */
  export function startGame(join) {
    if (join) {
      console.log("Joining game...");
      window.myPlayerCode =2;
      // Joining an existing game
      lobbyCode = document.getElementById("lobbyCodeInput").value;
      isLobbyActive(lobbyCode).then((active) => {
        if (!active) {
          alert("This lobby is no longer available!");
          location.reload();
          return;
        }
        initializeGame(join);
      });
    } 
    else {
      // Creating a new game/lobby
      console.log("Creating game...");
      window.myPlayerCode = 1;
      lobbyCode = generateLobbyCode();
      window.lobbyCode = lobbyCode;
      
      
      const sizeInput = document.getElementById("boardSizeInput").value;
      const parsedSize = parseInt(sizeInput, 10) || 10; 
      setBoardSize(parsedSize);
      window.boardSize = parsedSize;
      
      handlePublicLobby(lobbyCode, parsedSize); 
      initializeGame(join); 
    }
  }
  
  /**
   * Sets up the UI and player data in Firebase.
   */
  export function initializeGame(join) {
    // Hide the menu and show the game container.
    document.getElementById("menu").style.display = "none";
    const container = document.getElementById("container");
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.alignItems = "flex-start";
    container.style.flexDirection = "column";
    container.style.width = "100%";
    container.style.paddingTop = "50px";
    document.getElementById("lobbyCodeDisplay").innerText = `Lobby Code: ${lobbyCode}`;

    readData(`lobbies/${lobbyCode}/players`).then((players) => {
        if (!players || !players.player1) {
            // Set up Player 1.
            myPlayerCode = 1;
            const player1ChosenColor = document.getElementById("playerColor").value;
            const player1ChosenName = document.getElementById("playerName").value;
            writeData(`lobbies/${lobbyCode}/players/player1`, {
                uid: auth.currentUser.uid,
                name: player1ChosenName,
                color: player1ChosenColor,
            }).then(() => {
                setupPresenceMonitoring(lobbyCode, 1);
            });
            document.documentElement.style.setProperty("--player1-color", player1ChosenColor);
            listenToChanges(`lobbies/${lobbyCode}/players/player2/color`, (data) => {
                document.documentElement.style.setProperty("--player2-color", data);
            });

            // Initialize board data.
            const boardSize = getBoardSize(); // Get the board size from the input or default
            writeData(`lobbies/${lobbyCode}/boardSize`, boardSize).then(() => {
                window.boardSize = boardSize; // Set the board size for Player 1
                window.board = Array.from({ length: boardSize }, () =>
                    Array(boardSize).fill(null)
                );

                // Create the board and attach cell event handlers (defined in gameLogic.js).
                import("./gameLogic.js").then((module) => {
                    createBoard({
                        onCellMouseOver: module.previewBlock,
                        onCellMouseOut: module.clearPreview,
                        onCellClick: module.placeBlock,
                    });
                });
            });

            document.getElementById("status").innerText = `You are Player 1, ${player1ChosenName}!`;
        } else if (!players.player2) {
            // Set up Player 2.
            myPlayerCode = 2;
            const player2ChosenColor = document.getElementById("playerColor").value;
            const player2ChosenName = document.getElementById("playerName").value;
            writeData(`lobbies/${lobbyCode}/players/player2`, {
                uid: auth.currentUser.uid,
                name: player2ChosenName,
                color: player2ChosenColor,
            }).then(() => {
                setupPresenceMonitoring(lobbyCode, 2);
                window.lobbyCode=lobbyCode;
            });
            document.documentElement.style.setProperty("--player2-color", player2ChosenColor);
            readData(`lobbies/${lobbyCode}/players/player1/color`).then((data) => {
                document.documentElement.style.setProperty("--player1-color", data);
            });

            // Read the board size from the database and initialize the board.
            readData(`lobbies/${lobbyCode}/boardSize`).then((size) => {
                if (!size) {
                    console.error("Board size not found in the database!");
                    return;
                }
                window.boardSize = size; // Set the board size for Player 2
                setBoardSize(size);
                window.board = Array.from({ length: size }, () =>
                    Array(size).fill(null)
                );

                // Create the board and attach cell event handlers (defined in gameLogic.js).
                import("./gameLogic.js").then((module) => {
                    createBoard({
                        onCellMouseOver: module.previewBlock,
                        onCellMouseOut: module.clearPreview,
                        onCellClick: module.placeBlock,
                    });
                });
            });

            document.getElementById("status").innerText = `You are Player 2, ${player2ChosenName}!`;
        } else {
            alert("The lobby is already full!");
            location.reload();
            return;
        }

        // Setup turn status and game-over displays (defined in gameLogic.js).
        import("./gameLogic.js").then((module) => {
            module.displayTurnStatus(lobbyCode);
            module.displayGameOver(lobbyCode);
            writeData(`lobbies/${lobbyCode}/gameOver`, 0);
            if (myPlayerCode === 1) {
                writeData(`lobbies/${lobbyCode}/turnStatus`, 1);
            }
        });
    });

    // Show the chat UI and initialize it.
    document.getElementById("chatContainer").style.display = "block";
    initializeChat(lobbyCode);
}