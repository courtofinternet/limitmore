// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IBetFactoryCOFI {
    function forwardResolutionRequest() external;
}

/**
 * BetCOFI - COFI (Court of Internet) binary prediction market contract
 * Each bet is deployed as a separate contract instance
 * Anyone can bet on side A or B until the end date
 * Creator marks bet for resolution, GenLayer oracle resolves via bridge
 * Factory acts as trusted gatekeeper for oracle resolutions
 * Winners claim proportional share of losing side's pool
 * Enhanced with reentrancy protection and ERC20 validation
 */
contract BetCOFI is ReentrancyGuard, Ownable {
    // Bet status states
    enum BetStatus {
        ACTIVE,       // Betting is open
        RESOLVING,    // Resolution requested, awaiting oracle response
        RESOLVED,     // Final outcome received and set
        UNDETERMINED  // Cancelled/unresolvable - full refunds available
    }

    // Bet metadata
    address public immutable creator;
    string public title;
    string public description;
    string public sideAName;
    string public sideBName;
    uint256 public immutable creationDate;
    uint256 public immutable endDate;
    address public immutable factory;
    IERC20 public immutable token; // USDC token contract

    // Resolution timeout for cancelBet()
    uint256 private constant RESOLUTION_TIMEOUT = 7 days;

    // Bet state
    bool public resolved;
    bool public winnerSideA; // true if side A wins, false if side B wins
    BetStatus public status;
    uint256 public resolutionTimestamp; // When resolve() was called (for timeout)

    // Betting pools
    uint256 public totalSideA;
    uint256 public totalSideB;
    mapping(address => uint256) public betsOnSideA;
    mapping(address => uint256) public betsOnSideB;

    // Claim tracking
    mapping(address => bool) public hasClaimed;

    // Events
    event BetPlacedOnA(address indexed bettor, uint256 amount);
    event BetPlacedOnB(address indexed bettor, uint256 amount);
    event BetResolved(bool sideAWins, uint256 timestamp);
    event BetUndetermined(uint256 timestamp);
    event WinningsClaimed(address indexed winner, uint256 amount);
    event ResolutionReceived(bool sideAWins);

    /**
     * @dev Constructor called by factory when deploying new bet
     * @param _creator Address of bet creator (can resolve the bet)
     * @param _title Title of the bet
     * @param _description Detailed description
     * @param _sideAName Name/description of side A
     * @param _sideBName Name/description of side B
     * @param _endDate Timestamp when betting closes
     * @param _token Address of USDC token contract
     * @param _factory Address of factory contract (trusted gatekeeper)
     */
    constructor(
        address _creator,
        string memory _title,
        string memory _description,
        string memory _sideAName,
        string memory _sideBName,
        uint256 _endDate,
        address _token,
        address _factory
    ) Ownable(_factory) {
        require(_creator != address(0), "Invalid creator address");
        require(_token != address(0), "Invalid token address");
        require(_factory != address(0), "Invalid factory address");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_sideAName).length > 0, "Side A name cannot be empty");
        require(bytes(_sideBName).length > 0, "Side B name cannot be empty");

        creator = _creator;
        title = _title;
        description = _description;
        sideAName = _sideAName;
        sideBName = _sideBName;
        creationDate = block.timestamp;
        endDate = _endDate;
        factory = _factory;
        token = IERC20(_token);
        status = BetStatus.ACTIVE;
    }

    /**
     * @dev Bet on side A via factory (no per-bet approval needed)
     * @param bettor Actual user placing bet
     * @param amount Amount already transferred by factory to this contract
     */
    function betOnSideAViaFactory(address bettor, uint256 amount) external {
        require(msg.sender == factory, "Only factory can call");
        require(block.timestamp < endDate, "Betting has ended");
        require(status == BetStatus.ACTIVE, "Bet not active");
        require(amount > 0, "Must bet more than 0");

        // Factory already transferred USDC to this contract
        betsOnSideA[bettor] += amount;
        totalSideA += amount;

        emit BetPlacedOnA(bettor, amount);
    }

    /**
     * @dev Bet on side B via factory (no per-bet approval needed)
     * @param bettor Actual user placing bet
     * @param amount Amount already transferred by factory to this contract
     */
    function betOnSideBViaFactory(address bettor, uint256 amount) external {
        require(msg.sender == factory, "Only factory can call");
        require(block.timestamp < endDate, "Betting has ended");
        require(status == BetStatus.ACTIVE, "Bet not active");
        require(amount > 0, "Must bet more than 0");

        betsOnSideB[bettor] += amount;
        totalSideB += amount;

        emit BetPlacedOnB(bettor, amount);
    }

    /**
     * @dev Mark bet for resolution (only creator, after end date)
     * Forwards to factory which emits ResolutionRequested event
     * GenLayer oracle monitors factory and sends resolution via bridge
     */
    function resolve() external {
        require(msg.sender == creator, "Only creator can resolve");
        require(block.timestamp >= endDate, "Cannot resolve before end date");
        require(status == BetStatus.ACTIVE, "Bet not active");

        status = BetStatus.RESOLVING;
        resolutionTimestamp = block.timestamp;

        IBetFactoryCOFI(factory).forwardResolutionRequest();
    }

    /**
     * @dev Receive oracle resolution via factory (which receives from GenLayer bridge)
     * Factory acts as trusted gatekeeper - it verifies the source before calling this
     * @param _message The encoded resolution data
     */
    function setResolution(bytes calldata _message) external {
        require(msg.sender == factory, "Only factory can dispatch");

        (
            address betAddress,
            bool sideAWins,
            bool isUndetermined,
            ,  // timestamp - not used
               // requestId - not used
        ) = abi.decode(_message, (address, bool, bool, uint256, bytes32));

        require(betAddress == address(this), "Response for wrong bet");
        require(status == BetStatus.RESOLVING, "Not awaiting resolution");

        resolved = true;

        // Check for UNDETERMINED conditions:
        // 1. Oracle explicitly marked as undetermined
        // 2. Winning side has 0 bettors (auto-detect)
        if (isUndetermined ||
            (sideAWins && totalSideA == 0) ||
            (!sideAWins && totalSideB == 0)) {
            status = BetStatus.UNDETERMINED;
            emit BetUndetermined(block.timestamp);
        } else {
            winnerSideA = sideAWins;
            status = BetStatus.RESOLVED;
            emit BetResolved(sideAWins, block.timestamp);
        }

        emit ResolutionReceived(sideAWins);
    }

    /**
     * @dev Claim winnings after bet is resolved, or refund if undetermined
     * - RESOLVED: Winners receive proportional share of losing pool
     * - UNDETERMINED: All bettors receive full refund
     * Protected against reentrancy attacks
     */
    function claim() external nonReentrant {
        require(resolved, "Bet not resolved yet");
        require(!hasClaimed[msg.sender], "Already claimed");

        uint256 payout = 0;

        if (status == BetStatus.UNDETERMINED) {
            // UNDETERMINED: Full refund of all bets placed
            uint256 userBetOnA = betsOnSideA[msg.sender];
            uint256 userBetOnB = betsOnSideB[msg.sender];
            payout = userBetOnA + userBetOnB;
            require(payout > 0, "No bet to refund");
        } else if (winnerSideA) {
            // Side A won - proportional winnings
            uint256 userBetOnA = betsOnSideA[msg.sender];
            require(userBetOnA > 0, "No winning bet to claim");
            uint256 winningsShare = (userBetOnA * totalSideB) / totalSideA;
            payout = userBetOnA + winningsShare;
        } else {
            // Side B won - proportional winnings
            uint256 userBetOnB = betsOnSideB[msg.sender];
            require(userBetOnB > 0, "No winning bet to claim");
            uint256 winningsShare = (userBetOnB * totalSideA) / totalSideB;
            payout = userBetOnB + winningsShare;
        }

        // Update state BEFORE external call (Checks-Effects-Interactions pattern)
        hasClaimed[msg.sender] = true;

        // External call last
        require(token.transfer(msg.sender, payout), "Transfer failed");

        emit WinningsClaimed(msg.sender, payout);
    }

    /**
     * @dev Cancel bet if stuck in RESOLVING for too long (oracle failure recovery)
     * Only creator can cancel, only after RESOLUTION_TIMEOUT (7 days)
     * Sets status to UNDETERMINED, allowing all bettors to claim refunds
     */
    function cancelBet() external {
        require(msg.sender == creator, "Only creator can cancel");
        require(status == BetStatus.RESOLVING, "Can only cancel while resolving");
        require(block.timestamp >= resolutionTimestamp + RESOLUTION_TIMEOUT, "Timeout not reached");

        resolved = true;
        status = BetStatus.UNDETERMINED;

        emit BetUndetermined(block.timestamp);
    }

    /**
     * @dev Get complete bet information
     */
    function getInfo() external view returns (
        address _creator,
        string memory _title,
        string memory _description,
        string memory _sideAName,
        string memory _sideBName,
        uint256 _creationDate,
        uint256 _endDate,
        bool _resolved,
        bool _winnerSideA,
        uint256 _totalSideA,
        uint256 _totalSideB
    ) {
        return (
            creator,
            title,
            description,
            sideAName,
            sideBName,
            creationDate,
            endDate,
            resolved,
            winnerSideA,
            totalSideA,
            totalSideB
        );
    }

    /**
     * @dev Get user's bets on both sides
     */
    function getUserBets(address user) external view returns (uint256 onSideA, uint256 onSideB) {
        return (betsOnSideA[user], betsOnSideB[user]);
    }

    /**
     * @dev Calculate potential winnings for a user (before resolution)
     * Returns potential payout if side A wins and if side B wins
     */
    function calculatePotentialWinnings(address user) external view returns (
        uint256 ifSideAWins,
        uint256 ifSideBWins
    ) {
        uint256 userBetOnA = betsOnSideA[user];
        uint256 userBetOnB = betsOnSideB[user];

        // Calculate if side A wins
        if (userBetOnA > 0) {
            if (totalSideB == 0) {
                ifSideAWins = userBetOnA;
            } else if (totalSideA > 0) {
                // Explicit division by zero check
                require(totalSideA > 0, "Division by zero: totalSideA is zero");
                uint256 winningsShare = (userBetOnA * totalSideB) / totalSideA;
                ifSideAWins = userBetOnA + winningsShare;
            }
        }

        // Calculate if side B wins
        if (userBetOnB > 0) {
            if (totalSideA == 0) {
                ifSideBWins = userBetOnB;
            } else if (totalSideB > 0) {
                // Explicit division by zero check
                require(totalSideB > 0, "Division by zero: totalSideB is zero");
                uint256 winningsShare = (userBetOnB * totalSideA) / totalSideB;
                ifSideBWins = userBetOnB + winningsShare;
            }
        }

        return (ifSideAWins, ifSideBWins);
    }
}
