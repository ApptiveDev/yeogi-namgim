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

const code = 'ABC234';
const legacyCode = 'ABCDEFGHJKLM2345';
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
  for (const path of ['../src/api/client.ts', '../src/api/auth.ts', '../src/api/friends.ts', '../src/utils/friends.ts', '../src/auth/member-session.ts', '../src/state/friend-invitation.ts', '../src/state/friend-pages.ts', '../src/state/member-cache.ts']) {
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
  for (const invalid of ['', 'ABC', 'ABC2345', 'ABC230', 'ABC231', 'ABC23I', 'ABC23O', 'ABC-234', 'ABC 234', '../friends']) {
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

test('an existing 16-character invitation still reaches the preview API', async () => {
  const flow = createFlow();
  flow.setInput(legacyCode);
  respond = () => ok({ inviterNickname: friend.nickname, expiresAt: expiry() });
  await flow.preview();
  assert.equal(calls[0].path, `/api/v1/friends/invitations/${legacyCode}`);
  assert.equal(flow.getState().preview.code, legacyCode);
});

test('current invitation lookup handles an active code and 204 without generating a code', async () => {
  const flow = createFlow();
  const expiresAt = expiry();
  respond = () => ok({ code, expiresAt });
  await flow.loadCurrent();
  assert.deepEqual(flow.getState().created, { code, expiresAt });
  respond = () => new Response(null, { status: 204 });
  await flow.loadCurrent();
  assert.equal(flow.getState().created, null);
  assert.equal(flow.getState().error, null);
  assert.equal(calls.length, 2);
  for (const request of calls) {
    assert.equal(request.method, 'GET');
    assert.equal(request.path, '/api/v1/friends/invitations/current');
    assert.equal(request.headers.Authorization, 'Bearer access');
  }
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
  flow.setInput('DEF567');
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
  flow.setInput('DEF567');
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

test('friend list retries the failed page and reuses profiles when a page overlaps', async () => {
  const { friends: store } = require('../src/state/friend-pages.ts').getFriendPages();
  const page = (friends, index, hasNext) => ok({ friends, page: index, size: 20, hasNext });

  respond = () => page([friend], 0, true);
  await store.revalidate();
  const first = store.getSnapshot();
  assert.equal(first.hasLoaded, true);
  await store.revalidate();
  assert.equal(store.getSnapshot(), first);

  respond = () => fail(503, 'UNAVAILABLE');
  await store.loadMore();
  const failed = store.getSnapshot();
  assert.ok(failed.error);
  assert.equal(failed.items, first.items);

  const other = { ...friend, friendId: 'other-friend', nickname: '새 친구' };
  respond = () => page([friend, other], 1, false);
  await store.retry();
  const loaded = store.getSnapshot();
  assert.deepEqual(calls.map(({ query }) => query.get('page')), ['0', '0', '1', '1']);
  assert.deepEqual(loaded.items.map(({ id }) => id), [friend.friendId, other.friendId]);
  assert.equal(loaded.items[0], first.items[0]);
  assert.equal(loaded.error, null);
  assert.equal(loaded.hasNext, false);
});

test('friend activity feed maps card metadata and retries overlapping pages', async () => {
  const { getFriendPages } = require('../src/state/friend-pages.ts');
  const { activities: store } = getFriendPages();
  const createdAt = '2026-11-01T00:00:00Z';
  const activity = { noteId: 'note-1', friendId: friend.friendId, nickname: friend.nickname, placeName: '서울숲', neighborhood: '성수동', createdAt };
  const page = (activities, index, hasNext) => ok({ activities, page: index, size: 20, hasNext });

  respond = () => page([activity], 0, true);
  await store.revalidate();
  const first = store.getSnapshot();
  assert.deepEqual(first.items, [{
    id: activity.noteId,
    friend: { id: friend.friendId, displayName: friend.nickname, avatarUrl: null },
    locationLabel: '서울숲',
    createdAtMs: Date.parse(createdAt),
  }]);

  respond = () => page([{ ...activity, createdAt: 'invalid' }], 1, false);
  await store.loadMore();
  const failed = store.getSnapshot();
  assert.match(failed.error, /친구 쪽지 소식/);
  assert.equal(failed.items, first.items);

  respond = () => page([
    activity,
    { ...activity, noteId: 'note-2', placeName: null },
    { ...activity, noteId: 'note-3', placeName: ' ', neighborhood: null },
  ], 1, false);
  await store.retry();
  const loaded = store.getSnapshot();
  assert.deepEqual(loaded.items.map(({ id, locationLabel }) => [id, locationLabel]), [
    ['note-1', '서울숲'], ['note-2', '성수동'], ['note-3', '장소 정보 없음'],
  ]);
  assert.equal(loaded.error, null);
  assert.equal(loaded.hasNext, false);
  assert.deepEqual(calls.map(({ query }) => query.get('page')), ['0', '1', '1']);
  assert.ok(calls.every(({ method, path, query, headers }) => (
    method === 'GET' && path === '/api/v1/friends/activities' && query.get('size') === '20' && headers.Authorization === 'Bearer access'
  )));

  respond = () => ok({ loggedOut: true });
  await session.signOut();
  assert.deepEqual(getFriendPages().activities.getSnapshot().items, []);
});

test('returning to the feed quietly revalidates all loaded pages and changes only affected cards', async () => {
  const { getFriendPages } = require('../src/state/friend-pages.ts');
  const store = getFriendPages().activities;
  const first = { noteId: 'note-1', friendId: friend.friendId, nickname: friend.nickname, placeName: '서울숲', neighborhood: null, createdAt: '2026-11-01T00:00:00Z' };
  const second = { ...first, noteId: 'note-2', placeName: '장전동' };
  const third = { ...first, noteId: 'note-3' };
  let pages = [[first], [second, third]];
  const response = ({ query }) => {
    const page = Number(query.get('page'));
    return ok({ activities: pages[page], page, size: 20, hasNext: page === 0 });
  };
  respond = response;
  await store.revalidate();
  await store.loadMore();
  const previous = store.getSnapshot();
  let changes = 0;
  store.subscribe(() => { changes += 1; });
  let finish;
  respond = (request) => request.query.get('page') === '1'
    ? new Promise((resolve) => { finish = () => resolve(response(request)); }) : response(request);
  const pending = store.revalidate();
  await new Promise(setImmediate);
  assert.equal(getFriendPages().activities, store);
  assert.equal(store.getSnapshot(), previous);
  finish();
  await pending;
  assert.equal(store.getSnapshot(), previous);
  assert.equal(changes, 0);

  pages = [[first], [{ ...second, placeName: '새 장소' }]];
  respond = response;
  await store.revalidate();
  const updated = store.getSnapshot();
  assert.deepEqual(updated.items.map(({ id }) => id), ['note-1', 'note-2']);
  assert.equal(updated.items[0], previous.items[0]);
  assert.notEqual(updated.items[1], previous.items[1]);
  assert.equal(updated.items[1].locationLabel, '새 장소');
  assert.deepEqual(calls.map(({ query }) => query.get('page')), ['0', '1', '0', '1', '0', '1']);
  assert.equal(changes, 1);
});

test('a failed feed revalidation keeps only the confirmed pages and retries the missing page', async () => {
  const { activities: store } = require('../src/state/friend-pages.ts').getFriendPages();
  const revoked = { noteId: 'revoked', friendId: friend.friendId, nickname: friend.nickname,
    placeName: '서울숲', neighborhood: null, createdAt: '2026-11-01T00:00:00Z' };
  const current = { ...revoked, noteId: 'current' };
  const older = { ...revoked, noteId: 'older' };
  const page = (activities, index, hasNext) => ok({ activities, page: index, size: 20, hasNext });

  respond = ({ query }) => query.get('page') === '0' ? page([revoked, current], 0, true) : page([older], 1, false);
  await store.revalidate();
  await store.loadMore();
  const previous = store.getSnapshot();

  respond = ({ query }) => query.get('page') === '0' ? page([current], 0, true) : fail(503, 'UNAVAILABLE');
  await store.revalidate();
  const partial = store.getSnapshot();
  assert.ok(partial.error);
  assert.equal(partial.hasNext, true);
  assert.deepEqual(partial.items, [previous.items[1]]);
  assert.equal(partial.items[0], previous.items[1]);

  respond = () => page([older], 1, false);
  await store.retry();
  assert.deepEqual(calls.map(({ query }) => query.get('page')), ['0', '1', '0', '1', '1']);
  assert.deepEqual(store.getSnapshot().items.map(({ id }) => id), ['current', 'older']);
  assert.equal(store.getSnapshot().error, null);

  respond = () => fail(503, 'UNAVAILABLE');
  await store.reload();
  assert.deepEqual(store.getSnapshot().items, []);
  assert.ok(store.getSnapshot().error);

  respond = () => page([current], 0, false);
  await store.retry();
  assert.equal(calls.at(-1).query.get('page'), '0');
  assert.deepEqual(store.getSnapshot().items.map(({ id }) => id), ['current']);
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
