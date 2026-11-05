const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadSource(relativePath, overrides = {}) {
  const filename = path.resolve(__dirname, '../src', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  const originalRequire = Module.createRequire(filename);
  const requireSource = (name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('@/')) return loadSource(`${name.slice(2)}.ts`, overrides);
    return originalRequire(name);
  };
  new Function('require', 'module', 'exports', output)(requireSource, loaded, loaded.exports);
  return loaded.exports;
}

const picker = loadSource('utils/storage-month-picker.ts');

test('wheel selection rounds to the central 36px row and clamps both ends', () => {
  assert.equal(picker.MONTH_PICKER_ROW_HEIGHT, 36);
  assert.equal(picker.MONTH_PICKER_VISIBLE_ROWS, 5);
  for (const [offset, expected] of [[-80, 0], [0, 0], [17, 0], [18, 1], [36, 1], [72, 2], [396, 11], [1000, 11]]) {
    assert.equal(picker.monthPickerIndex(offset, 12), expected);
  }
});

test('a release keeps the nearest row on a slow drag and caps a fast flick at two extra rows', () => {
  assert.deepEqual(picker.monthPickerRelease(175, 0, 12), { index: 5, springVelocity: 0 });
  assert.equal(picker.monthPickerRelease(175, 10_000, 12).index, 7);
  assert.equal(picker.monthPickerRelease(175, -10_000, 12).index, 3);
  assert.equal(picker.monthPickerRelease(10, -10_000, 12).index, 0);
  assert.equal(picker.monthPickerRelease(390, 10_000, 12).index, 11);
  assert.equal(picker.monthPickerRelease(215, 10_000, 7).springVelocity, 18);
  assert.equal(picker.monthPickerRelease(181, 1, 12).springVelocity, 0);
});

test('year choices start in 2025 and extend only through the current year', () => {
  assert.deepEqual(picker.monthPickerYears(2025), [2025]);
  assert.deepEqual(picker.monthPickerYears(2026), [2025, 2026]);
  assert.deepEqual(picker.monthPickerYears(2027), [2025, 2026, 2027]);
  const today = new Date(2026, 10, 2);
  assert.equal(picker.isStorageMonthAllowed(new Date(2024, 11, 31), today), false);
  assert.equal(picker.isStorageMonthAllowed(new Date(2025, 0, 1), today), true);
  assert.equal(picker.isStorageMonthAllowed(new Date(2026, 11, 31), today), true);
  assert.equal(picker.isStorageMonthAllowed(new Date(2027, 0, 1), today), false);
});

test('popover follows the heading and stays within narrow and wide safe areas', () => {
  for (const width of [320, 390, 768]) {
    const viewport = { width, height: 844, topInset: 44, bottomInset: 34, leftInset: 0, rightInset: 0 };
    for (const anchor of [
      { x: 0, y: 100, width: 40, height: 32 },
      { x: width / 2 - 80, y: 260, width: 160, height: 32 },
      { x: width - 40, y: 720, width: 40, height: 32 },
    ]) {
      const result = picker.monthPickerPosition(anchor, viewport);
      assert.equal(result.width, 280);
      assert.ok(result.left >= 16);
      assert.ok(result.left + result.width <= width - 16);
      assert.ok(result.top >= viewport.topInset + 16);
      assert.ok(result.top + picker.MONTH_PICKER_HEIGHT <= viewport.height - viewport.bottomInset - 16);
      assert.ok(result.pointerLeft >= 22 && result.pointerLeft <= result.width - 44);
      assert.equal(result.opensAbove, anchor.y === 720);
    }
  }
});

function createStorageRenderer(notes) {
  const states = [];
  let cursor = 0;

  function useMemo(calculate, dependencies) {
    const index = cursor++;
    const previous = states[index];
    if (previous && dependencies.every((value, i) => Object.is(value, previous.dependencies[i]))) {
      return previous.value;
    }
    const value = calculate();
    states[index] = { value, dependencies };
    return value;
  }

  const react = {
    useMemo,
    useCallback: (callback, dependencies) => useMemo(() => callback, dependencies),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    },
  };
  const { useStorageNotes } = loadSource('hooks/use-storage-notes.ts', { react });
  return (filter) => {
    cursor = 0;
    return useStorageNotes(notes, filter);
  };
}

