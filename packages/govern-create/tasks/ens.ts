import { task } from 'hardhat/config'
import { Ens } from '../utils/ens'
import { constants } from 'ethers'

/*
*  This task is used to set the ENS address record
*  To run it:
*  yarn set-ens --name governbasefactory.aragon.eth --address 0xB75290E69F83b52BfbF9C99B4Ae211935E75A851 --network rinkeby
*
*  See https://github.com/aragon/govern/tree/develop/packages/govern-create on how to setup .env file with account mnemonic
*/

task('ens:set-addr', 'Set the ENS address record')
.addParam("name", "The ENS name to set")
.addParam("address", "The address to set to")
.setAction(async ({name, address}, env) => {
  const { network } = env
  const ens = await Ens.createEns(network.provider)
  let from = '';

  try {
    const tx = await ens.setAddr(name, address)
    if( !tx ) {
      console.log(`INFO: The ens name has already been set to the given address`)
      return
    }

    from = tx.from
    console.log('transaction')
    console.log(' hash:', tx.hash)
    console.log(' from:', tx.from)
    console.log(' to:', tx.to)
    console.log(' value:', tx.value.toString())
    console.log(' data:', tx.data)

    const receipt = await tx.wait()
    console.log('Success?', Boolean(receipt.status))

  } catch (err) {
    console.log('')
    console.log('=== ERROR ===')

    const authorisedAddress = await ens.getOwner(name)
    if( authorisedAddress !== from && authorisedAddress != constants.AddressZero ) {
      console.log('The account may not have the authorisation to set the address record')
      console.log(`Try using the account: ${authorisedAddress}`)
    }

    console.log(err.message)
  }
})