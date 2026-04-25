// Custom worker that ensures libcurl.wasm is loaded before use
console.log("[libcurl-worker] Starting...");

let wasmLoaded = false;
let wasmLoadPromise = null;

// Load WASM on worker startup
async function loadWasm() {
  if (wasmLoaded) return;
  if (wasmLoadPromise) return wasmLoadPromise;

  wasmLoadPromise = (async () => {
    try {
      console.log("[libcurl-worker] Loading libcurl.wasm...");
      
      // Import the libcurl module
      const { load_wasm, LibcurlClient } = await import("/libcurl/index.mjs");
      
      // Load the WASM file
      console.log("[libcurl-worker] Calling load_wasm()...");
      await load_wasm();
      
      console.log("[libcurl-worker] WASM loaded successfully!");
      wasmLoaded = true;
      return true;
    } catch (err) {
      console.error("[libcurl-worker] Failed to load WASM:", err);
      throw err;
    }
  })();

  return wasmLoadPromise;
}

// Start loading WASM immediately
loadWasm().catch(err => {
  console.error("[libcurl-worker] WASM loading failed:", err);
});

// Import the original bare-mux worker
importScripts("/baremux/worker.js");

// Wait for WASM before handling messages
const originalOnconnect = self.onconnect;
self.onconnect = async (event) => {
  console.log("[libcurl-worker] onconnect called");
  
  try {
    // Ensure WASM is loaded before processing messages
    await loadWasm();
    console.log("[libcurl-worker] WASM ready, processing connection");
    
    // Call original onconnect
    if (originalOnconnect) {
      originalOnconnect(event);
    }
  } catch (err) {
    console.error("[libcurl-worker] Error in onconnect:", err);
    const port = event.ports[0];
    port.postMessage({
      type: "error",
      error: `Failed to initialize libcurl: ${err.message}`
    });
  }
};
