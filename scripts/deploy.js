const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");

  const network = await ethers.provider.getNetwork();
  const isLocalOrTestnet = network.chainId === 31337n || network.chainId === 97n;

  // ─── Token ───────────────────────────────────────────────────────────────

  let tokenAddress = process.env.TOKEN_ADDRESS;

  if (!tokenAddress || isLocalOrTestnet) {
    console.log("\nDeploying MockERC20 (USDT mock)...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Mock USDT", "mUSDT");
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    console.log("MockERC20 deployed to:", tokenAddress);
  } else {
    console.log("\nUsing existing token:", tokenAddress);
  }

  // ─── Parameters ──────────────────────────────────────────────────────────

  const DECIMALS = 18n;
  const toWei = (amount) => BigInt(Math.round(Number(amount) * 1e6)) * (10n ** (DECIMALS - 6n));

  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  const creationFeeRaw  = process.env.CREATION_FEE       || "5";
  const tradeFeeRaw     = process.env.TRADE_FEE_PERCENT  || "0.5";
  const minBetRaw       = process.env.MIN_BET             || "1";
  const refundDelay     = BigInt(process.env.REFUND_DELAY || "259200");

  const creationFee     = toWei(creationFeeRaw);
  const tradeFeePercent = BigInt(Math.round(Number(tradeFeeRaw) * 100)); // 0.5% → 50 bps
  const minBet          = toWei(minBetRaw);

  console.log("\nDeployment parameters:");
  console.log("  Treasury:        ", treasuryAddress);
  console.log("  Creation Fee:    ", ethers.formatEther(creationFee), "tokens");
  console.log("  Trade Fee:       ", tradeFeePercent.toString(), "bps");
  console.log("  Min Bet:         ", ethers.formatEther(minBet), "tokens");
  console.log("  Refund Delay:    ", refundDelay.toString(), "seconds");

  // ─── MarketFactory ───────────────────────────────────────────────────────

  console.log("\nDeploying MarketFactory...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const factory = await MarketFactory.deploy(
    tokenAddress,
    treasuryAddress,
    creationFee,
    tradeFeePercent,
    minBet,
    refundDelay
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("MarketFactory deployed to:", factoryAddress);

  // ─── Seed demo markets on local/testnet ──────────────────────────────────

  if (isLocalOrTestnet) {
    console.log("\nSeeding demo markets...");

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = MockERC20.attach(tokenAddress);

    // Approve creation fees for 5 markets
    const approveTx = await token.approve(factoryAddress, creationFee * 10n);
    await approveTx.wait();

    const demoMarkets = [
      {
        title: "Will Bitcoin reach $200,000 before 2027?",
        description: "This market resolves YES if BTC/USD price reaches $200,000 on any major exchange before January 1, 2027.",
        category: "crypto",
        endTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90, // 90 days
      },
      {
        title: "Will Ethereum complete its next major upgrade in 2025?",
        description: "Resolves YES if Ethereum successfully deploys a major network upgrade (e.g., Pectra) by December 31, 2025.",
        category: "crypto",
        endTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 120,
      },
      {
        title: "Will AI surpass human performance on all major benchmarks by end of 2025?",
        description: "Resolves YES if a publicly available AI system achieves superhuman performance on all MMLU, HumanEval, and GPQA benchmarks.",
        category: "AI",
        endTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 60,
      },
      {
        title: "Will the S&P 500 close above 6000 by Q2 2025?",
        description: "Resolves YES if the S&P 500 index closes at or above 6000 points on any trading day before July 1, 2025.",
        category: "finance",
        endTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 45,
      },
      {
        title: "Will global inflation drop below 3% in 2025?",
        description: "Resolves YES if the IMF global inflation rate drops below 3% for any single month in 2025.",
        category: "politics",
        endTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180,
      },
    ];

    for (const m of demoMarkets) {
      const tx = await factory.createMarket(m.title, m.description, m.category, m.endTime);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (l) => l.fragment && l.fragment.name === "MarketCreated"
      );
      const marketId = event ? event.args[0] : "?";
      console.log(`  Created market #${marketId}: ${m.title.slice(0, 40)}...`);
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log("\n========================================");
  console.log("Deployment complete!");
  console.log("========================================");
  console.log("Network:            ", network.name, `(chainId: ${network.chainId})`);
  console.log("Token address:      ", tokenAddress);
  console.log("MarketFactory:      ", factoryAddress);
  console.log("Treasury:           ", treasuryAddress);
  console.log("\nAdd to frontend .env.local:");
  console.log(`NEXT_PUBLIC_CHAIN_ID=${network.chainId}`);
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${factoryAddress}`);
  console.log(`NEXT_PUBLIC_CREATION_FEE=${creationFeeRaw}`);
  console.log(`NEXT_PUBLIC_TRADE_FEE=${tradeFeeRaw}`);
  console.log(`NEXT_PUBLIC_MIN_BET=${minBetRaw}`);
  console.log(`NEXT_PUBLIC_REFUND_DELAY=${refundDelay}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
