pragma solidity ^0.4.23;

import "./BridgeValidators.sol";

import "./libraries/helpers.sol";

contract HomeBridge {
    BridgeValidators public validatorContract;

    /// Used foreign transaction hashes.
    mapping (bytes32 => bool) withdraws;

    // set to true once initialize() is called correctly
    bool initialized;

    /// event created on money deposit.
    event Deposit (address recipient, uint256 value);

    /// event created on money withdraw.
    event Withdraw (address recipient, uint256 value, bytes32 transactionHash);

    /// event created when tokens are sent to this contract
    //event TokenFallback (address _sender, address _origin, uint _value, bytes _data);

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
        emit Deposit(msg.sender, msg.value);
    }

    // need this to receive erc223 tokens
  	// function tokenFallback(address _sender, address _origin, uint _value, bytes _data) returns (bool ok) {
  	// 	emit TokenFallback(_sender, _origin, _value, _data);
    //     emit Deposit(_origin, _value);
	// 	return true;
	// }

    /// final step of a withdraw.
    /// checks that `requiredSignatures` `authorities` have signed of on the `message`.
    /// then transfers `value` to `recipient` (both extracted from `message`).
    /// see message library above for a breakdown of the `message` contents.
    /// `vs`, `rs`, `ss` are the components of the signatures.

    /// anyone can call this, provided they have the message and required signatures!
    /// only the `authorities` can create htese signatures.
    /// `requiredSignatures` authorities can sign arbitrary `message`s
    /// transfering any ether `value` out of this contract to `recipient`.
    /// bridge users must trust a majority of `requiredSignatures` of the `authorities`.

    /// this is altered from the parity bridge withdraw function so that it withdraws
    /// BTZ to the receiver, instead of ether.

    function withdraw(uint8[] vs, bytes32[] rs, bytes32[] ss, bytes message) public {
        //require(message.length == 84);

        // check that at least `requiredSignatures` `authorities` have signed `message`
        Message.hasEnoughValidSignatures(message, vs, rs, ss, validatorContract);

        address recipient = Message.getRecipient(message);
        uint256 value = Message.getValue(message);
        bytes32 hash = Message.getTransactionHash(message);

        // The following two statements guard against reentry into this function.
        // Duplicated withdraw or reentry.
        require(!withdraws[hash]);
        withdraws[hash] = true;

        // pay out recipient
        recipient.transfer(value); 

        emit Withdraw(recipient, value, hash);
    }
}
