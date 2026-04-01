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
    activeFrame.remove();
    activeFrame = null;
  }
  frameContainer.innerHTML = "";
}

async function navigate(rawUrl) {
  hideError();

  const url = search(rawUrl, "https://www.google.com/search?q=%s");

  // Show browser chrome
  showBrowser();
  navInput.value = url;

  // Create or reuse frame
  if (!activeFrame) {
    activeFrame = document.createElement("iframe");
    activeFrame.style.width  = "100%";
    activeFrame.style.height = "100%";
    activeFrame.style.border = "none";
    frameContainer.appendChild(activeFrame);
  }

  // Encode URL for proxy
  const encodedUrl = encodeURIComponent(url);
  const proxyUrl = `/proxy/${encodedUrl}`;
  
  try {
    activeFrame.src = proxyUrl;
  } catch (err) {
    showError("Failed to navigate.", err.toString());
  }
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

// Update nav bar URL when frame navigates
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

// ── Utility Functions ──────────────────────────────────────────────────────────
function search(query, searchUrl) {
  // If it looks like a URL, return it as-is
  if (query.startsWith("http://") || query.startsWith("https://")) {
    return query;
  }
  
  // If it looks like a domain, add https://
  if (query.includes(".") && !query.includes(" ")) {
    return "https://" + query;
  }
  
  // Otherwise, treat it as a search query
  return searchUrl.replace("%s", encodeURIComponent(query));
}
