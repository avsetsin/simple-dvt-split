import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';

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

export const modal = createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  themeMode: 'light',
  chains: [mainnet, holesky],
  projectId,
});
