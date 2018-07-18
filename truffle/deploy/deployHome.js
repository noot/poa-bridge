const fs = require('fs');
const deployHome = require('./src/home');

async function main() {
  const {homeBridge, btz223home, bridgeValidatorsHome} = await deployHome()
  console.log("\nDeployment has been completed.\n\n")
  console.log(`[   Home  ] HomeBridge: ${homeBridge.address} at block ${homeBridge.deployedBlockNumber}`)
  console.log(`[   Home  ] btz223home: ${btz223home.address}`)
  console.log(`[   Home  ] bridgeValidatorsHome: ${bridgeValidatorsHome.address}`)
  fs.writeFileSync('./homeDeploymentResults.json', JSON.stringify({
    homeBridge: {
      ...homeBridge,
    },btz223home: {
	  ...btz223home,
    },bridgeValidatorsHome: {
    ...bridgeValidatorsHome,
    }
  },null,4));
  console.log('Contracts Deployment have been saved to `homeDeploymentResults.json`')
}
main()
