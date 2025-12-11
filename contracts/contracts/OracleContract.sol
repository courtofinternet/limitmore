// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import {OptionsBuilder} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OracleContract
 * @notice Oracle contract for resolving BetCOFI predictions via LayerZero
 * @dev Handles multiple concurrent resolution requests from different bet contracts
 */
contract OracleContract is OApp {
    using OptionsBuilder for bytes;

    // Base Sepolia endpoint ID (hardcoded for loopback)
    uint32 private constant BASE_SEPOLIA_EID = 40245;

    /**
     * @dev Struct to track resolution requests
     */
    struct ResolutionRequest {
        address betContract;      // Which bet contract sent this request
        string title;             // Bet title
        string description;       // Bet description
        string sideAName;         // Side A name
        string sideBName;         // Side B name
        uint256 creationDate;     // When bet was created
        uint256 endDate;          // When betting closed
        bool fulfilled;           // Has this been resolved?
        bool sideAWins;           // Resolution outcome (set when fulfilled)
        bool isUndetermined;      // Was resolution undetermined? (refunds for all)
    }

    // Map: requestId (GUID) => request details
    mapping(bytes32 => ResolutionRequest) public requests;

    // Track pending requests for monitoring
    bytes32[] public pendingRequestIds;

    // Map: bet contract address => current request ID
    mapping(address => bytes32) public betToRequestId;

    // Authorized resolvers who can call sendResolution()
    mapping(address => bool) public authorizedResolvers;

    // Events
    event RequestReceived(
        bytes32 indexed requestId,
        address indexed betContract,
        string title
    );

    event RequestFulfilled(
        bytes32 indexed requestId,
        address indexed betContract,
        bool sideAWins,
        bool isUndetermined,
        uint256 timestamp
    );

    event ResolverAuthorizationChanged(address indexed resolver, bool authorized);

    /**
     * @param _endpoint LayerZero endpoint address on this chain
     * @param _owner Contract owner address
     */
    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) Ownable(_owner) {}

    /**
     * @notice Receive resolution request from BetCOFI contract via LayerZero
     * @dev Only callable by LayerZero endpoint from authorized peer contracts
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode request payload with bet metadata
        (
            address betContract,
            string memory title,
            string memory description,
            string memory sideAName,
            string memory sideBName,
            uint256 creationDate,
            uint256 endDate
        ) = abi.decode(payload, (address, string, string, string, string, uint256, uint256));

        // Store request with all bet context
        requests[_guid] = ResolutionRequest({
            betContract: betContract,
            title: title,
            description: description,
            sideAName: sideAName,
            sideBName: sideBName,
            creationDate: creationDate,
            endDate: endDate,
            fulfilled: false,
            sideAWins: false,
            isUndetermined: false
        });

        // Track pending request
        pendingRequestIds.push(_guid);
        betToRequestId[betContract] = _guid;

        emit RequestReceived(_guid, betContract, title);
    }

    /**
     * @notice Send resolution for a specific request back to BetCOFI contract
     * @param requestId The GUID of the request to fulfill
     * @param sideAWins The resolution outcome (true if side A wins, false if side B wins)
     * @param isUndetermined If true, bet is undetermined and all bettors get refunds
     * @dev Only callable by authorized resolvers (oracle service)
     */
    function sendResolution(bytes32 requestId, bool sideAWins, bool isUndetermined) external payable {
        require(authorizedResolvers[msg.sender], "Not authorized resolver");

        ResolutionRequest storage request = requests[requestId];
        require(request.betContract != address(0), "Request not found");
        require(!request.fulfilled, "Already fulfilled");

        // Mark as fulfilled
        request.fulfilled = true;
        request.sideAWins = sideAWins;
        request.isUndetermined = isUndetermined;

        // Encode response payload (new format with isUndetermined)
        bytes memory payload = abi.encode(
            request.betContract,  // Which bet this is for
            sideAWins,            // Outcome (ignored if isUndetermined)
            isUndetermined,       // Whether bet is undetermined
            block.timestamp,      // When oracle resolved
            requestId             // Original request ID for verification
        );

        // Build LayerZero message options (200k gas for bet resolution processing)
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);

        // Send back to Base Sepolia (same chain loopback)
        _lzSend(
            BASE_SEPOLIA_EID,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit RequestFulfilled(requestId, request.betContract, sideAWins, isUndetermined, block.timestamp);
    }

    /**
     * @notice Set authorization for a resolver address
     * @param resolver Address of the resolver
     * @param authorized Whether the resolver should be authorized
     * @dev Only callable by contract owner
     */
    function setAuthorizedResolver(address resolver, bool authorized) external onlyOwner {
        authorizedResolvers[resolver] = authorized;
        emit ResolverAuthorizationChanged(resolver, authorized);
    }

    /**
     * @notice Check if a bet contract has a pending request
     * @param betContract Address of the bet contract
     * @return bool True if there's a pending unfulfilled request
     */
    function hasPendingRequest(address betContract) external view returns (bool) {
        bytes32 requestId = betToRequestId[betContract];
        if (requestId == bytes32(0)) return false;

        ResolutionRequest memory request = requests[requestId];
        return !request.fulfilled;
    }

    /**
     * @notice Get request details
     * @param requestId The request ID to query
     * @return betContract Bet contract address
     * @return title Bet title
     * @return description Bet description
     * @return sideAName Side A name
     * @return sideBName Side B name
     * @return creationDate Bet creation timestamp
     * @return endDate Bet end timestamp
     * @return fulfilled Whether request has been fulfilled
     * @return sideAWins Resolution outcome (only valid if fulfilled)
     * @return isUndetermined Whether bet was marked undetermined
     */
    function getRequest(bytes32 requestId) external view returns (
        address betContract,
        string memory title,
        string memory description,
        string memory sideAName,
        string memory sideBName,
        uint256 creationDate,
        uint256 endDate,
        bool fulfilled,
        bool sideAWins,
        bool isUndetermined
    ) {
        ResolutionRequest memory request = requests[requestId];
        return (
            request.betContract,
            request.title,
            request.description,
            request.sideAName,
            request.sideBName,
            request.creationDate,
            request.endDate,
            request.fulfilled,
            request.sideAWins,
            request.isUndetermined
        );
    }

    /**
     * @notice Get all pending (unfulfilled) request IDs
     * @return Array of pending request GUIDs
     */
    function getPendingRequests() external view returns (bytes32[] memory) {
        // Count unfulfilled requests
        uint256 count = 0;
        for (uint256 i = 0; i < pendingRequestIds.length; i++) {
            if (!requests[pendingRequestIds[i]].fulfilled) {
                count++;
            }
        }

        // Build array of pending requests
        bytes32[] memory pending = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < pendingRequestIds.length; i++) {
            if (!requests[pendingRequestIds[i]].fulfilled) {
                pending[index] = pendingRequestIds[i];
                index++;
            }
        }

        return pending;
    }

    /**
     * @notice Get total number of requests received
     * @return Total number of resolution requests
     */
    function getTotalRequests() external view returns (uint256) {
        return pendingRequestIds.length;
    }
}
