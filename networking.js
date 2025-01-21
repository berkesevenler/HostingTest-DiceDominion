export const database = firebase.database();
export const auth = firebase.auth();

function authenticateUser() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log(`User signed in: ${user.email}`);
    } else {
      console.log("No user signed in. Redirecting to login...");
      auth
        .signInAnonymously()
        .then(() => {
          console.log("Signed in anonymously");
        })
        .catch((error) => {
          console.error("Error during anonymous sign-in:", error);
        });
    }
  });
}

function initializeDatabaseFeatures() {
  initializeGameState(lobbyCode);

  listenToChanges(`lobbies/${lobbyCode}`, (data) => {
    console.log("Game state updated:", data);
    updateGameDisplay(data);
  });
}

/**
 * function to write data
 * @param {string} path - path in database to write to
 * @param {object} data - data to write
 * @returns {Promise} 
 */
export function writeData(path, data) {
  return database
    .ref(path)
    .set(data)
    .then(() => {
      console.log(`Data written successfully to ${path}`);
    })
    .catch((error) => {
      console.error(`Failed to write data to ${path}:`, error);
      throw error; 
    });
}

/**
 * function to listen to changes
 * @param {string} path
 * @param {function} callback - callback funct when smt changes
 */
export function listenToChanges(path, callback) {
  database.ref(path).on("value", (snapshot) => {
    const data = snapshot.val();
    console.log(`Data changed at ${path}:`, data);
    if (callback) {
      callback(data);
    }
  });
}

/**
 * funct to read
 * @param {string} path 
 * @returns {Promise<object>}
 */
export function readData(path) {
  return database
    .ref(path)
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();
      console.log(`Data read from ${path}:`, data);
      return data;
    })
    .catch((error) => {
      console.error(`Failed to read data from ${path}:`, error);
    });
}

authenticateUser();

// END OF HELPER FUNCTIONS

const lobbyCode = "TESTLOBBY";
const boardSize = 20;


/**
 * init game state at the database
 * @param {string} lobbyCode 
 */
function initializeGameState(lobbyCode) {
  const initialState = {
    board: Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(0)), // this fills the map with 0
    turnStatus: 0, // 0 means game not started
    players: {}, //to track players
  };

  database
    .ref(`lobbies/${lobbyCode}`)
    .set(initialState)
    .then(() => {
      console.log(`Game initialized for lobby: ${lobbyCode}`);
    })
    .catch((error) => {
      console.error("Failed to initialize game:", error);
    });
}

//idk if we will use this but let's see
function makeMove(lobbyCode, x, y, player) {
  const path = `lobbies/${lobbyCode}`;
  database.ref(path).transaction((gameState) => {
    if (gameState) {
      if (
        gameState.board[x][y] === 0 && 
        gameState.turnStatus === player
      ) {
        gameState.board[x][y] = player;

        gameState.turnStatus = player === 1 ? 2 : 1;
      } else {
        console.log("Invalid move or not your turn");
      }
    }
    return gameState;
  });
}


function updateGameDisplay(gameState) {
  const displayElement = document.getElementById("data");
  displayElement.innerText = JSON.stringify(gameState, null, 2);

  //ui code might go here
}

//start and set initial turn
function startGame(lobbyCode) {
  const path = `lobbies/${lobbyCode}/turnStatus`;
  database
    .ref(path)
    .set(1)
    .then(() => {
      console.log("Game started");
    })
    .catch((error) => {
      console.error("Failed to start the game:", error);
    });
}

function joinGame(lobbyCode, player) {
  const path = `lobbies/${lobbyCode}/players/player${player}`;
  auth.currentUser
    .getIdToken()
    .then((token) => {
      return database.ref(path).set({
        uid: auth.currentUser.uid,
        token,
      });
    })
    .then(() => {
      console.log(`Player ${player} joined the game`);
    })
    .catch((error) => {
      console.error("Failed to join game:", error);
    });
}

//this function manages the presence of player 1 & 2 in a lobby
//this fucntion is needed for tracking how many players are in a lobby in order to disconnect lobbies from  game-menu/database
export function setupPresenceMonitoring(lobbyCode, playerNumber) {
  const userStatusPath = `lobbies/${lobbyCode}/players/player${playerNumber}/online`;
  const userStatusDatabaseRef = database.ref(userStatusPath);
  const presenceRef = database.ref('.info/connected');
  
  //listen to chnages in connection
  presenceRef.on('value', (snapshot) => {
    //if player is not connected, exit the function
    if (snapshot.val() === false) return;

    //callback to remove the user's online status when they disconnect 
    userStatusDatabaseRef.onDisconnect().remove();
    userStatusDatabaseRef.set(true);

    //if player 1 is connected and they leave, remove lobby from database
    if (playerNumber === 1) {
      database.ref(`lobbies/${lobbyCode}`).onDisconnect().remove();
    }
  });

  //if player 2 is connected
  if (playerNumber === 2) {
    const player1StatusRef = database.ref(`lobbies/${lobbyCode}/players/player1/online`);
    
    //listen for changes from player1 (host)
    player1StatusRef.on('value', (snapshot) => {
      //if the status for player1 doesnt exist it means they left or disconnected
      if (!snapshot.exists() || snapshot.val() === null) {
        alert("The host has left the game. Returning to main menu...");
        location.reload();
      }
    });
  }
}



//this function checks wether a specific lobby is active according to player1 (host)
export function isLobbyActive(lobbyCode) {
  return database.ref(`lobbies/${lobbyCode}`)
    .once('value')
    .then(snapshot => {
      const lobby = snapshot.val();
      //check if lobby exist, has both player 1 & 2, and if player1 (host) is in the game
      return lobby && lobby.players && lobby.players.player1 && lobby.players.player1.online === true;
    });
}
