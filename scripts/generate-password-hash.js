// Jelszó hash generáló script
// Futtasd: node scripts/generate-password-hash.js

const bcrypt = require('bcrypt');

const password = '12345';
const saltRounds = 12;

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
