import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAndValidateCanonicalLevel, generateTypeScriptArtifact, generateSolidityArtifact } from './generate-level.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function checkLevelSync(): boolean {
  const jsonPath = path.join(rootDir, 'src', 'level', 'canonical_level.json');
  const tsPath = path.join(rootDir, 'src', 'level', 'generated_level.ts');
  const solPath = path.join(rootDir, 'contracts', 'LevelConstants.sol');

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Canonical level file not found: ${jsonPath}`);
  }
  if (!fs.existsSync(tsPath)) {
    throw new Error(`Generated TypeScript artifact not found: ${tsPath}. Run 'npm run level:generate'.`);
  }
  if (!fs.existsSync(solPath)) {
    throw new Error(`Generated Solidity artifact not found: ${solPath}. Run 'npm run level:generate'.`);
  }

  const { level, hash } = loadAndValidateCanonicalLevel(jsonPath);
  const expectedTs = generateTypeScriptArtifact(level, hash).trim().replace(/\r\n/g, '\n');
  const actualTs = fs.readFileSync(tsPath, 'utf-8').trim().replace(/\r\n/g, '\n');

  const expectedSol = generateSolidityArtifact(level, hash).trim().replace(/\r\n/g, '\n');
  const actualSol = fs.readFileSync(solPath, 'utf-8').trim().replace(/\r\n/g, '\n');

  let inSync = true;
  if (expectedTs !== actualTs) {
    console.error('❌ Error: generated_level.ts is out of sync with canonical_level.json!');
    inSync = false;
  }
  if (expectedSol !== actualSol) {
    console.error('❌ Error: LevelConstants.sol is out of sync with canonical_level.json!');
    inSync = false;
  }

  if (inSync) {
    console.log('✅ Level artifacts are in sync with canonical source of truth.');
    return true;
  } else {
    throw new Error('Level artifacts are stale. Run "npm run level:generate" to synchronize.');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    checkLevelSync();
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }
}
