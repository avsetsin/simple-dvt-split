import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';
import {
  BrowserProvider,
  Contract,
  ContractTransactionResponse,
  Eip1193Provider,
  EventLog,
  JsonRpcSigner,
  formatUnits,
} from 'ethers';

// Get projectId at https://cloud.walletconnect.com
const projectId = 'a736b10e83c92bf5bbcec73aed31074a';

// Set chains
const mainnet = {
  chainId: 1,
  name: 'Mainnet',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://ethereum.publicnode.com',
};

const holesky = {
  chainId: 17000,
  name: 'Holesky',
  currency: 'hoETH',
  explorerUrl: 'https://holesky.etherscan.io',
  rpcUrl: 'https://ethereum-holesky.publicnode.com',
};

// Create modal
const metadata = {
  name: 'Split',
  description: 'Split deployment',
  url: location.href,
  icons: [],
};

const modal = createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  themeMode: 'light',
  chains: [mainnet, holesky],
  projectId,
});

const contracts = {
  splitFactory: {
    1: '0x0000000000000000000000000000000000000000',
    17000: '0x2ed6c4b5da6378c7897ac67ba9e43102feb694ee',
  },
  wrapperFactory: {
    1: {
      obol: '0x0000000000000000000000000000000000000000',
      ssv: '0x0000000000000000000000000000000000000000',
    },
    17000: {
      obol: '0x934ec6b68ce7cc3b3e6106c686b5ad808ed26449',
      ssv: '0xB7f465f1bd6B2f8DAbA3FcA36c5F5E49E0812F37',
    },
  },
};

const processAsyncForm = async (
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

const distributeEvenly = (total: number, participants: number) => {
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

// Wrapper
const handleSubmitWrapper = (event: SubmitEvent) => {
  event.preventDefault();

  const clusterTypeElement = document.getElementById('cluster-type') as HTMLSelectElement;
  const splitAddressElement = document.getElementById('split-address') as HTMLInputElement;

  const type = clusterTypeElement.value;
  const splitAddress = splitAddressElement.value.trim();
  const formElement = event.target as HTMLFormElement;
  const abi = ['function createSplit(address) returns (address)', 'event CreateObolLidoSplit(address split)'];

  processAsyncForm(async ({ signer, chainId }) => {
    const factoryAddress = contracts.wrapperFactory[chainId][type];
    const wrapperFactoryContract = new Contract(factoryAddress, abi, signer);
    const txResponse: ContractTransactionResponse = await wrapperFactoryContract.createSplit(splitAddress);
    const txReceipt = await txResponse.wait();
    const logs = txReceipt.logs as EventLog[];
    const deployedContractAddress = logs[0]?.args[0];

    return `Contract deployed: ${deployedContractAddress}`;
  }, formElement);
};

document.getElementById('cluster-form-wrapper').addEventListener('submit', handleSubmitWrapper);

// Split
const handleSubmitSplit = (event) => {
  event.preventDefault();

  const clusterAddressesElement = document.getElementById('cluster-addresses') as HTMLInputElement;
  const accounts = clusterAddressesElement.value
    .trim()
    .split('\n')
    .map((address) => address.trim());
  const formElement = event.target as HTMLFormElement;
  const abi = [
    'function createSplit(address[],uint32[],uint32,address) returns (address)',
    'function PERCENTAGE_SCALE() view returns (uint256)',
    'event CreateSplit(address indexed split)',
  ];

  processAsyncForm(async ({ signer, chainId }) => {
    const factoryAddress = contracts.splitFactory[chainId];
    const splitFactoryContract = new Contract(factoryAddress, abi, signer);
    const percentageScale = await splitFactoryContract.PERCENTAGE_SCALE();

    const percentAllocations = distributeEvenly(Number(percentageScale), accounts.length);
    const distributorFee = 0;
    const controller = signer.address;
    const sortedAccounts = accounts.sort((a: string, b: string) => Number(BigInt(a) - BigInt(b)));

    const txResponse: ContractTransactionResponse = await splitFactoryContract.createSplit(
      sortedAccounts,
      percentAllocations,
      distributorFee,
      controller,
    );
    const txReceipt = await txResponse.wait();
    const logs = txReceipt.logs as EventLog[];
    const deployedContractAddress = logs[0]?.args[0];

    return `Contract deployed: ${deployedContractAddress}`;
  }, formElement);
};

document.getElementById('cluster-form-split').addEventListener('submit', handleSubmitSplit);
