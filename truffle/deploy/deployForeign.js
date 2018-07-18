const fs = require('fs');
const deployForeign = require('./src/foreign');

async function main() {
  const {foreignBridge, btz223foreign, bridgeValidatorsForeign} = await deployForeign();
  console.log("\nDeployment has been completed.\n\n")
  console.log(`[ Foreign ] ForeignBridge: ${foreignBridge.address} at block ${foreignBridge.deployedBlockNumber}`)
  console.log(`[ Foreign ] btz223foreign: ${btz223foreign.address}`)
  console.log(`[ Foreign ] bridgeValidatorsForeign: ${bridgeValidatorsForeign.address}`)
  fs.writeFileSync('./foreignDeploymentResults.json', JSON.stringify({
    foreignBridge: {
      ...foreignBridge,
    },btz223foreign: {
	  ...btz223foreign,
	  },bridgeValidatorsForeign: {
    ...bridgeValidatorsForeign,
    }
  },null,4));
  console.log('Contracts Deployment have been saved to `foreignDeploymentResults.json`')
}
main()
