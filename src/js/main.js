import { createApp, renderLoadError } from './controller.js';
import { validateData } from './core/quiz.js';
import { createStorage } from './services/storage.js';
import { initDialog } from './ui/dialog.js';

async function init() {
  initDialog();
  try {
    const res = await fetch(new URL('../data/questions.json', import.meta.url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = validateData(await res.json());
    createApp({ data, storage: createStorage() }).start();
  } catch (e) {
    renderLoadError(e.message);
  }
}

init();
