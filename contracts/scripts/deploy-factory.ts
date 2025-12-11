import { ethers } from "hardhat";

async function main() {
  console.log("Deploying BetFactoryCOFI contract...");

  // Get the deployer's address
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from address: ${deployer.address}`);
  console.log(`This address will be the house for all created bets\n`);

  // Configuration
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

  // Oracle address should be set via environment variable
  const oracleAddress = process.env.ORACLE_ADDRESS;

  if (!oracleAddress) {
    throw new Error("ORACLE_ADDRESS environment variable not set. Deploy OracleContract first!");
  }

  console.log("Factory Configuration:");
  console.log(`  House Address: ${deployer.address}`);
  console.log(`  USDC Address: ${usdcAddress}`);
  console.log(`  Oracle Address: ${oracleAddress}`);
  console.log(`  LayerZero: Hardcoded (Base Sepolia)`);

  // Deploy the BetFactoryCOFI contract
  const BetFactory = await ethers.getContractFactory("BetFactoryCOFI");
  const factory = await BetFactory.deploy(
    usdcAddress,
    oracleAddress
  );

  await factory.waitForDeployment();

  const address = await factory.getAddress();

  console.log(`\n✅ BetFactoryCOFI deployed to: ${address}`);
  console.log(`   House address: ${deployer.address}`);
  console.log(`   USDC token: ${usdcAddress}`);
  console.log(`   Oracle: ${oracleAddress}`);

  console.log("\nTo verify on Basescan, run:");
  console.log(
    `npx hardhat verify --network baseSepolia ${address} "${usdcAddress}" "${oracleAddress}"`
  );

  console.log("\n📝 Next steps:");
  console.log("1. Add this to frontend/config/contracts.json:");
  console.log(`   "BetFactoryCOFI": {`);
  console.log(`     "84532": "${address}"`);
  console.log(`   }`);
  console.log("\n2. Users can now create bets by calling factory.createBet()");
  console.log("3. Each bet will have house address:", deployer.address);
  console.log("4. Bets will resolve via oracle at:", oracleAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
