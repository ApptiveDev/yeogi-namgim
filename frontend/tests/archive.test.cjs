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

const tokens = { accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 900, refreshExpiresIn: 86400 };
const ok = (data) => new Response(JSON.stringify({ success: true, data }), { status: 200 });
const fail = (status) => new Response(JSON.stringify({ success: false, error: { code: status === 401 ? 'UNAUTHORIZED' : 'UNAVAILABLE', message: '요청 실패' } }), { status });
const note = (id, source = 'WRITTEN', date = '2026-11-10') => ({
  noteId: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
  source, preview: `쪽지 ${id}`, createdAt: `${date}T01:00:00Z`, savedAt: source === 'SAVED' ? '2026-11-11T01:00:00Z' : null,
  visibility: 'PUBLIC', color: '#AABBCC', placeName: null, neighborhood: '장전동',
  authorCategory: source === 'WRITTEN' ? 'MINE' : 'ANONYMOUS', authorDisplayName: source === 'WRITTEN' ? '나예요' : '익명',
  accessStatus: 'OPENABLE', isSaved: source === 'SAVED', isRead: false,
});
const calendar = { month: '2026-11', days: [{ date: '2026-11-10', writtenCount: 1, savedCount: 1 }] };
const selection = { month: '2026-11', date: null, type: 'ALL' };
const page = (request, notes, nextCursor = null) => ok({
  date: request.query.get('date'), notes, size: Number(request.query.get('size')), hasNext: nextCursor !== null, nextCursor,
});
let calls, respond, session, api, data, state;

beforeEach(async () => {
  storage.clear();
  calls = [];
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.test';
  global.fetch = async (url, options) => {
    const parsed = new URL(url);
    const request = { path: parsed.pathname, query: parsed.searchParams, headers: options.headers };
    calls.push(request);
    return respond(request);
  };
  for (const path of ['api/client', 'api/auth', 'api/archive', 'auth/member-session', 'data/archive', 'state/archive-notes']) {
    delete require.cache[require.resolve(`../src/${path}.ts`)];
  }
  session = require('../src/auth/member-session.ts');
  api = require('../src/api/archive.ts');
  data = require('../src/data/archive.ts');
  state = require('../src/state/archive-notes.ts');
  respond = () => ok(tokens);
  await session.initializeSession();
  await session.signIn('member@example.test', 'Pass123!');
  calls = [];
  respond = (request) => request.path.endsWith('/calendar') ? ok(calendar) : page(request, [note(2, 'SAVED'), note(1)]);
});

test('all, saved and mine filter one shared page locally without HTTP or count changes', async () => {
  const cache = state.getArchiveCache(session.getMemberSessionKey(), '2026-11-10');
  const store = cache.get(selection);
  await store.ensureLoaded();
  const count = calls.length;
  const originalCalendar = cache.getCalendar(selection.month);
  const notes = store.getSnapshot().notes;
  assert.equal(data.filterArchiveNotes(notes, 'all').length, 2);
  assert.deepEqual(data.filterArchiveNotes(notes, 'saved').map((item) => item.id), [note(2).noteId]);
  assert.deepEqual(data.filterArchiveNotes(notes, 'mine').map((item) => item.id), [note(1).noteId]);
  await cache.get(selection).ensureLoaded();
  assert.equal(calls.length, count);
  assert.equal(cache.getCalendar(selection.month), originalCalendar);
  assert.equal(calls[1].query.get('type'), 'ALL');
  assert.ok(calls.every((request) => request.headers.Authorization === 'Bearer access' && !request.query.has('userId') && !request.query.has('page')));
});

test('tab re-entry keeps the cache; a new Seoul day, app cache or login starts fresh', async () => {
  const owner = session.getMemberSessionKey();
  const first = state.getArchiveCache(owner, '2026-11-10');
  await first.get(selection).ensureLoaded();
  assert.equal(state.getArchiveCache(owner, '2026-11-10'), first);
  await state.getArchiveCache(owner, '2026-11-10').get(selection).ensureLoaded();
  assert.equal(calls.length, 2);
  const nextDay = state.getArchiveCache(owner, '2026-11-11');
  assert.notEqual(nextDay, first);
  await nextDay.get(selection).ensureLoaded();
  assert.equal(calls.length, 4);
  assert.notEqual(state.getArchiveCache(owner + 1, '2026-11-11'), nextDay);
  assert.equal(state.createArchiveCache(owner).getCalendar('2026-11'), null);
});

