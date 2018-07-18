const Web3Utils = require('web3-utils')
require('dotenv').config({
  path: __dirname + '/../.env'
});

const assert = require('assert');

const {deployContract, sendRawTx} = require('./deploymentUtils');
const {web3Home, deploymentPrivateKey, HOME_RPC_URL} = require('./web3');

const BridgeValidators = require('../../build/contracts/BridgeValidators.json');
const HomeBridge = require('../../build/contracts/HomeBridge.json');

const VALIDATORS = process.env.VALIDATORS.split(" ")

const {
  DEPLOYMENT_ACCOUNT_ADDRESS,
  REQUIRED_NUMBER_OF_VALIDATORS,
  HOME_OWNER_MULTISIG
} = process.env;

async function deployHome()
{
  let homeNonce = await web3Home.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS);

  console.log('========================================')
  console.log('deploying HomeBridge')
  console.log('========================================\n')

  console.log('\ndeploying implementation for BridgeValidators')
  const BridgeValidatorsHome = await deployContract(BridgeValidators, [], {from: DEPLOYMENT_ACCOUNT_ADDRESS, network: 'home', nonce: homeNonce})
  console.log('[Home] BridgeValidators Implementation: ', BridgeValidatorsHome.options.address)
  homeNonce++;

  console.log('\ninitializing BridgeValidators with following parameters:\n')
  console.log('Required number of validator signatures: ' + REQUIRED_NUMBER_OF_VALIDATORS
     + '\nValidators: ' + VALIDATORS 
     + '\nOwner Multisig: ' + HOME_OWNER_MULTISIG)
  const initializeBridgeValidatorsData = await BridgeValidatorsHome.methods.initialize(
      REQUIRED_NUMBER_OF_VALIDATORS, VALIDATORS, HOME_OWNER_MULTISIG
  ).encodeABI({from: DEPLOYMENT_ACCOUNT_ADDRESS});
  const txInitializeBridgeValidators = await sendRawTx({
    data: initializeBridgeValidatorsData,
    nonce: homeNonce,
    to: BridgeValidatorsHome.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  });
  assert.equal(txInitializeBridgeValidators.status, '0x1', 'Transaction Failed');
  homeNonce++;

  console.log('\ndeploying homeBridge implementation\n')
  const homeBridgeImplementation = await deployContract(HomeBridge, [], {from: DEPLOYMENT_ACCOUNT_ADDRESS, network: 'home', nonce: homeNonce})
  console.log('[Home] HomeBridge Implementation: ', homeBridgeImplementation.options.address)
  homeNonce++;

  console.log('\ninitializing Home Bridge with following parameters:\n')
  console.log('BridgeValidators address: ' + BridgeValidatorsHome.options.address)
  const initializeHomeBridgeData = await homeBridgeImplementation.methods.initialize(
    BridgeValidatorsHome.options.address
  ).encodeABI({from: DEPLOYMENT_ACCOUNT_ADDRESS});
  const txInitializeHomeBridge = await sendRawTx({
    data: initializeHomeBridgeData,
    nonce: homeNonce,
    to: homeBridgeImplementation.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  });
  assert.equal(txInitializeHomeBridge.status, '0x1', 'Transaction Failed');
  homeNonce++;

  console.log('\nHome Deployment Bridge is complete\n')

  return{
    homeBridge:
      {
        address: homeBridgeImplementation.options.address,
        deployedBlockNumber: Web3Utils.hexToNumber(homeBridgeImplementation.deployedBlockNumber)
      },
    bridgeValidatorsHome: {address: BridgeValidatorsHome.options.address}
  }
}

module.exports = deployHome;
