import { defineChain } from 'viem';

export const BASE_SEPOLIA_CHAIN_ID = 84532;

export const BASE_SEPOLIA_CONFIG = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
    },
    public: {
      http: [
        'https://sepolia.base.org',
        'https://base-sepolia-rpc.publicnode.com',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Basescan',
      url: 'https://sepolia.basescan.org',
    },
  },
  testnet: true,
});
