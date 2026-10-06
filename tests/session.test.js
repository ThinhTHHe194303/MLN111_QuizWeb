import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuiz } from '../src/js/core/quiz.js';
import {
  createAttempt, elapsedMs, finishAttempt, historyEntry, isLocked,
  restoreAttempt, resumeAttempt, serializeAttempt,
} from '../src/js/core/session.js';
import { data, baseConfig } from './helpers.js';

const make = (opts = {}) => {
  const questions = buildQuiz(data, { ...baseConfig, all: false, count: 4, shuffleOptions: true }, () => 0.3);
  return createAttempt(questions, { mode: 'exam', now: 1000, ...opts });
};

test('Snapshot round-trips answers, flags, option order and index', () => {
  const a = make();
  a.answers[a.questions[0].id] = a.questions[0].options[2].id;
  a.flags.add(a.questions[1].id);
  a.index = 2;
  const snap = JSON.parse(JSON.stringify(serializeAttempt(a, 5000)));
  const b = restoreAttempt(data, snap, 9000);
  assert.deepEqual(b.questions.map(q => q.options.map(o => o.id)), a.questions.map(q => q.options.map(o => o.id)));
  assert.deepEqual(b.answers, a.answers);
  assert.deepEqual([...b.flags], [...a.flags]);
  assert.equal(b.index, 2);
  assert.equal(b.paused, true);
});

test('Untimed clock counts active time only and stays frozen while paused', () => {
  const a = make();
  const b = restoreAttempt(data, serializeAttempt(a, 11000), 50000);
  assert.equal(elapsedMs(b, 99999), 10000);
  resumeAttempt(b, 100000);
  assert.equal(elapsedMs(b, 103000), 13000);
});

test('Timed attempts use an absolute deadline and cap elapsed time', () => {
  const a = make({ timerMinutes: 1 });
  assert.equal(a.deadline, 61000);
  assert.equal(elapsedMs(a, 31000), 30000);
  assert.equal(elapsedMs(a, 999999), 60000);
  finishAttempt(a, { expired: true, now: 999999 });
  assert.equal(a.durationMs, 60000);
  assert.equal(a.expired, true);
});

test('Stale or corrupt snapshots are rejected instead of throwing', () => {
  const snap = serializeAttempt(make());
  assert.equal(restoreAttempt(data, null), null);
  assert.equal(restoreAttempt(data, { ...snap, v: 99 }), null);
  assert.equal(restoreAttempt(data, { ...snap, questions: [{ id: 'gone', options: ['A', 'B', 'C', 'D'] }] }), null);
  assert.equal(restoreAttempt(data, { ...snap, questions: snap.questions.map(q => ({ ...q, options: ['A', 'A', 'B', 'C'] })) }), null);
  assert.equal(restoreAttempt(data, { ...snap, questions: [] }), null);
});

test('Restore drops unknown answers/flags and clamps the index', () => {
  const snap = serializeAttempt(make());
  const id = snap.questions[0].id;
  const b = restoreAttempt(data, { ...snap, answers: { [id]: 'Z', ghost: 'A' }, flags: ['ghost', id], index: 999 });
  assert.deepEqual(b.answers, {});
  assert.deepEqual([...b.flags], [id]);
  assert.equal(b.index, 3);
});

test('Practice mode locks a question once answered; exam mode never does', () => {
  const p = make({ mode: 'practice' });
  const q = p.questions[0];
  assert.equal(isLocked(p, q), false);
  p.answers[q.id] = 'A';
  assert.equal(isLocked(p, q), true);
  const e = make();
  e.answers[q.id] = 'A';
  assert.equal(isLocked(e, q), false);
});

test('History entry summarises a finished attempt', () => {
  const a = make();
  a.answers[a.questions[0].id] = a.questions[0].correctAnswer;
  finishAttempt(a, { now: 31000 });
  const h = historyEntry(a);
  assert.deepEqual([h.correct, h.total, h.score, h.durationSec], [1, 4, 2.5, 30]);
  assert.ok(h.chapterIds.length >= 1);
});
