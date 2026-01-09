// Jelszó hash generáló script
// Futtasd: node scripts/generate-password-hash.js
// FONTOS: saltRounds értékét tartsd szinkronban: lib/constants.ts -> BCRYPT_ROUNDS

const bcrypt = require('bcrypt');

const password = '12345';
const saltRounds = 12; // Sync with BCRYPT_ROUNDS in lib/constants.ts

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Hiba:', err);
    return;
  }
  console.log('Jelszó:', password);
  console.log('Hash:', hash);
  console.log('');
  console.log('Másold be az SQL scriptbe!');
});
