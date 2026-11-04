const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

// Load the real TS API/session modules with only native storage replaced.
Module._extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const stored = new Map();
const nativeStorage = {
  getItemAsync: async (key) => stored.get(key) ?? null,
  setItemAsync: async (key, value) => { stored.set(key, value); },
  deleteItemAsync: async (key) => { stored.delete(key); },
};
const load = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === 'expo-secure-store') return nativeStorage;
  if (id === 'react-native') return { Platform: { OS: 'android' } };
  return load.call(this, id, parent, isMain);
};

const key = 'yeogi.member.session';
const tokens = { accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 900, refreshExpiresIn: 86400 };
const profile = { userId: 'member', email: 'user@example.com', nickname: '회원', createdAt: '2026-11-01T00:00:00Z' };
let calls;
let respond;
let api;
let session;
const ok = (data) => new Response(JSON.stringify({ success: true, data }), { status: 200 });
const fail = (status, code) => new Response(JSON.stringify({ success: false, error: { code, message: code } }), { status });
function saved(overrides = {}) {
  return { accessToken: 'old-access', refreshToken: 'old-refresh', accessExpiresAt: Date.now() + 900000, refreshExpiresAt: Date.now() + 86400000, ...overrides };
}
beforeEach(() => {
  stored.clear();
  calls = [];
  respond = () => { throw new Error('Unexpected request'); };
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.test';
  global.fetch = async (url, options) => {
    const request = { path: new URL(url).pathname, body: options.body ? JSON.parse(options.body) : null, headers: options.headers };
    calls.push(request);
    return respond(request);
  };
  for (const file of ['../src/auth/member-session.ts', '../src/api/auth.ts', '../src/api/client.ts']) delete require.cache[require.resolve(file)];
  api = require('../src/api/auth.ts');
  session = require('../src/auth/member-session.ts');
});

test('email verification and signup send the backend contract without code/password normalization', async () => {
  respond = ({ path }) => path.endsWith('/confirm') ? ok({ verificationToken: 'proof', expiresIn: 600 })
    : path.endsWith('/signup') ? ok(profile) : ok({ verificationId: 'verification', expiresIn: 300 });
  await api.requestEmailVerification(' USER@EXAMPLE.COM ');
  await api.confirmEmailVerification(' USER@EXAMPLE.COM ', 'verification', '123456');
  await api.signup({ email: ' USER@EXAMPLE.COM ', nickname: ' 회원 ', password: 'Pass123!', passwordConfirm: 'Pass123!', verificationToken: 'proof' });
  assert.deepEqual(calls.map((call) => call.path), ['/api/v1/auth/email-verifications', '/api/v1/auth/email-verifications/confirm', '/api/v1/auth/signup']);
  assert.deepEqual(calls[1].body, { email: profile.email, verificationId: 'verification', code: '123456' });
  assert.deepEqual(calls[2].body, { email: profile.email, nickname: '회원', password: 'Pass123!', passwordConfirm: 'Pass123!', verificationToken: 'proof' });
});

test('401, 409, 429 and 503 retain status and error code', async () => {
  for (const [status, code] of [[401, 'UNAUTHORIZED'], [409, 'EMAIL_ALREADY_EXISTS'], [429, 'TOO_MANY_REQUESTS'], [503, 'EMAIL_SEND_FAILED']]) {
    respond = () => fail(status, code);
    await assert.rejects(api.login(profile.email, 'wrong'), (error) => error.status === status && error.code === code);
  }
});

test('no saved member session means signed out without requesting a guest token', async () => {
  await Promise.all([session.initializeSession(), session.initializeSession()]);
  assert.equal(session.getAuthState().status, 'signedOut');
  assert.equal(calls.length, 0);
});

test('login stores both tokens and rejects invalid login without changing state', async () => {
  await session.initializeSession();
  respond = () => fail(401, 'UNAUTHORIZED');
  await assert.rejects(session.signIn(profile.email, 'wrong'));
  assert.equal(session.getAuthState().status, 'signedOut');
  assert.equal(stored.has(key), false);
  respond = () => ok(tokens);
  await session.signIn(' USER@EXAMPLE.COM ', 'Pass123!');
  assert.equal(session.getAuthState().status, 'authenticated');
  const value = JSON.parse(stored.get(key));
  assert.equal(value.accessToken, tokens.accessToken);
  assert.equal(value.refreshToken, tokens.refreshToken);
  assert.ok(value.accessExpiresAt > Date.now());
  assert.equal(calls.at(-1).body.email, profile.email);
});

test('startup verifies the saved member token with users/me', async () => {
  stored.set(key, JSON.stringify(saved()));
  respond = () => ok(profile);
  await session.initializeSession();
  assert.equal(session.getAuthState().status, 'authenticated');
  assert.equal(calls[0].path, '/api/v1/users/me');
  assert.equal(calls[0].headers.Authorization, 'Bearer old-access');
});

