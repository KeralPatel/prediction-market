// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PredictionMarket
 * @dev Core prediction market contract. Handles betting, resolution, claiming, and refunds.
 *      All markets are stored in a single contract using a marketId mapping.
 *      MarketFactory inherits this contract and adds registry functionality.
 */
contract PredictionMarket is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    IERC20 public immutable bettingToken;

    address public treasury;
    uint256 public creationFee;      // in token smallest units (wei)
    uint256 public tradeFeePercent;  // basis points: 50 = 0.5%
    uint256 public minBet;           // in token smallest units (wei)
    uint256 public refundDelay;      // seconds after endTime before refund is available

    uint256 public marketCount;

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    enum Outcome {
        UNRESOLVED, // 0
        YES,        // 1
        NO          // 2
    }

    struct Market {
        uint256 id;
        string  title;
        string  description;
        string  category;
        address creator;
        uint256 endTime;
        uint256 yesPool;
        uint256 noPool;
        bool    resolved;
        Outcome outcome;
        uint256 createdAt;
        uint256 totalVolume; // cumulative bet amounts (before fees)
    }

    struct Bet {
        uint256 yesAmount; // net amount in yes pool
        uint256 noAmount;  // net amount in no pool
        bool    claimed;
    }

    // marketId => Market
    mapping(uint256 => Market) public markets;
    // marketId => user => Bet
    mapping(uint256 => mapping(address => Bet)) public bets;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event MarketCreated(
        uint256 indexed marketId,
        string  title,
        string  category,
        address indexed creator,
        uint256 endTime
    );

    event BetPlaced(
        uint256 indexed marketId,
        address indexed bettor,
        bool    isYes,
        uint256 grossAmount,
        uint256 fee
    );

    event MarketResolved(
        uint256 indexed marketId,
        Outcome outcome
    );

    event Claimed(
        uint256 indexed marketId,
        address indexed claimer,
        uint256 amount
    );

    event Refunded(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(
        address _bettingToken,
        address _treasury,
        uint256 _creationFee,
        uint256 _tradeFeePercent,
        uint256 _minBet,
        uint256 _refundDelay
    ) Ownable(msg.sender) {
        require(_bettingToken != address(0), "Invalid token");
        require(_treasury    != address(0), "Invalid treasury");
        require(_tradeFeePercent <= 1000,   "Fee exceeds 10%");

        bettingToken     = IERC20(_bettingToken);
        treasury         = _treasury;
        creationFee      = _creationFee;
        tradeFeePercent  = _tradeFeePercent;
        minBet           = _minBet;
        refundDelay      = _refundDelay;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal market creation logic (no nonReentrant – caller adds it)
    // ─────────────────────────────────────────────────────────────────────────

    function _createMarketLogic(
        string memory title,
        string memory description,
        string memory category,
        uint256 endTime,
        address creator
    ) internal returns (uint256 marketId) {
        require(endTime > block.timestamp,      "End time must be in future");
        require(bytes(title).length > 0,        "Title required");
        require(bytes(category).length > 0,     "Category required");

        // Collect creation fee from creator → treasury
        if (creationFee > 0) {
            bettingToken.safeTransferFrom(creator, treasury, creationFee);
        }

        marketId = ++marketCount;
        markets[marketId] = Market({
            id:          marketId,
            title:       title,
            description: description,
            category:    category,
            creator:     creator,
            endTime:     endTime,
            yesPool:     0,
            noPool:      0,
            resolved:    false,
            outcome:     Outcome.UNRESOLVED,
            createdAt:   block.timestamp,
            totalVolume: 0
        });

        emit MarketCreated(marketId, title, category, creator, endTime);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public market creation (virtual so MarketFactory can override)
    // ─────────────────────────────────────────────────────────────────────────

    function createMarket(
        string calldata title,
        string calldata description,
        string calldata category,
        uint256 endTime
    ) external virtual nonReentrant returns (uint256) {
        return _createMarketLogic(title, description, category, endTime, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Betting
    // ─────────────────────────────────────────────────────────────────────────

    function betYes(uint256 marketId, uint256 amount) external nonReentrant {
        _placeBet(marketId, amount, true, msg.sender);
    }

    function betNo(uint256 marketId, uint256 amount) external nonReentrant {
        _placeBet(marketId, amount, false, msg.sender);
    }

    function _placeBet(
        uint256 marketId,
        uint256 amount,
        bool    isYes,
        address bettor
    ) internal {
        Market storage market = markets[marketId];
        require(market.id != 0,                             "Market does not exist");
        require(block.timestamp < market.endTime,           "Market has ended");
        require(!market.resolved,                           "Market already resolved");
        require(amount >= minBet,                           "Amount below minimum bet");

        uint256 fee       = (amount * tradeFeePercent) / 10000;
        uint256 netAmount = amount - fee;

        // Pull full amount into this contract first, then forward fee
        bettingToken.safeTransferFrom(bettor, address(this), amount);
        if (fee > 0) {
            bettingToken.safeTransfer(treasury, fee);
        }

        if (isYes) {
            market.yesPool              += netAmount;
            bets[marketId][bettor].yesAmount += netAmount;
        } else {
            market.noPool               += netAmount;
            bets[marketId][bettor].noAmount  += netAmount;
        }

        market.totalVolume += amount;

        emit BetPlaced(marketId, bettor, isYes, amount, fee);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Resolution
    // ─────────────────────────────────────────────────────────────────────────

    function resolveMarket(uint256 marketId, Outcome outcome) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.id != 0,          "Market does not exist");
        require(!market.resolved,        "Already resolved");
        require(outcome != Outcome.UNRESOLVED, "Invalid outcome");

        market.resolved = true;
        market.outcome  = outcome;

        emit MarketResolved(marketId, outcome);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Claim winnings
    // ─────────────────────────────────────────────────────────────────────────

    function claim(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved");

        Bet storage bet = bets[marketId][msg.sender];
        require(!bet.claimed, "Already claimed");

        uint256 winningBet;
        uint256 winningPool;

        if (market.outcome == Outcome.YES) {
            winningBet  = bet.yesAmount;
            winningPool = market.yesPool;
        } else {
            winningBet  = bet.noAmount;
            winningPool = market.noPool;
        }

        require(winningBet > 0, "No winning bet to claim");

        uint256 totalPool = market.yesPool + market.noPool;
        // payout = (userBet / winningPool) * totalPool
        uint256 payout = (winningBet * totalPool) / winningPool;

        bet.claimed = true;
        bettingToken.safeTransfer(msg.sender, payout);

        emit Claimed(marketId, msg.sender, payout);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Refund (when market is not resolved after endTime + refundDelay)
    // ─────────────────────────────────────────────────────────────────────────

    function refund(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.id != 0,         "Market does not exist");
        require(!market.resolved,       "Market is already resolved");
        require(
            block.timestamp > market.endTime + refundDelay,
            "Refund delay has not passed"
        );

        Bet storage bet = bets[marketId][msg.sender];
        require(!bet.claimed, "Already claimed or refunded");

        uint256 total = bet.yesAmount + bet.noAmount;
        require(total > 0, "Nothing to refund");

        bet.claimed = true;
        bettingToken.safeTransfer(msg.sender, total);

        emit Refunded(marketId, msg.sender, total);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View functions
    // ─────────────────────────────────────────────────────────────────────────

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getUserBet(uint256 marketId, address user) external view returns (Bet memory) {
        return bets[marketId][user];
    }

    function getAllMarkets() external view returns (Market[] memory) {
        Market[] memory result = new Market[](marketCount);
        for (uint256 i = 1; i <= marketCount; i++) {
            result[i - 1] = markets[i];
        }
        return result;
    }

    function getMarketProbabilities(uint256 marketId)
        external
        view
        returns (uint256 yesProbBps, uint256 noProbBps)
    {
        Market storage market = markets[marketId];
        uint256 total = market.yesPool + market.noPool;
        if (total == 0) return (5000, 5000); // 50/50 default
        yesProbBps = (market.yesPool * 10000) / total;
        noProbBps  = 10000 - yesProbBps;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin configuration
    // ─────────────────────────────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    function setCreationFee(uint256 _creationFee) external onlyOwner {
        creationFee = _creationFee;
    }

    function setTradeFeePercent(uint256 _tradeFeePercent) external onlyOwner {
        require(_tradeFeePercent <= 1000, "Fee exceeds 10%");
        tradeFeePercent = _tradeFeePercent;
    }

    function setMinBet(uint256 _minBet) external onlyOwner {
        minBet = _minBet;
    }

    function setRefundDelay(uint256 _refundDelay) external onlyOwner {
        refundDelay = _refundDelay;
    }
}
