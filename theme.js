export function toggleTheme() {
    const body = document.body;
    const isDarkMode = body.classList.toggle("dark-mode");
  
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    console.log("Theme toggled. Dark mode:", isDarkMode);
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    console.log("Loaded theme:", savedTheme);
    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
    }
    const toggleBtn = document.getElementById("toggleTheme");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", toggleTheme);
    }
  });