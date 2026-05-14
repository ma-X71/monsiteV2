/**
 * generate-hash.js
 * Lance ce script UNE SEULE FOIS en local pour obtenir le hash à coller dans Vercel.
 *
 * Usage :
 *   node generate-hash.js MonMotDePasse
 *
 * Copie la valeur affichée dans PASSWORD_HASH sur Vercel.
 */
import crypto from 'crypto';

const password = process.argv[2];

if (!password) {
  console.error('Usage: node generate-hash.js <ton_mot_de_passe>');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(password).digest('hex');

console.log('\n✅ Ton hash SHA-256 (colle cette valeur dans Vercel > PASSWORD_HASH) :\n');
console.log(hash);
console.log('\n💡 Génère aussi un TOKEN_SECRET aléatoire :');
console.log(crypto.randomBytes(32).toString('hex'));
console.log('');
