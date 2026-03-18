// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PredictionMarket.sol";

/**
 * @title MarketFactory
 * @dev Extends PredictionMarket with factory registry: tracks market IDs by creator
 *      and category, and emits a higher-level registry for fast enumeration.
 *      This is the contract that should be deployed.
 */
contract MarketFactory is PredictionMarket {

    // ─────────────────────────────────────────────────────────────────────────
    // Registry state
    // ─────────────────────────────────────────────────────────────────────────

    uint256[] private _allMarketIds;

    mapping(address => uint256[]) private _creatorMarkets;
    mapping(string  => uint256[]) private _categoryMarkets;

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
    )
        PredictionMarket(
            _bettingToken,
            _treasury,
            _creationFee,
            _tradeFeePercent,
            _minBet,
            _refundDelay
        )
    {}

    // ─────────────────────────────────────────────────────────────────────────
    // Override createMarket to register in factory indices
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev Creates a new prediction market and registers it in factory indices.
     *      Caller must have approved this contract for at least `creationFee` tokens.
     */
    function createMarket(
        string calldata title,
        string calldata description,
        string calldata category,
        uint256 endTime
    ) external override nonReentrant returns (uint256 marketId) {
        marketId = _createMarketLogic(title, description, category, endTime, msg.sender);

        _allMarketIds.push(marketId);
        _creatorMarkets[msg.sender].push(marketId);
        _categoryMarkets[category].push(marketId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Registry view functions
    // ─────────────────────────────────────────────────────────────────────────

    function getAllMarketIds() external view returns (uint256[] memory) {
        return _allMarketIds;
    }

    function getTotalMarketCount() external view returns (uint256) {
        return _allMarketIds.length;
    }

    function getMarketsByCreator(address creator) external view returns (uint256[] memory) {
        return _creatorMarkets[creator];
    }

    function getMarketsByCategory(string calldata category) external view returns (uint256[] memory) {
        return _categoryMarkets[category];
    }

    /**
     * @dev Returns a paginated slice of all markets.
     * @param offset Starting index (0-based)
     * @param limit  Maximum number of markets to return
     */
    function getMarketsPaginated(uint256 offset, uint256 limit)
        external
        view
        returns (Market[] memory result, uint256 total)
    {
        total = _allMarketIds.length;
        if (offset >= total) return (new Market[](0), total);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        result = new Market[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = markets[_allMarketIds[offset + i]];
        }
    }
}
