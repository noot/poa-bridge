var BTZReceiver = artifacts.require("BTZReceiver");
var BTZ223 = artifacts.require("BTZ223");
var bigNumber = require('bignumber');

contract('BTZ223', function(accounts) {
    var addressA = web3.eth.accounts[0];
    var addressB = web3.eth.accounts[1];
    var addressC = web3.eth.accounts[2];
    var addressD = web3.eth.accounts[3];

    var transfers;
    web3.eth.defaultAccount = web3.eth.accounts[0];

    it("should initialize", async() => {
        BTZReceiverContract = await BTZReceiver.new({from: addressA});
    	BTZ223Contract = await BTZ223.new({from: addressA});

    	assert(BTZReceiverContract !== undefined, "did not deploy");
    	assert(BTZ223Contract !== undefined, "did not deploy");
    })

    it("should assign totalSupply to addressA", async() => {
        let totalSupply = await BTZ223Contract.totalSupply.call();
        //console.log(totalSupply);
        let bal = await BTZ223Contract.balanceOf.call(addressA);
        //console.log(bal);
        assert(bal.equals(totalSupply), "");
    })

    it("should update tokenAddress inside BTZReceiver", async() => {
        let hash = await BTZReceiverContract.updateTokenAddress(BTZ223Contract.address, {from: addressA});
    })

    it("should update receiverAddress inside BTZ223", async() => {
	let hash = await BTZ223Contract.changeReceiverAddress(BTZReceiverContract.address, {from: addressA});
    })

    it("should deposit to the BTZReceiver and update balances", async() => {
        let val = 1000000;
        let uid = 1;
        let prevBal = await BTZ223Contract.balanceOf.call(addressA);
        let hash = await BTZ223Contract.deposit(val, uid, {from: addressA});
        let bal = await BTZ223Contract.balanceOf.call(BTZReceiverContract.address);
        let postBal = await BTZ223Contract.balanceOf.call(addressA);

        assert(bal.equals(val));
        //assert(prevBal.minus(postBal) == val);
    })

    it("should do a transfer to a user", async() => {
        let val = 1000000;
        let transfer = await BTZ223Contract.transfer(addressB, val);
        let bal = await BTZ223Contract.balanceOf(addressB);
        assert(bal.equals(val));
    })

    it("should allow a user to deposit to the BTZReceiver", async() => {
        let val = 5000;
        let uid = 1;
        let prevBal = await BTZ223Contract.balanceOf.call(addressB);
        let hash = await BTZ223Contract.deposit(val, uid, {from: addressB});
        let postBal = await BTZ223Contract.balanceOf.call(addressB);
        assert(prevBal.minus(postBal) == val);
    })

    it("should do a user lookup", async() => {
        let val = 1005000; //from prev tests
        let uid = 1;
        let lookup = await BTZReceiverContract.userLookup.call(uid);
        //for(let key in lookup) { console.log(lookup[key]) };
        assert(lookup[0].equals(val)); // balance within BTZReceiver
        assert(lookup[1].gt(0)); // time of last deposit
        assert(lookup[2].equals(2)); // number of deposits
    })

    it("should withdraw all tokens in BTZReceiver to an address", async() => {
        let prevBal = await BTZ223Contract.balanceOf(BTZReceiverContract.address);
        //console.log(prevBal.toNumber());
        let hash = await BTZReceiverContract.withdrawTokens(addressC, {from: addressA});
        let postBal = await BTZ223Contract.balanceOf(addressC);
        //console.log(postBal.toNumber());
        assert(prevBal.equals(postBal));
    })
})
