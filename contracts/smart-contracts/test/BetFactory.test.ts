import { expect } from "chai";
import { ethers } from "hardhat";
import { BetFactory, SimpleBet, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BetFactory", function () {
  let factory: BetFactory;
  let usdc: MockUSDC;
  let deployer: SignerWithAddress;
  let creator1: SignerWithAddress;
  let creator2: SignerWithAddress;
  let bettor: SignerWithAddress;

  const USDC_AMOUNT = (amount: number) => ethers.parseUnits(amount.toString(), 6);

  beforeEach(async function () {
    [deployer, creator1, creator2, bettor] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Mint USDC to test accounts
    await usdc.mint(bettor.address, USDC_AMOUNT(10000));

    // Deploy BetFactory
    const BetFactory = await ethers.getContractFactory("BetFactory");
    factory = await BetFactory.deploy(await usdc.getAddress());
    await factory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the deployer as house", async function () {
      expect(await factory.house()).to.equal(deployer.address);
    });

    it("Should set the correct USDC address", async function () {
      expect(await factory.usdcToken()).to.equal(await usdc.getAddress());
    });

    it("Should start with zero bets", async function () {
      expect(await factory.getBetCount()).to.equal(0);
    });

    it("Should fail with invalid USDC address", async function () {
      const BetFactory = await ethers.getContractFactory("BetFactory");
      await expect(
        BetFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid USDC address");
    });
  });

  describe("Creating Bets", function () {
    it("Should create a bet and emit BetCreated event", async function () {
      const currentTime = await time.latest();
      const endDate = currentTime + 7 * 24 * 60 * 60;

      await expect(
        factory.connect(creator1).createBet(
          "Will ETH reach $5000?",
          "ETH price prediction",
          "Yes",
          "No",
          endDate
        )
      )
        .to.emit(factory, "BetCreated")
        .withArgs(
          (betAddress: string) => betAddress !== ethers.ZeroAddress,
          creator1.address,
          "Will ETH reach $5000?",
          endDate
        );
    });

    it("Should increment bet count", async function () {
      const currentTime = await time.latest();
      const endDate = currentTime + 7 * 24 * 60 * 60;

      expect(await factory.getBetCount()).to.equal(0);

      await factory.connect(creator1).createBet(
        "Bet 1",
        "Description 1",
        "Yes",
        "No",
        endDate
      );

      expect(await factory.getBetCount()).to.equal(1);

      await factory.connect(creator2).createBet(
        "Bet 2",
        "Description 2",
        "Option A",
        "Option B",
        endDate
      );

      expect(await factory.getBetCount()).to.equal(2);
    });

    it("Should track all created bets", async function () {
      const currentTime = await time.latest();
      const endDate = currentTime + 7 * 24 * 60 * 60;

      await factory.connect(creator1).createBet(
        "Bet 1",
        "Description 1",
        "Yes",
        "No",
        endDate
      );

      await factory.connect(creator2).createBet(
        "Bet 2",
        "Description 2",
        "Option A",
        "Option B",
        endDate
      );

      const allBets = await factory.getAllBets();
      expect(allBets.length).to.equal(2);
      expect(allBets[0]).to.not.equal(ethers.ZeroAddress);
      expect(allBets[1]).to.not.equal(ethers.ZeroAddress);
      expect(allBets[0]).to.not.equal(allBets[1]);
    });
  });

  describe("Created Bet Properties", function () {
    let betAddress: string;
    let bet: SimpleBet;

    beforeEach(async function () {
      const currentTime = await time.latest();
      const endDate = currentTime + 7 * 24 * 60 * 60;

      const tx = await factory.connect(creator1).createBet(
        "Test Bet",
        "Test Description",
        "Side A",
        "Side B",
        endDate
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log) => {
          try {
            return factory.interface.parseLog(log as any)?.name === "BetCreated";
          } catch {
            return false;
          }
        }
      );

      const parsedEvent = factory.interface.parseLog(event as any);
      betAddress = parsedEvent?.args[0];

      // Get SimpleBet instance
      bet = await ethers.getContractAt("SimpleBet", betAddress);
    });

    it("Should set creator as tx sender", async function () {
      expect(await bet.creator()).to.equal(creator1.address);
    });

    it("Should set house as factory deployer", async function () {
      expect(await bet.houseAddress()).to.equal(deployer.address);
    });

    it("Should set correct USDC token", async function () {
      expect(await bet.token()).to.equal(await usdc.getAddress());
    });

    it("Should set correct bet parameters", async function () {
      expect(await bet.title()).to.equal("Test Bet");
      expect(await bet.description()).to.equal("Test Description");
      expect(await bet.sideAName()).to.equal("Side A");
      expect(await bet.sideBName()).to.equal("Side B");
    });

    it("Created bet should be functional", async function () {
      // Approve USDC
      await usdc.connect(bettor).approve(betAddress, USDC_AMOUNT(100));

      // Bet should work
      await expect(
        bet.connect(bettor).betOnSideA(USDC_AMOUNT(50))
      ).to.not.be.reverted;

      expect(await bet.totalSideA()).to.equal(USDC_AMOUNT(50));
    });
  });

  describe("Multiple Creators", function () {
    it("Should allow different users to create bets", async function () {
      const currentTime = await time.latest();
      const endDate = currentTime + 7 * 24 * 60 * 60;

      // Creator 1 creates a bet
      const tx1 = await factory.connect(creator1).createBet(
        "Creator 1 Bet",
        "Description 1",
        "Yes",
        "No",
        endDate
      );
      const receipt1 = await tx1.wait();
      const event1 = receipt1?.logs.find(
        (log) => {
          try {
            return factory.interface.parseLog(log as any)?.name === "BetCreated";
          } catch {
            return false;
          }
        }
      );
      const bet1Address = factory.interface.parseLog(event1 as any)?.args[0];
      const bet1 = await ethers.getContractAt("SimpleBet", bet1Address);

      // Creator 2 creates a bet
      const tx2 = await factory.connect(creator2).createBet(
        "Creator 2 Bet",
        "Description 2",
        "Option A",
        "Option B",
        endDate
      );
      const receipt2 = await tx2.wait();
      const event2 = receipt2?.logs.find(
        (log) => {
          try {
            return factory.interface.parseLog(log as any)?.name === "BetCreated";
          } catch {
            return false;
          }
        }
      );
      const bet2Address = factory.interface.parseLog(event2 as any)?.args[0];
      const bet2 = await ethers.getContractAt("SimpleBet", bet2Address);

      // Each bet should have correct creator
      expect(await bet1.creator()).to.equal(creator1.address);
      expect(await bet2.creator()).to.equal(creator2.address);

      // Both should have same house (factory deployer)
      expect(await bet1.houseAddress()).to.equal(deployer.address);
      expect(await bet2.houseAddress()).to.equal(deployer.address);
    });
  });
});
