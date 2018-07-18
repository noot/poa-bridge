pragma solidity ^0.4.8;


import "./Standard223Token.sol";
import "./BTZReceiver.sol";

/**
* @title BTZ223 Bunz Trading Zone token
*
* @dev Fully functional ERC223 compatible token with a deposit to receiver contract option available
*/
contract BTZ223 is Standard223Token {
  address public owner;

  // BTZ Token parameters
  string public name = "Bunz Trading Zone";
  string public symbol = "BTZ";
  uint8 public constant decimals = 18;
  uint256 public constant decimalFactor = 10 ** uint256(decimals);
  uint256 public constant totalSupply = 200000000000 * decimalFactor;

  // Variables for deposit functionality
  bool public prebridge;
  BTZReceiver receiverContract;
  address public receiverContractAddress = 0x0;
  
  /**
  * @dev Constructor function for BTZ creation
  */
  constructor() public {
    owner = msg.sender;
    balances[owner] = totalSupply;
    prebridge = true;
    receiverContract = BTZReceiver(receiverContractAddress);
    Transfer(address(0), owner, totalSupply);
  }

  modifier onlyOwner() {
      require(msg.sender == owner);
      _;
  }

  function changeOwner(address _addr) public onlyOwner {
      owner = _addr;
  }

  /**
  * @dev Gives admin the ability to switch prebridge states.
  *
  * @param _status A bool that represents the prebridge state, true == on
  */
  function toggleDeposit(bool _status) onlyOwner {
      prebridge = _status;
  }

  /**
  * @dev Gives admin the ability to update the address of reciever contract
  *
  * @param _newAddr The address of the new receiver contract
  */
  function changeReceiverAddress(address _newAddr) onlyOwner {
      receiverContractAddress = _newAddr;
      receiverContract = BTZReceiver(_newAddr);
  }

  /**
  * @dev Deposit function for users to send tokens to Bunz Trading Zone
  *
  * @param _value A uint representing the amount of BTZ to deposit
  */
  function deposit(uint _value, uint _id) public {
      require(prebridge &&
              balances[msg.sender] >= _value);
      balances[msg.sender] = balances[msg.sender].sub(_value);
      balances[receiverContractAddress] = balances[receiverContractAddress].add(_value);
      receiverContract.receiveDeposit(_id, _value);
  }
}
