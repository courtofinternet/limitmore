import { ethers } from "hardhat";

async function main() {
  console.log("Deploying SimpleBet contract...");

  // Get the deployer's address
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from address: ${deployer.address}`);

  // Bet parameters - CUSTOMIZE THESE FOR YOUR BET
  const betParams = {
    creator: deployer.address,
    title: "Will ETH reach $5000 by end of 2025?",
    description: "This bet resolves to YES if ETH price reaches $5000 USD at any point before the end date. Otherwise it resolves to NO.",
    sideAName: "Yes",
    sideBName: "No",
    // End date: 7 days from now (adjust as needed)
    endDate: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
    houseAddress: deployer.address, // Use deployer as house address
    // USDC contract address on Base Sepolia
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  };

  console.log("\nBet Configuration:");
  console.log(`  Title: ${betParams.title}`);
  console.log(`  Side A: ${betParams.sideAName}`);
  console.log(`  Side B: ${betParams.sideBName}`);
  console.log(`  End Date: ${new Date(betParams.endDate * 1000).toISOString()}`);
  console.log(`  House Address: ${betParams.houseAddress}`);
  console.log(`  USDC Address: ${betParams.usdcAddress}`);

  // Deploy the contract
  const SimpleBet = await ethers.getContractFactory("SimpleBet");
  const simpleBet = await SimpleBet.deploy(
    betParams.creator,
    betParams.title,
    betParams.description,
    betParams.sideAName,
    betParams.sideBName,
    betParams.endDate,
    betParams.houseAddress,
    betParams.usdcAddress
  );

  await simpleBet.waitForDeployment();

  const address = await simpleBet.getAddress();

  console.log(`\n✅ SimpleBet deployed to: ${address}`);
  console.log("\nTo verify on Basescan, run:");
  console.log(
    `npx hardhat verify --network baseSepolia ${address} "${betParams.creator}" "${betParams.title}" "${betParams.description}" "${betParams.sideAName}" "${betParams.sideBName}" ${betParams.endDate} "${betParams.houseAddress}" "${betParams.usdcAddress}"`
  );

  console.log("\nTo interact with the bet:");
  console.log(`  - First, approve USDC: usdc.approve(contractAddress, amount)`);
  console.log(`  - Bet on Side A: simpleBet.betOnSideA(ethers.parseUnits("10", 6)) // 10 USDC`);
  console.log(`  - Bet on Side B: simpleBet.betOnSideB(ethers.parseUnits("10", 6)) // 10 USDC`);
  console.log(`  - Resolve (after end date): simpleBet.resolve()`);
  console.log(`  - Claim winnings: simpleBet.claim()`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
