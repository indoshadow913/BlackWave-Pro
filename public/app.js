
// ── Elements ──────────────────────────────────────────────────────────────────
const homeScreen    = document.getElementById("home-screen");
const browserChrome = document.getElementById("browser-chrome");
const proxyForm     = document.getElementById("proxy-form");
const proxyInput    = document.getElementById("proxy-input");
const navInput      = document.getElementById("nav-input");
const frameContainer = document.getElementById("frame-container");

const btnHome       = document.getElementById("btn-home");
const btnBack       = document.getElementById("btn-back");
const btnForward    = document.getElementById("btn-forward");
const btnReload     = document.getElementById("btn-reload");
const btnFullscreen = document.getElementById("btn-fullscreen");

// ── State ──────────────────────────────────────────────────────────────────────
let activeFrame = null;

// ── Helpers ────────────────────────────────────────────────────────────────────
function showBrowser() {
  homeScreen.style.display = "none";
  browserChrome.style.display = "flex";
}

function showHome() {
  browserChrome.style.display = "none";
  homeScreen.style.display = "flex";
  // Clean up frame
  if (activeFrame) {
    activeFrame.remove();
    activeFrame = null;
  }
  frameContainer.innerHTML = "";
}

function normalizeUrl(input) {
  // Si ya es una URL completa, devolverla tal cual
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }
  
  // Si parece un dominio (tiene un punto y sin espacios), agregar https://
  if (input.includes(".") && !input.includes(" ")) {
    return "https://" + input;
  }
  
  // Si no, tratarlo como búsqueda en Google
  return "https://www.google.com/search?q=" + encodeURIComponent(input);
}

function navigate(rawUrl) {
  const url = normalizeUrl(rawUrl);
  
  // Mostrar navegador
  showBrowser();
  navInput.value = url;

  // Crear o reutilizar frame
  if (!activeFrame) {
    activeFrame = document.createElement("iframe");
    activeFrame.style.width  = "100%";
    activeFrame.style.height = "100%";
    activeFrame.style.border = "none";
    frameContainer.appendChild(activeFrame);
  }

  // Usar parámetro de query en lugar de ruta
  const proxyUrl = `/proxy?url=${encodeURIComponent(url)}`;
  
  console.log("Navigating to:", proxyUrl);
  activeFrame.src = proxyUrl;
}

// ── Event listeners ────────────────────────────────────────────────────────────
proxyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = proxyInput.value.trim();
  if (val) navigate(val);
});

// Navegar desde la barra de navegación del navegador
navInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const val = navInput.value.trim();
    if (val) navigate(val);
  }
});

document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const url = btn.dataset.url;
    if (url) navigate(url);
  });
});

btnHome.addEventListener("click", showHome);

// Botón de pánico
document.addEventListener("keydown", (e) => {
  if (e.key === "=") {
    navigate("https://classroom.google.com");
  }
});

// Botones de navegación
btnBack.addEventListener("click", () => {
  if (activeFrame) activeFrame.contentWindow.history.back();
});

btnForward.addEventListener("click", () => {
  if (activeFrame) activeFrame.contentWindow.history.forward();
});

btnReload.addEventListener("click", () => {
  if (activeFrame) activeFrame.contentWindow.location.reload();
});

btnFullscreen.addEventListener("click", () => {
  if (activeFrame) activeFrame.requestFullscreen();
});

// Cambiar tema
document.getElementById("theme-toggle")?.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");
});
