// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./BetCOFI.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * BetFactoryCOFI - Factory contract for deploying BetCOFI instances
 * Deployed once, then anyone can create bets through it
 * The factory deployer becomes the house address for all bets
 */
contract BetFactoryCOFI {
    // Immutable configuration
    address public immutable house;
    address public immutable usdcToken;
    address public immutable oracleAddress;   // Oracle contract address

    // All deployed bets
    address[] public allBets;

    // Registry to verify legitimate bets
    mapping(address => bool) public deployedBets;

    // Events
    event BetCreated(
        address indexed betAddress,
        address indexed creator,
        string title,
        uint256 endDate
    );

    event BetPlaced(
        address indexed betAddress,
        address indexed bettor,
        bool onSideA,
        uint256 amount
    );

    /**
     * @dev Constructor - sets house, USDC, and oracle configuration
     * @param _usdcToken Address of USDC token contract
     * @param _oracleAddress Oracle contract address
     */
    constructor(
        address _usdcToken,
        address _oracleAddress
    ) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_oracleAddress != address(0), "Invalid oracle address");

        house = msg.sender;  // Factory deployer becomes house
        usdcToken = _usdcToken;
        oracleAddress = _oracleAddress;
    }

    /**
     * @dev Create a new bet
     * @param title Bet title
     * @param description Bet description
     * @param sideAName Name of side A
     * @param sideBName Name of side B
     * @param endDate Timestamp when betting closes
     * @return Address of newly deployed BetCOFI contract
     */
    function createBet(
        string memory title,
        string memory description,
        string memory sideAName,
        string memory sideBName,
        uint256 endDate
    ) external returns (address) {
        // Deploy new BetCOFI contract
        BetCOFI bet = new BetCOFI(
            msg.sender,      // creator = transaction sender
            title,
            description,
            sideAName,
            sideBName,
            endDate,
            house,           // house = factory deployer
            usdcToken,       // USDC address from factory
            address(this)    // factory = this contract (also owner for OApp)
        );

        address betAddress = address(bet);

        // Configure LayerZero peer for the new bet (Base Sepolia loopback)
        // Factory is owner of bet, so it can call setPeer
        bytes32 oraclePeer = bytes32(uint256(uint160(oracleAddress)));
        bet.setPeer(40245, oraclePeer);  // 40245 = Base Sepolia EID

        allBets.push(betAddress);
        deployedBets[betAddress] = true;

        emit BetCreated(betAddress, msg.sender, title, endDate);

        return betAddress;
    }

    /**
     * @dev Get all deployed bets
     * @return Array of all bet addresses
     */
    function getAllBets() external view returns (address[] memory) {
        return allBets;
    }

    /**
     * @dev Get total number of bets created
     * @return Number of bets
     */
    function getBetCount() external view returns (uint256) {
        return allBets.length;
    }

    /**
     * @dev Verify if a bet was deployed by this factory
     * @param betAddress Address to check
     * @return True if legitimate, false if potentially malicious
     */
    function isLegitBet(address betAddress) external view returns (bool) {
        return deployedBets[betAddress];
    }

    /**
     * @dev Place bet via factory (user approves factory once for all bets)
     * @param betAddress Address of bet contract
     * @param onSideA True to bet on side A, false for side B
     * @param amount USDC amount to bet (6 decimals)
     */
    function placeBet(address betAddress, bool onSideA, uint256 amount) external {
        require(deployedBets[betAddress], "Bet not from this factory");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer USDC from user to bet contract
        require(
            IERC20(usdcToken).transferFrom(msg.sender, betAddress, amount),
            "USDC transfer failed"
        );

        // Tell bet contract to record the bet
        BetCOFI bet = BetCOFI(betAddress);
        if (onSideA) {
            bet.betOnSideAViaFactory(msg.sender, amount);
        } else {
            bet.betOnSideBViaFactory(msg.sender, amount);
        }

        emit BetPlaced(betAddress, msg.sender, onSideA, amount);
    }
}
