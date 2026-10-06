import { DEFAULT_SETTINGS, LIMITS, MODES, THEMES } from '../config.js';

const clampInt = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/** Turns untrusted (e.g. persisted) settings into a valid settings object. */
export function normalizeSettings(raw, data) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const known = data.chapters.map(c => c.id);
  const chapters = Array.isArray(r.chapters) ? known.filter(id => r.chapters.includes(id)) : [];
  return {
    chapters: chapters.length ? chapters : [known[0]],
    count: clampInt(r.count, 1, Number.MAX_SAFE_INTEGER, DEFAULT_SETTINGS.count),
    all: typeof r.all === 'boolean' ? r.all : DEFAULT_SETTINGS.all,
    shuffleQuestions: typeof r.shuffleQuestions === 'boolean' ? r.shuffleQuestions : DEFAULT_SETTINGS.shuffleQuestions,
    shuffleOptions: typeof r.shuffleOptions === 'boolean' ? r.shuffleOptions : DEFAULT_SETTINGS.shuffleOptions,
    timer: typeof r.timer === 'boolean' ? r.timer : DEFAULT_SETTINGS.timer,
    minutes: clampInt(r.minutes, LIMITS.minutes.min, LIMITS.minutes.max, DEFAULT_SETTINGS.minutes),
    mode: Object.hasOwn(MODES, r.mode) ? r.mode : DEFAULT_SETTINGS.mode,
    theme: THEMES.includes(r.theme) ? r.theme : DEFAULT_SETTINGS.theme,
  };
}

/** Returns an error message, or '' when the settings can start a quiz. */
export function validateForStart(settings, available) {
  if (!settings.chapters.length || available === 0) return 'Chọn ít nhất một chương để bắt đầu.';
  if (!settings.all && !(Number.isInteger(settings.count) && settings.count >= 1 && settings.count <= available)) {
    return `Số câu hỏi phải là số nguyên từ 1 đến ${available}.`;
  }
  const { min, max } = LIMITS.minutes;
  if (settings.timer && !(Number.isInteger(settings.minutes) && settings.minutes >= min && settings.minutes <= max)) {
    return `Thời gian phải là số nguyên từ ${min} đến ${max} phút.`;
  }
  return '';
}