test('daily cursor stays bound to its date and the next day fills the remainder of a monthly page', async () => {
  const recent = '2026-11-10';
  const older = '2026-11-09';
  respond = (request) => {
    if (request.path.endsWith('/calendar')) return ok({ month: '2026-11', days: [
      { date: older, writtenCount: 2, savedCount: 0 }, { date: recent, writtenCount: 21, savedCount: 0 },
    ] });
    if (request.query.get('date') === older) return page(request, [note(2, 'WRITTEN', older), note(1, 'WRITTEN', older)]);
    return request.query.has('cursor') ? page(request, [note(3)])
      : page(request, Array.from({ length: 20 }, (_, index) => note(23 - index)), 'opaque+/=');
  };
  const store = state.createArchiveStore(session.getMemberSessionKey(), selection);
  await store.refresh();
  assert.equal(store.getSnapshot().notes.length, 20);
  assert.deepEqual(store.getSnapshot().next, { dayIndex: 0, cursor: 'opaque+/=' });
  await store.loadMore();
  assert.equal(store.getSnapshot().notes.length, 23);
  assert.equal(store.getSnapshot().next, null);
  assert.equal(calls[2].query.get('cursor'), 'opaque+/=');
  assert.equal(calls[2].query.get('date'), recent);
  assert.equal(calls[3].query.has('cursor'), false);
  assert.equal(calls[3].query.get('size'), '19');
});

test('a failed later page preserves cards and retries exactly the same cursor', async () => {
  let failure = true;
  const store = state.createArchiveStore(session.getMemberSessionKey(), selection);
  respond = (request) => request.path.endsWith('/calendar') ? ok(calendar)
    : !request.query.has('cursor') ? page(request, Array.from({ length: 20 }, (_, index) => note(index + 2)), 'next')
    : failure ? fail(503) : page(request, [note(1)]);
  await store.refresh();
  await store.loadMore();
  assert.equal(store.getSnapshot().notes.length, 20);
  assert.ok(store.getSnapshot().error);
  assert.equal(store.getSnapshot().next.cursor, 'next');
  failure = false;
  await store.retry();
  assert.equal(store.getSnapshot().notes.length, 21);
  assert.equal(store.getSnapshot().error, null);
  assert.equal(calls.at(-1).query.get('cursor'), 'next');
});

test('overlapping first visits share the request and locked cards cannot expose previews or places', async () => {
  let finish;
  const store = state.createArchiveStore(session.getMemberSessionKey(), selection);
  respond = (request) => request.path.endsWith('/calendar') ? new Promise((resolve) => { finish = resolve; }) : page(request, []);
  const first = store.ensureLoaded();
  await store.ensureLoaded();
  assert.equal(calls.length, 1);
  finish(ok(calendar));
  await first;
  const locked = data.toStorageNote({ ...note(1, 'SAVED'), accessStatus: 'LOCATION_REQUIRED', preview: '감춰야 할 본문', placeName: '감춰야 할 장소' });
  assert.equal(locked.openable, false);
  assert.equal(locked.title, '내용을 볼 수 없는 쪽지');
  assert.equal(locked.locationLabel, '장소 정보 없음');
});

test('empty calendar means true zero and does not fetch daily notes', async () => {
  respond = () => ok({ month: '2026-11', days: [] });
  const store = state.createArchiveStore(session.getMemberSessionKey(), selection);
  await store.refresh();
  assert.deepEqual(store.getSnapshot().notes, []);
  assert.equal(store.getSnapshot().next, null);
  assert.equal(store.getSnapshot().loading, false);
  assert.equal(calls.length, 1);
});

test('selected dates share monthly counts and query even a day absent from an older calendar', async () => {
  const cache = state.createArchiveCache(session.getMemberSessionKey());
  await cache.get(selection).ensureLoaded();
  respond = (request) => page(request, []);
  await cache.get({ ...selection, date: '2026-11-08' }).ensureLoaded();
  assert.equal(calls.filter((request) => request.path.endsWith('/calendar')).length, 1);
  assert.equal(calls.at(-1).query.get('date'), '2026-11-08');
  assert.deepEqual(cache.getCalendar('2026-11'), calendar);
});

