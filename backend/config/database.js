/**
 * Database Configuration Module
 *
 * This module configures and manages the PostgreSQL connection pool
 * for the State Placement Cell.
 *
 * Features:
 * - Connection pooling with configurable limits
 * - Automatic reconnection on failures
 * - Query execution with performance logging
 * - Transaction support with automatic rollback
 * - Client management with timeout protection
 *
 * @module config/database
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ============================================
// CONNECTION POOL CONFIGURATION
// ============================================

/**
 * PostgreSQL Connection Pool
 *
 * Configuration for HIGH TRAFFIC (20,000+ concurrent users):
 * - max: Maximum number of clients in the pool
 * - min: Minimum number of idle clients to maintain
 * - idleTimeoutMillis: How long a client can remain idle before being closed
 * - connectionTimeoutMillis: Maximum time to wait for connection
 *
 * PRODUCTION NOTES:
 * - PostgreSQL default max_connections is 100, increase to 200+ in postgresql.conf
 * - For multiple backend instances, divide max pool size accordingly
 * - Example: 2 backend servers × 100 pool = 200 total DB connections needed
 * - Monitor connection usage with: SELECT count(*) FROM pg_stat_activity;
 *
 * @constant {Pool}
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'campus_placement_portal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // Production-optimized pool settings for high concurrency
  max: process.env.DB_POOL_MAX || (process.env.NODE_ENV === 'production' ? 100 : 20),
  min: process.env.DB_POOL_MIN || (process.env.NODE_ENV === 'production' ? 20 : 2),
  idleTimeoutMillis: 30000,    // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Wait up to 10s for connection
  // Performance and safety settings
  statement_timeout: 30000,     // Kill queries taking > 30s
  query_timeout: 30000,
  application_name: 'placement_portal',
  // Connection keepalive for long-running connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Connection Success Handler
 * Logs when a new client connects to the database
 */
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

/**
 * Error Handler
 * Logs unexpected database errors and exits process
 * This prevents the application from running with a broken database connection
 */
pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Execute a Query with Performance Logging
 *
 * Executes a SQL query with parameter binding and logs execution time.
 * Use parameterized queries to prevent SQL injection.
 *
 * @async
 * @function query
 * @param {string} text - SQL query text with $1, $2, etc. placeholders
 * @param {Array} [params] - Array of parameter values
 * @returns {Promise<pg.QueryResult>} Query result with rows and metadata
 * @throws {Error} Database query error
 *
 * @example
 * // Simple query
 * const result = await query('SELECT * FROM users WHERE email = $1', ['user@example.com']);
 *
 * @example
 * // Insert query
 * const result = await query(
 *   'INSERT INTO students (prn, name) VALUES ($1, $2) RETURNING *',
 *   ['2301150100', 'John Doe']
 * );
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log query performance in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Executed query', {
        text: text.substring(0, 100), // First 100 chars
        duration: `${duration}ms`,
        rows: res.rowCount
      });
    }

    return res;
  } catch (error) {
    console.error('❌ Database query error:', {
      message: error.message,
      query: text.substring(0, 100),
    });
    throw error;
  }
};

// ============================================
// CLIENT MANAGEMENT
// ============================================

/**
 * Get a Client from the Pool for Transactions
 *
 * Returns a client with timeout protection to prevent hanging connections.
 * The client must be released manually after use.
 *
 * @async
 * @function getClient
 * @returns {Promise<pg.PoolClient>} Database client from pool
 * @throws {Error} If no clients are available
 *
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('SELECT * FROM users');
 * } finally {
 *   client.release();
 * }
 */
export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout to prevent hanging connections
  // Logs warning if client is not released within 5 seconds
  const timeout = setTimeout(() => {
    console.error('❌ Client has been checked out for more than 5 seconds!');
    console.error('   This may indicate a missing client.release() call');
  }, 5000);

  // Override release to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return client;
};

// ============================================
// TRANSACTION SUPPORT
// ============================================

/**
 * Execute a Database Transaction
 *
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 * If the callback throws an error, the transaction is rolled back.
 * The client is always released, even if an error occurs.
 *
 * @async
 * @function transaction
 * @param {Function} callback - Async function that receives the client
 * @returns {Promise<any>} Result from callback function
 * @throws {Error} If transaction fails or callback throws
 *
 * @example
 * const result = await transaction(async (client) => {
 *   await client.query('UPDATE students SET cgpa = $1 WHERE id = $2', [8.5, 1]);
 *   await client.query('INSERT INTO activity_logs (action) VALUES ($1)', ['cgpa_updated']);
 *   return { success: true };
 * });
 */
export const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Close All Database Connections
 *
 * Used during graceful shutdown to close all pool connections.
 *
 * @async
 * @function closePool
 * @returns {Promise<void>}
 */
export const closePool = async () => {
  await pool.end();
  console.log('🔌 Database connection pool closed');
};

// ============================================
// EXPORTS
// ============================================

export default pool;
