import { writeData, readData, listenToChanges, isLobbyActive } from "./networking.js";



//this function displays a list of available public game lobbies that players can join.
export function displayPublicLobbies() {
  //first get the HTML element where the lobbies will be displayed
  const lobbiesDiv = document.getElementById("publicLobbiesList");
  
  //listens to the changes in the lobby data
  listenToChanges('lobbies', (lobbies) => {
    lobbiesDiv.innerHTML = '';

    //if no lobbies exist:
    if (!lobbies) {
      lobbiesDiv.innerHTML = '<p>No public lobbies available</p>';
      return;
    }

    //converts to array and sorts by player count
    const lobbiesArray = Object.entries(lobbies)
      //filter to only shows public lobbies
      .filter(([_, data]) => data.public)
      //shows lobby code and player count next to Lobby
      .map(([code, data]) => ({
        code,
        playerCount: data.players ? Object.keys(data.players).length : 0
      }))
      //sorts the lobby list according to fullness/emptieness. empty lobbies are on top
      .sort((a, b) => a.playerCount - b.playerCount);


    //displays sorted lobbies by creating HTML element for each lobby
    lobbiesArray.forEach(({code, playerCount}) => {
      //create a div for each lobby
      const lobbyElement = document.createElement('div');
      lobbyElement.className = 'public-lobby-item';
      const isLobbyFull = playerCount >= 2;
      
      //adds lobby information(code, player count) and a join button next to the lobby
      //if lobby is full button=disabled and the join button transfroms to Full and is unclickable
      lobbyElement.innerHTML = `
        <span>Lobby: ${code} (${playerCount}/2 players)</span>
        <button onclick="window.joinPublicLobby('${code}')" 
                ${isLobbyFull ? 'disabled' : ''}>
          ${isLobbyFull ? 'Full' : 'Join'}
        </button>
      `;
      lobbiesDiv.appendChild(lobbyElement);
    });
  });
}





//this function is responsible for creating a new lobby in the database(firebase).
export function handlePublicLobby(lobbyCode, boardSize) {
  //checks if the "Public Lobby" checkbox is checked in the HTML
  const isPublic = document.getElementById("isPublicLobby").checked;
 //writes new lobby data to the database. path 'lobbies/[lobbyCode]'
  writeData(`lobbies/${lobbyCode}`, {
    boardSize: boardSize,
    createdAt: Date.now(),
    players: [],
    public: isPublic
  });
}




//this function adds the player ids to the lobby's list of players in the database
export function updatePublicLobbyPlayers(lobbyCode, playerId) {
  readData(`lobbies/${lobbyCode}`).then((lobby) => {
    if (lobby) {
      const updatedPlayers = lobby.players ? [...lobby.players, playerId] : [playerId];
      writeData(`lobbies/${lobbyCode}/players`, updatedPlayers);
    }
  });
}




//to delete the lobby from the database. (small but really important function)
export function cleanupPublicLobby(lobbyCode) {
  writeData(`lobbies/${lobbyCode}`, null);
}




//this function is called when a player clicks the "Join" button on a lobby in the public lobby list
export function joinPublicLobby(code) {
  // Sets the lobby code input field's value to the selected lobby's code
  document.getElementById("lobbyCodeInput").value = code;
  //starts the game (true) because player 2 has joined.
  window.startGame(true);
}


//to let html access joinPublicLobby function
window.joinPublicLobby = joinPublicLobby;




//wait for the webpage to fully load before displaying public lobbies
document.addEventListener('DOMContentLoaded', () => {
  displayPublicLobbies();
});



//another version of displayPublicLobbies(). NEEDS REFACTORING (WIP) (maybe not needed)
export function updatePublicLobbiesList() {
  //create a reference to 'lobbies' location in firebase
  const lobbiesRef = database.ref('lobbies');

  //listen for changes to lobby data
  lobbiesRef.on('value', (snapshot) => {
    //get current lobby data
    const lobbies = snapshot.val();
    //get html element where public lobbies are displayed
    const lobbiesList = document.getElementById('publicLobbiesList');
    //clear current list to start fresh
    lobbiesList.innerHTML = '';


    if (lobbies) {
      //write each lobby in firebase
      Object.entries(lobbies).forEach(([code, data]) => {
        //show lobbies that are public and player1 is still in lobby
        if (data && data.public && data.players?.player1?.online === true) {
          //create div for lobby
          const lobbyElement = document.createElement('div');
          //if player 2 is int he lobby menaing lobby is full, "Full" will be writtennext to lobby, otherweise "Available"
          lobbyElement.textContent = `Lobby ${code} - ${data.players.player2 ? 'Full' : 'Available'}`;
          
          //if player 2 hasnt joined the lobby, add a join button next to lobby
          if (!data.players.player2) {
            const joinButton = document.createElement('button');
            joinButton.textContent = 'Join';
            joinButton.onclick = () => {
              //check if lobby is still active
              isLobbyActive(code).then(active => {
                if (active) {
                  //set lobby code and start game
                  document.getElementById('lobbyCodeInput').value = code;
                  startGame(true);
                } else {
                  //if lobby isnt active = show error message
                  alert("This lobby is no longer available.");
                  location.reload();
                }
              });
            };
            lobbyElement.appendChild(joinButton);
          }
          lobbiesList.appendChild(lobbyElement);
        }
      });
    }
  });
}
