import { lobbyCode } from "./gameSetup.js";
import { listenToChanges } from "./networking.js";

/**
 * Initializes the chat system for the given lobby.
 */
export function initializeChat() {
  const messageInput = document.getElementById("messageInput");
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
  console.log("initializing chat for lobby code "+lobbyCode);
  listenToChanges(`lobbies/${lobbyCode}/chat`, (messages) => {
    if (!messages) return;
    const chatMessages = document.getElementById("chatMessages");
    chatMessages.innerHTML = "";
    // Convert the messages object to an array and sort by timestamp
    const messageArray = Object.entries(messages)
      .map(([key, msg]) => ({ ...msg, key }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (messageArray.length > 20) {
      // Delete older messages beyond the 20 most recent
      const messagesToDelete = messageArray.slice(0, messageArray.length - 20);
      messagesToDelete.forEach((msg) => {
        firebase.database().ref(`lobbies/${lobbyCode}/chat/${msg.key}`).remove();
      });
      messageArray.slice(-20).forEach((msg) => {
        const messageDiv = document.createElement("div");
        messageDiv.className = `chat-message player${msg.player}`;
        messageDiv.textContent = msg.text;
        chatMessages.appendChild(messageDiv);
      });
    } else {
      messageArray.forEach((msg) => {
        const messageDiv = document.createElement("div");
        messageDiv.className = `chat-message player${msg.player}`;
        messageDiv.textContent = `${msg.name}: ${msg.text}`;
        chatMessages.appendChild(messageDiv);
      });
    }
    //scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

/**
 * Sends a chat message.
 */
export function sendMessage() {
  const messageInput = document.getElementById("messageInput");
  const message = messageInput.value.trim();
  const playerName = document.getElementById("playerName").value;

  if (message) {
    const chatRef = firebase.database().ref(`lobbies/${window.lobbyCode}/chat`).push();
    chatRef.set({
      player: window.myPlayerCode,
      name: playerName,
      text: message,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    });
    messageInput.value = "";
  }
}
