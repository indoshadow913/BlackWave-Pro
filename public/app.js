"use strict";

console.log("[BlackWave] Initializing...");

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

// Verificar que todos los elementos existen
const requiredElements = {
  homeScreen, browserChrome, proxyForm, proxyInput, navForm, navInput,
  frameContainer, errorArea, errorMsg, errorCode,
  btnHome, btnBack, btnForward, btnReload, btnFullscreen
};

for (const [name, el] of Object.entries(requiredElements)) {
  if (!el) console.error(`[BlackWave] Missing element: ${name}`);
}

// ── Scramjet setup ─────────────────────────────────────────────────────────────
let scramjet = null;
let connection = null;

try {
  const { ScramjetController } = $scramjetLoadController();
  scramjet = new ScramjetController({
    files: {
      wasm: "/scram/scramjet.wasm.wasm",
      all:  "/scram/scramjet.all.js",
      sync: "/scram/scramjet.sync.js",
    },
  });
  scramjet.init("/scram/scramjet.config.js");
  console.log("[BlackWave] Scramjet initialized");
} catch (err) {
  console.error("[BlackWave] Scramjet initialization failed:", err);
}

try {
  connection = new BareMux.BareMuxConnection("/baremux/worker.js");
  console.log("[BlackWave] BareMux connection created");
} catch (err) {
  console.error("[BlackWave] BareMux initialization failed:", err);
}

// ── State ──────────────────────────────────────────────────────────────────────
let activeFrame = null;

// ── Helpers ────────────────────────────────────────────────────────────────────
function showError(msg, detail) {
  if (errorArea) {
    errorArea.style.display = "block";
    if (errorMsg) errorMsg.textContent = msg;
    if (errorCode) errorCode.textContent = detail || "";
  }
  console.error(`[BlackWave] Error: ${msg}`, detail);
}

function hideError() {
  if (errorArea) errorArea.style.display = "none";
}

function showBrowser() {
  if (homeScreen) homeScreen.style.display = "none";
  if (browserChrome) browserChrome.style.display = "flex";
  console.log("[BlackWave] Browser shown");
}

function showHome() {
  if (browserChrome) browserChrome.style.display = "none";
  if (homeScreen) homeScreen.style.display = "flex";
  // Clean up frame
  if (activeFrame) {
    try {
      activeFrame.frame.remove();
    } catch (_) {}
    activeFrame = null;
  }
  if (frameContainer) frameContainer.innerHTML = "";
  console.log("[BlackWave] Home shown");
}

async function ensureTransport() {
  if (!connection) {
    throw new Error("BareMux connection not initialized");
  }
  
  const wispUrl =
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/";
  
  console.log("[BlackWave] Wisp URL:", wispUrl);
  
  if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
    console.log("[BlackWave] Setting transport...");
    await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
  }
  console.log("[BlackWave] Transport ready");
}

async function navigate(rawUrl) {
  console.log("[BlackWave] Navigate called with:", rawUrl);
  hideError();

  if (!scramjet) {
    showError("Proxy not initialized", "Scramjet failed to load");
    return;
  }

  // Esperar a que search() esté disponible
  let searchFn = window.search;
  if (typeof searchFn !== 'function') {
    console.warn("[BlackWave] search() not available yet, waiting...");
    // Esperar hasta 2 segundos para que search.js se cargue
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      searchFn = window.search;
      if (typeof searchFn === 'function') break;
    }
  }

  if (typeof searchFn !== 'function') {
    console.error("[BlackWave] search() function still not available");
    showError("Search function not available", "search.js may not be loaded");
    return;
  }

  const url = searchFn(rawUrl, "https://www.google.com/search?q=%s");
  console.log("[BlackWave] Processed URL:", url);

  try {
    await ensureTransport();
  } catch (err) {
    showError("Transport setup failed.", err.toString());
    console.error("[BlackWave] Transport error:", err);
    return;
  }

  // Show browser chrome
  showBrowser();
  if (navInput) navInput.value = url;

  // Create or reuse frame
  if (!activeFrame) {
    console.log("[BlackWave] Creating frame...");
    activeFrame = scramjet.createFrame();
    activeFrame.frame.style.width  = "100%";
    activeFrame.frame.style.height = "100%";
    activeFrame.frame.style.border = "none";
    if (frameContainer) frameContainer.appendChild(activeFrame.frame);
  }

  console.log("[BlackWave] Navigating to:", url);
  activeFrame.go(url);
}

