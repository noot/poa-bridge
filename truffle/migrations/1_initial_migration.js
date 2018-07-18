var Migrations = artifacts.require("./Migrations.sol");
var Message = artifacts.require("Message");
var MessageSigning = artifacts.require("MessageSigning");
var BTZHomeBridge = artifacts.require("BTZHomeBridge");
var BTZForeignBridge = artifacts.require("BTZForeignBridge");
var BridgeValidators = artifacts.require("BridgeValidators");

module.exports = function(deployer) {
  const maxGas = 4600000;

  deployer.deploy(Migrations);
  deployer.deploy(Message, {gas: maxGas});
  deployer.deploy(MessageSigning, {gas: maxGas});
  deployer.deploy(BTZHomeBridge, {gas: maxGas});
  deployer.deploy(BTZForeignBridge, {gas: maxGas});
  deployer.deploy(BridgeValidators, {gas: maxGas});
};
