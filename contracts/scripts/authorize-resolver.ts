import { ethers } from "hardhat";

async function main() {
  console.log("Authorizing Oracle Resolver...");

  // Get the deployer's address (must be oracle owner)
  const [deployer] = await ethers.getSigners();
  console.log(`Authorizing from address: ${deployer.address}`);

  // Oracle contract address from environment variable
  const oracleAddress = process.env.ORACLE_ADDRESS;

  // Oracle service wallet address from environment variable
  const resolverAddress = process.env.ORACLE_WALLET_ADDRESS;

  if (!oracleAddress) {
    throw new Error("ORACLE_ADDRESS environment variable not set!");
  }

  if (!resolverAddress) {
    throw new Error("ORACLE_WALLET_ADDRESS environment variable not set!");
  }

  console.log("\nConfiguration:");
  console.log(`  Oracle Contract: ${oracleAddress}`);
  console.log(`  Resolver Wallet: ${resolverAddress}`);

  // Get the OracleContract instance
  const oracle = await ethers.getContractAt("OracleContract", oracleAddress);

  // Authorize the resolver
  console.log("\nAuthorizing resolver...");
  const tx = await oracle.setAuthorizedResolver(resolverAddress, true);
  await tx.wait();

  console.log(`✅ Resolver authorized successfully!`);
  console.log(`   Transaction hash: ${tx.hash}`);

  // Verify authorization
  const isAuthorized = await oracle.authorizedResolvers(resolverAddress);
  console.log(`\nVerification: Resolver ${resolverAddress} is authorized: ${isAuthorized}`);

  console.log("\n📝 Next steps:");
  console.log("1. Ensure the oracle service has this private key in .env:");
  console.log(`   ORACLE_PRIVATE_KEY=<private_key_for_${resolverAddress}>`);
  console.log("\n2. Start the oracle service:");
  console.log("   cd oracle-service && npm run oracle");
  console.log("\n3. The service will now be able to fulfill resolution requests");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
