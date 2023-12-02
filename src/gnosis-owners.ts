import { BrowserProvider, Contract } from 'ethers';
import { modal } from './modal';
import { clusterAddressesElement } from './elements';

export const getMultisigOwners = async (address: string, chainId: number) => {
  const walletProvider = modal.getWalletProvider();
  const ethersProvider = new BrowserProvider(walletProvider);
  const gnosisContract = new Contract(address, contractABI, ethersProvider);

  return (await gnosisContract.getOwners()) as string[];
};

const contractABI = ['function getOwners() view returns (address[])'];

modal.subscribeProvider(async ({ address, chainId, isConnected }) => {
  if (!isConnected) {
    resetOwners();
    return;
  }

  try {
    const owners = await getMultisigOwners(address, chainId);
    setOwners(owners);
  } catch (error) {
    resetOwners();
  }
});

const setOwners = (owners: string[]) => {
  const ownersString = owners.join('\n');

  clusterAddressesElement.placeholder = ownersString;
  clusterAddressesElement.setAttribute('data-owners', ownersString);
};

const resetOwners = () => {
  clusterAddressesElement.placeholder =
    '0x0000000000000000000000000000000000000000\n0x0000000000000000000000000000000000000001\n0x0000000000000000000000000000000000000002';
  clusterAddressesElement.removeAttribute('data-owners');
};

resetOwners();
