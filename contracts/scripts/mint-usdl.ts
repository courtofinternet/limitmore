import { ethers } from "hardhat";

async function main() {
  const usdlAddress = process.env.USDL_ADDRESS || "0xeA2d0cb43E1a8462C4958657Dd13f300A73574f7";
  const recipient = process.env.RECIPIENT || "0x08E9F4723CF5A27866bB11eD2C41162e05206777";
  const amount = process.env.AMOUNT || "1000";

  const usdl = await ethers.getContractAt("MockUSDL", usdlAddress);

  console.log(`Minting ${amount} USDL to ${recipient}`);
  const tx = await usdl.mint(recipient, ethers.parseUnits(amount, 6));
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("✅ Minted!");

  const balance = await usdl.balanceOf(recipient);
  console.log("New balance:", ethers.formatUnits(balance, 6), "USDL");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
