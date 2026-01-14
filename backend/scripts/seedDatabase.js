import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const BCRYPT_SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Readline interface for interactive prompts
let rl = null;

/**
 * Initialize readline interface
 */
function initReadline() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Close readline interface
 */
function closeReadline() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

/**
 * Prompt user for input
 */
function promptUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt user for password (with basic masking indication)
 */
function promptPassword(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();

    let password = '';

    const onData = (char) => {
      const c = char.toString();

      switch (c) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          stdin.removeListener('data', onData);
          if (stdin.isTTY) {
            stdin.setRawMode(wasRaw);
          }
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit(1);
        case '\u007F': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(question + '*'.repeat(password.length));
          }
          break;
        default:
          password += c;
          process.stdout.write('*');
          break;
      }
    };

    stdin.on('data', onData);
  });
}

/**
 * Check if a super admin already exists
 */
async function checkExistingSuperAdmin(client) {
  const result = await client.query(
    "SELECT id, email FROM users WHERE role = 'super_admin' LIMIT 1"
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Validate email format
 */
function validateEmail(email) {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
  }
  return null;
}

/**
 * Create super admin in database
 */
async function createSuperAdmin(client, email, password) {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);

  const result = await client.query(
    `INSERT INTO users (email, password_hash, role, is_active)
     VALUES ($1, $2, 'super_admin', TRUE)
     RETURNING id, email`,
    [email, passwordHash]
  );

  return result.rows[0];
}

/**
 * Get super admin credentials interactively
 */
async function getSuperAdminCredentialsInteractive() {
  let email, password;

  // Get email
  while (true) {
    email = await promptUser('   Enter super admin email: ');
    if (!validateEmail(email)) {
      console.log('   \u274C Invalid email format. Please try again.\n');
      continue;
    }
    break;
  }

  // Get password
  while (true) {
    password = await promptPassword('   Enter super admin password: ');
    const passwordError = validatePassword(password);
    if (passwordError) {
      console.log(`   \u274C ${passwordError}\n`);
      continue;
    }

    // Confirm password
    const confirmPassword = await promptPassword('   Confirm password: ');
    if (password !== confirmPassword) {
      console.log('   \u274C Passwords do not match. Please try again.\n');
      continue;
    }
    break;
  }

  return { email, password };
}

/**
 * Verify setup secret key
 */
async function verifySetupKey(providedKey) {
  const setupSecretKey = process.env.SETUP_SECRET_KEY;

  if (!setupSecretKey) {
    console.log('   \u274C SETUP_SECRET_KEY not configured in environment.');
    return false;
  }

  return providedKey === setupSecretKey;
}

/**
 * Handle super admin creation based on environment and mode
 */
async function handleSuperAdminCreation(client) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const createFromEnv = process.env.CREATE_SUPER_ADMIN === 'true';

  console.log('\n\u{1F464} Super Admin Setup\n');

  // Check for existing super admin
  const existingAdmin = await checkExistingSuperAdmin(client);
  if (existingAdmin) {
    console.log(`   \u26A0\uFE0F  A super admin already exists: ${existingAdmin.email}`);
    console.log('   Skipping super admin creation.\n');
    return null;
  }

  // Mode 1: Non-interactive (CI/CD) - Environment variables
  if (createFromEnv) {
    console.log('   Mode: Non-interactive (using environment variables)\n');

    const { SETUP_SECRET_KEY, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = process.env;

    // Verify setup key (skip in development)
    if (!isDevelopment) {
      if (!await verifySetupKey(SETUP_SECRET_KEY)) {
        console.log('   \u274C Invalid SETUP_SECRET_KEY. Super admin creation aborted.');
        return null;
      }
      console.log('   \u2705 Setup key verified.\n');
    }

    // Validate credentials
    if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
      console.log('   \u274C SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set.');
      return null;
    }

    if (!validateEmail(SUPER_ADMIN_EMAIL)) {
      console.log('   \u274C Invalid SUPER_ADMIN_EMAIL format.');
      return null;
    }

    const passwordError = validatePassword(SUPER_ADMIN_PASSWORD);
    if (passwordError) {
      console.log(`   \u274C ${passwordError}`);
      return null;
    }

    const admin = await createSuperAdmin(client, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    console.log(`   \u2705 Super admin created: ${admin.email}\n`);
    return admin;
  }

  // Mode 2: Interactive
  initReadline();

  try {
    // Ask if user wants to create super admin
    const createAdmin = await promptUser('   Do you want to create a super admin? (yes/no): ');

    if (createAdmin.toLowerCase() !== 'yes' && createAdmin.toLowerCase() !== 'y') {
      console.log('   Skipping super admin creation.\n');
      return null;
    }

    // Verify setup key (skip in development)
    if (!isDevelopment) {
      console.log('\n   \u{1F512} Authorization required for production setup.\n');

      const setupKey = await promptPassword('   Enter setup secret key: ');

      if (!await verifySetupKey(setupKey)) {
        console.log('   \u274C Invalid setup key. Super admin creation aborted.\n');
        return null;
      }
      console.log('   \u2705 Setup key verified.\n');
    } else {
      console.log('   \u{1F6E0}\uFE0F  Development mode - skipping key verification.\n');
    }

    // Get credentials interactively
    const { email, password } = await getSuperAdminCredentialsInteractive();

    const admin = await createSuperAdmin(client, email, password);
    console.log(`\n   \u2705 Super admin created successfully: ${admin.email}\n`);
    return admin;

  } finally {
    closeReadline();
  }
}

/**
 * Main seeding function
 */
const seedDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('\n\u{1F331} Seeding database...\n');

    await client.query('BEGIN');

    // Read seed file
    const seedPath = path.join(__dirname, '../../database/seed-data.sql');
    let seedSQL = fs.readFileSync(seedPath, 'utf8');

    // Hash passwords for placement officers
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const officerPasswordHash = await bcrypt.hash('123', salt);

    // Replace placeholder with actual hashed password for officers
    seedSQL = seedSQL.replace(/\$2b\$10\$placeholder/g, officerPasswordHash);

    // Execute seed SQL (regions, colleges, placement officers)
    console.log('\u{1F4BE} Seeding base data (regions, colleges, officers)...');
    await client.query(seedSQL);
    console.log('\u2705 Base data seeded successfully.\n');

    // Handle super admin creation
    await handleSuperAdminCreation(client);

    await client.query('COMMIT');

    // Print summary
    console.log('\u{1F389} Database seeding completed!\n');
    console.log('\u{1F4CB} Summary:');

    const regions = await client.query('SELECT COUNT(*) FROM regions');
    const colleges = await client.query('SELECT COUNT(*) FROM colleges');
    const officers = await client.query('SELECT COUNT(*) FROM placement_officers');
    const admins = await client.query("SELECT COUNT(*) FROM users WHERE role = 'super_admin'");

    console.log(`   - ${regions.rows[0].count} Regions`);
    console.log(`   - ${colleges.rows[0].count} Colleges`);
    console.log(`   - ${officers.rows[0].count} Placement Officers`);
    console.log(`   - ${admins.rows[0].count} Super Admin(s)\n`);

    console.log('\u{1F511} Default Credentials:');
    console.log('   Placement Officers: <phone_number> / 123\n');

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n\u274C Error seeding database:', error.message);
    client.release();
    await pool.end();
    process.exit(1);
  }
};

seedDatabase();
