
import crypto from 'crypto';

/**
 * Utilidad de cifrado de grado militar para Krea Business.
 * Implementa AES-256-GCM para asegurar confidencialidad e integridad.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Llave maestra del servidor (Debe estar en .env)
const MASTER_SECRET = process.env.ENCRYPTION_KEY || 'krea-business-ultra-secret-2026-prod';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(MASTER_SECRET, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Estructura: [SALT (64)] [IV (16)] [TAG (16)] [ENCRYPTED DATA]
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

export function decrypt(cipherText: string): string {
  try {
    const data = Buffer.from(cipherText, 'base64');
    
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 16);
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + 16);
    
    const key = crypto.pbkdf2Sync(MASTER_SECRET, salt, ITERATIONS, KEY_LENGTH, 'sha512');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch (e) {
    throw new Error('Fallo en el descifrado: La llave maestra es incorrecta o los datos están corruptos.');
  }
}

/**
 * Genera un Token de Activación firmado para instalaciones Offline.
 */
export function generateActivationToken(storeId: string, secretKey: string): string {
  const hmac = crypto.createHmac('sha256', MASTER_SECRET);
  hmac.update(`${storeId}:${secretKey}:${new Date().toISOString().split('T')[0]}`);
  return hmac.digest('hex');
}
