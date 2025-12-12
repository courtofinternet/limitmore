/**
 * Bridge Service - Entry Point
 *
 * Relay service for GenLayer → EVM messages via zkSync hub.
 */

import cron from "node-cron";
import { getBridgeSyncInterval } from "./config.js";
import { GenLayerToEvmRelay } from "./relay/GenLayerToEvm.js";

async function main() {
  console.log("Starting Bridge Service (GenLayer → EVM)");

  const glToEvm = new GenLayerToEvmRelay();
  const glToEvmInterval = getBridgeSyncInterval();

  console.log(`  Sync interval: ${glToEvmInterval}`);
  glToEvm.sync(); // Initial sync
  cron.schedule(glToEvmInterval, () => glToEvm.sync());

  console.log("Bridge service running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM. Shutting down...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Received SIGINT. Shutting down...");
  process.exit(0);
});
