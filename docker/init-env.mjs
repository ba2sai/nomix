import { randomBytes } from 'node:crypto';
import { chownSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const path = '.env';
const existing = existsSync(path);
const original = readFileSync(existing ? path : '.env.example', 'utf8');
let contents = original.replace(/\r\n/g, '\n');
for (const name of ['POSTGRES_PASSWORD', 'DB_PASSWORD', 'DB_MIGRATION_PASSWORD', 'APP_KEY']) {
  const pattern = new RegExp(`^${name}=$`, 'm');
  if (pattern.test(contents)) {
    const secret = name === 'APP_KEY' ? `base64:${randomBytes(32).toString('base64')}` : randomBytes(32).toString('hex');
    contents = contents.replace(pattern, `${name}=${secret}`);
  } else if (!new RegExp(`^${name}=.+$`, 'm').test(contents)) {
    throw new Error(`Falta ${name} en .env. Agrega ${name}= y vuelve a ejecutar env.`);
  }
}
if (!existing || contents !== original) {
  writeFileSync(path, contents, { mode: 0o600, flag: existing ? 'w' : 'wx' });
  // En Linux el archivo debe pertenecer al usuario del checkout, no a root del contenedor.
  if (!existing && process.getuid?.() === 0) {
    const owner = statSync('.');
    chownSync(path, owner.uid, owner.gid);
  }
}
console.log('Configuracion local lista; las claves existentes se conservan.');
