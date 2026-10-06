export const LIMITS = Object.freeze({
  minutes: { min: 1, max: 180 },
  historySize: 20,
  urgentSeconds: 60,
});

export const STORAGE_KEYS = Object.freeze({
  settings: 'ontap:settings:v1',
  session: 'ontap:session:v1',
  history: 'ontap:history:v1',
});

export const MODES = Object.freeze({
  exam: { id: 'exam', label: 'Kiểm tra', hint: 'Xem đáp án và giải thích sau khi nộp bài.' },
  practice: { id: 'practice', label: 'Luyện tập', hint: 'Xem đáp án đúng ngay sau mỗi câu trả lời.' },
});

export const THEMES = Object.freeze(['auto', 'light', 'dark']);

export const DEFAULT_SETTINGS = Object.freeze({
  chapters: [],
  count: 10,
  all: true,
  shuffleQuestions: true,
  shuffleOptions: true,
  timer: false,
  minutes: 20,
  mode: 'exam',
  theme: 'auto',
});

export const OPTION_IDS = Object.freeze(['A', 'B', 'C', 'D']);
