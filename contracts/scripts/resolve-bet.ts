import { ethers } from "hardhat";

async function main() {
  // Contract address - UPDATE THIS to match your deployed contract
  const contractAddress =
    process.env.BET_CONTRACT_ADDRESS ||
    "0x331BF7c686e22ce6588d626626660f1Fdbc4Ef12";

  console.log(`Resolving bet at: ${contractAddress}`);

  // Get the signer (should be the creator)
  const [signer] = await ethers.getSigners();
  console.log(`Resolving from address: ${signer.address}`);

  // Get contract instance
  const SimpleBet = await ethers.getContractFactory("SimpleBet");
  const simpleBet = SimpleBet.attach(contractAddress);

  // Check if already resolved
  const isResolved = await simpleBet.resolved();
  if (isResolved) {
    console.log("\n❌ Bet is already resolved!");
    const winnerSideA = await simpleBet.winnerSideA();
    const sideAName = await simpleBet.sideAName();
    const sideBName = await simpleBet.sideBName();
    console.log(`Winner: ${winnerSideA ? sideAName : sideBName}`);
    return;
  }

  // Get bet info before resolving
  const creator = await simpleBet.creator();
  const title = await simpleBet.title();
  const sideAName = await simpleBet.sideAName();
  const sideBName = await simpleBet.sideBName();
  const totalSideA = await simpleBet.totalSideA();
  const totalSideB = await simpleBet.totalSideB();

  console.log("\nBet Information:");
  console.log(`  Title: ${title}`);
  console.log(`  Creator: ${creator}`);
  console.log(
    `  Side A (${sideAName}): ${ethers.formatUnits(totalSideA, 6)} USDC`
  );
  console.log(
    `  Side B (${sideBName}): ${ethers.formatUnits(totalSideB, 6)} USDC`
  );

  // Verify the signer is the creator
  if (signer.address.toLowerCase() !== creator.toLowerCase()) {
    console.log("\n❌ Error: Only the creator can resolve the bet!");
    console.log(`  Creator: ${creator}`);
    console.log(`  Your address: ${signer.address}`);
    return;
  }

  console.log("\n🎲 Resolving bet...");

  // Resolve the bet
  const tx = await simpleBet.resolve();
  console.log(`Transaction sent: ${tx.hash}`);

  // Wait for confirmation
  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

  // Get the result
  const winnerSideA = await simpleBet.winnerSideA();
  console.log(`\n🏆 Winner: ${winnerSideA ? sideAName : sideBName}`);

  console.log("\n✨ Bet resolved successfully!");
  console.log(
    "Winners can now claim their winnings by calling the claim() function."
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
