const { expect } = require("chai");
const { ethers }  = require("hardhat");
const { time }    = require("@nomicfoundation/hardhat-network-helpers");

// ─── Constants ────────────────────────────────────────────────────────────────

const DECIMALS      = 18n;
const ONE_TOKEN     = 10n ** DECIMALS;
const CREATION_FEE  = 5n  * ONE_TOKEN;
const TRADE_FEE_BPS = 50n;           // 0.5 %
const MIN_BET       = 1n  * ONE_TOKEN;
const REFUND_DELAY  = 3n  * 24n * 60n * 60n; // 3 days in seconds

const Outcome = { UNRESOLVED: 0, YES: 1, NO: 2 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getTimestamp() {
  return BigInt(await time.latest());
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

async function deployFixture() {
  const [owner, treasury, alice, bob, carol] = await ethers.getSigners();

  // Deploy token
  const Token = await ethers.getContractFactory("MockERC20");
  const token = await Token.deploy("Mock USDT", "mUSDT");

  // Deploy factory
  const Factory = await ethers.getContractFactory("MarketFactory");
  const factory = await Factory.deploy(
    await token.getAddress(),
    treasury.address,
    CREATION_FEE,
    TRADE_FEE_BPS,
    MIN_BET,
    REFUND_DELAY
  );

  // Fund users
  for (const user of [alice, bob, carol]) {
    await token.mint(user.address, 1000n * ONE_TOKEN);
    await token.connect(user).approve(await factory.getAddress(), ethers.MaxUint256);
  }

  // Creator (owner) approval
  await token.approve(await factory.getAddress(), ethers.MaxUint256);

  return { owner, treasury, alice, bob, carol, token, factory };
}

async function marketFixture() {
  const base = await deployFixture();
  const { factory } = base;
  const endTime = Number(await getTimestamp()) + 7 * 24 * 3600; // 7 days from now

  const tx = await factory.createMarket(
    "Will BTC hit $200k?",
    "Resolves YES if BTC reaches $200k before end time.",
    "crypto",
    endTime
  );
  const receipt  = await tx.wait();
  const event    = receipt.logs.find((l) => l.fragment?.name === "MarketCreated");
  const marketId = event.args[0];

  return { ...base, marketId, endTime };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MarketFactory – Deployment", function () {
  it("sets constructor parameters correctly", async function () {
    const { factory, token, treasury } = await deployFixture();
    expect(await factory.bettingToken()).to.equal(await token.getAddress());
    expect(await factory.treasury()).to.equal(treasury.address);
    expect(await factory.creationFee()).to.equal(CREATION_FEE);
    expect(await factory.tradeFeePercent()).to.equal(TRADE_FEE_BPS);
    expect(await factory.minBet()).to.equal(MIN_BET);
    expect(await factory.refundDelay()).to.equal(REFUND_DELAY);
  });
});

describe("Market Creation", function () {
  it("creates a market and emits MarketCreated event", async function () {
    const { factory } = await deployFixture();
    const endTime = Number(await getTimestamp()) + 86400;

    await expect(
      factory.createMarket("Test Market", "Description", "crypto", endTime)
    )
      .to.emit(factory, "MarketCreated")
      .withArgs(1n, "Test Market", "crypto", (await ethers.getSigners())[0].address, endTime);
  });

  it("collects creation fee from creator to treasury", async function () {
    const { factory, token, treasury } = await deployFixture();
    const endTime = Number(await getTimestamp()) + 86400;
    const before  = await token.balanceOf(treasury.address);

    await factory.createMarket("Test", "Desc", "crypto", endTime);

    const after = await token.balanceOf(treasury.address);
    expect(after - before).to.equal(CREATION_FEE);
  });

  it("increments marketCount after each creation", async function () {
    const { factory } = await deployFixture();
    const endTime = Number(await getTimestamp()) + 86400;

    await factory.createMarket("A", "D", "crypto", endTime);
    await factory.createMarket("B", "D", "sports", endTime);

    expect(await factory.marketCount()).to.equal(2n);
  });

  it("reverts when end time is in the past", async function () {
    const { factory } = await deployFixture();
    const pastTime = Number(await getTimestamp()) - 1;

    await expect(
      factory.createMarket("Test", "Desc", "crypto", pastTime)
    ).to.be.revertedWith("End time must be in future");
  });

  it("reverts when title is empty", async function () {
    const { factory } = await deployFixture();
    const endTime = Number(await getTimestamp()) + 86400;

    await expect(
      factory.createMarket("", "Desc", "crypto", endTime)
    ).to.be.revertedWith("Title required");
  });

  it("registers market in category index", async function () {
    const { factory } = await deployFixture();
    const endTime = Number(await getTimestamp()) + 86400;

    await factory.createMarket("Market A", "Desc", "crypto", endTime);
    await factory.createMarket("Market B", "Desc", "sports", endTime);
    await factory.createMarket("Market C", "Desc", "crypto", endTime);

    const cryptoIds = await factory.getMarketsByCategory("crypto");
    expect(cryptoIds.length).to.equal(2);

    const sportsIds = await factory.getMarketsByCategory("sports");
    expect(sportsIds.length).to.equal(1);
  });
});

describe("Betting", function () {
  it("places YES bet and updates yesPool", async function () {
    const { factory, alice, marketId } = await marketFixture();
    const betAmount = 10n * ONE_TOKEN;

    await expect(factory.connect(alice).betYes(marketId, betAmount))
      .to.emit(factory, "BetPlaced")
      .withArgs(marketId, alice.address, true, betAmount, (betAmount * TRADE_FEE_BPS) / 10000n);

    const market = await factory.getMarket(marketId);
    const expectedNet = betAmount - (betAmount * TRADE_FEE_BPS) / 10000n;
    expect(market.yesPool).to.equal(expectedNet);
  });

  it("places NO bet and updates noPool", async function () {
    const { factory, bob, marketId } = await marketFixture();
    const betAmount = 20n * ONE_TOKEN;

    await factory.connect(bob).betNo(marketId, betAmount);

    const market   = await factory.getMarket(marketId);
    const expected = betAmount - (betAmount * TRADE_FEE_BPS) / 10000n;
    expect(market.noPool).to.equal(expected);
  });

  it("enforces minimum bet", async function () {
    const { factory, alice, marketId } = await marketFixture();
    const belowMin = MIN_BET - 1n;

    await expect(
      factory.connect(alice).betYes(marketId, belowMin)
    ).to.be.revertedWith("Amount below minimum bet");
  });

  it("sends trade fee to treasury", async function () {
    const { factory, token, treasury, alice, marketId } = await marketFixture();
    const betAmount  = 100n * ONE_TOKEN;
    const expectedFee = (betAmount * TRADE_FEE_BPS) / 10000n;
    const before     = await token.balanceOf(treasury.address);

    await factory.connect(alice).betYes(marketId, betAmount);

    const after = await token.balanceOf(treasury.address);
    expect(after - before).to.equal(expectedFee);
  });

  it("reverts bet after market end time", async function () {
    const { factory, alice, marketId, endTime } = await marketFixture();

    await time.increaseTo(endTime + 1);

    await expect(
      factory.connect(alice).betYes(marketId, MIN_BET)
    ).to.be.revertedWith("Market has ended");
  });

  it("reverts bet on non-existent market", async function () {
    const { factory, alice } = await deployFixture();

    await expect(
      factory.connect(alice).betYes(999n, MIN_BET)
    ).to.be.revertedWith("Market does not exist");
  });

  it("tracks user bet amounts correctly", async function () {
    const { factory, alice, marketId } = await marketFixture();
    const betAmount = 50n * ONE_TOKEN;
    const netAmount = betAmount - (betAmount * TRADE_FEE_BPS) / 10000n;

    await factory.connect(alice).betYes(marketId, betAmount);
    await factory.connect(alice).betNo(marketId, betAmount);

    const bet = await factory.getUserBet(marketId, alice.address);
    expect(bet.yesAmount).to.equal(netAmount);
    expect(bet.noAmount).to.equal(netAmount);
  });
});

describe("Token Approval Flow", function () {
  it("reverts bet when insufficient token allowance", async function () {
    const { factory, token, marketId } = await marketFixture();
    const [, , , , noApprovalUser] = await ethers.getSigners();

    // Mint tokens but do NOT approve
    await token.mint(noApprovalUser.address, 100n * ONE_TOKEN);

    await expect(
      factory.connect(noApprovalUser).betYes(marketId, MIN_BET)
    ).to.be.reverted; // ERC20InsufficientAllowance
  });
});

describe("Market Resolution", function () {
  it("owner resolves market with YES outcome", async function () {
    const { factory, alice, marketId, endTime } = await marketFixture();

    await factory.connect(alice).betYes(marketId, 10n * ONE_TOKEN);
    await time.increaseTo(endTime + 1);

    await expect(factory.resolveMarket(marketId, Outcome.YES))
      .to.emit(factory, "MarketResolved")
      .withArgs(marketId, Outcome.YES);

    const market = await factory.getMarket(marketId);
    expect(market.resolved).to.be.true;
    expect(market.outcome).to.equal(Outcome.YES);
  });

  it("reverts resolution by non-owner", async function () {
    const { factory, alice, marketId } = await marketFixture();

    await expect(
      factory.connect(alice).resolveMarket(marketId, Outcome.YES)
    ).to.be.reverted; // OwnableUnauthorizedAccount
  });

  it("reverts double resolution", async function () {
    const { factory, marketId } = await marketFixture();

    await factory.resolveMarket(marketId, Outcome.YES);

    await expect(
      factory.resolveMarket(marketId, Outcome.NO)
    ).to.be.revertedWith("Already resolved");
  });

  it("reverts resolution with UNRESOLVED outcome", async function () {
    const { factory, marketId } = await marketFixture();

    await expect(
      factory.resolveMarket(marketId, Outcome.UNRESOLVED)
    ).to.be.revertedWith("Invalid outcome");
  });

  it("reverts bet on resolved market", async function () {
    const { factory, alice, marketId } = await marketFixture();

    await factory.resolveMarket(marketId, Outcome.YES);

    await expect(
      factory.connect(alice).betYes(marketId, MIN_BET)
    ).to.be.revertedWith("Market already resolved");
  });
});

describe("Claim Winnings", function () {
  it("allows winner to claim proportional payout", async function () {
    const { factory, token, alice, bob, marketId } = await marketFixture();

    const aliceBet = 100n * ONE_TOKEN;
    const bobBet   = 50n  * ONE_TOKEN;

    await factory.connect(alice).betYes(marketId, aliceBet);
    await factory.connect(bob).betNo(marketId, bobBet);

    await factory.resolveMarket(marketId, Outcome.YES);

    const aliceNet  = aliceBet - (aliceBet * TRADE_FEE_BPS) / 10000n;
    const bobNet    = bobBet   - (bobBet   * TRADE_FEE_BPS) / 10000n;
    const totalPool = aliceNet + bobNet;

    const before  = await token.balanceOf(alice.address);
    await factory.connect(alice).claim(marketId);
    const after   = await token.balanceOf(alice.address);

    // Alice bet all of yes pool, so she gets 100% of total pool
    expect(after - before).to.equal(totalPool);
  });

  it("distributes pool proportionally among multiple winners", async function () {
    const { factory, token, alice, bob, carol, marketId } = await marketFixture();

    // Alice and Bob both bet YES; Carol bets NO
    await factory.connect(alice).betYes(marketId, 100n * ONE_TOKEN);
    await factory.connect(bob).betYes(marketId,   100n * ONE_TOKEN);
    await factory.connect(carol).betNo(marketId,  100n * ONE_TOKEN);

    await factory.resolveMarket(marketId, Outcome.YES);

    const market = await factory.getMarket(marketId);
    const total  = market.yesPool + market.noPool;

    const aliceBefore = await token.balanceOf(alice.address);
    await factory.connect(alice).claim(marketId);
    const aliceAfter = await token.balanceOf(alice.address);

    const alicePayout = aliceAfter - aliceBefore;
    // Alice has 50% of yesPool → gets 50% of total pool
    const expectedPayout = (market.yesPool / 2n * total) / market.yesPool;
    expect(alicePayout).to.be.closeTo(expectedPayout, ONE_TOKEN / 100n);
  });

  it("prevents double claiming", async function () {
    const { factory, alice, marketId } = await marketFixture();

    await factory.connect(alice).betYes(marketId, 10n * ONE_TOKEN);
    await factory.resolveMarket(marketId, Outcome.YES);
    await factory.connect(alice).claim(marketId);

    await expect(
      factory.connect(alice).claim(marketId)
    ).to.be.revertedWith("Already claimed");
  });

  it("reverts claim with no winning bet", async function () {
    const { factory, alice, bob, marketId } = await marketFixture();

    await factory.connect(alice).betYes(marketId, 10n * ONE_TOKEN);
    await factory.connect(bob).betNo(marketId, 10n * ONE_TOKEN);
    await factory.resolveMarket(marketId, Outcome.NO); // NO wins

    await expect(
      factory.connect(alice).claim(marketId) // Alice bet YES → no winning bet
    ).to.be.revertedWith("No winning bet to claim");
  });

  it("reverts claim before resolution", async function () {
    const { factory, alice, marketId } = await marketFixture();

    await factory.connect(alice).betYes(marketId, 10n * ONE_TOKEN);

    await expect(
      factory.connect(alice).claim(marketId)
    ).to.be.revertedWith("Market not resolved");
  });
});

describe("Refund System", function () {
  it("allows refund after endTime + refundDelay", async function () {
    const { factory, token, alice, marketId, endTime } = await marketFixture();
    const betAmount = 20n * ONE_TOKEN;

    await factory.connect(alice).betYes(marketId, betAmount);
    const netAmount = betAmount - (betAmount * TRADE_FEE_BPS) / 10000n;

    // Fast-forward past endTime + refundDelay
    await time.increaseTo(Number(endTime) + Number(REFUND_DELAY) + 1);

    const before = await token.balanceOf(alice.address);
    await expect(factory.connect(alice).refund(marketId))
      .to.emit(factory, "Refunded")
      .withArgs(marketId, alice.address, netAmount);

    const after = await token.balanceOf(alice.address);
    expect(after - before).to.equal(netAmount);
  });

  it("refunds both yes and no bets", async function () {
    const { factory, token, alice, marketId, endTime } = await marketFixture();

    const yesBet = 10n * ONE_TOKEN;
    const noBet  = 15n * ONE_TOKEN;
    await factory.connect(alice).betYes(marketId, yesBet);
    await factory.connect(alice).betNo(marketId, noBet);

    const yesNet  = yesBet - (yesBet * TRADE_FEE_BPS) / 10000n;
    const noNet   = noBet  - (noBet  * TRADE_FEE_BPS) / 10000n;
    const totalNet = yesNet + noNet;

    await time.increaseTo(Number(endTime) + Number(REFUND_DELAY) + 1);

    const before = await token.balanceOf(alice.address);
    await factory.connect(alice).refund(marketId);
    const after = await token.balanceOf(alice.address);

    expect(after - before).to.equal(totalNet);
  });

  it("reverts refund before delay passes", async function () {
    const { factory, alice, marketId, endTime } = await marketFixture();

    await factory.connect(alice).betYes(marketId, MIN_BET);
    await time.increaseTo(endTime + 1); // past endTime but not past refundDelay

    await expect(
      factory.connect(alice).refund(marketId)
    ).to.be.revertedWith("Refund delay has not passed");
  });

  it("reverts refund when market is resolved", async function () {
    const { factory, alice, marketId } = await marketFixture();

    await factory.connect(alice).betYes(marketId, MIN_BET);
    await factory.resolveMarket(marketId, Outcome.YES);

    await expect(
      factory.connect(alice).refund(marketId)
    ).to.be.revertedWith("Market is already resolved");
  });

  it("prevents double refund", async function () {
    const { factory, alice, marketId, endTime } = await marketFixture();

    await factory.connect(alice).betYes(marketId, MIN_BET);
    await time.increaseTo(Number(endTime) + Number(REFUND_DELAY) + 1);

    await factory.connect(alice).refund(marketId);

    await expect(
      factory.connect(alice).refund(marketId)
    ).to.be.revertedWith("Already claimed or refunded");
  });
});

describe("Fee Logic", function () {
  it("calculates zero fee when tradeFeePercent is 0", async function () {
    const { owner, token, treasury, alice } = await deployFixture();

    const Factory = await ethers.getContractFactory("MarketFactory");
    const freeFactory = await Factory.deploy(
      await token.getAddress(),
      treasury.address,
      0n,
      0n,        // 0% trade fee
      MIN_BET,
      REFUND_DELAY
    );

    await token.connect(alice).approve(await freeFactory.getAddress(), ethers.MaxUint256);
    const endTime = Number(await getTimestamp()) + 86400;
    await freeFactory.createMarket("Free Test", "Desc", "crypto", endTime);

    const betAmount = 10n * ONE_TOKEN;
    const before    = await token.balanceOf(treasury.address);

    await freeFactory.connect(alice).betYes(1n, betAmount);

    const after = await token.balanceOf(treasury.address);
    expect(after - before).to.equal(0n);

    const market = await freeFactory.getMarket(1n);
    expect(market.yesPool).to.equal(betAmount);
  });

  it("applies correct basis-point fee calculation", async function () {
    const { factory, token, treasury, alice, marketId } = await marketFixture();
    const betAmount  = 1000n * ONE_TOKEN;
    const expectedFee = (betAmount * TRADE_FEE_BPS) / 10000n; // 0.5%

    const before = await token.balanceOf(treasury.address);
    await factory.connect(alice).betYes(marketId, betAmount);
    const after = await token.balanceOf(treasury.address);

    expect(after - before).to.equal(expectedFee); // 5 tokens on 1000 bet
  });
});

describe("Admin Functions", function () {
  it("owner can update treasury", async function () {
    const { factory, alice } = await deployFixture();
    await factory.setTreasury(alice.address);
    expect(await factory.treasury()).to.equal(alice.address);
  });

  it("owner can update creation fee", async function () {
    const { factory } = await deployFixture();
    await factory.setCreationFee(10n * ONE_TOKEN);
    expect(await factory.creationFee()).to.equal(10n * ONE_TOKEN);
  });

  it("reverts when non-owner tries to update settings", async function () {
    const { factory, alice } = await deployFixture();
    await expect(
      factory.connect(alice).setTreasury(alice.address)
    ).to.be.reverted;
  });

  it("reverts trade fee above 10%", async function () {
    const { factory } = await deployFixture();
    await expect(
      factory.setTradeFeePercent(1001n) // > 1000 bps = 10%
    ).to.be.revertedWith("Fee exceeds 10%");
  });
});
