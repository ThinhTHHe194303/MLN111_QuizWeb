import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/js/services/storage.js';
import { STORAGE_KEYS, LIMITS } from '../src/js/config.js';
import { fakeBackend } from './helpers.js';

const entry = (i, over = {}) => ({ id: `e${i}`, finishedAt: 1000 + i, score: 5, correct: 5, total: 10, durationSec: 30, chapterIds: [], ...over });

test('Settings and session round-trip through JSON', () => {
  const s = createStorage(fakeBackend());
  assert.equal(s.persistent, true);
  assert.equal(s.loadSettings(), null);
  s.saveSettings({ a: 1 });
  assert.deepEqual(s.loadSettings(), { a: 1 });
  s.saveSession({ v: 1 });
  assert.deepEqual(s.loadSession(), { v: 1 });
  s.clearSession();
  assert.equal(s.loadSession(), null);
});

test('Corrupt JSON is treated as missing data', () => {
  const s = createStorage(fakeBackend({ [STORAGE_KEYS.settings]: '{oops', [STORAGE_KEYS.history]: '"str"' }));
  assert.equal(s.loadSettings(), null);
  assert.deepEqual(s.loadHistory(), []);
});

test('History is newest-first, de-duplicated by id, capped and filtered', () => {
  const s = createStorage(fakeBackend());
  for (let i = 0; i < LIMITS.historySize + 5; i++) s.addHistory(entry(i));
  const list = s.loadHistory();
  assert.equal(list.length, LIMITS.historySize);
  assert.equal(list[0].id, `e${LIMITS.historySize + 4}`);
  s.addHistory(entry(100, { id: list[0].id }));
  assert.equal(s.loadHistory().filter(e => e.id === list[0].id).length, 1);
  s.clearHistory();
  assert.deepEqual(s.loadHistory(), []);
  const bad = createStorage(fakeBackend({ [STORAGE_KEYS.history]: JSON.stringify([null, { score: 'x' }, entry(1)]) }));
  assert.equal(bad.loadHistory().length, 1);
});

test('A throwing backend degrades gracefully (quota, private mode)', () => {
  const fail = () => { throw new Error('blocked'); };
  const s = createStorage({ getItem: fail, setItem: fail, removeItem: fail });
  assert.equal(s.saveSettings({}), false);
  assert.equal(s.loadSettings(), null);
  assert.doesNotThrow(() => s.clearSession());
});

test('Without any backend it falls back to memory and reports non-persistent', () => {
  const s = createStorage(null);
  assert.equal(s.persistent, false);
  s.saveSettings({ k: 1 });
  assert.deepEqual(s.loadSettings(), { k: 1 });
});
