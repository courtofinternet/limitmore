// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./BetCOFI.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title BetFactoryCOFI - Factory for deploying prediction markets
/// @notice Creates BetCOFI instances and routes oracle resolutions from GenLayer bridge
contract BetFactoryCOFI is Ownable {
    address public immutable usdcToken;
    address public bridgeReceiver;
    address[] public allBets;
    mapping(address => bool) public deployedBets;
    mapping(address => bool) public approvedCreators;

    event BetCreated(address indexed betAddress, address indexed creator, string title, uint256 endDate);
    event BetPlaced(address indexed betAddress, address indexed bettor, bool onSideA, uint256 amount);
    event OracleResolutionReceived(address indexed betContract, uint32 sourceChainId);
    event ResolutionRequested(address indexed betContract, address indexed creator, uint8 resolutionType, bytes resolutionData, uint256 timestamp);
    event BridgeReceiverUpdated(address indexed oldReceiver, address indexed newReceiver);
    event CreatorApprovalUpdated(address indexed creator, bool approved);

    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = _usdcToken;
    }

    function setCreatorApproval(address _creator, bool _approved) external onlyOwner {
        approvedCreators[_creator] = _approved;
        emit CreatorApprovalUpdated(_creator, _approved);
    }

    function canCreateBet(address _creator) public view returns (bool) {
        return _creator == owner() || approvedCreators[_creator];
    }

    function setBridgeReceiver(address _bridgeReceiver) external onlyOwner {
        require(_bridgeReceiver != address(0), "Invalid bridge receiver");
        address oldReceiver = bridgeReceiver;
        bridgeReceiver = _bridgeReceiver;
        emit BridgeReceiverUpdated(oldReceiver, _bridgeReceiver);
    }

    // ============ Bridge Handling ============

    /// @notice Receives oracle resolution from BridgeReceiver and dispatches to target bet
    function processBridgeMessage(uint32 _sourceChainId, address, bytes calldata _message) external {
        require(msg.sender == bridgeReceiver, "Only bridge receiver");

        (address targetContract, bytes memory data) = abi.decode(_message, (address, bytes));
        require(deployedBets[targetContract], "Unknown bet contract");

        BetCOFI(targetContract).setResolution(data);
        emit OracleResolutionReceived(targetContract, _sourceChainId);
    }

    /// @notice Called by BetCOFI.resolve() - emits event for oracle service to pick up
    function forwardResolutionRequest(uint8 _resolutionType) external {
        require(deployedBets[msg.sender], "Not a deployed bet");

        BetCOFI bet = BetCOFI(msg.sender);
        address creator = bet.creator();
        bytes memory data = bet.resolutionData();

        emit ResolutionRequested(msg.sender, creator, _resolutionType, data, block.timestamp);
    }

    // ============ Bet Management ============

    function createBet(
        string memory title,
        string memory resolutionCriteria,
        string memory sideAName,
        string memory sideBName,
        uint256 endDate,
        uint8 resolutionType,
        bytes memory resolutionData
    ) external returns (address) {
        require(canCreateBet(msg.sender), "Not authorized to create bets");
        require(resolutionType <= 2, "Invalid resolution type");

        BetCOFI bet = new BetCOFI(
            msg.sender,
            title,
            resolutionCriteria,
            sideAName,
            sideBName,
            endDate,
            usdcToken,
            address(this),
            BetCOFI.ResolutionType(resolutionType),
            resolutionData
        );

        address betAddress = address(bet);

        allBets.push(betAddress);
        deployedBets[betAddress] = true;

        emit BetCreated(betAddress, msg.sender, title, endDate);

        return betAddress;
    }

    function getAllBets() external view returns (address[] memory) {
        return allBets;
    }

    function getBetCount() external view returns (uint256) {
        return allBets.length;
    }

    function isLegitBet(address betAddress) external view returns (bool) {
        return deployedBets[betAddress];
    }

    /// @notice Users place bets through factory (single USDC approval for all bets)
    function placeBet(address betAddress, bool onSideA, uint256 amount) external {
        require(deployedBets[betAddress], "Bet not from this factory");
        require(amount > 0, "Amount must be greater than 0");

        require(IERC20(usdcToken).transferFrom(msg.sender, betAddress, amount), "USDC transfer failed");

        BetCOFI bet = BetCOFI(betAddress);
        if (onSideA) {
            bet.betOnSideAViaFactory(msg.sender, amount);
        } else {
            bet.betOnSideBViaFactory(msg.sender, amount);
        }

        emit BetPlaced(betAddress, msg.sender, onSideA, amount);
    }
}
