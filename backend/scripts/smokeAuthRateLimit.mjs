/**
 * Smoke test for the auth rate-limiter fix (per-account keying + IP cap).
 *
 * Start the server with production-like settings first:
 *   NODE_ENV=production APP_ENV=development node server.js
 * (NODE_ENV=production enables trust proxy, so X-Forwarded-For headers
 *  from this script simulate distinct client IPs; APP_ENV=development
 *  keeps email in safe capture mode.)
 *
 * Then: node scripts/smokeAuthRateLimit.mjs
 */
const BASE = 'http://localhost:5000';

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  cond ? (pass++, console.log(`  PASS  ${name}`)) : (fail++, console.log(`  FAIL  ${name} ${extra}`));
};

const attemptLogin = async (ip, email) => {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ email, password: 'definitely-wrong-password' }),
  });
  let message = '';
  try {
    message = (await res.json()).message || '';
  } catch { /* non-JSON */ }
  return { status: res.status, message };
};

const main = async () => {
  // 1. Proxy diagnostic: /health must echo the forwarded IP
  let res = await fetch(`${BASE}/health`, { headers: { 'X-Forwarded-For': '9.9.9.50' } });
  let body = await res.json();
  check('/health echoes forwarded client IP (trust proxy works)',
    body.client_ip === '9.9.9.50', `got ${body.client_ip}`);

  // 2. Per-account limit: 10 failed attempts for one account on IP 9.9.9.1
  let last;
  for (let i = 0; i < 10; i++) {
    last = await attemptLogin('9.9.9.1', 'locked.account@test.invalid');
  }
  check('10 failed attempts allowed through (each got 401)', last.status === 401, `status=${last.status}`);

  last = await attemptLogin('9.9.9.1', 'locked.account@test.invalid');
  check('11th attempt for SAME account blocked (429)', last.status === 429, `status=${last.status}`);
  check('  message names the account, not the IP', /for this account/i.test(last.message), last.message);

  // 3. THE FIX: a different user on the SAME shared IP is not locked out
  last = await attemptLogin('9.9.9.1', 'innocent.neighbor@test.invalid');
  check('DIFFERENT account on same IP still allowed (mass-lockout fixed)',
    last.status === 401, `status=${last.status} ${last.message}`);

  // 4. Coarse IP cap: 100 failed attempts across many accounts from one IP
  let blockedAt = null;
  for (let i = 0; i < 110; i++) {
    const r = await attemptLogin('9.9.9.2', `stuffing-${i}@test.invalid`);
    if (r.status === 429) { blockedAt = { attempt: i + 1, ...r }; break; }
  }
  check('credential-stuffing from one IP blocked at attempt 101',
    blockedAt?.attempt === 101, `blocked at ${blockedAt?.attempt}`);
  check('  message names the network', /from this network/i.test(blockedAt?.message || ''), blockedAt?.message);

  // 5. And a clean third IP is completely unaffected by all of the above
  last = await attemptLogin('9.9.9.3', 'locked.account@test.invalid');
  check('same account from a NEW IP gets a fresh bucket (401 not 429)',
    last.status === 401, `status=${last.status}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});
