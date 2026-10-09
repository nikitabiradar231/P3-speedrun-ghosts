import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidateCanonicalLevel } from '../scripts/generate-level.ts';
import { checkLevelSync } from '../scripts/check-level-sync.ts';
import { LEVEL_DATA, CANONICAL_LEVEL_HASH } from '../src/level/generated_level.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Test 8: Single Source of Level Data & Artifact Sync', () => {
  it('should verify generated TypeScript level data matches canonical level hash', () => {
    const jsonPath = path.join(rootDir, 'src', 'level', 'canonical_level.json');
    const { hash } = loadAndValidateCanonicalLevel(jsonPath);

    expect(CANONICAL_LEVEL_HASH).toBe(hash);
    expect(LEVEL_DATA.canonicalHash).toBe(hash);
  });

  it('should verify checkLevelSync passes for currently generated artifacts', () => {
    expect(() => checkLevelSync()).not.toThrow();
  });

  it('should contain matching platform and hazard count between TS and canonical JSON', () => {
    const jsonPath = path.join(rootDir, 'src', 'level', 'canonical_level.json');
    const content = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    expect(LEVEL_DATA.solids.length).toBe(content.solids.length);
    expect(LEVEL_DATA.hazards.length).toBe(content.hazards.length);

    // Verify first solid matches
    expect(LEVEL_DATA.solids[0].x).toBe(content.solids[0].x);
    expect(LEVEL_DATA.solids[0].y).toBe(content.solids[0].y);
    expect(LEVEL_DATA.solids[0].w).toBe(content.solids[0].w);
    expect(LEVEL_DATA.solids[0].h).toBe(content.solids[0].h);
  });
});
