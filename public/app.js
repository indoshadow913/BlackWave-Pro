console.log("[BlackWave] Starting initialization...");

// ── GLOBAL STATE ──────────────────────────────────────────────────────────────
let scramjet = null;
let connection = null;
let activeFrame = null;

// ── DOM ELEMENTS ──────────────────────────────────────────────────────────────
const homeScreen = document.getElementById("home-screen");
const browserChrome = document.getElementById("browser-chrome");
const proxyForm = document.getElementById("proxy-form");
const proxyInput = document.getElementById("proxy-input");
const navForm = document.getElementById("nav-form");
const navInput = document.getElementById("nav-input");
const frameContainer = document.getElementById("frame-container");
const errorArea = document.getElementById("error-area");
const errorMsg = document.getElementById("error-msg");
const errorCode = document.getElementById("error-code");

const btnHome = document.getElementById("btn-home");
const btnBack = document.getElementById("btn-back");
const btnForward = document.getElementById("btn-forward");
const btnReload = document.getElementById("btn-reload");
const btnFullscreen = document.getElementById("btn-fullscreen");

// ── HELPERS ───────────────────────────────────────────────────────────────────
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

// ── URL PROCESSING ────────────────────────────────────────────────────────────
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

// ── TRANSPORT SETUP ───────────────────────────────────────────────────────────
async function ensureTransport() {
  if (!connection) {
    throw new Error("BareMux connection not initialized");
  }

  const wispUrl = location.origin + "/bare/";
  console.log("[BlackWave] Wisp URL:", wispUrl);

  try {
    console.log("[BlackWave] Setting Epoxy transport...");
    await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    console.log("[BlackWave] Epoxy transport ready");
    return;
  } catch (err) {
    console.error("[BlackWave] Transport setup failed:", err);
    throw new Error("Failed to initialize proxy transport: " + err.message);
  }
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
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
    showError("Transport setup failed", err.message);
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
    activeFrame.frame.style.width = "100%";
    activeFrame.frame.style.height = "100%";
    activeFrame.frame.style.border = "none";
    if (frameContainer) frameContainer.appendChild(activeFrame.frame);
  }

  console.log("[BlackWave] Navigating to:", url);
  activeFrame.go(url);
}

// ── UI SETUP ──────────────────────────────────────────────────────────────────
function setupUI() {
  // Proxy form
  if (proxyForm) {
    proxyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = proxyInput?.value.trim();
      if (val) navigate(val);
    });
  }

  // Nav form
  if (navForm) {
    navForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = navInput?.value.trim();
      if (val) navigate(val);
    });
  }

  // Home button
  if (btnHome) {
    btnHome.addEventListener("click", () => {
      console.log("[BlackWave] Home button clicked");
      showHome();
    });
  }

  // Back button
  if (btnBack) {
    btnBack.addEventListener("click", () => {
      if (activeFrame) {
        console.log("[BlackWave] Back button clicked");
        activeFrame.back();
      }
    });
  }

  // Forward button
  if (btnForward) {
    btnForward.addEventListener("click", () => {
      if (activeFrame) {
        console.log("[BlackWave] Forward button clicked");
        activeFrame.forward();
      }
    });
  }

  // Reload button
  if (btnReload) {
    btnReload.addEventListener("click", () => {
      if (activeFrame) {
        console.log("[BlackWave] Reload button clicked");
        activeFrame.reload();
      }
    });
  }

  // Fullscreen button
  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", () => {
      if (activeFrame && frameContainer) {
        console.log("[BlackWave] Fullscreen button clicked");
        if (!document.fullscreenElement) {
          frameContainer.requestFullscreen().catch((err) => {
            console.error("[BlackWave] Fullscreen request failed:", err);
          });
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    });
  }

  // Panic button
  const panicBtn = document.getElementById("panic-btn");
  if (panicBtn) {
    panicBtn.addEventListener("click", () => {
      console.log("[BlackWave] Panic button triggered");
      window.location.href = "https://classroom.google.com";
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "=" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.location.href = "https://classroom.google.com";
    }
  }, true);

  // Theme toggle
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
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

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      themeToggle.textContent = "☀️";
    } else {
      themeToggle.textContent = "🌙";
    }

    themeToggle.addEventListener("click", toggleTheme);
  }

  // Category navigation
  const navButtons = document.querySelectorAll(".nav-btn");
  const categories = document.querySelectorAll(".category");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const categoryName = btn.getAttribute("data-category");
      console.log("[BlackWave] Category clicked:", categoryName);

      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      categories.forEach((cat) => {
        const catName = cat.getAttribute("data-category");
        cat.style.display = catName === categoryName ? "block" : "none";
      });
    });
  });

  // Card click handler
  const cards = document.querySelectorAll(".card");
  console.log(`[BlackWave] Found ${cards.length} cards`);

  cards.forEach((card, index) => {
    card.addEventListener("click", () => {
      const url = card.getAttribute("data-url");
      console.log(`[BlackWave] Card ${index} clicked:`, url);
      if (url) navigate(url);
    });
  });

  console.log("[BlackWave] UI setup complete");
}

// ── INITIALIZATION ────────────────────────────────────────────────────────────
async function initApp() {
  console.log("[BlackWave] Initializing app...");

  // Initialize Scramjet
  try {
    const { ScramjetController } = $scramjetLoadController();
    scramjet = new ScramjetController({
      files: {
        wasm: "/scram/scramjet.wasm.wasm",
        all: "/scram/scramjet.all.js",
        sync: "/scram/scramjet.sync.js",
      },
    });
    scramjet.init("/scram/scramjet.config.js");
    console.log("[BlackWave] Scramjet initialized");
  } catch (err) {
    console.error("[BlackWave] Scramjet initialization failed:", err);
    showError("Proxy engine failed", "Scramjet could not load");
    return;
  }

  // Initialize BareMux
  try {
    connection = new BareMux.BareMuxConnection("/baremux/worker.js");
    console.log("[BlackWave] BareMux connection created");
  } catch (err) {
    console.error("[BlackWave] BareMux initialization failed:", err);
    showError("Proxy connection failed", "BareMux could not initialize");
    return;
  }

  // Setup UI
  setupUI();

  console.log("[BlackWave] Initialization complete");
}

// ── START ─────────────────────────────────────────────────────────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// Register Service Worker AFTER app initialization
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[BlackWave] Service Worker registered:", reg);
      })
      .catch((err) => {
        console.warn("[BlackWave] Service Worker registration failed:", err);
      });
  });
}

console.log("[BlackWave] Script loaded");
