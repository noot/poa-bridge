pragma solidity 0.4.24;

import "../libraries/SafeMath.sol";
import "./BTZ223.sol";

/**
* @title BTZReceiver
*
* @dev Receiver contract for user deposits to Bunz Trading Zone
*/

contract BTZReceiver {
    using SafeMath for *;

    // BTZReceiver state variables
    BTZ223 BTZToken;
    address public tokenAddress = 0x0;
    address public owner;
    uint numUsers;

    // Struct to store user info
    struct UserInfo {
        uint balance;
        uint lastDeposit;
        uint totalDeposits;
    }

    event DepositReceived(uint indexed _who, uint _value, uint _timestamp);
    event Withdrawal(address indexed _withdrawalAddress, uint _value, uint _timestamp);

    // mapping of user info indexed by the user ID
    mapping (uint => UserInfo) userInfo;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function changeOwner(address _addr) public onlyOwner {
        owner = _addr;
    }

    /*
    * @dev Gives admin the ability to update the address of BTZ223
    *
    * @param _tokenAddress The new address of BTZ223
    **/
    function updateTokenAddress(address _tokenAddress) public onlyOwner {
        tokenAddress = _tokenAddress;
        BTZToken = BTZ223(_tokenAddress);
    }

    /*
    * @dev Returns the information of a user
    *
    * @param _uid The id of the user whose info to return
    **/
    function userLookup(uint _uid) public view returns (uint, uint, uint){
        return (userInfo[_uid].balance, userInfo[_uid].lastDeposit, userInfo[_uid].totalDeposits);
    }

    /*
    * @dev The function BTZ223 uses to update user info in this contract
    *
    * @param _id The users Bunz Trading Zone ID
    * @param _value The number of tokens to deposit
    **/
    function receiveDeposit(uint _id, uint _value) public {
        require(msg.sender == tokenAddress);
        userInfo[_id].balance = userInfo[_id].balance.add(_value);
        userInfo[_id].lastDeposit = now;
        userInfo[_id].totalDeposits = userInfo[_id].totalDeposits.add(1);
        emit DepositReceived(_id, _value, now);
    }

    /*
    * @dev The withdrawal function for admin
    *
    * @param _withdrawalAddr The admins address to withdraw the BTZ223 tokens to
    **/
    function withdrawTokens(address _withdrawalAddr) public onlyOwner{
        uint tokensToWithdraw = BTZToken.balanceOf(this);
        BTZToken.transfer(_withdrawalAddr, tokensToWithdraw);
        emit Withdrawal(_withdrawalAddr, tokensToWithdraw, now);
    }
}
