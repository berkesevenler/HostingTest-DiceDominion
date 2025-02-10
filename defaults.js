document.addEventListener("DOMContentLoaded", () => {
    // Randomize player color when the site loads.
    const colorInput = document.getElementById("playerColor");
    if (colorInput) {
      colorInput.value = getRandomColor();
    }
  
    // Generate a random placeholder name (and optionally assign it as the value).
    const nameInput = document.getElementById("playerName");
    if (nameInput) {
      const randomName = generateRandomName();
      nameInput.placeholder = randomName;
      // Optionally set the input's value as well:
      nameInput.value = randomName;
    }
  });
  
  /**
   * Returns a random hex color string (e.g., "#A3F4C1").
   */
  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  
  /**
   * Returns a randomly generated name by combining one adjective with one noun.
   * The arrays below contain 10 adjectives and 10 nouns each, chosen for a lighthearted feel.
   */
  function generateRandomName() {
    const adjectives = [
      "Cheerful",
      "Silly",
      "Brave",
      "Jolly",
      "Wacky",
      "Zany",
      "Bubbly",
      "Mighty",
      "Cuddly",
      "Spunky"
    ];
    const nouns = [
      "Shark",
      "Penguin",
      "Ninja",
      "Dragon",
      "Unicorn",
      "Robot",
      "Pirate",
      "Wizard",
      "Monkey",
      "Goblin"
    ];
  
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return adjective + noun;
  }