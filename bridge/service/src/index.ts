/**
 * Bridge Service - Entry Point
 *
 * Bidirectional relay service:
 * - GenLayer → EVM: Polls GenLayer and relays via LayerZero
 * - EVM → GenLayer: Listens for events and deploys intelligent oracles to GenLayer
 */

import cron from "node-cron";
import { getBridgeSyncInterval, getOptionalConfig } from "./config.js";
import { GenLayerToEvmRelay } from "./relay/GenLayerToEvm.js";
import { EvmToGenLayerRelay } from "./relay/EvmToGenLayer.js";

async function main() {
  console.log("Starting Bridge Service\n");

  // GenLayer → EVM (polling)
  console.log("[GL→EVM] Initializing...");
  const glToEvm = new GenLayerToEvmRelay();
  const glToEvmInterval = getBridgeSyncInterval();
  console.log(`[GL→EVM] Sync interval: ${glToEvmInterval}`);
  glToEvm.sync();
  cron.schedule(glToEvmInterval, () => glToEvm.sync());

  // EVM → GenLayer (event listening)
  const betFactoryAddress = getOptionalConfig("betFactoryAddress", "BET_FACTORY_ADDRESS");
  if (betFactoryAddress) {
    console.log("\n[EVM→GL] Initializing...");
    const evmToGl = new EvmToGenLayerRelay();
    evmToGl.startListening();
  } else {
    console.log("\n[EVM→GL] Skipped (BET_FACTORY_ADDRESS not set)");
  }

  console.log("\nBridge service running (both directions)");
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
