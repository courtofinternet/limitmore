// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./BetCOFI.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * BetFactoryCOFI - Factory contract for deploying BetCOFI instances
 * Deployed once, then anyone can create bets through it
 * Acts as trusted gatekeeper for GenLayer oracle resolutions via BridgeReceiver
 */
contract BetFactoryCOFI is Ownable {
    // Immutable configuration
    address public immutable usdcToken;

    // Bridge receiver address (receives LayerZero messages and forwards here)
    address public bridgeReceiver;

    // All deployed bets
    address[] public allBets;

    // Registry to verify legitimate bets
    mapping(address => bool) public deployedBets;

    // Approved bet creators (owner is always approved)
    mapping(address => bool) public approvedCreators;

    // Events
    event BetCreated(address indexed betAddress,address indexed creator,string title,uint256 endDate );

    event BetPlaced(address indexed betAddress, address indexed bettor, bool onSideA, uint256 amount);

    event OracleResolutionReceived(address indexed betContract, uint32 sourceChainId);

    event ResolutionRequested(address indexed betContract, address indexed creator, uint8 resolutionType, uint256 timestamp);

    event BridgeReceiverUpdated(address indexed oldReceiver, address indexed newReceiver);

    event CreatorApprovalUpdated(address indexed creator, bool approved);

    /**
     * @dev Constructor - sets USDC configuration
     * @param _usdcToken Address of USDC token contract
     */
    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = _usdcToken;
    }

    /**
     * @dev Set approval status for a bet creator (only owner)
     * @param _creator Address to approve/revoke
     * @param _approved True to approve, false to revoke
     */
    function setCreatorApproval(address _creator, bool _approved) external onlyOwner {
        approvedCreators[_creator] = _approved;
        emit CreatorApprovalUpdated(_creator, _approved);
    }

    /**
     * @dev Check if an address can create bets
     * @param _creator Address to check
     * @return True if owner or approved creator
     */
    function canCreateBet(address _creator) public view returns (bool) {
        return _creator == owner() || approvedCreators[_creator];
    }

    /**
     * @dev Set the bridge receiver address (only owner)
     * @param _bridgeReceiver Address of BridgeReceiver contract
     */
    function setBridgeReceiver(address _bridgeReceiver) external onlyOwner {
        require(_bridgeReceiver != address(0), "Invalid bridge receiver");
        address oldReceiver = bridgeReceiver;
        bridgeReceiver = _bridgeReceiver;
        emit BridgeReceiverUpdated(oldReceiver, _bridgeReceiver);
    }

    /**
     * @dev Receive oracle resolution via BridgeReceiver (implements IGenLayerBridgeReceiver)
     * Called by BridgeReceiver after it receives a LayerZero message
     * @param _sourceChainId The chain ID where the message originated
     * @param _message The encoded resolution data
     */
    function processBridgeMessage(
        uint32 _sourceChainId,
        address,
        bytes calldata _message
    ) external {
        require(msg.sender == bridgeReceiver, "Only bridge receiver");

        // Decode resolution data: (targetContract = BetCOFI address, data = resolution bytes)
        (address targetContract, bytes memory data) = abi.decode(_message, (address, bytes));

        // Verify target is a legitimate bet from this factory
        require(deployedBets[targetContract], "Unknown bet contract");

        // Dispatch resolution to target BetCOFI
        BetCOFI(targetContract).setResolution(data);

        emit OracleResolutionReceived(targetContract, _sourceChainId);
    }

    /**
     * @dev Forward resolution request from a deployed bet
     * Only callable by deployed BetCOFI contracts
     * Emits ResolutionRequested so external services only need to monitor the factory
     * @param _resolutionType The type of resolution needed (0=CRYPTO, 1=STOCKS, 2=NEWS)
     */
    function forwardResolutionRequest(uint8 _resolutionType) external {
        require(deployedBets[msg.sender], "Not a deployed bet");

        BetCOFI bet = BetCOFI(msg.sender);
        address creator = bet.creator();

        emit ResolutionRequested(msg.sender, creator, _resolutionType, block.timestamp);
    }

    /**
     * @dev Create a new bet
     * @param title Bet title
     * @param resolutionCriteria Resolution criteria for the bet
     * @param sideAName Name of side A
     * @param sideBName Name of side B
     * @param endDate Timestamp when betting closes
     * @param resolutionType Type of resolution (0=CRYPTO, 1=STOCKS, 2=NEWS)
     * @return Address of newly deployed BetCOFI contract
     */
    function createBet(
        string memory title,
        string memory resolutionCriteria,
        string memory sideAName,
        string memory sideBName,
        uint256 endDate,
        uint8 resolutionType
    ) external returns (address) {
        require(canCreateBet(msg.sender), "Not authorized to create bets");
        require(resolutionType <= 2, "Invalid resolution type");

        // Deploy new BetCOFI contract
        BetCOFI bet = new BetCOFI(
            msg.sender,         // creator = transaction sender
            title,
            resolutionCriteria,
            sideAName,
            sideBName,
            endDate,
            usdcToken,          // USDC token address
            address(this),      // factory = trusted gatekeeper
            BetCOFI.ResolutionType(resolutionType)
        );

        address betAddress = address(bet);

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
