/**
 * derive-agent-key.mjs
 * Reads PACIFICA_AGENT_PRIVATE_KEY (or PACIFICA_API_KEY as fallback) from .env.local
 * and prints the corresponding agent wallet public key.
 *
 * Usage:
 *   node apps/backend/scripts/derive-agent-key.mjs
 */

import { createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── load .env.local from repo root ──────────────────────────────────────────
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
const envPath = resolve(ROOT, '.env.local');

let envRaw = '';
try {
  envRaw = readFileSync(envPath, 'utf8');
} catch {
  console.error(`Could not read ${envPath}`);
  process.exit(1);
}

function parseEnvLine(raw, key) {
  const match = raw.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

const privateKeyB58 =
  parseEnvLine(envRaw, 'PACIFICA_AGENT_PRIVATE_KEY') ||
  parseEnvLine(envRaw, 'PACIFICA_API_KEY');

if (!privateKeyB58) {
  console.error('❌  No PACIFICA_AGENT_PRIVATE_KEY or PACIFICA_API_KEY found in .env.local');
  process.exit(1);
}

// ── decode base58 ────────────────────────────────────────────────────────────
// Simple base58 decoder (no external dep needed)
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE_MAP = new Uint8Array(256).fill(255);
for (let i = 0; i < ALPHABET.length; i++) BASE_MAP[ALPHABET.charCodeAt(i)] = i;

function decodeBase58(str) {
  const bytes = [0];
  for (const ch of str) {
    const digit = BASE_MAP[ch.charCodeAt(0)];
    if (digit === 255) throw new Error(`Invalid base58 character: ${ch}`);
    let carry = digit;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const ch of str) {
    if (ch !== '1') break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

function encodeBase58(bytes) {
  let result = '';
  let carry;
  const digits = [0];
  for (const byte of bytes) {
    carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    result += '1';
  }
  return result + digits.reverse().map((d) => ALPHABET[d]).join('');
}

// ── derive public key ────────────────────────────────────────────────────────
let secretKey;
try {
  secretKey = decodeBase58(privateKeyB58);
} catch (e) {
  console.error('❌  Failed to decode base58 private key:', e.message);
  process.exit(1);
}

if (secretKey.length !== 64) {
  console.error(`❌  Decoded key is ${secretKey.length} bytes — expected 64 bytes (Solana keypair format).`);
  console.error('    Make sure PACIFICA_AGENT_PRIVATE_KEY is a full 64-byte Solana secret key in base58.');
  process.exit(1);
}

const privateSeed = secretKey.subarray(0, 32);
const publicKeyBytes = secretKey.subarray(32, 64);
const publicKeyB58 = encodeBase58(publicKeyBytes);

// verify by reconstructing via crypto
const jwk = {
  kty: 'OKP', crv: 'Ed25519',
  d: Buffer.from(privateSeed).toString('base64url'),
  x: Buffer.from(publicKeyBytes).toString('base64url'),
};
createPrivateKey({ key: jwk, format: 'jwk' }); // throws if invalid

console.log('\n✅  Agent wallet derived successfully!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Agent Wallet Public Key : ${publicKeyB58}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋  Langkah selanjutnya:\n');
console.log('1. Tambahkan ke .env.local (ganti nilai yang sudah ada):');
console.log(`   PACIFICA_AGENT_PRIVATE_KEY=${privateKeyB58}`);
console.log(`   PACIFICA_AGENT_ACCOUNT=<ALAMAT_WALLET_UTAMA_KAMU>\n`);
console.log('2. Daftarkan agent wallet di Pacifica testnet:');
console.log('   a. Buka https://test.pacifica.fi');
console.log('   b. Connect wallet utama kamu (Phantom)');
console.log('   c. Pergi ke Settings / Account / Agent Wallets');
console.log(`   d. Register agent wallet: ${publicKeyB58}\n`);
console.log('3. Restart backend: pnpm dev\n');

const currentAccount = parseEnvLine(envRaw, 'PACIFICA_AGENT_ACCOUNT');
if (currentAccount) {
  console.log(`ℹ️   PACIFICA_AGENT_ACCOUNT sudah ada: ${currentAccount}`);
} else {
  console.log('⚠️   PACIFICA_AGENT_ACCOUNT belum di-set di .env.local');
  console.log('    Set ini ke alamat wallet Solana utama kamu (yang connect di browser).\n');
}
