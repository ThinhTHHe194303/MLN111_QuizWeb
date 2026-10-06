// Validates src/data/questions.json: `npm run validate`.
import fs from 'node:fs';
import { validateData } from '../src/js/core/quiz.js';

const file = new URL('../src/data/questions.json', import.meta.url);
try {
  const data = validateData(JSON.parse(fs.readFileSync(file, 'utf8')));
  const total = data.chapters.reduce((n, c) => n + c.questions.length, 0);
  const warnings = [];
  for (const c of data.chapters) {
    for (const q of c.questions) {
      if (!q.source) warnings.push(`${q.id}: thiếu "source"`);
      if (!q.explanation.trim()) warnings.push(`${q.id}: thiếu giải thích`);
      if (new Set(q.options.map(o => o.text.trim())).size !== q.options.length) warnings.push(`${q.id}: đáp án trùng nội dung`);
    }
  }
  console.log(`OK: ${data.chapters.length} chương, ${total} câu hỏi.`);
  warnings.forEach(w => console.warn(`Cảnh báo: ${w}`));
} catch (e) {
  console.error(`Dữ liệu không hợp lệ: ${e.message}`);
  process.exit(1);
}
