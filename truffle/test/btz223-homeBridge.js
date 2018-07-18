var BTZReceiver = artifacts.require("BTZReceiver");
var BTZ223 = artifacts.require("BTZ223");
var BTZHomeBridge = artifacts.require("BTZHomeBridge");

var bigNumber = require('bignumber');

var helpers = require("./helpers/helpers");

function watchEvents(contract) {
    var events = contract.allEvents({fromBlock: 0, toBlock: 'latest'});

    console.log("contract events:\n");
    events.watch(function(error, result){
        console.log(result);
    }); 
}

contract('BTZ223', function(accounts) {
    var addrA = web3.eth.accounts[0];
    var addrB = web3.eth.accounts[1];
    var addrC = web3.eth.accounts[2];
    var addrD = web3.eth.accounts[3];

    var requiredSignatures = 1;
    var authorities = [addrA, addrB];
    var userAccount = addrC;

    var BTZ223Contract;
    var homeBridge;

    web3.eth.defaultAccount = web3.eth.accounts[0];

    it("should initialize", async() => {
    	BTZ223Contract = await BTZ223.new({from: addrA});
        homeBridge = await BTZHomeBridge.new({from: addrA});
        initHash = await homeBridge.initialize(requiredSignatures, authorities, addrA, BTZ223Contract.address, {from: addrA});

        console.log("BTZHomeBridge address: " + homeBridge.address);
        console.log("BTZ223Contract address: " + BTZ223Contract.address);
        console.log("address of first authority: " + addrA);
        console.log("address of second authority: " + addrB);

    	assert(homeBridge !== undefined, "did not deploy");
    	assert(BTZ223Contract !== undefined, "did not deploy");

       // watchEvents(homeBridge);
       // watchEvents(BTZ223Contract);
    })

    it("should assign totalSupply to addrA", async() => {
        let totalSupply = await BTZ223Contract.totalSupply.call();
        let bal = await BTZ223Contract.balanceOf.call(addrA);
        assert(bal.equals(totalSupply), "");
    })

    it("should do a transfer to a user", async() => {
        let val = 1000000;
        let transferHash = await BTZ223Contract.transfer(addrB, val);
        let bal = await BTZ223Contract.balanceOf(addrB);
        assert(bal.equals(val));
    })

    it("should transfer tokens to the homeBridge", async() => {
        let val = 5000;
        let transferHash = await BTZ223Contract.transfer(homeBridge.address, val, {from: addrB});
        console.log(transferHash.logs);
        assert.equal("TokenFallback", transferHash.logs[1].event, "Event name should be TokenFallback");
    })
})
