import test from 'node:test';
import assert from 'node:assert/strict';
import { esc, formatTime, formatScore, percent, letter } from '../src/js/utils/format.js';

test('esc neutralises HTML metacharacters and tolerates null', () => {
  assert.equal(esc('<img onerror="a(\'b\')">&'), '&lt;img onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  assert.equal(esc(null), '');
  assert.equal(esc(0), '0');
});

test('formatTime handles minutes, hours and negatives', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(3725), '1:02:05');
  assert.equal(formatTime(-5), '00:00');
});

test('score, percent and letter helpers', () => {
  assert.equal(formatScore(6.666), '6.7');
  assert.equal(formatScore(10), '10.0');
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(1, 0), 0);
  assert.equal(letter(2), 'C');
});
