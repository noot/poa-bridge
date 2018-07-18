const Web3Utils = require('web3-utils')
require('dotenv').config({
  path: __dirname + '/../.env'
});

const assert = require('assert');

const {deployContract, sendRawTx} = require('./deploymentUtils');
const {web3Foreign, deploymentPrivateKey, FOREIGN_RPC_URL} = require('./web3');

const BridgeValidators = require('../../build/contracts/BridgeValidators.json');
const ForeignBridge = require('../../build/contracts/ForeignBridge.json');

const VALIDATORS = process.env.VALIDATORS.split(" ")

const {
  DEPLOYMENT_ACCOUNT_ADDRESS,
  REQUIRED_NUMBER_OF_VALIDATORS,
  FOREIGN_OWNER_MULTISIG
} = process.env;

var FOREIGN_TOKEN_CONTRACT = process.env.FOREIGN_TOKEN_CONTRACT;

async function deployForeign() {
  let foreignNonce = await web3Foreign.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS);
  console.log('========================================')
  console.log('deploying ForeignBridge')
  console.log('========================================\n')

  console.log('\ndeploying implementation for BridgeValidators')
  const BridgeValidatorsForeign = await deployContract(BridgeValidators, [], {from: DEPLOYMENT_ACCOUNT_ADDRESS, network: 'foreign', nonce: foreignNonce})
  console.log('[Foreign] BridgeValidators Implementation: ', BridgeValidatorsForeign.options.address)
  foreignNonce++;

  console.log('\ninitializing BridgeValidators with following parameters:\n')
  console.log('Required number of validator signatures: ' + REQUIRED_NUMBER_OF_VALIDATORS
     + '\nValidators: ' + VALIDATORS 
     + '\nOwner Multisig: ' + FOREIGN_OWNER_MULTISIG)
  const initializeBridgeValidatorsData = await BridgeValidatorsForeign.methods.initialize(
      REQUIRED_NUMBER_OF_VALIDATORS, VALIDATORS, FOREIGN_OWNER_MULTISIG
  ).encodeABI({from: DEPLOYMENT_ACCOUNT_ADDRESS});
  const txInitializeBridgeValidators = await sendRawTx({
    data: initializeBridgeValidatorsData,
    nonce: foreignNonce,
    to: BridgeValidatorsForeign.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL
  });
  assert.equal(txInitializeBridgeValidators.status, '0x1', 'Transaction Failed');
  foreignNonce++;

  console.log('\ndeploying foreignBridge implementation\n')
  const foreignBridgeImplementation = await deployContract(ForeignBridge, [], {from: DEPLOYMENT_ACCOUNT_ADDRESS, network: 'foreign', nonce: foreignNonce})
  console.log('[Foreign] ForeignBridge Implementation: ', foreignBridgeImplementation.options.address)
  foreignNonce++;

  console.log('\ninitializing Foreign Bridge with following parameters:\n')
  console.log('BridgeValidators address: ' + BridgeValidatorsForeign.options.address )
  const initializeForeignBridgeData = await foreignBridgeImplementation.methods.initialize(
    BridgeValidatorsForeign.options.address
  ).encodeABI({from: DEPLOYMENT_ACCOUNT_ADDRESS});
  const txInitializeBridge = await sendRawTx({
    data: initializeForeignBridgeData,
    nonce: foreignNonce,
    to: foreignBridgeImplementation.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL
  });
  assert.equal(txInitializeBridge.status, '0x1', 'Transaction Failed');
  foreignNonce++;

  return {
    foreignBridge:
      {
        address: foreignBridgeImplementation.options.address,
        deployedBlockNumber: Web3Utils.hexToNumber(foreignBridgeImplementation.deployedBlockNumber)
      },
    bridgeValidatorsForeign: {address: BridgeValidatorsForeign.options.address}
  }
}

module.exports = deployForeign;
