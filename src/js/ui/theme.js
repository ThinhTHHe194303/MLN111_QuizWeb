import { $ } from '../utils/dom.js';

const prefersDark = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
export const effectiveTheme = theme => (theme === 'auto' ? (prefersDark() ? 'dark' : 'light') : theme);

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
  const dark = effectiveTheme(theme) === 'dark';
  const btn = $('#theme-toggle');
  if (btn) {
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
    btn.textContent = dark ? '☀' : '☾';
  }
  $('meta[name=theme-color]')?.setAttribute('content', dark ? '#0f1f1c' : '#1b6852');
}

export const nextTheme = theme => (effectiveTheme(theme) === 'dark' ? 'light' : 'dark');
