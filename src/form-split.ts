import { Contract, ContractTransactionResponse, EventLog } from 'ethers';
import { distributeEvenly, processAsyncForm, splitAccounts, validateAddress } from './utils';
import { contracts } from './constants';
import { clusterFormSplitElement, clusterAddressesElement, splitAddressElement } from './elements';

const contractABI = [
  'function createSplit(address[],uint32[],uint32,address) returns (address)',
  'function PERCENTAGE_SCALE() view returns (uint256)',
  'event CreateSplit(address indexed split)',
];

// Split
const handleSubmitSplit = (event) => {
  event.preventDefault();

  processAsyncForm(async ({ signer, chainId }) => {
    const accounts = splitAccounts(clusterAddressesElement.value);

    accounts.map((address) => validateAddress(address));

    const factoryAddress = contracts.splitFactory[chainId];
    const splitFactoryContract = new Contract(factoryAddress, contractABI, signer);
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

    validateAddress(deployedContractAddress);

    if (splitAddressElement.value === '') {
      splitAddressElement.value = deployedContractAddress;
    }

    return `Wrapper contract deployed: ${deployedContractAddress}`;
  }, clusterFormSplitElement);
};

clusterFormSplitElement.addEventListener('submit', handleSubmitSplit);
