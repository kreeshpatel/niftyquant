#!/usr/bin/env node
// Usage: node generate_hash.js yourpassword
// Outputs SHA-256 hash to paste into src/auth/config.js

const crypto = require('crypto');
const password = process.argv[2];

if (!password) {
  console.error('Usage: node generate_hash.js <password>');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(password).digest('hex');
console.log(`\nPassword: ${password}`);
console.log(`SHA-256:  ${hash}`);
console.log(`\nPaste into dashboard/frontend/src/auth/config.js:`);
console.log(`export const ACCESS_HASH = "${hash}"`);
