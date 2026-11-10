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
const ok = (data, status = 200) => new Response(JSON.stringify({ success: true, data }), { status });
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
    const request = { path: parsed.pathname, query: parsed.searchParams, headers: options.headers,
      method: options.method ?? 'GET', body: options.body ? JSON.parse(options.body) : null };
    calls.push(request);
    return respond(request);
  };
  for (const path of ['api/client', 'api/auth', 'api/notes', 'api/archive', 'auth/member-session', 'data/archive', 'state/archive-notes']) {
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
  const cache = state.getArchiveCache(session.getMemberSessionKey());
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

test('the current login shares its cache across visits and a new login or app starts empty', async () => {
  const owner = session.getMemberSessionKey();
  const first = state.getArchiveCache(owner);
  await first.get(selection).ensureLoaded();
  assert.equal(state.getArchiveCache(owner), first);
  await state.getArchiveCache(owner).get(selection).ensureLoaded();
  assert.equal(calls.length, 2);
  assert.notEqual(state.getArchiveCache(owner + 1), first);
  assert.equal(state.createArchiveCache(owner).getCalendar('2026-11'), null);
});

test('re-entering fetches fresh data but an identical response keeps all references and emits no changes', async () => {
  const cache = state.getArchiveCache(session.getMemberSessionKey());
  const store = cache.get(selection);
  await store.ensureLoaded();
  const snapshot = store.getSnapshot();
  const calendarSnapshot = cache.getCalendar(selection.month);
  let storeUpdates = 0, calendarUpdates = 0, finish;
  store.subscribe(() => { storeUpdates++; });
  cache.subscribe(() => { calendarUpdates++; });
  respond = (request) => request.path.endsWith('/calendar') ? new Promise((resolve) => { finish = resolve; })
    : page(request, [note(2, 'SAVED'), note(1)]);
  cache.invalidate(); // Navigation focus, not local filter changes.
  const pending = store.ensureLoaded();
  assert.equal(store.getSnapshot(), snapshot);
  assert.equal(snapshot.loading, false);
  assert.equal(snapshot.refreshing, false);
  finish(ok(calendar));
  await pending;
  assert.equal(calls.length, 4);
  assert.equal(store.getSnapshot(), snapshot);
  assert.equal(cache.getCalendar(selection.month), calendarSnapshot);
  assert.equal(storeUpdates, 0);
  assert.equal(calendarUpdates, 0);
});

test('a successfully written note appears immediately on the next archive visit', async () => {
  const cache = state.createArchiveCache(session.getMemberSessionKey());
  const store = cache.get(selection);
  const records = [note(2, 'SAVED'), note(1)];
  const created = { ...note(3), preview: '방금 작성한 쪽지', createdAt: '2026-11-10T02:00:00Z' };
  respond = (request) => {
    if (request.path === '/api/v1/notes' && request.method === 'POST') {
      assert.equal(request.body.content, created.preview);
      records.unshift(created);
      return ok({ noteId: created.noteId, createdAt: created.createdAt }, 201);
    }
    if (request.path.endsWith('/calendar')) return ok({ month: '2026-11', days: [{
      date: '2026-11-10', writtenCount: records.filter((item) => item.source === 'WRITTEN').length, savedCount: 1,
    }] });
    return page(request, records);
  };
  await store.ensureLoaded();
  const previous = store.getSnapshot();
  const { createNote } = require('../src/api/notes.ts');
  await session.runMemberRequest((token) => createNote({ content: created.preview, latitude: 35, longitude: 129, visibility: 'PUBLIC' }, token));
  cache.invalidate();
  await store.ensureLoaded();
  const updated = store.getSnapshot();
  assert.deepEqual(updated.notes.map((item) => item.id), [created.noteId, note(2).noteId, note(1).noteId]);
  assert.equal(updated.notes[1], previous.notes[0]);
  assert.equal(updated.notes[2], previous.notes[1]);
  assert.equal(cache.getCalendar('2026-11').days[0].writtenCount, 2);
});

test('equal counts still update changed card content, author name and access without replacing other cards', async () => {
  const cache = state.createArchiveCache(session.getMemberSessionKey());
  const store = cache.get(selection);
  await store.ensureLoaded();
  const previous = store.getSnapshot();
  const calendarSnapshot = cache.getCalendar(selection.month);
  respond = (request) => request.path.endsWith('/calendar') ? ok(calendar)
    : page(request, [{ ...note(2, 'SAVED'), authorCategory: 'FRIEND', authorDisplayName: '새 닉네임', preview: '바뀐 미리보기' }, note(1)]);
  cache.invalidate();
  await store.ensureLoaded();
  assert.equal(cache.getCalendar(selection.month), calendarSnapshot);
  assert.equal(store.getSnapshot().notes[0].authorDisplayName, '새 닉네임');
  assert.equal(store.getSnapshot().notes[0].title, '바뀐 미리보기');
  assert.equal(store.getSnapshot().notes[1], previous.notes[1]);
  respond = (request) => request.path.endsWith('/calendar') ? ok(calendar)
    : page(request, [{ ...note(2, 'SAVED'), accessStatus: 'LOCATION_REQUIRED', isSaved: false, preview: null }, note(1)]);
  cache.invalidate();
  await store.ensureLoaded();
  assert.equal(store.getSnapshot().notes[0].openable, false);
  assert.equal(store.getSnapshot().notes[0].isSaved, false);
});

test('revalidation keeps all loaded pages and advances the cursor after a newly inserted note', async () => {
  const cache = state.createArchiveCache(session.getMemberSessionKey());
  const store = cache.get(selection);
  const records = Array.from({ length: 45 }, (_, index) => note(100 - index));
  respond = (request) => {
    if (request.path.endsWith('/calendar')) return ok({ month: '2026-11', days: [{ date: '2026-11-10', writtenCount: records.length, savedCount: 0 }] });
    const offset = Number(request.query.get('cursor') ?? 0);
    const end = Math.min(records.length, offset + Number(request.query.get('size')));
    return page(request, records.slice(offset, end), end < records.length ? String(end) : null);
  };
  await store.ensureLoaded();
  await store.loadMore();
  const previous = store.getSnapshot();
  assert.equal(previous.notes.length, 40);
  cache.invalidate();
  await store.ensureLoaded();
  assert.equal(store.getSnapshot(), previous);
  assert.equal(calls.at(-1).query.get('size'), '40');
  records.unshift({ ...note(101), createdAt: '2026-11-10T02:00:00Z' });
  cache.invalidate();
  await store.ensureLoaded();
  assert.equal(store.getSnapshot().notes.length, 40);
  assert.equal(store.getSnapshot().notes[0].id, note(101).noteId);
  await store.loadMore();
  assert.deepEqual(store.getSnapshot().notes.map((item) => item.id), records.map((item) => item.noteId));
  assert.equal(new Set(store.getSnapshot().notes.map((item) => item.id)).size, 46);
});

test('a failed background revalidation keeps the visible cards and cursor for explicit retry', async () => {
  const cache = state.createArchiveCache(session.getMemberSessionKey());
  const store = cache.get(selection);
  await store.ensureLoaded();
  const previous = store.getSnapshot();
  const calendarSnapshot = cache.getCalendar(selection.month);
  respond = () => fail(503);
  cache.invalidate();
  await store.ensureLoaded();
  assert.equal(store.getSnapshot().notes, previous.notes);
  assert.equal(store.getSnapshot().next, previous.next);
  assert.equal(cache.getCalendar(selection.month), calendarSnapshot);
  assert.equal(store.getSnapshot().loading, false);
  assert.equal(store.getSnapshot().refreshing, false);
  assert.ok(store.getSnapshot().error);
  const failedCalls = calls.length;
  await store.ensureLoaded();
  assert.equal(calls.length, failedCalls);
  respond = (request) => request.path.endsWith('/calendar') ? ok(calendar) : page(request, [note(1)]);
  await store.retry();
  assert.equal(store.getSnapshot().error, null);
  assert.deepEqual(store.getSnapshot().notes.map((item) => item.id), [note(1).noteId]);
});

test('revalidating a long loaded prefix respects the 100-note API request limit', async () => {
  const records = Array.from({ length: 120 }, (_, index) => note(200 - index));
  respond = (request) => {
    const offset = Number(request.query.get('cursor') ?? 0);
    const size = Number(request.query.get('size'));
    assert.ok(size <= 100);
    const end = Math.min(records.length, offset + size);
    return page(request, records.slice(offset, end), end < records.length ? String(end) : null);
  };
  const result = await data.loadArchivePage(selection, ['2026-11-10'], { dayIndex: 0, cursor: null }, () => true, 120);
  assert.equal(result.notes.length, 120);
  assert.equal(result.next, null);
  assert.deepEqual(calls.map((request) => request.query.get('size')), ['100', '20']);
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
