import { BrowserProvider, Eip1193Provider, JsonRpcSigner, isAddress } from 'ethers';
import { modal } from './modal';
import { contracts } from './constants';

export const distributeEvenly = (total: number, participants: number) => {
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
