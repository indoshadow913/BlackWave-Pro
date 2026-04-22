"use strict";

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

  // Codificar URL para proxy
  const encodedUrl = encodeURIComponent(url);
  const proxyUrl = `/proxy/${encodedUrl}`;
  
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

btnBack.addEventListener("click", () => {
  if (activeFrame) {
    try { activeFrame.contentWindow.history.back(); } catch (_) {}
  }
});

btnForward.addEventListener("click", () => {
  if (activeFrame) {
    try { activeFrame.contentWindow.history.forward(); } catch (_) {}
  }
});

btnReload.addEventListener("click", () => {
  if (activeFrame) {
    try { activeFrame.contentWindow.location.reload(); } catch (_) {}
  }
});

btnFullscreen.addEventListener("click", () => {
  const el = frameContainer;
  if (!document.fullscreenElement) {
    el.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// ── Panic Button ──────────────────────────────────────────────────────────────
const panicBtn = document.getElementById("panic-btn");
const themeToggle = document.getElementById("theme-toggle");

// Panic button - navigate to Google Classroom
function triggerPanic() {
  window.location.href = "https://classroom.google.com";
}

panicBtn.addEventListener("click", triggerPanic);

// Keyboard shortcut for panic button (= key) - works globally
window.addEventListener("keydown", (e) => {
  if (e.key === "=" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    triggerPanic();
  }
}, true);

// ── Theme Toggle ──────────────────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  
  if (isDark) {
    html.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    themeToggle.textContent = "🌙";
  } else {
    html.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    themeToggle.textContent = "☀️";
  }
}

// Load saved theme preference
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
  themeToggle.textContent = "☀️";
} else {
  themeToggle.textContent = "🌙";
}

themeToggle.addEventListener("click", toggleTheme);
