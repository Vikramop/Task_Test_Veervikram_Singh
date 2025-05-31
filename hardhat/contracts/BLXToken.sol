// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BLXToken is ERC20, Ownable {
    uint256 public maxTxAmount;
    uint256 public cooldownTime = 60; // 60 seconds cooldown
    mapping(address => uint256) private lastTxTime;
    mapping(address => bool) private _isExcludedFromCooldown;

    constructor(
        uint256 initialSupply
    ) Ownable(msg.sender) ERC20("BLUME Token", "BLX") {
        _mint(msg.sender, initialSupply * 10 ** decimals());
        maxTxAmount = (initialSupply * 10 ** decimals()) / 100; // 1% maxTxAmount with decimals

        // Exclude deployer/owner from cooldown
        _isExcludedFromCooldown[msg.sender] = true;
    }

    modifier antiWhale(address sender, uint256 amount) {
        require(
            amount <= maxTxAmount,
            "BLX: Transfer amount exceeds maxTxAmount"
        );
        _;
    }

    modifier antiBot(address sender) {
        if (!_isExcludedFromCooldown[sender]) {
            require(
                block.timestamp - lastTxTime[sender] >= cooldownTime,
                "BLX: Please wait before making another transaction"
            );
            _;
            lastTxTime[sender] = block.timestamp;
        } else {
            _; // Skip cooldown check for excluded addresses
        }
    }

    function transfer(
        address to,
        uint256 amount
    )
        public
        override
        antiWhale(msg.sender, amount)
        antiBot(msg.sender)
        returns (bool)
    {
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override antiWhale(from, amount) antiBot(from) returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function setMaxTxAmount(uint256 newMaxTxAmount) external onlyOwner {
        maxTxAmount = newMaxTxAmount;
    }

    function setCooldownTime(uint256 newCooldownTime) external onlyOwner {
        cooldownTime = newCooldownTime;
    }

    function setCooldownExcluded(
        address account,
        bool excluded
    ) external onlyOwner {
        _isExcludedFromCooldown[account] = excluded;
    }
}
