import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, validateForStart } from '../src/js/core/settings.js';
import { DEFAULT_SETTINGS } from '../src/js/config.js';
import { data } from './helpers.js';

test('Missing or garbage settings fall back to defaults with the first chapter selected', () => {
  for (const raw of [null, undefined, 'x', 42, [], {}]) {
    const s = normalizeSettings(raw, data);
    assert.deepEqual(s.chapters, ['chuong-1']);
    assert.equal(s.count, DEFAULT_SETTINGS.count);
    assert.equal(s.mode, 'exam');
  }
});

test('Persisted values are sanitised and clamped', () => {
  const s = normalizeSettings({
    chapters: ['chuong-3', 'x', 'chuong-1'], count: '7.4', minutes: 9999, mode: 'toString', theme: 'neon',
    all: 'yes', timer: true,
  }, data);
  assert.deepEqual(s.chapters, ['chuong-1', 'chuong-3']);
  assert.equal(s.count, 7);
  assert.equal(s.minutes, 180);
  assert.equal(s.mode, 'exam');
  assert.equal(s.theme, 'auto');
  assert.equal(s.all, true);
  assert.equal(s.timer, true);
});

test('validateForStart reports bad count, minutes and empty selection', () => {
  const ok = { chapters: ['chuong-1'], all: false, count: 5, timer: false, minutes: 20 };
  assert.equal(validateForStart(ok, 12), '');
  assert.match(validateForStart({ ...ok, chapters: [] }, 0), /ít nhất một chương/);
  for (const count of [0, 13, 1.5, NaN]) assert.match(validateForStart({ ...ok, count }, 12), /từ 1 đến 12/);
  assert.equal(validateForStart({ ...ok, all: true, count: NaN }, 12), '');
  for (const minutes of [0, 181, 2.5, NaN]) assert.match(validateForStart({ ...ok, timer: true, minutes }, 12), /phút/);
  assert.equal(validateForStart({ ...ok, timer: false, minutes: NaN }, 12), '');
});
