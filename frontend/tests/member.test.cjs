const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

Module._extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const storage = new Map();
const load = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === 'expo-secure-store') return {
    getItemAsync: async (key) => storage.get(key) ?? null,
    setItemAsync: async (key, value) => { storage.set(key, value); },
    deleteItemAsync: async (key) => { storage.delete(key); },
  };
  if (id === 'react-native') return { Platform: { OS: 'android' } };
  return load.call(this, id, parent, isMain);
};

const tokens = { accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 900, refreshExpiresIn: 86400 };
const profile = { userId: 'member-a', email: 'member@example.test', nickname: '회원이름', createdAt: '2026-11-01T00:00:00Z' };
const stats = { writtenNoteCount: 7, friendCount: 3, savedNoteCount: null };
const ok = (data) => new Response(JSON.stringify({ success: true, data }), { status: 200 });
const fail = (status) => new Response(JSON.stringify({ success: false, error: { code: status === 401 ? 'UNAUTHORIZED' : 'UNAVAILABLE', message: '요청 실패' } }), { status });
let calls;
let respond;
let authApi;
let memberApi;
let session;
beforeEach(async () => {
  storage.clear();
  calls = [];
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.test';
  global.fetch = async (url, options) => {
    const parsed = new URL(url);
    const request = { path: parsed.pathname, query: parsed.searchParams, method: options.method ?? 'GET', headers: options.headers, body: options.body ? JSON.parse(options.body) : null };
    calls.push(request);
    return respond(request);
  };
  for (const path of ['../src/api/client.ts', '../src/api/auth.ts', '../src/api/member.ts', '../src/auth/member-session.ts']) {
    delete require.cache[require.resolve(path)];
  }
  authApi = require('../src/api/auth.ts');
  memberApi = require('../src/api/member.ts');
  session = require('../src/auth/member-session.ts');
  respond = () => ok(tokens);
  await session.initializeSession();
  await session.signIn(profile.email, 'Pass123!');
  calls = [];
  respond = () => { throw new Error('Unexpected request'); };
});

test('member profile and stats preserve unsupported counts without mock values', async () => {
  respond = ({ path }) => ok(path.endsWith('/stats') ? stats : profile);
  const [identity, counts] = await Promise.all([
    session.runMemberRequest(authApi.getMemberProfile), session.runMemberRequest(memberApi.getMemberStats),
  ]);
  const { memberToMyPage, formatMyNoteCount } = require('../src/utils/my-page.ts');
  const view = memberToMyPage(identity, counts);
  assert.equal(view.displayName, profile.nickname);
  assert.deepEqual(view.noteCounts, { found: null, written: 7, saved: null });
  assert.equal(view.loginType, '');
  assert.equal(view.tag, null);
  assert.equal(formatMyNoteCount(null, 99), '—');
  assert.equal(formatMyNoteCount(0, 99), '0');
  assert.ok(calls.every((request) => request.headers.Authorization === 'Bearer access' && !request.query.has('userId')));
  respond = () => ok({ ...stats, writtenNoteCount: 0, savedNoteCount: 0 });
  assert.equal((await session.runMemberRequest(memberApi.getMemberStats)).savedNoteCount, 0);
  respond = () => ok({ ...stats, writtenNoteCount: -1 });
  await assert.rejects(session.runMemberRequest(memberApi.getMemberStats));
});

test('nickname editing sends only the normalized nickname and returns the saved profile', async () => {
  respond = () => ok({ ...profile, nickname: '새이름' });
  const result = await session.runMemberRequest((token) => authApi.updateMemberProfile('  새이름  ', token));
  assert.equal(result.nickname, '새이름');
  assert.equal(calls[0].path, '/api/v1/users/me');
  assert.equal(calls[0].method, 'PATCH');
  assert.deepEqual(calls[0].body, { nickname: '새이름' });
  assert.equal(calls[0].headers.Authorization, 'Bearer access');
  const { validateNickname } = require('../src/utils/auth-validation.ts');
  for (const value of ['가나', ' 😀😀 ', '😀'.repeat(20)]) assert.equal(validateNickname(value), undefined);
  for (const value of ['', ' ', '가', '가'.repeat(21), '😀'.repeat(21), '가\n나', '가\u007f나']) assert.ok(validateNickname(value));
});