test('startup network failure preserves credentials for an explicit retry', async () => {
  const value = JSON.stringify(saved());
  stored.set(key, value);
  respond = () => { throw new TypeError('offline'); };
  await session.initializeSession();
  assert.equal(session.getAuthState().status, 'error');
  assert.equal(stored.get(key), value);
  respond = () => ok(profile);
  await session.initializeSession(true);
  assert.equal(session.getAuthState().status, 'authenticated');
});

test('concurrent refresh calls share a single rotation and replace both tokens', async () => {
  stored.set(key, JSON.stringify(saved()));
  respond = () => ok(profile);
  await session.initializeSession();
  calls = [];
  respond = () => ok({ ...tokens, accessToken: 'new-access', refreshToken: 'new-refresh' });
  await Promise.all([session.refreshSession(), session.refreshSession(), session.refreshSession()]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/api/v1/auth/refresh');
  assert.equal(JSON.parse(stored.get(key)).refreshToken, 'new-refresh');
});

test('a lost refresh response clears credentials and never replays the old token', async () => {
  stored.set(key, JSON.stringify(saved({ accessExpiresAt: 0 })));
  respond = () => { throw new TypeError('connection lost after rotation'); };
  await session.initializeSession();
  await session.refreshSession();
  assert.equal(calls.length, 1);
  assert.equal(session.getAuthState().status, 'signedOut');
  assert.equal(stored.has(key), false);
});

test('revoked access and refresh tokens return to login', async () => {
  stored.set(key, JSON.stringify(saved()));
  respond = () => fail(401, 'UNAUTHORIZED');
  await session.initializeSession();
  assert.deepEqual(calls.map((call) => call.path), ['/api/v1/users/me', '/api/v1/auth/refresh']);
  assert.equal(session.getAuthState().status, 'signedOut');
  assert.equal(stored.has(key), false);
});

test('malformed or expired saved sessions are removed without network requests', async () => {
  for (const value of ['invalid json', JSON.stringify({}), JSON.stringify(saved({ accessToken: 123 })), JSON.stringify(saved({ refreshExpiresAt: 0 }))]) {
    stored.set(key, value);
    await session.initializeSession(true);
    assert.equal(session.getAuthState().status, 'signedOut');
    assert.equal(stored.has(key), false);
  }
  assert.equal(calls.length, 0);
});

test('invalid login and signup success payloads cannot authenticate or complete signup', async () => {
  await session.initializeSession();
  for (const payload of [null, {}, { ...tokens, accessToken: 123 }, { ...tokens, expiresIn: -1 }]) {
    respond = () => ok(payload);
    await assert.rejects(session.signIn(profile.email, 'Pass123!'));
    assert.equal(session.getAuthState().status, 'signedOut');
    assert.equal(stored.has(key), false);
  }
  respond = () => ok(null);
  await assert.rejects(api.signup({ email: profile.email, nickname: profile.nickname, password: 'Pass123!', passwordConfirm: 'Pass123!', verificationToken: 'proof' }));
});

test('logout failure keeps the session for retry; success removes it', async () => {
  await session.initializeSession();
  respond = () => ok(tokens);
  await session.signIn(profile.email, 'Pass123!');
  respond = () => fail(503, 'UNAVAILABLE');
  await assert.rejects(session.signOut());
  assert.equal(session.getAuthState().status, 'authenticated');
  assert.ok(stored.has(key));
  respond = () => ok({ loggedOut: true });
  await session.signOut();
  assert.equal(session.getAuthState().status, 'signedOut');
  assert.equal(stored.has(key), false);
});

test('logout waits for in-flight refresh and revokes the new token', async () => {
  await session.initializeSession();
  respond = () => ok(tokens);
  await session.signIn(profile.email, 'Pass123!');
  let finishRefresh;
  respond = ({ path }) => path.endsWith('/refresh') ? new Promise((resolve) => { finishRefresh = resolve; }) : ok({ loggedOut: true });
  const refresh = session.refreshSession();
  const logout = session.signOut();
  finishRefresh(ok({ ...tokens, refreshToken: 'rotated-refresh' }));
  await Promise.all([refresh, logout]);
  assert.deepEqual(calls.at(-1).body, { refreshToken: 'rotated-refresh' });
  assert.equal(session.getAuthState().status, 'signedOut');
});

test('refresh during a failed logout runs only after logout has finished', async () => {
  await session.initializeSession();
  respond = () => ok(tokens);
  await session.signIn(profile.email, 'Pass123!');
  let finishLogout;
  respond = ({ path }) => path.endsWith('/logout') ? new Promise((resolve) => { finishLogout = resolve; }) : ok(tokens);
  const logout = session.signOut();
  const refresh = session.refreshSession();
  finishLogout(fail(503, 'UNAVAILABLE'));
  await assert.rejects(logout);
  await refresh;
  assert.equal(calls.at(-1).path, '/api/v1/auth/refresh');
  assert.equal(session.getAuthState().status, 'authenticated');
});
