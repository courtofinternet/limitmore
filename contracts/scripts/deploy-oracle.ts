import { ethers } from "hardhat";

async function main() {
  console.log("Deploying OracleContract...");

  // Get the deployer's address
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from address: ${deployer.address}`);

  // LayerZero endpoint on Base Sepolia
  const lzEndpoint = "0x6EDCE65403992e310A62460808c4b910D972f10f";

  console.log("\nOracle Configuration:");
  console.log(`  Owner Address: ${deployer.address}`);
  console.log(`  LayerZero Endpoint: ${lzEndpoint}`);
  console.log(`  Network: Base Sepolia (EID: 40245)`);

  // Deploy the OracleContract
  const OracleContract = await ethers.getContractFactory("OracleContract");
  const oracle = await OracleContract.deploy(lzEndpoint, deployer.address);

  await oracle.waitForDeployment();

  const address = await oracle.getAddress();

  console.log(`\n✅ OracleContract deployed to: ${address}`);
  console.log(`   Owner: ${deployer.address}`);
  console.log(`   LayerZero Endpoint: ${lzEndpoint}`);

  console.log("\nTo verify on Basescan, run:");
  console.log(
    `npx hardhat verify --network baseSepolia ${address} "${lzEndpoint}" "${deployer.address}"`
  );

  console.log("\n📝 Next steps:");
  console.log("1. Save this oracle address for factory deployment:");
  console.log(`   ORACLE_ADDRESS=${address}`);
  console.log("\n2. Deploy BetFactoryCOFI with this oracle address:");
  console.log(`   ORACLE_ADDRESS=${address} npm run deploy:factory:sepolia`);
  console.log("\n3. Authorize the oracle service wallet:");
  console.log(`   ORACLE_ADDRESS=${address} npx hardhat run scripts/authorize-resolver.ts --network baseSepolia`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
