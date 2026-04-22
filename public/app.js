"use strict";

// ── Elements ──────────────────────────────────────────────────────────────────
const homeScreen    = document.getElementById("home-screen");
const browserChrome = document.getElementById("browser-chrome");
const proxyForm     = document.getElementById("proxy-form");
const proxyInput    = document.getElementById("proxy-input");
const navForm       = document.getElementById("nav-form");
const navInput      = document.getElementById("nav-input");
const frameContainer = document.getElementById("frame-container");
const errorArea     = document.getElementById("error-area");
const errorMsg      = document.getElementById("error-msg");
const errorCode     = document.getElementById("error-code");

const btnHome       = document.getElementById("btn-home");
const btnBack       = document.getElementById("btn-back");
const btnForward    = document.getElementById("btn-forward");
const btnReload     = document.getElementById("btn-reload");
const btnFullscreen = document.getElementById("btn-fullscreen");

// ── Scramjet setup ─────────────────────────────────────────────────────────────
const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
  files: {
    wasm: "/scram/scramjet.wasm.wasm",
    all:  "/scram/scramjet.all.js",
    sync: "/scram/scramjet.sync.js",
  },
});
scramjet.init("/scram/scramjet.config.js");

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

// ── State ──────────────────────────────────────────────────────────────────────
let activeFrame = null;

// ── Helpers ────────────────────────────────────────────────────────────────────
function showError(msg, detail) {
  errorArea.style.display = "block";
  errorMsg.textContent = msg;
  errorCode.textContent = detail || "";
}

function hideError() {
  errorArea.style.display = "none";
}

function showBrowser() {
  homeScreen.style.display = "none";
  browserChrome.style.display = "flex";
}

function showHome() {
  browserChrome.style.display = "none";
  homeScreen.style.display = "flex";
  // Clean up frame
  if (activeFrame) {
    activeFrame.frame.remove();
    activeFrame = null;
  }
  frameContainer.innerHTML = "";
}

async function ensureTransport() {
  const wispUrl =
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/";
  if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
    await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
  }
}

async function navigate(rawUrl) {
  hideError();

  // Register service worker first
  try {
    await registerSW();
  } catch (err) {
    showError("Could not register service worker.", err.toString());
    return;
  }

  const url = search(rawUrl, "https://www.google.com/search?q=%s");

  try {
    await ensureTransport();
  } catch (err) {
    showError("Transport setup failed.", err.toString());
    return;
  }

  // Show browser chrome
  showBrowser();
  navInput.value = url;

  // Create or reuse frame
  if (!activeFrame) {
    activeFrame = scramjet.createFrame();
    activeFrame.frame.style.width  = "100%";
    activeFrame.frame.style.height = "100%";
    activeFrame.frame.style.border = "none";
    frameContainer.appendChild(activeFrame.frame);
  }

  activeFrame.go(url);
}

// ── Event listeners ────────────────────────────────────────────────────────────
proxyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = proxyInput.value.trim();
  if (val) navigate(val);
});

navForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = navInput.value.trim();
  if (val) navigate(val);
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
    try { activeFrame.frame.contentWindow.history.back(); } catch (_) {}
  }
});

btnForward.addEventListener("click", () => {
  if (activeFrame) {
    try { activeFrame.frame.contentWindow.history.forward(); } catch (_) {}
  }
});

btnReload.addEventListener("click", () => {
  if (activeFrame) {
    try { activeFrame.frame.contentWindow.location.reload(); } catch (_) {}
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

// Update nav bar URL when frame navigates
// Scramjet frames are iframes; we listen to load events
frameContainer.addEventListener("load", (e) => {
  if (e.target && e.target.tagName === "IFRAME") {
    try {
      const loc = e.target.contentWindow.location.href;
      if (loc && loc !== "about:blank") navInput.value = loc;
    } catch (_) {}
  }
}, true);


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

// Also intercept at document level
document.addEventListener("keydown", (e) => {
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
