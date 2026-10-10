/**
 * Browser-compatible hexadecimal and byte array conversion utilities.
 * Pure TypeScript implementation with strict format and length validation.
 */

/**
 * Converts a hexadecimal string (with or without '0x' prefix) to a Uint8Array.
 *
 * @param hex Hexadecimal input string (e.g. "0x0602" or "0602")
 * @returns Uint8Array of parsed bytes
 * @throws Error if input contains non-hex characters or has an odd length
 */
export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== 'string') {
    throw new TypeError('Expected a string for hexToBytes');
  }

  const clean = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;

  if (clean.length === 0) {
    return new Uint8Array(0);
  }

  if (clean.length % 2 !== 0) {
    throw new Error(`Invalid hex string: odd length (${clean.length})`);
  }

  if (!/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error(`Invalid hex string: contains non-hexadecimal characters`);
  }

  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

/**
 * Converts a Uint8Array into a '0x'-prefixed hexadecimal string.
 *
 * @param bytes Uint8Array of bytes
 * @returns '0x'-prefixed lowercase hexadecimal string
 */
export function bytesToHex(bytes: Uint8Array): `0x${string}` {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('Expected a Uint8Array for bytesToHex');
  }

  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }

  return `0x${hex}` as `0x${string}`;
}