test('manual refresh retains badges while loading and replaces removed notes', async () => {
  const cache = state.createArchiveCache(session.getMemberSessionKey());
  const store = cache.get(selection);
  await store.refresh();
  const counts = cache.getCalendar('2026-11');
  let finish;
  respond = (request) => request.path.endsWith('/calendar') ? new Promise((resolve) => { finish = resolve; }) : page(request, [note(1)]);
  cache.invalidate();
  const pending = store.refresh();
  assert.equal(cache.getCalendar('2026-11'), counts);
  assert.equal(store.getSnapshot().notes.length, 2);
  finish(ok({ month: '2026-11', days: [{ date: '2026-11-10', writtenCount: 1, savedCount: 0 }] }));
  await pending;
  assert.deepEqual(store.getSnapshot().notes.map((item) => item.id), [note(1).noteId]);
  assert.equal(cache.getCalendar('2026-11').days[0].savedCount, 0);
});

test('late responses cannot replace a newer manual refresh', async () => {
  const store = state.createArchiveStore(session.getMemberSessionKey(), selection);
  let finish;
  respond = () => new Promise((resolve) => { finish = resolve; });
  const old = store.refresh();
  respond = (request) => request.path.endsWith('/calendar') ? ok(calendar) : page(request, [note(1)]);
  await store.refresh();
  finish(ok(calendar));
  await old;
  assert.deepEqual(store.getSnapshot().notes.map((item) => item.id), [note(1).noteId]);
});

test('previous-login responses are discarded after another account signs in', async () => {
  const store = state.createArchiveStore(session.getMemberSessionKey(), selection);
  let finish;
  respond = () => new Promise((resolve) => { finish = resolve; });
  const pending = store.refresh();
  respond = (request) => request.path.endsWith('/logout') ? ok({ loggedOut: true }) : ok(tokens);
  await session.signOut();
  await session.signIn('other@example.test', 'Pass123!');
  finish(ok(calendar));
  await pending;
  assert.deepEqual(store.getSnapshot().notes, []);
  assert.equal(store.getSnapshot().calendar, null);
});

test('an expired access token refreshes once for the real archive client', async () => {
  respond = (request) => request.path.endsWith('/refresh') ? ok({ ...tokens, accessToken: 'new-access', refreshToken: 'new-refresh' })
    : request.headers.Authorization === 'Bearer access' ? fail(401)
    : request.path.endsWith('/calendar') ? ok(calendar) : page(request, [note(1)]);
  const store = state.createArchiveStore(session.getMemberSessionKey(), selection);
  await store.refresh();
  assert.equal(store.getSnapshot().notes.length, 1);
  assert.equal(calls.filter((request) => request.path.endsWith('/refresh')).length, 1);
  assert.equal(calls.at(-1).headers.Authorization, 'Bearer new-access');
});

test('invalid calendars and malformed cursor/card responses fail visibly', async () => {
  for (const result of [
    { month: '2026-10', days: [] }, { ...calendar, days: [{ ...calendar.days[0], savedCount: -1 }] },
    { ...calendar, days: [{ ...calendar.days[0], date: '2026-11-31' }] },
    { ...calendar, days: [calendar.days[0], calendar.days[0]] },
  ]) {
    respond = () => ok(result);
    await assert.rejects(api.getArchiveCalendar('access', '2026-11'));
  }
  const valid = { date: '2026-11-10', notes: [note(1)], size: 20, hasNext: false, nextCursor: null };
  for (const patch of [
    { nextCursor: 'unexpected' }, { hasNext: true, nextCursor: null }, { hasNext: true, nextCursor: 'same' },
    { notes: [{ ...note(1), authorDisplayName: null }] }, { notes: [{ ...note(1), createdAt: '2026-11-09T14:59:59Z' }] },
    { notes: [{ ...note(1), accessStatus: 'HIDDEN' }] },
  ]) {
    respond = () => ok({ ...valid, ...patch });
    await assert.rejects(api.getArchiveNotes('access', valid.date, 'ALL', 'same', 20));
  }
});

test('Seoul dates stay correct across UTC day, month and year boundaries', () => {
  const { seoulDateKey, getSeoulToday, dateKey } = require('../src/utils/storage-calendar.ts');
  assert.equal(seoulDateKey(new Date('2026-11-01T14:59:59Z')), '2026-11-01');
  assert.equal(seoulDateKey(new Date('2026-11-01T15:00:00Z')), '2026-11-02');
  assert.equal(dateKey(getSeoulToday(new Date('2026-12-31T15:00:00Z'))), '2027-01-01');
});
