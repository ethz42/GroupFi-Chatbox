import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
} from 'wagmi/chains';
import {
  getDefaultConfig,
  RainbowKitProvider,
  connectorsForWallets
} from '@rainbow-me/rainbowkit';

import {toPrivyWallet} from '@privy-io/cross-app-connect/rainbow-kit';
import { createConfig, http } from 'wagmi';

const connectors = connectorsForWallets(
[
  {
    groupName: 'Recommended',
    wallets: [
      toPrivyWallet({
        id: 'cm3i5sgth034ft6mzekwo3qkq',
        name: 'Privy',
        iconUrl: '',
      }),
    ],
  },
],
{
  appName: 'Privy',
  projectId: 'Demo',
},
);

export const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId: 'Demo',
  chains: [mainnet, polygon, optimism, arbitrum, base]
});

export const wagmiConfig = createConfig({
chains: [mainnet, sepolia, base, polygon],
transports: {
  [mainnet.id]: http(),
  [sepolia.id]: http(),
  [base.id]: http(),
  [polygon.id]: http(),
},
connectors,
ssr: true,
});