import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateData, buildQuiz, buildQuizFromIds, grade, shuffle, chapterBreakdown,
  questionIdsByResult, countAvailable, resultType,
} from '../src/js/core/quiz.js';
import { data, baseConfig, totalQuestions } from './helpers.js';

test('Bank is valid and every question has a source reference', () => {
  assert.equal(validateData(data), data);
  assert.equal(buildQuiz(data, baseConfig).length, totalQuestions);
  for (const c of data.chapters) for (const q of c.questions) assert.ok(q.source, q.id);
});

test('Subset respects chapter selection, count and stable ordering when shuffle is off', () => {
  const q = buildQuiz(data, { ...baseConfig, chapters: ['chuong-2'], all: false, count: 5 });
  assert.deepEqual(q.map(x => x.id), data.chapters[1].questions.slice(0, 5).map(x => x.id));
});

test('Shuffle preserves stable answer IDs and does not mutate the source data', () => {
  const before = JSON.stringify(data);
  const q = buildQuiz(data, { ...baseConfig, shuffleQuestions: true, shuffleOptions: true }, () => 0);
  assert.notDeepEqual(q.map(x => x.id), buildQuiz(data, baseConfig).map(x => x.id));
  assert.notDeepEqual(q[0].options.map(x => x.id), ['A', 'B', 'C', 'D']);
  const answers = Object.fromEntries(q.map(x => [x.id, x.correctAnswer]));
  assert.equal(grade(q, answers).score, 10);
  assert.equal(JSON.stringify(data), before);
});

test('Correct, wrong and blank answers are scored consistently', () => {
  const q = buildQuiz(data, { ...baseConfig, all: false, count: 3 });
  const wrong = q[1].options.find(o => o.id !== q[1].correctAnswer).id;
  const g = grade(q, { [q[0].id]: q[0].correctAnswer, [q[1].id]: wrong });
  assert.deepEqual([g.correct, g.wrong, g.blank, g.total], [1, 1, 1, 3]);
  assert.equal(grade(q, {}).score, 0);
  assert.equal(resultType(q[2], {}), 'blank');
});

test('grade of an empty quiz does not produce NaN', () => {
  assert.deepEqual(grade([], {}), { correct: 0, blank: 0, wrong: 0, total: 0, percentage: 0, score: 0 });
});

test('Invalid counts and empty chapter selection fail with a clear message', () => {
  for (const count of [0, -1, totalQuestions + 1, 1.2, NaN, undefined]) {
    assert.throws(() => buildQuiz(data, { ...baseConfig, all: false, count }), /số nguyên/);
  }
  assert.throws(() => buildQuiz(data, { ...baseConfig, chapters: [] }), /ít nhất một chương/);
  assert.throws(() => buildQuiz(data, { ...baseConfig, chapters: ['khong-ton-tai'] }), /ít nhất một chương/);
});

test('Malformed data is rejected', () => {
  const bad = mutate => {
    const d = structuredClone(data);
    mutate(d);
    assert.throws(() => validateData(d));
  };
  bad(d => { d.chapters[0].questions[0].correctAnswer = 'Z'; });
  bad(d => { d.chapters[0].questions[1].id = d.chapters[0].questions[0].id; });
  bad(d => { d.chapters[0].questions[0].options.pop(); });
  bad(d => { d.chapters[0].questions[0].options[1].text = '  '; });
  bad(d => { d.chapters[1].id = d.chapters[0].id; });
  bad(d => { d.chapters = []; });
  assert.throws(() => validateData(null));
});

test('Fisher–Yates keeps every element exactly once', () => {
  for (let i = 0; i < 100; i++) assert.deepEqual(shuffle([1, 2, 3, 4, 5]).sort(), [1, 2, 3, 4, 5]);
  assert.deepEqual(shuffle([]), []);
});

test('countAvailable sums only selected chapters', () => {
  assert.equal(countAvailable(data, []), 0);
  assert.equal(countAvailable(data, ['chuong-1']), data.chapters[0].questions.length);
  assert.equal(countAvailable(data, data.chapters.map(c => c.id)), totalQuestions);
});

test('Retry set contains only wrong and blank questions', () => {
  const q = buildQuiz(data, { ...baseConfig, all: false, count: 4 });
  const wrong = q[1].options.find(o => o.id !== q[1].correctAnswer).id;
  const answers = { [q[0].id]: q[0].correctAnswer, [q[1].id]: wrong, [q[2].id]: q[2].correctAnswer };
  const ids = questionIdsByResult(q, answers, ['wrong', 'blank']);
  assert.deepEqual(ids, [q[1].id, q[3].id]);
  assert.deepEqual(buildQuizFromIds(data, ids, baseConfig).map(x => x.id), ids);
  assert.throws(() => buildQuizFromIds(data, ['nope'], baseConfig));
});

test('Chapter breakdown counts per chapter', () => {
  const q = buildQuiz(data, baseConfig);
  const rows = chapterBreakdown(q, Object.fromEntries(q.map(x => [x.id, x.correctAnswer])));
  assert.equal(rows.length, data.chapters.length);
  for (const r of rows) assert.equal(r.correct, r.total);
});
