import { BrowserProvider, Eip1193Provider, JsonRpcSigner, isAddress } from 'ethers';
import { modal } from './modal';
import { contracts, treasuryShareByProvider } from './constants';
import { Contract } from 'ethers';
import { superClusterTypeElement } from './elements';

export const distributeEvenly = (total: number, participants: number): number[] => {
  if (participants <= 0) {
    return [];
  }

  let shares = Array(participants).fill(Math.floor(total / participants));
  let remainder = total % participants;

  for (let i = 0; i < remainder; i++) {
    shares[i]++;
  }

  return shares;
};

export const calcDistributionForRegularCluster = (accounts: string[], totalShares: number) => {
  const percentAllocations = distributeEvenly(Number(totalShares), accounts.length);
  const sortedAccounts = accounts.sort((a: string, b: string) => Number(BigInt(a) - BigInt(b)));

  return [percentAllocations, sortedAccounts] as const;
};

export const calcDistributionForSuperCluster = (accounts: string[], totalShares: number, chainId: number) => {
  const splitType = superClusterTypeElement.value;
  validateSplitType(splitType, chainId);

  const treasuryShare = treasuryShareByProvider[splitType];
  const treasuryAddress = contracts.treasury[chainId];
  validateAddress(treasuryAddress);

  const restShares = totalShares - treasuryShare;

  // distribute the rest of the shares evenly
  const percentAllocations = distributeEvenly(Number(restShares), accounts.length);

  const accountsWithTreasury = [treasuryAddress, ...accounts];
  const sortedAccounts = accountsWithTreasury.sort((a: string, b: string) => Number(BigInt(a) - BigInt(b)));
  const indexOfTreasury = sortedAccounts.indexOf(treasuryAddress);

  // add special allocation for treasury
  percentAllocations.splice(indexOfTreasury, 0, treasuryShare);

  return [percentAllocations, sortedAccounts] as const;
};

export const processAsyncForm = async (
  method: (arg: {
    walletProvider: Eip1193Provider;
    ethersProvider: BrowserProvider;
    chainId: number;
    signer: JsonRpcSigner;
  }) => Promise<string | void>,
  formElement: HTMLFormElement,
) => {
  const errorElement = formElement.getElementsByClassName('error')[0] as HTMLDivElement;
  const resultElement = formElement.getElementsByClassName('result')[0] as HTMLDivElement;

  const walletProvider = modal.getWalletProvider();

  if (walletProvider == null) {
    throw new Error('wallet provider not found');
  }

  const ethersProvider = new BrowserProvider(walletProvider);
  const signer = await ethersProvider.getSigner();

  const network = await ethersProvider.getNetwork();
  const chainId = Number(network.chainId);

  const arg = { walletProvider, ethersProvider, chainId, signer };

  try {
    if (formElement.getAttribute('disabled') === 'disabled') {
      return;
    }

    formElement.setAttribute('disabled', 'disabled');
    errorElement.innerHTML = '';
    resultElement.innerHTML = '';

    const result = await method(arg);
    if (result != null) resultElement.innerHTML = String(result);
  } catch (error) {
    errorElement.innerHTML = error.message;
  } finally {
    formElement.removeAttribute('disabled');
  }
};

export const splitAccounts = (str: string) => {
  return str
    .trim()
    .split('\n')
    .map((address) => address.trim());
};

export const validateAddress = (address: string) => {
  if (!isAddress(address)) {
    throw new Error(`"${address}" is not an address`);
  }
};

export const validateSplitType = (splitType: string, chainId: number) => {
  const allowedTypes = new Set(Object.keys(contracts.wrapperFactory[chainId]));

  if (!allowedTypes.has(splitType)) {
    throw new Error(`unknown split type "${splitType}"`);
  }
};

export const checkDuplicates = (accounts: string[]) => {
  const uniqueAccounts = new Set(accounts.map((address) => address.toLocaleLowerCase()));

  if (uniqueAccounts.size !== accounts.length) {
    throw new Error('duplicate accounts detected');
  }
};

export const printTx = async (contract: Contract, method: string, ...args: any[]) => {
  console.log('Tx to sign', {
    contract: await contract.getAddress(),
    method,
    args,
  });
};
