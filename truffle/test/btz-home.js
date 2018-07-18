var BTZHomeBridge = artifacts.require("BTZHomeBridge");
var BTZ223 = artifacts.require("BTZ223");
var BridgeValidators = artifacts.require("BridgeValidators");

var helpers = require("./helpers/helpers");

function watchEvents(contract) {
    var events = contract.allEvents({fromBlock: 0, toBlock: 'latest'});

    console.log("contract events:\n");
    events.watch(function(error, result){
        console.log(result);
    }); 
}

contract('BTZHomeBridge', function(accounts) {  
  var homeBridge;
  var BTZ223Instance;

  var addrA = accounts[0];
  var addrB = accounts[1];
  var addrC = accounts[2];
  var addrD = accounts[3];

  var validators = [addrA, addrB];
  var userAccount = addrC;

  var homeGasPrice = web3.toBigNumber(0);

  web3.eth.defaultAccount = addrA;

  it("should deploy contract", async() => {
    var maxSingleDepositValue = 200000000000;
    var requiredSignatures = 1;

    BTZ223Instance = await BTZ223.new();
    console.log("address of BTZ223Instance: " + BTZ223Instance.address);

    bridgeValidators = await BridgeValidators.new();
    console.log("address of bridgeValidators: " + bridgeValidators.address);
    initHash = await bridgeValidators.initialize(requiredSignatures, validators, addrA, {from: addrA});

    homeBridge = await BTZHomeBridge.new({from: addrA});
    initHash = await homeBridge.initialize(bridgeValidators.address, BTZ223Instance.address, {from: addrA});

    console.log("address of homeBridge: " + homeBridge.address);
    console.log("address of first authority: " + addrA);
    console.log("address of second authority: " + addrB);
    console.log("address of userAccount: " + userAccount);

    let txReceipt = web3.eth.getTransactionReceipt(homeBridge.transactionHash);
    console.log("estimated gas cost of HomeBridge deploy: ", txReceipt.gasUsed);

    let requiredSigsRes = await bridgeValidators.requiredSignatures.call();
    assert.equal(requiredSignatures, requiredSigsRes, "Contract has invalid number of requiredSignatures");

    let validatorsRes = await Promise.all(validators.map((_, index) => bridgeValidators.validators.call(index)));
    assert.deepEqual(validators, validatorsRes, "Contract has invalid authorities");
  })

  it("should deposit into the bridge by transferring tokens to BTZHomeBridge", async() => {
    let val = web3.toBigNumber(web3.toWei(2000, "ether"));
    let transferHash = await BTZ223Instance.transfer(userAccount, val, {from: addrA});
    let balanceOfUser = await BTZ223Instance.balanceOf(userAccount);

    let depositHash = await BTZ223Instance.transfer(BTZHomeBridge.address, val, {from: userAccount});
    let balanceOfBridge = await BTZ223Instance.balanceOf(BTZHomeBridge.address);
    assert(balanceOfBridge.equals(val));
  })

  it("should allow for withdrawals of tokens", async() => {
    let val = web3.toBigNumber(web3.toWei(2, "ether"));
    let transferHash = await BTZ223Instance.transfer(homeBridge.address, val, {from: addrA});
    let bal = await BTZ223Instance.balanceOf.call(homeBridge.address);

    var recipientAccount = userAccount;
    val = bal;
    var transactionHash = "0xfb43877f2192f83670e564ceeb3a0e4154896d11cd6dac49b8e7f8677a305cfa";
    var message = helpers.createMessage(recipientAccount, val, transactionHash, homeGasPrice);

    var sig = await helpers.sign(validators[0], message);
    var vrs = await helpers.signatureToVRS(sig);

    let prevBal = await homeBridge.getBalance.call(userAccount);

    let withdrawHash = await homeBridge.withdraw(
      [vrs.v],
      [vrs.r],
      [vrs.s],
      message,
      {from: userAccount}
    );

    let postBal = await homeBridge.getBalance.call(userAccount);

    console.log("estimated gas cost of withdraw: " + withdrawHash.receipt.gasUsed);

    assert(postBal.minus(prevBal).equals(val), "tokens were not transferred");
    assert.equal("Withdraw", withdrawHash.logs[1].event, "Event name should be Withdraw");
    assert.equal(recipientAccount, withdrawHash.logs[1].args.recipient, "Event recipient should match recipient in message");
    assert(val.equals(withdrawHash.logs[1].args.value), "Event value should match value in message");
    assert.equal(transactionHash, withdrawHash.logs[1].args.transactionHash);
  })

  it("should not allow for the same withdrawal twice", async() => {
    let val = web3.toBigNumber(web3.toWei(2, "ether"));
    let transferHash = await BTZ223Instance.transfer(homeBridge.address, val, {from: addrA});

    let bal = await BTZ223Instance.balanceOf.call(homeBridge.address);
    //console.log("bal of homeBridge: " + bal.toNumber());
    //assert(bal == 0);

    var recipientAccount = userAccount;
    val = bal;
    var transactionHash = "0xfb43877f2192f83670e564ceeb3a0e4154896d11cd6dac49b8e7f8677a305cfa";
    var message = helpers.createMessage(recipientAccount, val, transactionHash, homeGasPrice);

    var sig = await helpers.sign(validators[1], message);
    var vrs = await helpers.signatureToVRS(sig);

    let prevBal = await homeBridge.getBalance.call(userAccount);

    try { 
      let withdrawHash = await homeBridge.withdraw(
        [vrs.v],
        [vrs.r],
        [vrs.s],
        message,
        {from: userAccount}
      );
      assert(false);
    } catch (error) {
      assert(true);
    }
  })

  it("should deposit into the bridge by transferring tokens from account to BTZHomeBridge", async() => {
    let val = web3.toBigNumber(web3.toWei(2000, "ether"));
    let prevBal = await BTZ223Instance.balanceOf(addrA);
    let approveHash = await BTZ223Instance.approve(userAccount, val, {from: addrA});
    let transferHash = await BTZ223Instance.transferFrom(addrA, BTZHomeBridge.address, val, {from: userAccount});
    let postBal = await BTZ223Instance.balanceOf(addrA);
    assert(prevBal.minus(postBal).equals(val));
  })


  /* validator tests */
  describe('#bridgeValidators', async() => {
    it("should add another validator", async() => {
      let addValidatorHash = await bridgeValidators.addValidator(addrD, {from: addrA});
      let isValidatorRes = await bridgeValidators.isValidator(addrD);

      let validatorCountRes = await bridgeValidators.validatorCount();
      assert(validatorCountRes == 3);

      assert(isValidatorRes);
    })

    it("should remove a validator", async() => {
      let isValidatorRes = await bridgeValidators.isValidator(addrB);
      assert(isValidatorRes);

      let removeValidatorHash = await bridgeValidators.removeValidator(addrB, {from: addrA});
      isValidatorRes = await bridgeValidators.isValidator(addrB);
      assert(!isValidatorRes);
    })

    it("should have the correct number of validators", async() => {
      let validatorCountRes = await bridgeValidators.validatorCount();
      assert(validatorCountRes == 2);
    })

    it("should not allow requiredSignatures to be increased beyond the number of validators", async() => {
      try{
        let setRequiredSigsHash = await bridgeValidators.setRequiredSignatures(3, {from: addrA});
        assert(false);
      } catch(error) {
        assert(true);
      }
    })

  })

})