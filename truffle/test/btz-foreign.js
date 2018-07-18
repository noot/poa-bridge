var BTZForeignBridge = artifacts.require("BTZForeignBridge");
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

contract('BTZForeignBridge', function(accounts) {  
  var foreignBridge;
  var BTZ223Instance;

  var addrA = accounts[0];
  var addrB = accounts[1];
  var addrC = accounts[2];
  var addrD = accounts[3];

  var validators = [addrA, addrB];
  var userAccount = addrC;

  web3.eth.defaultAccount = addrA;

  it("should deploy contract", async() => {
    var maxTxAmount = 200000000000;
    var requiredSignatures = 1;

    BTZ223Instance = await BTZ223.new({from: addrA});
    console.log("address of BTZ223Instance: " + BTZ223Instance.address);

    bridgeValidators = await BridgeValidators.new();
    console.log("address of bridgeValidators: " + bridgeValidators.address);
    initHash = await bridgeValidators.initialize(requiredSignatures, validators, addrA, {from: addrA});
    foreignBridge = await BTZForeignBridge.new({from: addrA});
    initHash = await foreignBridge.initialize(bridgeValidators.address, BTZ223Instance.address, {from: addrA});


    console.log("address of foreignBridge: " + foreignBridge.address);
    console.log("address of first authority: " + addrA);
    console.log("address of second authority: " + addrB);
    console.log("address of userAccount: " + userAccount);


    let txReceipt = web3.eth.getTransactionReceipt(foreignBridge.transactionHash);
    console.log("estimated gas cost of foreignBridge deploy: ", txReceipt.gasUsed);

    let requiredSigsRes = await bridgeValidators.requiredSignatures.call();
    assert.equal(requiredSignatures, requiredSigsRes, "Contract has invalid number of requiredSignatures");

    let validatorsRes = await Promise.all(validators.map((_, index) => bridgeValidators.validators.call(index)));
    assert.deepEqual(validators, validatorsRes, "Contract has invalid validators");

    //watchEvents(foreignBridge);
    //watchEvents(BTZ223Instance);
  })

  it("should receive tokens through the fallback", async() => {
    let val = web3.toBigNumber(web3.toWei(2000, "ether"));
    let transferHash = await BTZ223Instance.transfer(foreignBridge.address, val, {from: addrA});
   // console.log(transferHash);
    assert.equal("Transfer", transferHash.logs[0].event, "Event name should be Transfer");
  })

  it("should allow for a deposit on the main chain to be withdrawn", async() => {
    let prevBal = await foreignBridge.getBalance.call(userAccount);

    let val = web3.toBigNumber(web3.toWei(10, "ether"));
    let hash = "0x878351c4721eb92acbc6b83dbe1aab452e2adff176426a58a1ede7b5629ba7ee";
    let depositHash = await foreignBridge.deposit(userAccount, val, hash, {from: addrA});

    let postBal = await foreignBridge.getBalance.call(userAccount);

    assert(postBal.minus(prevBal).equals(val), "did not transfer tokens to user");
  })

  it('allows a validator to submit a signature', async () => {
    var recipientAccount = userAccount;
    var value = web3.toBigNumber(web3.toWei(0.5, "ether"));
    var homeGasPrice = web3.toBigNumber(0);
    var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
    var message = helpers.createMessage(recipientAccount, value, transactionHash, homeGasPrice);
    var signature = await helpers.sign(validators[0], message)
    let submitSigHash = await foreignBridge.submitSignature(signature, message, {from: validators[0]});
    assert.equal("SignedForWithdraw", submitSigHash.logs[0].event, "Event name should be SignedForWithdraw");
    assert.equal("CollectedSignatures", submitSigHash.logs[1].event, "Event name should be CollectedSignatures");
  })

  it('should not allow the same message twice', async () => {
    var recipientAccount = userAccount;
    var value = web3.toBigNumber(web3.toWei(0.5, "ether"));
    var homeGasPrice = web3.toBigNumber(0);
    var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
    var message = helpers.createMessage(recipientAccount, value, transactionHash, homeGasPrice);
    var signature = await helpers.sign(validators[0], message)
    try{
      let submitSigHash = await foreignBridge.submitSignature(signature, message, {from: validators[0]});
      assert(false);
    } catch (error) { 
      assert(true);
    }
  })

  it('should not allow a signed message submitted by a different validator than the signing validator', async () => {
    var recipientAccount = userAccount;
    var value = web3.toBigNumber(web3.toWei(0.5, "ether"));
    var homeGasPrice = web3.toBigNumber(0);
    var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
    var message = helpers.createMessage(recipientAccount, value, transactionHash, homeGasPrice);
    var signature = await helpers.sign(validators[0], message)
    try{
      let submitSigHash = await foreignBridge.submitSignature(signature, message, {from: validators[1]});
      assert(false);
    } catch (error) { 
      assert(true);
    }
  })

  it("should not emit CollectedSignatures when requiredSignatures hasn't been reached", async() => {
    let setRequiredSigsHash = await bridgeValidators.setRequiredSignatures(2, {from: addrA});

    var recipientAccount = userAccount;
    var value = web3.toBigNumber(web3.toWei(0.5, "ether"));
    var homeGasPrice = web3.toBigNumber(0);
    var transactionHash = "0x37b675a945cbb0a13cda43ffbca8d3293f04c80f3d5e09f43bfa437f8b8f6efa";
    var message = helpers.createMessage(recipientAccount, value, transactionHash, homeGasPrice);
    var signature = await helpers.sign(validators[0], message)
    let submitSigHash = await foreignBridge.submitSignature(signature, message, {from: validators[0]});
    assert.equal("SignedForWithdraw", submitSigHash.logs[0].event, "Event name should be SignedForWithdraw");
    assert.equal("WithdrawSignatureSubmitted", submitSigHash.logs[1].event, "Event name should be WithdrawSignatureSubmitted"); 
  })

  it("should not allow for a deposit on the main chain to be withdrawn if requiredSignatures is not reached", async() => {
    let setRequiredSigsHash = await bridgeValidators.setRequiredSignatures(2, {from: addrA});

    let prevBal = await foreignBridge.getBalance.call(userAccount);

    let val = web3.toBigNumber(web3.toWei(1, "ether"));
    let hash = "0x59bce1cb54f6778bea390c13f807f11a3622d06f290f939bc75382f0a1345eed";
    let depositHash = await foreignBridge.deposit(userAccount, val, hash, {from: addrA});

    let postBal = await foreignBridge.getBalance.call(userAccount);

    assert(postBal.minus(prevBal).equals(0), "did not transfer tokens to user");
    assert.equal("SignedForDeposit", depositHash.logs[0].event, "Event name should be SignedForDeposit");
  })

  it("should not allow for a deposit to be confirmed by the same authority twice", async() => {
    let prevBal = await foreignBridge.getBalance.call(userAccount);

    let val = web3.toBigNumber(web3.toWei(1, "ether"));
    let hash = "0x59bce1cb54f6778bea390c13f807f11a3622d06f290f939bc75382f0a1345eed";
    try{
      let depositHash = await foreignBridge.deposit(userAccount, val, hash, {from: addrA});
      assert(false);
    } catch(error) { 
      assert(true);
    }
  })

  it("should not allow for a deposit on the main chain to be withdrawn if requiredSignatures is not reached", async() => {
    let prevBal = await foreignBridge.getBalance.call(userAccount);

    let val = web3.toBigNumber(web3.toWei(1, "ether"));
    let hash = "0x59bce1cb54f6778bea390c13f807f11a3622d06f290f939bc75382f0a1345eed";
    let depositHash = await foreignBridge.deposit(userAccount, val, hash, {from: addrB});

    let postBal = await foreignBridge.getBalance.call(userAccount);

    assert(postBal.minus(prevBal).equals(val), "did not transfer tokens to user");
    assert.equal("SignedForDeposit", depositHash.logs[0].event, "Event name should be SignedForDeposit");
    assert.equal("Deposit", depositHash.logs[1].event, "Event name should be Deposit"); 

  })
})