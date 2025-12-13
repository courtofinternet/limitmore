import { ethers } from "hardhat";

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

async function main() {
  const factoryAddress = process.env.FACTORY_ADDRESS;
  const betAddress = process.env.BET_ADDRESS;
  const side = process.env.SIDE?.toUpperCase(); // A or B
  const amount = process.env.AMOUNT; // In USDC units (6 decimals), e.g., 1000000 = 1 USDC

  if (!factoryAddress || !betAddress || !side || !amount) {
    console.log("Usage: FACTORY_ADDRESS=0x... BET_ADDRESS=0x... SIDE=A AMOUNT=1000000 npx hardhat run scripts/testing/place-bet.ts --network baseSepolia");
    throw new Error("Missing required env vars: FACTORY_ADDRESS, BET_ADDRESS, SIDE, AMOUNT");
  }

  const [signer] = await ethers.getSigners();
  console.log(`Placing bet from: ${signer.address}`);
  console.log(`  Factory: ${factoryAddress}`);
  console.log(`  Bet: ${betAddress}`);
  console.log(`  Side: ${side}`);
  console.log(`  Amount: ${amount} (${Number(amount) / 1e6} USDC)`);

  // Get contracts
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  const factory = await ethers.getContractAt("BetFactoryCOFI", factoryAddress);

  // Check USDC balance
  const balance = await usdc.balanceOf(signer.address);
  console.log(`\nUSDC balance: ${balance} (${Number(balance) / 1e6} USDC)`);

  if (balance < BigInt(amount)) {
    console.log("\nInsufficient USDC balance!");
    console.log("Get testnet USDC from: https://faucet.circle.com/");
    throw new Error("Insufficient USDC balance");
  }

  // Check and set allowance
  const allowance = await usdc.allowance(signer.address, factoryAddress);
  console.log(`Current allowance: ${allowance}`);

  if (allowance < BigInt(amount)) {
    console.log("\nApproving USDC to factory...");
    const approveTx = await usdc.approve(factoryAddress, ethers.MaxUint256);
    await approveTx.wait();
    console.log("Approved!");
  }

  // Place bet
  const onSideA = side === "A";
  console.log(`\nPlacing bet on side ${side}...`);

  const tx = await factory.placeBet(betAddress, onSideA, amount);
  console.log(`Transaction: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`\nBet placed successfully!`);

  // Parse BetPlaced event
  const betPlacedEvent = receipt?.logs.find((log: any) => {
    try {
      const parsed = factory.interface.parseLog({ topics: log.topics as string[], data: log.data });
      return parsed?.name === "BetPlaced";
    } catch {
      return false;
    }
  });

  if (betPlacedEvent) {
    const parsed = factory.interface.parseLog({
      topics: betPlacedEvent.topics as string[],
      data: betPlacedEvent.data
    });
    console.log(`  Bet Address: ${parsed?.args[0]}`);
    console.log(`  Bettor: ${parsed?.args[1]}`);
    console.log(`  On Side A: ${parsed?.args[2]}`);
    console.log(`  Amount: ${parsed?.args[3]}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
