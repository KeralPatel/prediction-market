// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @dev ERC20 token for local testing and testnet deployments.
 *      Anyone can call faucet() to get test tokens.
 */
contract MockERC20 is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 1000 * 1e18; // 1000 tokens per drip

    constructor(string memory name, string memory symbol)
        ERC20(name, symbol)
        Ownable(msg.sender)
    {
        // Mint 1 million tokens to deployer
        _mint(msg.sender, 1_000_000 * 1e18);
    }

    /// @dev Anyone can call faucet to receive test tokens
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @dev Owner can mint arbitrary amounts
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
