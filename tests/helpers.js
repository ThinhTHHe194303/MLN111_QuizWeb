import fs from 'node:fs';

export const data = JSON.parse(fs.readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8'));
export const allChapterIds = data.chapters.map(c => c.id);
export const baseConfig = { chapters: allChapterIds, all: true, shuffleQuestions: false, shuffleOptions: false };
export const totalQuestions = data.chapters.reduce((n, c) => n + c.questions.length, 0);

export function fakeBackend(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: k => void map.delete(k),
    map,
  };
}