test('confirming a month normalizes its first day, clears date selection and retains the filter', () => {
  const year = new Date().getFullYear();
  const notes = [{ id: 'mine', title: 'record', createdAt: new Date(year, 1, 28, 12).toISOString(), author: 'me', isSaved: false }];
  const renderStorage = createStorageRenderer(notes);
  const render = () => renderStorage('mine');
  let state = render();
  state.selectDate(new Date(year, 9, 30));
  state = render();
  assert.equal(state.selectedDate, `${year}-10-30`);
  state.selectMonth(new Date(year, 1, 18, 23));
  state = render();
  assert.equal(state.month.getFullYear(), year);
  assert.equal(state.month.getMonth(), 1);
  assert.equal(state.month.getDate(), 1);
  assert.equal(state.month.getHours(), 0);
  assert.equal(state.selectedDate, null);
  assert.equal(state.filter, 'mine');
  assert.deepEqual(state.visibleNotes.map((note) => note.id), ['mine']);
  assert.deepEqual([...state.markedDates], [`${year}-02-28`]);

  state.selectMonth(new Date(2025, 0, 1));
  state = render();
  state.selectDate(new Date(2025, 0, 15));
  state = render();
  for (const action of [
    () => state.changeMonth(-1),
    () => state.selectMonth(new Date(2024, 11, 1)),
    () => state.selectDate(new Date(2024, 11, 31)),
  ]) {
    action();
    state = render();
    assert.equal(state.month.getFullYear(), 2025);
    assert.equal(state.month.getMonth(), 0);
    assert.equal(state.selectedDate, '2025-01-15');
  }
  state.selectMonth(new Date(year, 11, 1));
  state = render();
  state.changeMonth(1);
  state.selectMonth(new Date(year + 1, 0, 1));
  state.selectDate(new Date(year + 1, 0, 1));
  state = render();
  assert.equal(state.month.getFullYear(), year);
  assert.equal(state.month.getMonth(), 11);
  assert.equal(state.selectedDate, null);
});

test('monthly badges and filtered markers stay stable while day selection narrows the newest-first list', () => {
  const createdAt = (month, day, hour) => new Date(2025, month, day, hour).toISOString();
  const notes = [
    { id: 'saved-friend', createdAt: createdAt(1, 3, 9), author: 'friend', isSaved: true },
    { id: 'mine', createdAt: createdAt(1, 4, 10), author: 'me', isSaved: false },
    { id: 'newer-saved', createdAt: createdAt(1, 3, 17), author: 'anonymous', isSaved: true },
    { id: 'another-month', createdAt: createdAt(2, 1, 10), author: 'friend', isSaved: true },
  ];
  const render = createStorageRenderer(notes);
  render('all').selectMonth(new Date(2025, 1, 1));

  const saved = render('saved');
  assert.deepEqual(saved.counts, { all: 3, saved: 2, mine: 1, friends: 1 });
  assert.deepEqual(saved.visibleNotes.map((note) => note.id), ['newer-saved', 'saved-friend']);
  assert.deepEqual([...saved.markedDates], ['2025-02-03']);

  saved.selectDate(new Date(2025, 1, 4));
  const selected = render('saved');
  assert.equal(selected.selectedDate, '2025-02-04');
  assert.deepEqual(selected.visibleNotes, []);
  assert.equal(selected.counts, saved.counts);
  assert.equal(selected.markedDates, saved.markedDates);

  const all = render('all');
  assert.deepEqual(all.visibleNotes.map((note) => note.id), ['mine']);
  assert.equal(all.counts, saved.counts);
  assert.deepEqual([...all.markedDates].sort(), ['2025-02-03', '2025-02-04']);

  all.selectDate(new Date(2025, 1, 4));
  const cleared = render('all');
  assert.equal(cleared.selectedDate, null);
  assert.deepEqual(cleared.visibleNotes.map((note) => note.id), ['mine', 'newer-saved', 'saved-friend']);

  cleared.selectDate(new Date(2025, 2, 1));
  const adjacentMonth = render('all');
  assert.equal(adjacentMonth.month.getMonth(), 2);
  assert.equal(adjacentMonth.selectedDate, '2025-03-01');
  assert.deepEqual(adjacentMonth.visibleNotes.map((note) => note.id), ['another-month']);
});
