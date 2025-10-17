const { performance } = globalThis;

// Configuration
const INTERVAL_MS = 1000; // How often to log stats

// Event loop lag tracker
let lastTime = performance.now();

function trackEventLoopLag() {
  const now = performance.now();
  const lag = now - lastTime - INTERVAL_MS;
  lastTime = now;
  return lag;
}

// Function to print Bun memory + event loop info
function logStats() {
  const mem = process.memoryUsage();
  const lag = trackEventLoopLag();

  console.log(
    `[${new Date().toISOString()}] ` +
      `Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB, ` +
      `Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB, ` +
      `RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB, ` +
      `Event Loop Lag: ${lag.toFixed(2)} ms`
  );
}

// Start monitoring
setInterval(logStats, INTERVAL_MS);
