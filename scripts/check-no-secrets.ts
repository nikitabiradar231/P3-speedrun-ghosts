import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Regex patterns to detect potential real secrets
const SECRET_PATTERNS = [
  /(?:private_?key|deployer_?key)\s*[:=]\s*["']?0x[a-fA-F0-9]{64}["']?/i,
  /BEGIN (?:RSA|EC|PRIVATE) KEY/,
  /AKIA[0-9A-Z]{16}/, // AWS Access Key
  /ghp_[a-zA-Z0-9]{36}/, // GitHub Token
];

// Placeholder values that are safe in examples
const ALLOWED_PLACEHOLDERS = [
  '0x0000000000000000000000000000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
  'PLACEHOLDER_BASESCAN_API_KEY',
  'YOUR_PRIVATE_KEY_HERE',
];

export function checkNoSecrets(): { success: boolean; findings: string[] } {
  const findings: string[] = [];

  // Check if .env is git-tracked
  try {
    const trackedFiles = execSync('git ls-files', { cwd: rootDir, encoding: 'utf-8' })
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    for (const file of trackedFiles) {
      if (file === '.env' || file.startsWith('.env.local') || file.endsWith('.key') || file.endsWith('.pem')) {
        findings.push(`Tracked forbidden file: ${file}`);
      }

      const filePath = path.join(rootDir, file);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) continue;

      // Skip binary files or lock files if huge
      if (file.endsWith('.png') || file.endsWith('.ico') || file.endsWith('.svg') || file.endsWith('.jpg')) continue;

      const content = fs.readFileSync(filePath, 'utf-8');

      for (const pattern of SECRET_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          const matchStr = matches[0];
          const isAllowed = ALLOWED_PLACEHOLDERS.some((placeholder) => matchStr.includes(placeholder));
          if (!isAllowed) {
            findings.push(`Potential secret found in ${file}: "${matchStr.slice(0, 30)}..."`);
          }
        }
      }
    }
  } catch (err: any) {
    findings.push(`Git scan error: ${err.message}`);
  }

  // Also verify .gitignore includes .env
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    findings.push('.gitignore missing');
  } else {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignoreContent.includes('.env')) {
      findings.push('.gitignore does not ignore .env');
    }
  }

  if (findings.length === 0) {
    console.log('✅ No tracked secrets or private keys detected. .gitignore properly protects .env.');
    return { success: true, findings: [] };
  } else {
    console.error('❌ Secret / credential findings:');
    for (const f of findings) {
      console.error(` - ${f}`);
    }
    return { success: false, findings };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { success } = checkNoSecrets();
  if (!success) process.exit(1);
}
