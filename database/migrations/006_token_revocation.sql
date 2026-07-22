-- 006: Token revocation via a per-user "valid from" instant.
--
-- JWTs are stateless: once issued they are honoured until they expire (7 days),
-- so logout only forgot the cookie on the client and a copied/leaked token kept
-- working. This adds a single instant per user — any token issued before it is
-- refused by `protect`.
--
-- Set to now() on logout, password change, and password reset. NULL means "no
-- revocation yet", so existing sessions keep working after this deploys — no
-- forced logout of everyone.
--
-- TIMESTAMPTZ (not TIMESTAMP) on purpose: `protect` compares this against the
-- token's `iat` via to_timestamp(iat), which yields an absolute UTC instant.
-- A timestamptz column stores an absolute instant too, so the comparison is
-- correct regardless of the database session's timezone. A plain TIMESTAMP
-- would be reinterpreted through the session TZ and could skew the check.
--
-- Idempotent — safe to re-apply. Also present in database/schema.sql.

ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_valid_from TIMESTAMPTZ;
