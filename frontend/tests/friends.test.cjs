const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

Module._extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const storage = new Map();
const originalLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === 'expo-secure-store') return {
    getItemAsync: async (key) => storage.get(key) ?? null,
    setItemAsync: async (key, value) => { storage.set(key, value); },
    deleteItemAsync: async (key) => { storage.delete(key); },
  };
  if (id === 'react-native') return { Platform: { OS: 'android' } };
  return originalLoad.call(this, id, parent, isMain);
};

const code = 'ABCDEFGHJKLM2345';
const expiry = () => new Date(Date.now() + 86400000).toISOString();
const friend = { friendId: '11111111-1111-4111-8111-111111111111', nickname: '초대한친구', friendedAt: '2026-11-01T00:00:00Z' };
const tokens = { accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 900, refreshExpiresIn: 86400 };
const ok = (data, status = 200) => new Response(JSON.stringify({ success: true, data }), { status });
const fail = (status, errorCode) => new Response(JSON.stringify({ success: false, error: { code: errorCode, message: '요청 실패' } }), { status });
let calls;
let respond;
let api;
let session;
let createFlow;
beforeEach(async () => {
  storage.clear();
  calls = [];
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.test';
  global.fetch = async (url, options) => {
    const parsed = new URL(url);
    const request = { path: parsed.pathname, query: parsed.searchParams, method: options.method ?? 'GET', headers: options.headers, body: options.body };
    calls.push(request);
    return respond(request);
  };
  for (const path of ['../src/api/client.ts', '../src/api/auth.ts', '../src/api/friends.ts', '../src/utils/friends.ts', '../src/auth/member-session.ts', '../src/state/friend-invitation.ts']) {
    delete require.cache[require.resolve(path)];
  }
  api = require('../src/api/friends.ts');
  session = require('../src/auth/member-session.ts');
  createFlow = require('../src/state/friend-invitation.ts').createFriendInvitationFlow;
  respond = () => ok(tokens);
  await session.initializeSession();
  await session.signIn('member@example.test', 'Pass123!');
  calls = [];
  respond = () => { throw new Error('Unexpected request'); };
});

test('code generation is explicit and duplicate taps create only one invitation', async () => {
  let finish;
  respond = () => new Promise((resolve) => { finish = resolve; });
  const flow = createFlow();
  assert.equal(calls.length, 0);
  const first = flow.generate();
  await flow.generate();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].path, '/api/v1/friends/invitations');
  assert.equal(calls[0].body, undefined);
  assert.equal(calls[0].headers.Authorization, 'Bearer access');
  const expiresAt = expiry();
  finish(ok({ code, expiresAt }, 201));
  await first;
  assert.deepEqual(flow.getState().created, { code, expiresAt });
  assert.equal(flow.getState().busy, null);
  assert.ok(!storage.get('yeogi.member.session').includes(code));
});

test('invalid codes never reach the server; lowercase and outer whitespace are normalized', async () => {
  const flow = createFlow();
  for (const invalid of ['', 'ABC', `${code.slice(0, 15)}0`, `${code.slice(0, 15)}I`, `${code.slice(0, 15)}O`, 'ABCDEFGH-JKLM2345', 'ABCDEFGH JKLM2345', '../friends']) {
    flow.setInput(invalid);
    await flow.preview();
    assert.ok(flow.getState().error);
  }
  assert.equal(calls.length, 0);
  respond = () => ok({ inviterNickname: friend.nickname, expiresAt: expiry() });
  flow.setInput(`  ${code.toLowerCase()}  `);
  await flow.preview();
  assert.equal(calls[0].path, `/api/v1/friends/invitations/${code}`);
  assert.equal(calls[0].method, 'GET');
  assert.equal(flow.getState().preview.inviterNickname, friend.nickname);
  assert.equal(flow.getState().accepted, null);
  assert.equal(calls.length, 1);
});

test('acceptance requires a preview, uses its confirmed code, and cannot be submitted twice', async () => {
  const flow = createFlow();
  await flow.accept();
  assert.equal(calls.length, 0);
  respond = () => ok({ inviterNickname: friend.nickname, expiresAt: expiry() });
  flow.setInput(code);
  await flow.preview();
  let finish;
  respond = () => new Promise((resolve) => { finish = resolve; });
  const pending = flow.accept();
  await flow.accept();
  flow.setInput('NNNNNNNNNNNNNNNN');
  assert.equal(flow.getState().input, code);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].path, `/api/v1/friends/invitations/${code}/accept`);
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].body, undefined);
  finish(ok(friend));
  await pending;
  assert.deepEqual(flow.getState().accepted, friend);
  await flow.accept();
  assert.equal(calls.length, 2);
});

test('changing the entered code invalidates the previous preview', async () => {
  const flow = createFlow();
  respond = () => ok({ inviterNickname: friend.nickname, expiresAt: expiry() });
  flow.setInput(code);
  await flow.preview();
  flow.setInput('NNNNNNNNNNNNNNNN');
  assert.equal(flow.getState().preview, null);
  await flow.accept();
  assert.equal(calls.length, 1);
});

