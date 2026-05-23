// Load libcurl FIRST before anything else
(async () => {
  try {
    // Import libcurl module
    const libcurl = await import("/libcurl/index.mjs");
    
    // Load the WASM file
    await libcurl.load_wasm("/libcurl/libcurl.wasm");
    
    console.log("[BareMux Worker] libcurl loaded successfully");
  } catch (err) {
    console.error("[BareMux Worker] Failed to load libcurl:", err);
  }
})();

// Now load the original worker code
importScripts("https://cdn.jsdelivr.net/npm/@mercuryworkshop/bare-mux@2.1.8/dist/worker.js");
