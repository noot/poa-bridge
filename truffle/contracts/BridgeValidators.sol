pragma solidity ^0.4.23;

import "./libraries/SafeMath.sol";
import "./libraries/helpers.sol";

contract BridgeValidators {
    using SafeMath for uint256;

    // the number of validator signatures required for a withdraw or deposit to be authorized
    uint public requiredSignatures;

    // multisig address of the contract owner
    address public owner;

    // address array of all validators
    address[] public validators;

    // address to bool mapping of whether that address is a validator or not
    mapping(address => bool) validatorStatus;

    // set to true once the contract is correctly initialized
    bool initialized;

    event ValidatorAdded (address validator);
    event ValidatorRemoved (address validator);
    event RequiredSignaturesChanged (uint256 requiredSignatures);

    // initialization function
    function initialize(
        uint256 _requiredSignatures, // number of validator signatures needed to authorize a transaction
        address[] _initialValidators, // address array of initial validators
        address _owner //multisig address of contract owner
    ) public returns (bool)
    {
        require(!initialized);
        require(_requiredSignatures != 0);
        require(_initialValidators.length >= _requiredSignatures);

        owner = _owner;

        // for reach address in the _initialValidators array, make sure it is valid, and if so,
        // add it to the validator array and set its status to true
        for (uint256 i = 0; i < _initialValidators.length; i++) {
            require(_initialValidators[i] != address(0));
            validators.push(_initialValidators[i]);
            validatorStatus[_initialValidators[i]] = true;
            emit ValidatorAdded(_initialValidators[i]);
        }

        requiredSignatures = _requiredSignatures;
        initialized = true;
        return initialized;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier onlyValidator() {
        require(isValidator(msg.sender));
        _;
    }

    function addValidator(address _validator) external onlyOwner {
        require(_validator != address(0));
        require(!isValidator(_validator));
        validators.push(_validator);
        validatorStatus[_validator] = true;
        emit ValidatorAdded(_validator);
    }

    function removeValidator(address _validator) external onlyOwner {
        require(validatorCount() > requiredSignatures);
        require(isValidator(_validator));
        validatorStatus[_validator] = false;
        emit ValidatorRemoved(_validator);
    }

    function setRequiredSignatures(uint256 _requiredSignatures) external onlyOwner {
        require(validatorCount() >= _requiredSignatures);
        require(_requiredSignatures != 0);
        requiredSignatures = _requiredSignatures;
        emit RequiredSignaturesChanged(_requiredSignatures);
    }

    function validatorCount() public view returns (uint) {
        uint count;
        for(uint i = 0; i < validators.length; i++){
            if(isValidator(validators[i])) count++;
        }
        return count;
    }

    function isValidator(address _validator) public view returns (bool) {
        return validatorStatus[_validator];
    }
}