test('my notes request the selected page and reject foreign or malformed records', async () => {
  const note = { noteId: 'note-1', content: '내 쪽지', visibility: 'PRIVATE', isMine: true, createdAt: '2026-11-01T00:00:00Z' };
  respond = () => ok({ notes: [note], page: 2, size: 20, hasNext: true });
  assert.equal((await session.runMemberRequest((token) => memberApi.getMyNotes(token, 2))).hasNext, true);
  assert.equal(calls[0].query.get('page'), '2');
  assert.equal(calls[0].query.get('size'), '20');
  for (const invalid of [{ ...note, isMine: false }, { ...note, createdAt: 'invalid' }, { ...note, visibility: 'UNKNOWN' }]) {
    respond = () => ok({ notes: [invalid], page: 0, size: 20, hasNext: false });
    await assert.rejects(session.runMemberRequest(memberApi.getMyNotes));
  }
  respond = () => ok({ notes: [], page: 0, size: 20, hasNext: false });
  assert.deepEqual((await session.runMemberRequest(memberApi.getMyNotes)).notes, []);
});

test('concurrent member 401s share one refresh and use the rotated access token', async () => {
  let finishRefresh;
  respond = ({ path, headers }) => {
    if (path.endsWith('/refresh')) return new Promise((resolve) => { finishRefresh = resolve; });
    if (headers.Authorization === 'Bearer access') return fail(401);
    return ok(path.endsWith('/stats') ? stats : profile);
  };
  const first = session.runMemberRequest(authApi.getMemberProfile);
  const second = session.runMemberRequest(memberApi.getMemberStats);
  await new Promise(setImmediate);
  assert.equal(calls.filter((request) => request.path.endsWith('/refresh')).length, 1);
  finishRefresh(ok({ ...tokens, accessToken: 'rotated', refreshToken: 'rotated-refresh' }));
  await Promise.all([first, second]);
  assert.equal(calls.filter((request) => request.headers?.Authorization === 'Bearer rotated').length, 2);
});

test('a late 401 reuses an already rotated access token without refreshing again', async () => {
  let finishOldRequest;
  respond = ({ path, headers }) => {
    if (path.endsWith('/refresh')) return ok({ ...tokens, accessToken: 'rotated', refreshToken: 'rotated-refresh' });
    if (headers.Authorization === 'Bearer access') return new Promise((resolve) => { finishOldRequest = resolve; });
    return ok(profile);
  };
  const pending = session.runMemberRequest(authApi.getMemberProfile);
  await session.refreshSession();
  finishOldRequest(fail(401));
  assert.equal((await pending).nickname, profile.nickname);
  assert.equal(calls.filter((request) => request.path.endsWith('/refresh')).length, 1);
});

test('a revoked refreshed token signs out after one retry; a server failure keeps the login', async () => {
  respond = () => fail(503);
  await assert.rejects(session.runMemberRequest(memberApi.getMemberStats), (error) => error.status === 503);
  assert.equal(session.getAuthState().status, 'authenticated');
  calls = [];
  respond = ({ path }) => path.endsWith('/refresh') ? ok({ ...tokens, accessToken: 'rotated' }) : fail(401);
  await assert.rejects(session.runMemberRequest(authApi.getMemberProfile), (error) => error.status === 401);
  assert.equal(session.getAuthState().status, 'signedOut');
  assert.equal(calls.length, 3);
  const count = calls.length;
  await assert.rejects(session.runMemberRequest(authApi.getMemberProfile));
  assert.equal(calls.length, count);
});

test('responses from a previous login are discarded after logout and another login', async () => {
  let finishProfile;
  respond = ({ path }) => path.endsWith('/logout') ? ok({ loggedOut: true })
    : path.endsWith('/login') ? ok({ ...tokens, accessToken: 'other-access', refreshToken: 'other-refresh' })
    : new Promise((resolve) => { finishProfile = resolve; });
  const owner = session.getMemberSessionKey();
  const pending = session.runMemberRequest(authApi.getMemberProfile);
  await session.signOut();
  await session.signIn('other@example.test', 'Pass123!');
  finishProfile(ok(profile));
  await assert.rejects(pending, /로그인 정보를 확인/);
  assert.notEqual(session.getMemberSessionKey(), owner);
  assert.equal(session.getAuthState().session.accessToken, 'other-access');
});
