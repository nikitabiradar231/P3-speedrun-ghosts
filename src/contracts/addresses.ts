export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  // Base Sepolia (84532)
  84532: ((import.meta as any).env?.VITE_CONTRACT_ADDRESS as `0x${string}`) || '0x0000000000000000000000000000000000000000',
  // Local Anvil (31337)
  31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};

export function getContractAddress(chainId: number): `0x${string}` {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[84532];
}
