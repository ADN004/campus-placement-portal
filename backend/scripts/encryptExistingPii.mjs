/**
 * One-time backfill: encrypt existing plaintext Aadhaar / PAN / passport numbers
 * in student_extended_profiles (C-3).
 *
 * Safe to run repeatedly — values already in the enc:v1: format are skipped, so
 * a re-run only encrypts anything still plaintext. NULL/empty values are left
 * as-is.
 *
 * DRY RUN BY DEFAULT: prints what it would do and changes nothing. Pass --apply
 * to actually write. ALWAYS take a database backup before --apply: once
 * plaintext is encrypted, the old code (which cannot decrypt) can no longer read
 * these columns, and losing PII_ENCRYPTION_KEY makes them unrecoverable.
 *
 * Requires PII_ENCRYPTION_KEY in the environment (same key the app uses).
 *
 * Usage (inside the backend container):
 *   node scripts/encryptExistingPii.mjs            # dry run
 *   node scripts/encryptExistingPii.mjs --apply    # perform the encryption
 */

import dotenv from 'dotenv';
dotenv.config();

import pool, { query, closePool } from '../config/database.js';
import { encryptPii, isEncrypted, PII_FIELDS } from '../utils/piiCrypto.js';

const APPLY = process.argv.includes('--apply');

async function main() {
  if (!process.env.PII_ENCRYPTION_KEY) {
    console.error('❌ PII_ENCRYPTION_KEY is not set. Aborting.');
    process.exit(1);
  }

  console.log(`\n🔐 PII backfill — ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (no changes)'}\n`);

  const { rows } = await query(
    `SELECT student_id, pan_number, aadhar_number, passport_number
       FROM student_extended_profiles`
  );

  const stats = {
    rowsScanned: rows.length,
    rowsUpdated: 0,
    valuesEncrypted: 0,
    valuesAlreadyEncrypted: 0,
    valuesNull: 0,
  };

  for (const row of rows) {
    const updates = {};

    for (const field of PII_FIELDS) {
      const value = row[field];
      if (value === null || value === undefined || value === '') {
        stats.valuesNull++;
        continue;
      }
      if (isEncrypted(value)) {
        stats.valuesAlreadyEncrypted++;
        continue;
      }
      updates[field] = encryptPii(value);
      stats.valuesEncrypted++;
    }

    if (Object.keys(updates).length === 0) continue;
    stats.rowsUpdated++;

    if (APPLY) {
      const fields = Object.keys(updates);
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const values = [...fields.map((f) => updates[f]), row.student_id];
      await query(
        `UPDATE student_extended_profiles SET ${setClause} WHERE student_id = $${values.length}`,
        values
      );
    }
  }

  console.log('  rows scanned            :', stats.rowsScanned);
  console.log('  rows ' + (APPLY ? 'updated       ' : 'to update    ') + '     :', stats.rowsUpdated);
  console.log('  values encrypted        :', stats.valuesEncrypted);
  console.log('  values already encrypted:', stats.valuesAlreadyEncrypted, '(skipped)');
  console.log('  values null/empty       :', stats.valuesNull, '(skipped)');

  if (!APPLY && stats.valuesEncrypted > 0) {
    console.log('\n➡  Dry run only. Re-run with --apply (after a DB backup) to encrypt these.');
  } else if (APPLY) {
    console.log('\n✅ Backfill complete.');
  } else {
    console.log('\n✅ Nothing to encrypt — all values already encrypted or empty.');
  }
}

main()
  .catch((err) => {
    console.error('❌ Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool().catch(() => {});
  });
