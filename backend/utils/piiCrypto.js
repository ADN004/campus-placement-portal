/**
 * PII field encryption (C-3).
 *
 * Encrypts the government-ID numbers stored in student_extended_profiles
 * (Aadhaar, PAN, passport) at rest. These columns are never searched, filtered,
 * grouped, or unique — verified across the codebase — so we can use strong
 * random-IV authenticated encryption (AES-256-GCM) rather than a deterministic
 * scheme. Each encryption of the same value produces different ciphertext, and
 * tampering is detected by the auth tag.
 *
 * Self-describing format: encrypted values are stored as
 *   enc:v1:<base64( iv[12] || tag[16] || ciphertext )>
 * decryptPii() returns anything without that prefix unchanged. That is what
 * makes the rollout safe and order-independent:
 *   - a row that is still legacy plaintext reads back as-is;
 *   - a value that is already encrypted decrypts;
 *   - if a decrypt site is ever missed, it shows a visible "enc:v1:..." string
 *     rather than silently leaking plaintext — a loud, obvious failure.
 *
 * Key: PII_ENCRYPTION_KEY, a 32-byte key supplied as base64 or hex. If the key
 * is lost, encrypted values are unrecoverable, so it must be backed up
 * separately from the database. The key is loaded lazily and only required to
 * encrypt or to decrypt a tagged value — the app still boots and serves
 * plaintext rows if it is unset (useful before the backfill has run).
 */

import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';
const IV_LEN = 12;
const TAG_LEN = 16;

// The three columns C-3 covers. Also the allow-list for field-name-based
// helpers, so a stray field can never be accidentally encrypted.
export const PII_FIELDS = ['pan_number', 'aadhar_number', 'passport_number'];

let cachedKey = null;

function getKey() {
  if (cachedKey) return cachedKey;
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'PII_ENCRYPTION_KEY is not set — required to encrypt/decrypt student ID numbers'
    );
  }
  // Accept a 64-char hex string or base64; both must decode to exactly 32 bytes.
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(
      'PII_ENCRYPTION_KEY must decode to 32 bytes (use a 64-char hex or base64 of 32 random bytes)'
    );
  }
  cachedKey = key;
  return key;
}

/** True if a value is one of our encrypted strings. */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Encrypt a plaintext value. null/undefined/'' pass through unchanged (we do
 * not encrypt "no value"), and an already-encrypted value is returned as-is so
 * the operation is idempotent (safe to run the backfill twice).
 */
export function encryptPii(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  if (isEncrypted(plaintext)) return plaintext;
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/**
 * Decrypt a value. Anything not carrying our prefix (legacy plaintext, null,
 * undefined, non-strings) is returned unchanged.
 */
export function decryptPii(value) {
  if (!isEncrypted(value)) return value;
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Encrypt a value only if fieldName is a PII field; otherwise return it
 * unchanged. Used at the single write site so non-PII fields are untouched.
 */
export function encryptPiiField(fieldName, value) {
  return PII_FIELDS.includes(fieldName) ? encryptPii(value) : value;
}

/**
 * Decrypt the PII fields of a DB row, or every row in an array, in place.
 * Tolerant of missing fields, nulls, and legacy plaintext. Returns the same
 * reference for convenience. Call this immediately after any SELECT that reads
 * these columns for display.
 */
export function decryptPiiFields(rowOrRows) {
  if (!rowOrRows) return rowOrRows;
  const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    for (const field of PII_FIELDS) {
      if (isEncrypted(row[field])) row[field] = decryptPii(row[field]);
    }
  }
  return rowOrRows;
}
