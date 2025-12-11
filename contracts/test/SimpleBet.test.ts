import { expect } from "chai";
import { ethers } from "hardhat";
import { SimpleBet, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SimpleBet", function () {
  let simpleBet: SimpleBet;
  let usdc: MockUSDC;
  let creator: SignerWithAddress;
  let bettor1: SignerWithAddress;
  let bettor2: SignerWithAddress;
  let bettor3: SignerWithAddress;
  let house: SignerWithAddress;

  const USDC_AMOUNT = (amount: number) => ethers.parseUnits(amount.toString(), 6);
  const TITLE = "Will ETH reach $5000?";
  const DESCRIPTION = "ETH price prediction";
  const SIDE_A = "Yes";
  const SIDE_B = "No";

  beforeEach(async function () {
    [creator, bettor1, bettor2, bettor3, house] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Mint USDC to test accounts
    await usdc.mint(bettor1.address, USDC_AMOUNT(10000));
    await usdc.mint(bettor2.address, USDC_AMOUNT(10000));
    await usdc.mint(bettor3.address, USDC_AMOUNT(10000));

    // Deploy SimpleBet with 7 days end date (use blockchain time)
    const currentTime = await time.latest();
    const endDate = currentTime + 7 * 24 * 60 * 60;
    const SimpleBet = await ethers.getContractFactory("SimpleBet");
    simpleBet = await SimpleBet.deploy(
      creator.address,
      TITLE,
      DESCRIPTION,
      SIDE_A,
      SIDE_B,
      endDate,
      house.address,
      await usdc.getAddress()
    );
    await simpleBet.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct creator", async function () {
      expect(await simpleBet.creator()).to.equal(creator.address);
    });

    it("Should set the correct bet details", async function () {
      expect(await simpleBet.title()).to.equal(TITLE);
      expect(await simpleBet.description()).to.equal(DESCRIPTION);
      expect(await simpleBet.sideAName()).to.equal(SIDE_A);
      expect(await simpleBet.sideBName()).to.equal(SIDE_B);
    });

    it("Should set the correct USDC token address", async function () {
      expect(await simpleBet.token()).to.equal(await usdc.getAddress());
    });

    it("Should set the correct house address", async function () {
      expect(await simpleBet.houseAddress()).to.equal(house.address);
    });

    it("Should not be resolved initially", async function () {
      expect(await simpleBet.resolved()).to.be.false;
    });

    it("Should fail with invalid creator address", async function () {
      const currentTime = await time.latest();
      const endDate = currentTime + 7 * 24 * 60 * 60;
      const SimpleBet = await ethers.getContractFactory("SimpleBet");

      await expect(
        SimpleBet.deploy(
          ethers.ZeroAddress,
          TITLE,
          DESCRIPTION,
          SIDE_A,
          SIDE_B,
          endDate,
          house.address,
          await usdc.getAddress()
        )
      ).to.be.revertedWith("Invalid creator address");
    });

    it("Should fail with end date in the past", async function () {
      const currentTime = await time.latest();
      const pastDate = currentTime - 1000;
      const SimpleBet = await ethers.getContractFactory("SimpleBet");

      await expect(
        SimpleBet.deploy(
          creator.address,
          TITLE,
          DESCRIPTION,
          SIDE_A,
          SIDE_B,
          pastDate,
          house.address,
          await usdc.getAddress()
        )
      ).to.be.revertedWith("End date must be in the future");
    });
  });

  describe("Betting on Side A", function () {
    it("Should allow betting on side A with USDC", async function () {
      const betAmount = USDC_AMOUNT(100);

      // Approve USDC
      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), betAmount);

      // Place bet
      await expect(simpleBet.connect(bettor1).betOnSideA(betAmount))
        .to.emit(simpleBet, "BetPlacedOnA")
        .withArgs(bettor1.address, betAmount);

      expect(await simpleBet.betsOnSideA(bettor1.address)).to.equal(betAmount);
      expect(await simpleBet.totalSideA()).to.equal(betAmount);
    });

    it("Should accumulate multiple bets on side A", async function () {
      const bet1 = USDC_AMOUNT(100);
      const bet2 = USDC_AMOUNT(50);

      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), bet1 + bet2);

      await simpleBet.connect(bettor1).betOnSideA(bet1);
      await simpleBet.connect(bettor1).betOnSideA(bet2);

      expect(await simpleBet.betsOnSideA(bettor1.address)).to.equal(bet1 + bet2);
      expect(await simpleBet.totalSideA()).to.equal(bet1 + bet2);
    });

    it("Should fail without USDC approval", async function () {
      const betAmount = USDC_AMOUNT(100);

      await expect(
        simpleBet.connect(bettor1).betOnSideA(betAmount)
      ).to.be.reverted;
    });

    it("Should fail with zero amount", async function () {
      await expect(
        simpleBet.connect(bettor1).betOnSideA(0)
      ).to.be.revertedWith("Must bet more than 0");
    });

    it("Should fail after betting ends", async function () {
      const endDate = await simpleBet.endDate();
      await time.increaseTo(endDate + 1n);

      const betAmount = USDC_AMOUNT(100);
      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), betAmount);

      await expect(
        simpleBet.connect(bettor1).betOnSideA(betAmount)
      ).to.be.revertedWith("Betting has ended");
    });
  });

  describe("Betting on Side B", function () {
    it("Should allow betting on side B with USDC", async function () {
      const betAmount = USDC_AMOUNT(100);

      await usdc.connect(bettor2).approve(await simpleBet.getAddress(), betAmount);

      await expect(simpleBet.connect(bettor2).betOnSideB(betAmount))
        .to.emit(simpleBet, "BetPlacedOnB")
        .withArgs(bettor2.address, betAmount);

      expect(await simpleBet.betsOnSideB(bettor2.address)).to.equal(betAmount);
      expect(await simpleBet.totalSideB()).to.equal(betAmount);
    });

    it("Should allow same user to bet on both sides", async function () {
      const betA = USDC_AMOUNT(100);
      const betB = USDC_AMOUNT(50);

      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), betA + betB);

      await simpleBet.connect(bettor1).betOnSideA(betA);
      await simpleBet.connect(bettor1).betOnSideB(betB);

      expect(await simpleBet.betsOnSideA(bettor1.address)).to.equal(betA);
      expect(await simpleBet.betsOnSideB(bettor1.address)).to.equal(betB);
    });
  });

  describe("Resolution", function () {
    beforeEach(async function () {
      // Place some bets
      const betAmount = USDC_AMOUNT(100);
      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), betAmount);
      await usdc.connect(bettor2).approve(await simpleBet.getAddress(), betAmount);
      await simpleBet.connect(bettor1).betOnSideA(betAmount);
      await simpleBet.connect(bettor2).betOnSideB(betAmount);
    });

    it("Should allow creator to resolve", async function () {
      await expect(simpleBet.connect(creator).resolve())
        .to.emit(simpleBet, "BetResolved");

      expect(await simpleBet.resolved()).to.be.true;
    });

    it("Should fail if non-creator tries to resolve", async function () {
      await expect(
        simpleBet.connect(bettor1).resolve()
      ).to.be.revertedWith("Only creator can resolve");
    });

    it("Should fail to resolve twice", async function () {
      await simpleBet.connect(creator).resolve();

      await expect(
        simpleBet.connect(creator).resolve()
      ).to.be.revertedWith("Bet already resolved");
    });

    it("Should fail to bet after resolution", async function () {
      await simpleBet.connect(creator).resolve();

      const betAmount = USDC_AMOUNT(100);
      await usdc.connect(bettor3).approve(await simpleBet.getAddress(), betAmount);

      await expect(
        simpleBet.connect(bettor3).betOnSideA(betAmount)
      ).to.be.revertedWith("Bet already resolved");
    });
  });

  describe("Claiming Winnings", function () {
    it("Should allow winner to claim when side A wins", async function () {
      // Bettor1 bets 100 on A, Bettor2 bets 100 on B
      const bet1 = USDC_AMOUNT(100);
      const bet2 = USDC_AMOUNT(100);

      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), bet1);
      await usdc.connect(bettor2).approve(await simpleBet.getAddress(), bet2);

      await simpleBet.connect(bettor1).betOnSideA(bet1);
      await simpleBet.connect(bettor2).betOnSideB(bet2);

      // Mock resolution to side A
      await simpleBet.connect(creator).resolve();
      const sideAWon = await simpleBet.winnerSideA();

      const initialBalance = await usdc.balanceOf(bettor1.address);

      if (sideAWon) {
        // Bettor1 should win
        await expect(simpleBet.connect(bettor1).claim())
          .to.emit(simpleBet, "WinningsClaimed");

        const finalBalance = await usdc.balanceOf(bettor1.address);
        expect(finalBalance).to.be.gt(initialBalance);
      } else {
        // Bettor2 should win
        await expect(simpleBet.connect(bettor2).claim())
          .to.emit(simpleBet, "WinningsClaimed");

        const finalBalance = await usdc.balanceOf(bettor2.address);
        expect(finalBalance).to.be.gt(await usdc.balanceOf(bettor2.address));
      }
    });

    it("Should fail to claim before resolution", async function () {
      const betAmount = USDC_AMOUNT(100);
      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), betAmount);
      await simpleBet.connect(bettor1).betOnSideA(betAmount);

      await expect(
        simpleBet.connect(bettor1).claim()
      ).to.be.revertedWith("Bet not resolved yet");
    });

    it("Should fail to claim twice", async function () {
      const betAmount = USDC_AMOUNT(100);
      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), betAmount);
      await simpleBet.connect(bettor1).betOnSideA(betAmount);

      await simpleBet.connect(creator).resolve();
      const sideAWon = await simpleBet.winnerSideA();

      if (sideAWon) {
        await simpleBet.connect(bettor1).claim();
        await expect(
          simpleBet.connect(bettor1).claim()
        ).to.be.revertedWith("Already claimed");
      }
    });

    it("Should fail if user has no winning bet", async function () {
      const betAmount = USDC_AMOUNT(100);
      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), betAmount);
      await simpleBet.connect(bettor1).betOnSideA(betAmount);

      await simpleBet.connect(creator).resolve();
      const sideAWon = await simpleBet.winnerSideA();

      if (!sideAWon) {
        // Bettor1 bet on A but B won
        await expect(
          simpleBet.connect(bettor1).claim()
        ).to.be.revertedWith("No winning bet to claim");
      }
    });
  });

  describe("Proportional Winnings", function () {
    it("Should distribute winnings proportionally", async function () {
      // Bettor1: 200 USDC on A
      // Bettor2: 100 USDC on A
      // Bettor3: 300 USDC on B (total losing pool)
      const bet1 = USDC_AMOUNT(200);
      const bet2 = USDC_AMOUNT(100);
      const bet3 = USDC_AMOUNT(300);

      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), bet1);
      await usdc.connect(bettor2).approve(await simpleBet.getAddress(), bet2);
      await usdc.connect(bettor3).approve(await simpleBet.getAddress(), bet3);

      await simpleBet.connect(bettor1).betOnSideA(bet1);
      await simpleBet.connect(bettor2).betOnSideA(bet2);
      await simpleBet.connect(bettor3).betOnSideB(bet3);

      await simpleBet.connect(creator).resolve();
      const sideAWon = await simpleBet.winnerSideA();

      if (sideAWon) {
        // Bettor1 should get: 200 + (200/300 * 300) = 200 + 200 = 400
        // Bettor2 should get: 100 + (100/300 * 300) = 100 + 100 = 200

        const balance1Before = await usdc.balanceOf(bettor1.address);
        const balance2Before = await usdc.balanceOf(bettor2.address);

        await simpleBet.connect(bettor1).claim();
        await simpleBet.connect(bettor2).claim();

        const balance1After = await usdc.balanceOf(bettor1.address);
        const balance2After = await usdc.balanceOf(bettor2.address);

        const payout1 = balance1After - balance1Before;
        const payout2 = balance2After - balance2Before;

        expect(payout1).to.equal(USDC_AMOUNT(400));
        expect(payout2).to.equal(USDC_AMOUNT(200));
      }
    });
  });

  describe("House Funds", function () {
    it("Should allow house to claim if winning side has no bets", async function () {
      // Only bet on side B
      const betAmount = USDC_AMOUNT(500);
      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), betAmount);
      await simpleBet.connect(bettor1).betOnSideB(betAmount);

      await simpleBet.connect(creator).resolve();
      const sideAWon = await simpleBet.winnerSideA();

      if (sideAWon) {
        // Side A won but no one bet on A - house gets all of side B
        const houseBalanceBefore = await usdc.balanceOf(house.address);

        await expect(simpleBet.connect(house).claimHouseFunds())
          .to.emit(simpleBet, "HousePayout")
          .withArgs(house.address, betAmount);

        const houseBalanceAfter = await usdc.balanceOf(house.address);
        expect(houseBalanceAfter - houseBalanceBefore).to.equal(betAmount);
      }
    });

    it("Should fail if non-house tries to claim house funds", async function () {
      const betAmount = USDC_AMOUNT(500);
      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), betAmount);
      await simpleBet.connect(bettor1).betOnSideB(betAmount);

      await simpleBet.connect(creator).resolve();

      await expect(
        simpleBet.connect(bettor1).claimHouseFunds()
      ).to.be.revertedWith("Only house can claim");
    });
  });

  describe("View Functions", function () {
    it("Should return correct bet info", async function () {
      const info = await simpleBet.getInfo();

      expect(info._creator).to.equal(creator.address);
      expect(info._title).to.equal(TITLE);
      expect(info._description).to.equal(DESCRIPTION);
      expect(info._sideAName).to.equal(SIDE_A);
      expect(info._sideBName).to.equal(SIDE_B);
      expect(info._resolved).to.be.false;
    });

    it("Should return user bets correctly", async function () {
      const betA = USDC_AMOUNT(100);
      const betB = USDC_AMOUNT(50);

      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), betA + betB);
      await simpleBet.connect(bettor1).betOnSideA(betA);
      await simpleBet.connect(bettor1).betOnSideB(betB);

      const [onSideA, onSideB] = await simpleBet.getUserBets(bettor1.address);
      expect(onSideA).to.equal(betA);
      expect(onSideB).to.equal(betB);
    });

    it("Should calculate potential winnings correctly", async function () {
      // Bettor1: 100 on A, Bettor2: 200 on B
      const bet1 = USDC_AMOUNT(100);
      const bet2 = USDC_AMOUNT(200);

      await usdc.connect(bettor1).approve(await simpleBet.getAddress(), bet1);
      await usdc.connect(bettor2).approve(await simpleBet.getAddress(), bet2);

      await simpleBet.connect(bettor1).betOnSideA(bet1);
      await simpleBet.connect(bettor2).betOnSideB(bet2);

      const [ifAWins, ifBWins] = await simpleBet.calculatePotentialWinnings(bettor1.address);

      // If A wins: bettor1 gets 100 + 200 = 300
      expect(ifAWins).to.equal(USDC_AMOUNT(300));
      // If B wins: bettor1 gets 0
      expect(ifBWins).to.equal(0);
    });
  });
});
