import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import {
  generateAuthorizationUrl,
  validateRegistrationRequest,
  verifySlackSignature,
} from '.';
import { hmac } from '../utils/hmac';
import { secret } from '../utils/env';
import { Oops } from '../utils/errors';

const toUnix = (date: Date) => {
  return `${Math.floor(date.valueOf() / 1000)}`;
};

describe('Verify Slack Signature', () => {
  const app = new Hono()
    .use(verifySlackSignature())
    .get('/', (c) => c.text('ok'))
    .onError((error, c) => {
      const status = error instanceof Oops ? error.status : 500;
      return c.body(null, status);
    });

  // replay, future/arbitrary
  test('Allow valid requests', async () => {
    const body = 'test';
    const timestamp = toUnix(new Date());
    const signature = hmac.createDigest(
      secret('SLACK_SIGNING_SECRET'),
      `v0:${timestamp}:${body}`,
      'hex'
    );

    const res = await app.request('/', {
      headers: {
        'user-agent': 'Slackbot 1.0 (+https://api.slack.com/robots)',
        'x-slack-signature': `v0=${signature}`,
        'x-slack-request-timestamp': timestamp,
      },
      body,
    });

    expect(res.status).toBe(200);
  });

  test('Reject future timestamps', async () => {
    const body = 'test';
    const timestamp = toUnix(new Date(Date.now() + 1000 * 10));
    const signature = hmac.createDigest(
      secret('SLACK_SIGNING_SECRET'),
      `v0:${timestamp}:${body}`,
      'hex'
    );

    const res = await app.request('/', {
      headers: {
        'user-agent': 'Slackbot 1.0 (+https://api.slack.com/robots)',
        'x-slack-signature': `v0=${signature}`,
        'x-slack-request-timestamp': timestamp,
      },
      body,
    });

    expect(res.status).toBe(401);
  });

  test('Reject timestamps older than 5 minutes', async () => {
    const body = 'test';
    const timestamp = toUnix(new Date(Date.now() - 1000 * 60 * 5 + 1));
    const signature = hmac.createDigest(
      secret('SLACK_SIGNING_SECRET'),
      `v0:${timestamp}:${body}`,
      'hex'
    );

    const res = await app.request('/', {
      headers: {
        'user-agent': 'Slackbot 1.0 (+https://api.slack.com/robots)',
        'x-slack-signature': `v0=${signature}`,
        'x-slack-request-timestamp': timestamp,
      },
      body,
    });

    expect(res.status).toBe(401);
  });

  test('Reject malformed body', async () => {
    const body = 'test';
    const timestamp = toUnix(new Date(Date.now() - 1000 * 60 * 5 + 1));
    const signature = hmac.createDigest(
      secret('SLACK_SIGNING_SECRET'),
      `v0:${timestamp}:${body}`,
      'hex'
    );

    const res = await app.request('/', {
      headers: {
        'user-agent': 'Slackbot 1.0 (+https://api.slack.com/robots)',
        'x-slack-signature': `v0=${signature}`,
        'x-slack-request-timestamp': timestamp,
      },
      body: 'modified',
    });

    expect(res.status).toBe(401);
  });

  test('Reject malformed signature', async () => {
    const body = 'test';
    const timestamp = toUnix(new Date(Date.now() - 1000 * 60 * 5 + 1));
    const signature = hmac.createDigest(
      secret('SLACK_SIGNING_SECRET'),
      `${timestamp}:${body}`,
      'hex'
    );

    const res = await app.request('/', {
      headers: {
        'user-agent': 'Slackbot 1.0 (+https://api.slack.com/robots)',
        'x-slack-signature': `v0=${signature}`,
        'x-slack-request-timestamp': timestamp,
      },
      body,
    });

    expect(res.status).toBe(401);
  });
});

describe('Generate Authorization URL', () => {
  const app = new Hono().get('/', (c) => c.text(generateAuthorizationUrl(c)));

  test('Craft URL and set `state` cookie', async () => {
    const res = await app.request('/');
    const url = new URL(await res.text());

    const scope = 'commands,incoming-webhook,channels:read,users:read';

    expect(url.searchParams.get('client_id')).toBeString();
    expect(url.searchParams.get('scope')).toBe(scope);
    expect(url.searchParams.get('state')).toBeString();
    expect(url.searchParams.get('redirect_uri')).toEndWith('/register');

    const stateCookie = res.headers.getSetCookie().at(0);

    const [value, ageLimit, path, httpOnly, sameSite] =
      stateCookie!.split('; ');
    expect(value?.split('=').at(1)).toBe(url.searchParams.get('state')!);
    expect(ageLimit?.split('=').at(1)).toBe('600');
    expect(path?.split('=').at(1)).toBe('/');
    expect(httpOnly).toBe('HttpOnly');
    expect(sameSite?.split('=').at(1)).toBe('Lax');
  });
});

describe('Validate Registration Request', () => {
  const app = new Hono()
    .use(validateRegistrationRequest())
    .get('/', (c) => c.text('ok'))
    .onError((error, c) => {
      const status = error instanceof Oops ? error.status : 500;
      return c.body(null, status);
    });

  test('Allow valid requests', async () => {
    const state = 'TEST_STATE';
    const query = new URLSearchParams({
      code: 'TEST_CODE',
      state,
    }).toString();

    const res = await app.request('/' + '?' + query, {
      headers: {
        cookie: `lsa_auth_state=${state}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax`,
      },
    });

    expect(res.status).toBe(200);
  });

  test('Reject requests without a code', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(401);
  });

  test('Reject requests without state', async () => {
    const res = await app.request('/?code=TEST_CODE');
    expect(res.status).toBe(401);
  });

  test('Reject requests with invalid state', async () => {
    const state = 'TEST_STATE';
    const query = new URLSearchParams({
      code: 'TEST_CODE',
      state: 'MANIPULATED',
    }).toString();

    const res = await app.request('/' + '?' + query, {
      headers: {
        cookie: `lsa_auth_state=${state}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax`,
      },
    });

    expect(res.status).toBe(401);
  });
});
