import { Contract, ContractTransactionResponse, EventLog, ZeroAddress } from 'ethers';
import {
  checkDuplicates,
  calcDistributionForSuperCluster,
  calcDistributionForRegularCluster,
  processAsyncForm,
  splitAccounts,
  validateAddress,
  printTx,
} from './utils';
import { contracts } from './constants';
import {
  clusterFormSplitElement,
  clusterAddressesElement,
  splitAddressElement,
  clusterIsSuperClusterElement,
} from './elements';
import './gnosis-owners';

const contractABI = [
  'function createSplit(address[],uint32[],uint32,address) returns (address)',
  'function PERCENTAGE_SCALE() view returns (uint256)',
  'event CreateSplit(address indexed split)',
];

// Split
const handleSubmitSplit = (event) => {
  event.preventDefault();

  processAsyncForm(async ({ signer, chainId }) => {
    const rawAccounts = clusterAddressesElement.value || clusterAddressesElement.getAttribute('data-owners') || '';
    const accounts = splitAccounts(rawAccounts);

    accounts.map((address) => validateAddress(address));

    const factoryAddress = contracts.splitFactory[chainId];
    const splitFactoryContract = new Contract(factoryAddress, contractABI, signer);
    const percentageScale = Number(await splitFactoryContract.PERCENTAGE_SCALE());

    const isSuperCluster = clusterIsSuperClusterElement.checked;

    let percentAllocations: number[] = [];
    let sortedAccounts: string[] = [];

    if (isSuperCluster) {
      [percentAllocations, sortedAccounts] = calcDistributionForSuperCluster(accounts, percentageScale, chainId);
    } else {
      [percentAllocations, sortedAccounts] = calcDistributionForRegularCluster(accounts, percentageScale);
    }

    checkDuplicates(sortedAccounts);

    const distributorFee = 0;
    const controller = ZeroAddress;

    await printTx(splitFactoryContract, 'createSplit', sortedAccounts, percentAllocations, distributorFee, controller);

    const txResponse: ContractTransactionResponse = await splitFactoryContract.createSplit(
      sortedAccounts,
      percentAllocations,
      distributorFee,
      controller,
    );
    const txReceipt = await txResponse.wait();
    const logs = txReceipt?.logs as EventLog[];
    const deployedContractAddress = logs[0]?.args[0];

    validateAddress(deployedContractAddress);

    if (splitAddressElement.value === '') {
      splitAddressElement.value = deployedContractAddress;
    }

    return `0x split contract deployed: ${deployedContractAddress}`;
  }, clusterFormSplitElement);
};

clusterFormSplitElement.addEventListener('submit', handleSubmitSplit);
