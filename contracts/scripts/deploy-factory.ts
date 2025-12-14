import { ethers } from "hardhat";

async function main() {
  console.log("Deploying BetFactoryCOFI contract...\n");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from address: ${deployer.address}`);

  // Configuration
  const usdcAddress = process.env.USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

  console.log("\nFactory Configuration:");
  console.log(`  USDC Address: ${usdcAddress}`);

  // Deploy the BetFactoryCOFI contract
  const BetFactory = await ethers.getContractFactory("BetFactoryCOFI");
  const factory = await BetFactory.deploy(usdcAddress);

  await factory.waitForDeployment();

  const address = await factory.getAddress();

  console.log(`\n BetFactoryCOFI deployed to: ${address}`);
  console.log(`   Owner: ${deployer.address}`);
  console.log(`   USDC token: ${usdcAddress}`);

  console.log("\nTo verify on Basescan, run:");
  console.log(
    `npx hardhat verify --network baseSepolia ${address} "${usdcAddress}"`
  );

  console.log("\n Next steps:");
  console.log("1. Deploy BridgeReceiver on this chain (if not already deployed)");
  console.log("2. Configure factory with bridge receiver:");
  console.log(`   FACTORY_ADDRESS=${address} BRIDGE_RECEIVER_ADDRESS=0x... npx hardhat run scripts/configure-factory.ts --network baseSepolia`);
  console.log("\n3. Configure BridgeReceiver to trust BridgeForwarder on zkSync:");
  console.log("   bridgeReceiver.setTrustedForwarder(zkSyncEid, bridgeForwarderAddress)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
