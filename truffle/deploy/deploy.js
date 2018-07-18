const fs = require('fs');

const deployHome = require('./src/home');
const deployForeign = require('./src/foreign');

async function main() {
  const {homeBridge, bridgeValidatorsHome} = await deployHome();
  const {foreignBridge, bridgeValidatorsForeign} = await deployForeign();
  console.log("\nDeployment has been completed.\n\n")
  console.log(`[   Home  ] HomeBridge: ${homeBridge.address} at block ${homeBridge.deployedBlockNumber}`)
  console.log(`[   Home  ] bridgeValidatorsHome: ${bridgeValidatorsHome.address}`)
  console.log(`[ Foreign ] ForeignBridge: ${foreignBridge.address} at block ${foreignBridge.deployedBlockNumber}`)
  console.log(`[ Foreign ] bridgeValidatorsForeign: ${bridgeValidatorsForeign.address}`)
  fs.writeFileSync('./bridgeDeploymentResults.json', JSON.stringify({
    homeBridge: {
      ...homeBridge,
    },bridgeValidatorsHome: {
    ...bridgeValidatorsHome,
    },
    foreignBridge: {
      ...foreignBridge,
    },bridgeValidatorsForeign: {
    ...bridgeValidatorsForeign,
    }
  },null,4));
  console.log('Contracts Deployment have been saved to `bridgeDeploymentResults.json`')
}
main()
