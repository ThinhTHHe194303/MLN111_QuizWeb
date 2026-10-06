// Pure quiz logic (no DOM, no storage). Answer IDs are stable:
// display letters are derived from position and never decide correctness.
import { OPTION_IDS } from '../config.js';

export function shuffle(items, rng = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function validateData(data) {
  if (!data || !Array.isArray(data.chapters) || !data.chapters.length) throw new Error('Thiếu danh sách chương.');
  const chapterIds = new Set();
  const questionIds = new Set();
  for (const c of data.chapters) {
    if (!c.id || chapterIds.has(c.id) || !c.title || !Array.isArray(c.questions) || !c.questions.length) {
      throw new Error('Chương thiếu thông tin hoặc trùng ID.');
    }
    chapterIds.add(c.id);
    for (const q of c.questions) {
      if (!q.id || questionIds.has(q.id) || typeof q.question !== 'string' || !q.question.trim()
        || !Array.isArray(q.options) || q.options.length !== OPTION_IDS.length) {
        throw new Error(`Câu hỏi thiếu thông tin, trùng ID hoặc không đủ ${OPTION_IDS.length} đáp án: ${q.id ?? '?'}`);
      }
      questionIds.add(q.id);
      const ids = new Set(q.options.map(o => o.id));
      const badOption = q.options.some(o => typeof o.text !== 'string' || !o.text.trim() || !OPTION_IDS.includes(o.id));
      if (ids.size !== OPTION_IDS.length || badOption || !ids.has(q.correctAnswer) || typeof q.explanation !== 'string') {
        throw new Error(`Đáp án không hợp lệ: ${q.id}`);
      }
    }
  }
  return data;
}

/** Flattens chapters into questions annotated with their chapter. */
export function flattenQuestions(data, chapterIds = null) {
  return data.chapters
    .filter(c => !chapterIds || chapterIds.includes(c.id))
    .flatMap(c => c.questions.map(q => ({ ...q, chapterId: c.id, chapterTitle: c.title })));
}

export function countAvailable(data, chapterIds) {
  return data.chapters.filter(c => chapterIds.includes(c.id)).reduce((n, c) => n + c.questions.length, 0);
}

function withOptions(q, shuffleOptions, rng) {
  return { ...q, options: shuffleOptions ? shuffle(q.options, rng) : q.options.map(o => ({ ...o })) };
}

export function buildQuiz(data, config, rng = Math.random) {
  let pool = flattenQuestions(data, config.chapters);
  const count = config.all ? pool.length : Number(config.count);
  if (!pool.length) throw new Error('Chọn ít nhất một chương để bắt đầu.');
  if (!Number.isInteger(count) || count < 1 || count > pool.length) {
    throw new Error(`Số câu hỏi phải là số nguyên từ 1 đến ${pool.length}.`);
  }
  // With shuffle disabled, choose the first N in chapter/data order.
  if (config.shuffleQuestions) pool = shuffle(pool, rng);
  return pool.slice(0, count).map(q => withOptions(q, config.shuffleOptions, rng));
}

/** Rebuilds a quiz from explicit question IDs (retry wrong answers, redo the same set). */
export function buildQuizFromIds(data, ids, config, rng = Math.random) {
  const wanted = new Set(ids);
  let pool = flattenQuestions(data).filter(q => wanted.has(q.id));
  if (!pool.length) throw new Error('Không tìm thấy câu hỏi để làm lại.');
  if (config.shuffleQuestions) pool = shuffle(pool, rng);
  return pool.map(q => withOptions(q, config.shuffleOptions, rng));
}

export function resultType(question, answers) {
  const picked = answers[question.id];
  if (!picked) return 'blank';
  return picked === question.correctAnswer ? 'correct' : 'wrong';
}

export function grade(questions, answers) {
  const total = questions.length;
  const correct = questions.filter(q => resultType(q, answers) === 'correct').length;
  const blank = questions.filter(q => resultType(q, answers) === 'blank').length;
  const ratio = total ? correct / total : 0;
  return { correct, blank, wrong: total - correct - blank, total, percentage: ratio * 100, score: ratio * 10 };
}

export function chapterBreakdown(questions, answers) {
  const map = new Map();
  for (const q of questions) {
    const row = map.get(q.chapterId) ?? { chapterId: q.chapterId, title: q.chapterTitle, total: 0, correct: 0 };
    row.total++;
    if (resultType(q, answers) === 'correct') row.correct++;
    map.set(q.chapterId, row);
  }
  return [...map.values()];
}

export function questionIdsByResult(questions, answers, types) {
  return questions.filter(q => types.includes(resultType(q, answers))).map(q => q.id);
}
