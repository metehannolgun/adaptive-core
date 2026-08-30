import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const EMAIL_TEMPLATE_MARKER = 'Your Adaptive Core sign-in code';
const OTP_PATTERN = /<strong>(\d{6})<\/strong>/i;
const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 10_000;

function loadLocalSupabaseStatus() {
  const result = spawnSync(
    './node_modules/.bin/supabase',
    ['status', '--output', 'json'],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    throw new Error('Unable to read the running local Supabase status.');
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error('Local Supabase status did not return valid JSON.');
  }
}

function assertLocalStatus(status) {
  const apiUrl = status.API_URL;
  const inboxUrl = status.MAILPIT_URL ?? status.INBUCKET_URL;
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const serviceRoleKey = status.SERVICE_ROLE_KEY;

  if (!apiUrl || !inboxUrl || !publishableKey || !serviceRoleKey) {
    throw new Error('Local Supabase Auth or captured-email configuration is unavailable.');
  }

  return { apiUrl, inboxUrl, publishableKey, serviceRoleKey };
}

async function createConfirmedFixtureUser(
  { apiUrl, serviceRoleKey },
  email,
) {
  const response = await fetch(`${apiUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, email_confirm: true }),
  });

  if (!response.ok) {
    throw new Error(`Local Auth fixture creation failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();

  if (!payload.id) {
    throw new Error('Local Auth fixture creation returned no user identity.');
  }

  return payload.id;
}

async function requestPasswordlessEmail({ apiUrl, publishableKey }, email) {
  const response = await fetch(`${apiUrl}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, create_user: false }),
  });

  if (!response.ok) {
    throw new Error(`Passwordless email request failed with HTTP ${response.status}.`);
  }
}

async function waitForCapturedMessage(inboxUrl, email) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  const query = encodeURIComponent(`to:${email}`);

  while (Date.now() < deadline) {
    const response = await fetch(`${inboxUrl}/api/v1/search?query=${query}`);

    if (response.ok) {
      const payload = await response.json();
      const message = payload.messages?.[0];

      if (message?.ID) {
        return message.ID;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('The local captured-email service did not receive the Auth email in time.');
}

async function readCapturedEmailHtml(inboxUrl, messageId) {
  const response = await fetch(
    `${inboxUrl}/view/${encodeURIComponent(messageId)}.html`,
  );

  if (!response.ok) {
    throw new Error(`Captured email retrieval failed with HTTP ${response.status}.`);
  }

  return response.text();
}

function extractConfiguredOtp(html) {
  if (!html.includes(EMAIL_TEMPLATE_MARKER)) {
    throw new Error('Captured email did not use the configured six-digit OTP template.');
  }

  if (/<a\b|href\s*=|\/auth\/v1\/verify|token_hash/i.test(html)) {
    throw new Error('Captured email contains a sign-in link instead of code-only content.');
  }

  const match = html.match(OTP_PATTERN);

  if (!match) {
    throw new Error('Captured email did not contain one six-digit OTP.');
  }

  return match[1];
}

async function verifyOtp({ apiUrl, publishableKey }, email, token) {
  const response = await fetch(`${apiUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, token, type: 'email' }),
  });

  if (!response.ok) {
    throw new Error(`Email OTP verification failed with HTTP ${response.status}.`);
  }
}

async function deleteCapturedMessage(inboxUrl, messageId) {
  if (!messageId) {
    return;
  }

  const response = await fetch(`${inboxUrl}/api/v1/messages`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ IDs: [messageId] }),
  });

  if (!response.ok) {
    throw new Error('Captured email cleanup failed.');
  }
}

async function deleteFixtureUser({ apiUrl, serviceRoleKey }, userId) {
  if (!userId) {
    return;
  }

  const response = await fetch(
    `${apiUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Local Auth fixture cleanup failed.');
  }
}

async function main() {
  const local = assertLocalStatus(loadLocalSupabaseStatus());
  const email = `adaptive-core-otp-${randomUUID()}@example.test`;
  let messageId;
  let userId;

  try {
    userId = await createConfirmedFixtureUser(local, email);
    await requestPasswordlessEmail(local, email);
    messageId = await waitForCapturedMessage(local.inboxUrl, email);
    const html = await readCapturedEmailHtml(local.inboxUrl, messageId);
    const token = extractConfiguredOtp(html);
    await verifyOtp(local, email, token);
  } finally {
    const cleanupResults = await Promise.allSettled([
      deleteCapturedMessage(local.inboxUrl, messageId),
      deleteFixtureUser(local, userId),
    ]);

    if (cleanupResults.some(({ status }) => status === 'rejected')) {
      throw new Error('Local OTP integration cleanup failed.');
    }
  }

  console.log('Local email OTP integration test passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Local email OTP test failed.');
  process.exitCode = 1;
});
