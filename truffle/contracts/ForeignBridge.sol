pragma solidity ^0.4.23;

import "./BridgeValidators.sol";

import "./libraries/helpers.sol";

import "./token-contracts/Standard223Token.sol";

/* this contract will be deployed on the mainnet */
contract ForeignBridge { // is Standard223Token {
    // BridgeValidator contract tied to this contract
    BridgeValidators public validatorContract;

    struct SignaturesCollection {
        /// Signed message.
        bytes message;
        /// Authorities who signed the message.
        address[] signed;
        /// Signatures
        bytes[] signatures;
    }

    /// Pending deposits and authorities who confirmed them
    mapping (bytes32 => address[]) deposits;

    /// Pending signatures and authorities who confirmed them
    mapping (bytes32 => SignaturesCollection) signatures;

    // set to true once initialize() is called correctly
    bool initialized;

    // event created upon a deposit on the home chain being confirmed by a validator
    event SignedForDeposit(address indexed signer, bytes32 transactionHash);

    // event created upon a withdraw on the home chain being confirmed by a validator
    event SignedForWithdraw(address indexed signer, bytes32 messageHash);

    /// triggered when enough authorities have confirmed a deposit
    event Deposit(address recipient, uint256 value, bytes32 transactionHash);

    /// event created on money withdraw.
    event Withdraw(address recipient, uint256 value, uint homeGasCost);

    /// event created when a validator submits a withdraw signature
    event WithdrawSignatureSubmitted(bytes32 messageHash);

    /// Collected signatures which should be relayed to home chain.
    event CollectedSignatures(address authorityResponsibleForRelay, bytes32 messageHash);

    /// event created when tokens are sent to this contract
    event TokenFallback (address _sender, address _origin, uint _value, bytes _data);

    // initialization function
    // requires BridgeValidators to already have been deployed on this chain
    function initialize(
        address _validatorContractAddress
    ) public returns (bool)
    {
        require(!initialized);
        validatorContract = BridgeValidators(_validatorContractAddress);
        initialized = true;
        return initialized;
    }

    modifier onlyValidator() {
        require(validatorContract.isValidator(msg.sender));
        _;
    }

    // this contract will need to have some eth to do token transfers
    function () public payable {
        require(msg.value > 0);
        require(msg.data.length == 0);
        emit Withdraw(msg.sender, msg.value, 0);
    }

    // need this to receive erc223 tokens
    // withdraw refers to a withdrawal of tokens on the homeBridge
    // function tokenFallback(address _sender, address _origin, uint _value, bytes _data) returns (bool ok) {
    //     emit TokenFallback(_sender, _origin, _value, _data);
    //     emit Withdraw(_origin, _value, 1000000000 wei);
    //     return true;
    // }

    /// deposit refers to a deposit on the homeBridge
    ///
    /// deposit recipient (bytes20)
    /// deposit value (uint256)
    /// mainnet transaction hash (bytes32) // to avoid transaction duplication
    function deposit(address recipient, uint256 value, bytes32 transactionHash) public onlyValidator() {
        // Protection from misbehaving authority
        var hash = keccak256(recipient,value,transactionHash);

        // don't allow authority to confirm deposit twice
        require(!Helpers.addressArrayContains(deposits[hash], msg.sender));

        // added validator to already-signed array
        deposits[hash].push(msg.sender);
        emit SignedForDeposit(msg.sender, transactionHash);

        // if requiredSignatures reached, transfer tokens to recipient
        if(deposits[hash].length == validatorContract.requiredSignatures()){
            //transfer(recipient, value);
            recipient.transfer(value);
            emit Deposit(recipient, value, transactionHash);
        }
    }

    /// Message is a message that should be relayed to main chain once authorities sign it.
    ///
    /// for withdraw message contains:
    /// withdrawal recipient (bytes20)
    /// withdrawal value (uint256)
    /// foreign transaction hash (bytes32) // to avoid transaction duplication
    function submitSignature(bytes signature, bytes message) public onlyValidator() {
        // ensure that `signature` is really `message` signed by `msg.sender`
        require(msg.sender == MessageSigning.recoverAddressFromSignedMessage(signature, message));

        //require(message.length == 116);
        var hash = keccak256(message);

        // each authority can only provide one signature per message
        require(!Helpers.addressArrayContains(signatures[hash].signed, msg.sender));
        signatures[hash].message = message;
        signatures[hash].signed.push(msg.sender);
        signatures[hash].signatures.push(signature);

        emit SignedForWithdraw(msg.sender, hash);

        // if requiredSignatures reached, tell the bridge all signatures have been collected
        if (signatures[hash].signed.length == validatorContract.requiredSignatures()) {
            emit CollectedSignatures(msg.sender, hash);
        } else {
            emit WithdrawSignatureSubmitted(hash);
        }
    }

    function signature(bytes32 _hash, uint256 _index) public view returns (bytes) {
	SignaturesCollection tmp = signatures[_hash];
        return tmp.signatures[_index];
    }

    function message(bytes32 _hash) public view returns (bytes) {
        return signatures[_hash].message;
    }

}
