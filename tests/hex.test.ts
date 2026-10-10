import { describe, it, expect } from 'vitest';
import { hexToBytes, bytesToHex } from '../src/utils/hex.ts';

describe('Hex & Byte Array Utilities', () => {
  it('should parse hex string without 0x prefix', () => {
    const hex = '060205';
    const bytes = hexToBytes(hex);
    expect(bytes).toEqual(new Uint8Array([0x06, 0x02, 0x05]));
  });

  it('should parse hex string with 0x prefix', () => {
    const hex = '0x060205';
    const bytes = hexToBytes(hex);
    expect(bytes).toEqual(new Uint8Array([0x06, 0x02, 0x05]));
  });

  it('should parse uppercase 0X prefix and uppercase hex digits', () => {
    const hex = '0X0A0B0C0D0E0F';
    const bytes = hexToBytes(hex);
    expect(bytes).toEqual(new Uint8Array([0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]));
  });

  it('should handle empty string and 0x prefix only', () => {
    expect(hexToBytes('')).toEqual(new Uint8Array(0));
    expect(hexToBytes('0x')).toEqual(new Uint8Array(0));
  });

  it('should preserve exact byte order across multiple bytes', () => {
    const hex = '0102030405060708090a';
    const bytes = hexToBytes(hex);
    expect(bytes.length).toBe(10);
    expect(bytes[0]).toBe(0x01);
    expect(bytes[4]).toBe(0x05);
    expect(bytes[9]).toBe(0x0a);
  });

  it('should reject odd-length hex strings', () => {
    expect(() => hexToBytes('0x1')).toThrow(/odd length/i);
    expect(() => hexToBytes('123')).toThrow(/odd length/i);
    expect(() => hexToBytes('0x12345')).toThrow(/odd length/i);
  });

  it('should reject non-hexadecimal characters', () => {
    expect(() => hexToBytes('0xzz')).toThrow(/non-hexadecimal/i);
    expect(() => hexToBytes('0x123g')).toThrow(/odd length|non-hexadecimal/i);
    expect(() => hexToBytes('hello!world!')).toThrow(/non-hexadecimal/i);
  });

  it('should reject non-string inputs', () => {
    expect(() => hexToBytes(123 as any)).toThrow(TypeError);
    expect(() => hexToBytes(null as any)).toThrow(TypeError);
  });

  it('should convert Uint8Array to 0x-prefixed hex string', () => {
    const bytes = new Uint8Array([0x06, 0x02, 0x05, 0x0a, 0xff]);
    const hex = bytesToHex(bytes);
    expect(hex).toBe('0x0602050aff');
  });

  it('should handle roundtrip conversion (hexToBytes -> bytesToHex)', () => {
    const originalHex = '0x06020202050602';
    const bytes = hexToBytes(originalHex);
    const convertedHex = bytesToHex(bytes);
    expect(convertedHex).toBe(originalHex);
  });
});
