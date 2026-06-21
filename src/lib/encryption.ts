
import crypto from 'crypto';

/**
 * Utilidad de cifrado para proteger las URIs de conexión de los clientes en la DB maestra.
 * Utiliza AES-256-GCM para asegurar integridad y confidencialidad.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// En un entorno real, ENCRYPTION_KEY debe estar en variables de entorno (.env)
const MASTER_SECRET = process.env.ENCRYPTION_KEY || 'krea-business-ultra-secret-key-2026';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(MASTER_SECRET, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

export function decrypt(cipherText: string): string {
  const data = Buffer.from(cipherText, 'base64');
  
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 16);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + 16);
  
  const key = crypto.pbkdf2Sync(MASTER_SECRET, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
