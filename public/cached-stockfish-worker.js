const WASM_URL = "/stockfish-18-single.wasm";
const CACHE_NAME = "stockfish-18-single";

async function loadWasmBuffer() {
  const cache = await caches.open(CACHE_NAME);
  let response = await cache.match(WASM_URL);

  if (!response) {
    response = await fetch(WASM_URL);
    if (!response.ok) throw new Error(`fetch failed: ${response.status}`);

    await cache.put(WASM_URL, response.clone());
  }

  return response.arrayBuffer();
}

// Start buffering messages while we're setting up the worker
const pending = [];
const bufferHandler = (e) => pending.push(e.data);
self.addEventListener("message", bufferHandler);

loadWasmBuffer().then((wasmBuffer) => {
  const origFetch = self.fetch;

  // Overwrite self.fetch to return our buffer for WASM files, so the real stockfish.js wrapper doesn't make a real fetch request
  self.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.endsWith(".wasm")) {
      return Promise.resolve(
        new Response(wasmBuffer.slice(0), {
          status: 200,
          headers: { "Content-Type": "application/wasm" },
        })
      );
    }
    return origFetch.call(self, input, init);
  };

  self.Module = {
    wasmBinary: wasmBuffer,
    print: (line) => self.postMessage(line),
    printErr: (line) => self.postMessage(line),
  };

  importScripts("/stockfish-18-single.js");

  // Let stockfish.js overtake the event listener, dispatch buffered events
  self.removeEventListener("message", bufferHandler);

  for (const msg of pending) {
    self.dispatchEvent(new MessageEvent("message", { data: msg }));
  }
});
