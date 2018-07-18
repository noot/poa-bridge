const PrivateKeyProvider = require("truffle-privatekey-provider");
const privateKey = "358be44145ad16a1add8622786bef07e0b00391e072855a5667eb3c78b9d3803";

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 6700000 
    },
    bunziverse: {
      //provider: new PrivateKeyProvider(privateKey, 'http://167.99.178.78'),
      host: "167.99.178.78",
      port: 8545,
      network_id: "*",
      from: "0x0092942302c73fcc8dca5fa93d7b9edfa12618f8"
    },
    geth_testnet: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 4600000 
    },
    geth_testnet2: {
      host: "localhost",
      port: 8546,
      network_id: "*",
      gas: 4600000
    }
  }
};
