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
  
  connection.getTransport().then(() => {
    console.log("[BlackWave] BareMux transport initialized");
  }).catch(err => {
    console.warn("[BlackWave] BareMux transport initialization warning:", err);
  });
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
  
  let retries = 3;
  while (retries > 0) {
    try {
      const currentTransport = await connection.getTransport();
      if (currentTransport !== "libcurl") {
        console.log("[BlackWave] Setting transport to libcurl...");
        await connection.setTransport("libcurl", [{ websocket: wispUrl }]);
      }
      console.log("[BlackWave] Transport ready");
      return;
    } catch (err) {
      retries--;
      console.warn(`[BlackWave] Transport attempt failed, retries left: ${retries}`, err);
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  throw new Error("Transport setup failed after retries");
}

// Simple URL processing function
function processUrl(rawUrl) {
  // Prevent self-proxying
  if (rawUrl.includes(location.hostname)) {
    console.warn("[BlackWave] Blocked self-proxy attempt:", rawUrl);
    return null;
  }
  
  // If it looks like a URL, normalize it
  if (rawUrl.includes("://") || rawUrl.startsWith("http")) {
    return rawUrl;
  }
  
  // If it's a domain-like string, add https://
  if (rawUrl.includes(".") && !rawUrl.includes(" ")) {
    return "https://" + rawUrl;
  }
  
  // Otherwise treat as search query
  return "https://www.google.com/search?q=" + encodeURIComponent(rawUrl);
}

async function navigate(rawUrl) {
  console.log("[BlackWave] Navigate called with:", rawUrl);
  hideError();

  if (!scramjet) {
    showError("Proxy not initialized", "Scramjet failed to load");
    return;
  }

  const url = processUrl(rawUrl);
  if (!url) {
    showError("Invalid URL", "Cannot proxy to the same domain");
    return;
  }
  console.log("[BlackWave] Processed URL:", url);

  try {
    await ensureTransport();
  } catch (err) {
    const errorMsg = err.toString();
    if (errorMsg.includes("wasm")) {
      showError("Proxy engine loading...", "The proxy is initializing. Please wait a moment and try again.");
    } else if (errorMsg.includes("transport")) {
      showError("Connection error", "Unable to establish proxy connection. Check your internet.");
    } else {
      showError("Transport setup failed.", errorMsg);
    }
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
    
    navButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    categories.forEach(cat => {
      const catName = cat.getAttribute("data-category");
      cat.style.display = catName === categoryName ? "block" : "none";
    });
  });
});

// ── CARD CLICK HANDLER ────────────────────────────────────────────────────────
const cards = document.querySelectorAll(".card");
console.log(`[BlackWave] Found ${cards.length} cards`);

cards.forEach((card, index) => {
  card.addEventListener("click", () => {
    const url = card.getAttribute("data-url");
    console.log(`[BlackWave] Card ${index} clicked:`, url);
    if (url) {
      navigate(url);
    }
  });
});

console.log("[BlackWave] Initialization complete");
