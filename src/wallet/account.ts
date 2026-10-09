import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  formatEther,
  Address,
  PublicClient,
  WalletClient,
} from 'viem';
import { BASE_SEPOLIA_CONFIG, BASE_SEPOLIA_CHAIN_ID } from './config.ts';
import { SPEEDRUN_GHOSTS_ABI } from '../contracts/SpeedrunGhostsABI.ts';
import { getContractAddress } from '../contracts/addresses.ts';

export interface LeaderboardEntry {
  runId: number;
  player: string;
  finishTick: number;
  timestamp: number;
  inputs: Uint8Array;
}

export class WalletService {
  public publicClient: PublicClient;
  public walletClient: WalletClient | null = null;
  public userAddress: Address | null = null;
  public chainId: number | null = null;
  public ethBalance = '0.00';

  constructor() {
    this.publicClient = createPublicClient({
      chain: BASE_SEPOLIA_CONFIG,
      transport: http('https://sepolia.base.org'),
    });
  }

  public async connect(): Promise<{ address: Address; chainId: number }> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No Ethereum wallet extension detected (e.g. MetaMask, Coinbase Wallet)');
    }

    const provider = (window as any).ethereum;
    this.walletClient = createWalletClient({
      chain: BASE_SEPOLIA_CONFIG,
      transport: custom(provider),
    });

    const [address] = await this.walletClient.requestAddresses();
    this.userAddress = address;

    const hexChainId = await provider.request({ method: 'eth_chainId' });
    this.chainId = parseInt(hexChainId, 16);

    await this.refreshBalance();
    return { address: this.userAddress, chainId: this.chainId };
  }

  public async switchToBaseSepolia(): Promise<boolean> {
    if (typeof window === 'undefined' || !(window as any).ethereum) return false;
    const provider = (window as any).ethereum;

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${BASE_SEPOLIA_CHAIN_ID.toString(16)}` }],
      });
      this.chainId = BASE_SEPOLIA_CHAIN_ID;
      await this.refreshBalance();
      return true;
    } catch (switchError: any) {
      // 4902 error code means chain has not been added yet
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${BASE_SEPOLIA_CHAIN_ID.toString(16)}`,
                chainName: 'Base Sepolia',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org'],
              },
            ],
          });
          this.chainId = BASE_SEPOLIA_CHAIN_ID;
          await this.refreshBalance();
          return true;
        } catch (addError) {
          console.error('Failed to add Base Sepolia network', addError);
          return false;
        }
      }
      console.error('Failed to switch network', switchError);
      return false;
    }
  }

  public async refreshBalance(): Promise<string> {
    if (!this.userAddress) return '0.00';
    try {
      const balance = await this.publicClient.getBalance({ address: this.userAddress });
      this.ethBalance = parseFloat(formatEther(balance)).toFixed(4);
      return this.ethBalance;
    } catch (e) {
      console.warn('Could not fetch balance', e);
      return '0.00';
    }
  }

  public async submitRunToChain(inputs: Uint8Array): Promise<{
    txHash: `0x${string}`;
    finishTick: number;
    runId: number;
  }> {
    if (!this.walletClient || !this.userAddress) {
      throw new Error('Wallet not connected. Connect wallet first.');
    }
    if (this.chainId !== BASE_SEPOLIA_CHAIN_ID) {
      throw new Error('Please switch network to Base Sepolia (Chain ID 84532)');
    }

    const contractAddress = getContractAddress(this.chainId);
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('Speedrun contract address is not configured. Set VITE_CONTRACT_ADDRESS in .env');
    }

    const hexInputs = `0x${Buffer.from(inputs).toString('hex')}` as `0x${string}`;

    // Send transaction
    const txHash = await this.walletClient.writeContract({
      address: contractAddress,
      abi: SPEEDRUN_GHOSTS_ABI,
      functionName: 'submitRun',
      args: [hexInputs],
      account: this.userAddress,
      chain: BASE_SEPOLIA_CONFIG,
    });

    // Wait for onchain confirmation
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

    // Read official result
    let verifiedFinishTick = 0;
    let verifiedRunId = 0;

    // Parse logs for RunVerified event
    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
          // Topics: [0] = RunVerified, [1] = player, [2] = runId
          if (log.topics && log.topics.length >= 3 && log.topics[2]) {
            verifiedRunId = Number(BigInt(log.topics[2]));
          }
        }
      } catch (err) {
        console.warn('Log parse warning', err);
      }
    }

    // Also double check PB from contract
    const [bestTick] = await this.publicClient.readContract({
      address: contractAddress,
      abi: SPEEDRUN_GHOSTS_ABI,
      functionName: 'getPersonalBest',
      args: [this.userAddress],
    });

    verifiedFinishTick = bestTick;

    return {
      txHash,
      finishTick: verifiedFinishTick,
      runId: verifiedRunId,
    };
  }

  public async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    const contractAddress = getContractAddress(this.chainId || BASE_SEPOLIA_CHAIN_ID);
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return [];
    }

    try {
      const runCountBig = await this.publicClient.readContract({
        address: contractAddress,
        abi: SPEEDRUN_GHOSTS_ABI,
        functionName: 'getRunCount',
      });

      const runCount = Number(runCountBig);
      if (runCount === 0) return [];

      const limit = Math.min(runCount, 50);
      const records = await this.publicClient.readContract({
        address: contractAddress,
        abi: SPEEDRUN_GHOSTS_ABI,
        functionName: 'getLeaderboard',
        args: [0n, BigInt(limit)],
      });

      return records.map((r: any, idx: number) => {
        const rawHex = r.inputs.startsWith('0x') ? r.inputs.slice(2) : r.inputs;
        const bytes = new Uint8Array(Buffer.from(rawHex, 'hex'));
        return {
          runId: idx,
          player: r.player,
          finishTick: Number(r.finishTick),
          timestamp: Number(r.timestamp),
          inputs: bytes,
        };
      });
    } catch (err) {
      console.warn('Could not fetch onchain leaderboard', err);
      return [];
    }
  }

  public async fetchPersonalBest(address: Address): Promise<{ bestTick: number; runId: number }> {
    const contractAddress = getContractAddress(this.chainId || BASE_SEPOLIA_CHAIN_ID);
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return { bestTick: 0, runId: 0 };
    }

    try {
      const [bestTick, runId] = await this.publicClient.readContract({
        address: contractAddress,
        abi: SPEEDRUN_GHOSTS_ABI,
        functionName: 'getPersonalBest',
        args: [address],
      });
      return { bestTick: Number(bestTick), runId: Number(runId) };
    } catch (err) {
      console.warn('Could not fetch PB', err);
      return { bestTick: 0, runId: 0 };
    }
  }
}

export const walletService = new WalletService();