// ── Event listeners ────────────────────────────────────────────────────────────
if (proxyForm) {
  proxyForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = proxyInput?.value.trim();
    console.log("[BlackWave] Proxy form submitted with:", val);
    if (val) {
      navigate(val);
    }
  });
}

if (navForm) {
  navForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = navInput?.value.trim();
    console.log("[BlackWave] Nav form submitted with:", val);
    if (val) navigate(val);
  });
}

document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const url = btn.dataset.url;
    console.log("[BlackWave] Quick button clicked:", url);
    if (url) navigate(url);
  });
});

if (btnHome) {
  btnHome.addEventListener("click", showHome);
}

if (btnBack) {
  btnBack.addEventListener("click", () => {
    if (activeFrame) {
      try { activeFrame.frame.contentWindow.history.back(); } catch (_) {}
    }
  });
}

if (btnForward) {
  btnForward.addEventListener("click", () => {
    if (activeFrame) {
      try { activeFrame.frame.contentWindow.history.forward(); } catch (_) {}
    }
  });
}

if (btnReload) {
  btnReload.addEventListener("click", () => {
    if (activeFrame) {
      try { activeFrame.frame.contentWindow.location.reload(); } catch (_) {}
    }
  });
}

if (btnFullscreen) {
  btnFullscreen.addEventListener("click", () => {
    const el = frameContainer;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });
}

// Update nav bar URL when frame navigates
if (frameContainer) {
  frameContainer.addEventListener("load", (e) => {
    if (e.target && e.target.tagName === "IFRAME") {
      try {
        const loc = e.target.contentWindow.location.href;
        if (loc && loc !== "about:blank" && navInput) navInput.value = loc;
      } catch (_) {}
    }
  }, true);
}

// ── Panic Button ──────────────────────────────────────────────────────────────
const panicBtn = document.getElementById("panic-btn");
const themeToggle = document.getElementById("theme-toggle");

function triggerPanic() {
  console.log("[BlackWave] Panic button triggered");
  window.location.href = "https://classroom.google.com";
}

if (panicBtn) {
  panicBtn.addEventListener("click", triggerPanic);
}

// Keyboard shortcut for panic button (= key)
// Works from anywhere, including inside inputs and iframes
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
    if (themeToggle) themeToggle.textContent = "🌙";
  } else {
    html.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    if (themeToggle) themeToggle.textContent = "☀️";
  }
}

// Load saved theme preference
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
  if (themeToggle) themeToggle.textContent = "☀️";
} else {
  if (themeToggle) themeToggle.textContent = "🌙";
}

if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

// ── CATEGORY NAVIGATION ────────────────────────────────────────────────────────
const navButtons = document.querySelectorAll(".nav-btn");
const categories = document.querySelectorAll(".category");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const categoryName = btn.getAttribute("data-category");
    console.log("[BlackWave] Category clicked:", categoryName);
    
    // Update active button
    navButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    // Show/hide categories
    categories.forEach(cat => {
      const catName = cat.getAttribute("data-category");
      cat.style.display = catName === categoryName ? "block" : "none";
    });
  });
});

// ── CARD CLICK HANDLER ────────────────────────────────────────────────────────
const cards = document.querySelectorAll(".card");
cards.forEach(card => {
  card.addEventListener("click", () => {
    const url = card.getAttribute("data-url");
    console.log("[BlackWave] Card clicked:", url);
    if (url) {
      navigate(url);
    }
  });
});

console.log("[BlackWave] Initialization complete");
