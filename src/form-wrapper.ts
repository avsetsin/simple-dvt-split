import { Contract, ContractTransactionResponse, EventLog } from 'ethers';
import { processAsyncForm, validateAddress, validateSplitType } from './utils';
import { contracts } from './constants';
import { clusterFormWrapperElement, clusterTypeElement, splitAddressElement } from './elements';

const contractABI = ['function createSplit(address) returns (address)', 'event CreateObolLidoSplit(address split)'];

// Wrapper
const handleSubmitWrapper = (event: SubmitEvent) => {
  event.preventDefault();

  processAsyncForm(async ({ signer, chainId }) => {
    const splitType = clusterTypeElement.value;
    const splitAddress = splitAddressElement.value.trim();

    validateAddress(splitAddress);
    validateSplitType(splitType, chainId);

    const factoryAddress = contracts.wrapperFactory[chainId][splitType];
    const wrapperFactoryContract = new Contract(factoryAddress, contractABI, signer);
    const txResponse: ContractTransactionResponse = await wrapperFactoryContract.createSplit(splitAddress);
    const txReceipt = await txResponse.wait();
    const logs = txReceipt?.logs as EventLog[];
    const deployedContractAddress = logs[0]?.args[0];

    validateAddress(deployedContractAddress);

    return `Wrapper contract deployed: ${deployedContractAddress}`;
  }, clusterFormWrapperElement);
};

clusterFormWrapperElement.addEventListener('submit', handleSubmitWrapper);
