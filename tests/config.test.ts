import { describe, it, expect } from 'vitest';
import { checkNoSecrets } from '../scripts/check-no-secrets.ts';
import { LEVEL_DATA } from '../src/level/generated_level.ts';
import { BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CONFIG } from '../src/wallet/config.ts';

describe('Test 1 & Test 2: Base Sepolia Configuration & Security Checks', () => {
  it('Test 1: should configure Base Sepolia with chain ID 84532', () => {
    expect(BASE_SEPOLIA_CHAIN_ID).toBe(84532);
    expect(BASE_SEPOLIA_CONFIG.id).toBe(84532);
    expect(BASE_SEPOLIA_CONFIG.name).toBe('Base Sepolia');
    expect(BASE_SEPOLIA_CONFIG.rpcUrls.default.http[0]).toBe('https://sepolia.base.org');
    expect(BASE_SEPOLIA_CONFIG.blockExplorers?.default.url).toBe('https://sepolia.basescan.org');
  });

  it('Test 2: should ensure no tracked private keys or credentials exist and .env is ignored', () => {
    const { success, findings } = checkNoSecrets();
    expect(findings).toEqual([]);
    expect(success).toBe(true);
  });

  it('Test 4: should enforce MAX_TICKS limit in level config', () => {
    expect(LEVEL_DATA.world.maxTicks).toBe(600);
  });
});
