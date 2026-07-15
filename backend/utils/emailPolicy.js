import { createRequire } from 'module';

/**
 * Email policy — blocks disposable/temporary email addresses.
 *
 * Uses the community-maintained disposable-email-domains list (120k+ domains,
 * plain JSON, refreshed via normal npm updates). Matching walks the domain
 * labels so subdomain tricks are caught too (e.g. anything.mailinator.com).
 *
 * Applied wherever a student email is SET: registration and email correction.
 * The Google account picker path is inherently safe (disposable domains
 * cannot host Google accounts) but goes through the same endpoints anyway.
 */

const require = createRequire(import.meta.url);
const DISPOSABLE_DOMAINS = new Set(require('disposable-email-domains'));

export const isDisposableEmail = (email) => {
  if (typeof email !== 'string') return false;
  const domain = email.toLowerCase().split('@')[1]?.trim();
  if (!domain) return false;

  // Check the domain and every parent domain (a.b.mailinator.com → matches)
  const labels = domain.split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(labels.slice(i).join('.'))) return true;
  }
  return false;
};

export const DISPOSABLE_EMAIL_MESSAGE =
  'Temporary/disposable email addresses are not allowed. Please use your personal email address — important placement communication will be sent there.';