test('a code expiring after preview cannot be accepted without a fresh invitation', async () => {
  const flow = createFlow();
  respond = () => ok({ inviterNickname: friend.nickname, expiresAt: '2000-01-01T00:00:00Z' });
  flow.setInput(code);
  await flow.preview();
  await flow.accept();
  assert.equal(calls.length, 1);
  assert.match(flow.getState().error, /만료/);
  assert.equal(flow.getState().preview, null);
});

test('expired, self, duplicate and throttled invitations show actionable errors without accepting', async () => {
  for (const [status, errorCode, expected] of [
    [400, 'FRIEND_INVITATION_INVALID', /만료 또는 사용/], [400, 'FRIEND_SELF_INVITATION', /내가 만든/],
    [409, 'FRIEND_ALREADY_EXISTS', /이미 친구/], [429, 'TOO_MANY_REQUESTS', /잠시 후/],
  ]) {
    const flow = createFlow();
    flow.setInput(code);
    respond = () => fail(status, errorCode);
    await flow.preview();
    assert.match(flow.getState().error, expected);
    assert.equal(flow.getState().preview, null);
    assert.equal(flow.getState().accepted, null);
  }
  assert.ok(calls.every((request) => request.method === 'GET'));
});

test('server revalidation can reject an invitation that became used after preview', async () => {
  const flow = createFlow();
  flow.setInput(code);
  respond = () => ok({ inviterNickname: friend.nickname, expiresAt: expiry() });
  await flow.preview();
  respond = () => fail(400, 'FRIEND_INVITATION_INVALID');
  await flow.accept();
  assert.equal(flow.getState().preview, null);
  assert.equal(flow.getState().accepted, null);
  assert.match(flow.getState().error, /만료 또는 사용/);
  await flow.accept();
  assert.equal(calls.length, 2);
});

test('a lost acceptance response is not replayed and asks the user to check the friends list', async () => {
  const flow = createFlow();
  flow.setInput(code);
  respond = () => ok({ inviterNickname: friend.nickname, expiresAt: expiry() });
  await flow.preview();
  respond = () => { throw new TypeError('connection lost'); };
  await flow.accept();
  assert.match(flow.getState().error, /이미 추가됐을 수/);
  assert.equal(flow.getState().preview, null);
  await flow.accept();
  assert.equal(calls.length, 2);
});

test('friend listing is paginated and empty responses stay empty', async () => {
  respond = () => ok({ friends: [friend], page: 2, size: 20, hasNext: true });
  const page = await session.runMemberRequest((token) => api.getFriends(token, 2));
  assert.deepEqual(page.friends, [friend]);
  assert.equal(calls[0].query.get('page'), '2');
  assert.equal(calls[0].query.get('size'), '20');
  assert.equal(calls[0].headers.Authorization, 'Bearer access');
  respond = () => ok({ friends: [], page: 0, size: 20, hasNext: false });
  assert.deepEqual((await session.runMemberRequest(api.getFriends)).friends, []);
  respond = () => fail(503, 'UNAVAILABLE');
  await assert.rejects(session.runMemberRequest(api.getFriends), (error) => error.status === 503);
});

test('malformed success payloads never report creation, preview or acceptance as complete', async () => {
  const flow = createFlow();
  respond = () => ok({ code: 'invalid', expiresAt: expiry() });
  await flow.generate();
  assert.equal(flow.getState().created, null);
  assert.ok(flow.getState().error);
  flow.setInput(code);
  respond = () => ok({ inviterNickname: null, expiresAt: expiry() });
  await flow.preview();
  assert.equal(flow.getState().preview, null);
  respond = () => ok({ inviterNickname: friend.nickname, expiresAt: expiry() });
  await flow.preview();
  respond = () => ok({ friendId: friend.friendId });
  await flow.accept();
  assert.equal(flow.getState().accepted, null);
  assert.ok(flow.getState().error);
});

test('the invitation flow shares member token rotation and returns to login when revoked', async () => {
  const flow = createFlow();
  respond = ({ path }) => path.endsWith('/refresh') ? fail(401, 'UNAUTHORIZED') : fail(401, 'UNAUTHORIZED');
  await flow.generate();
  assert.equal(session.getAuthState().status, 'signedOut');
  assert.equal(flow.getState().created, null);
  assert.equal(calls.length, 2);
});

test('pending invitation results cannot be reused by a different login', async () => {
  let finish;
  const flow = createFlow();
  respond = ({ path }) => path.endsWith('/logout') ? ok({ loggedOut: true })
    : path.endsWith('/login') ? ok({ ...tokens, accessToken: 'other' })
    : new Promise((resolve) => { finish = resolve; });
  const pending = flow.generate();
  await session.signOut();
  await session.signIn('other@example.test', 'Pass123!');
  finish(ok({ code, expiresAt: expiry() }));
  await pending;
  assert.equal(flow.getState().created, null);
  const count = calls.length;
  await flow.generate();
  assert.equal(calls.length, count);
});
