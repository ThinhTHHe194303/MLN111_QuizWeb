// Application controller: owns state, wires DOM events to actions, and drives the views.
import { LIMITS } from './config.js';
import { buildQuiz, buildQuizFromIds, countAvailable, questionIdsByResult } from './core/quiz.js';
import { normalizeSettings, validateForStart } from './core/settings.js';
import {
  createAttempt, elapsedMs, finishAttempt, historyEntry, isLocked,
  restoreAttempt, resumeAttempt, serializeAttempt,
} from './core/session.js';
import { renderDashboard, syncDashboard } from './ui/dashboard.js';
import { renderQuestionCard, renderQuiz, updateNavigation } from './ui/quiz.js';
import { filterBar, renderResults, reviewList } from './ui/results.js';
import { closeDialog, confirmAction, isDialogOpen } from './ui/dialog.js';
import { applyTheme, nextTheme } from './ui/theme.js';
import { $, $$ } from './utils/dom.js';
import { esc, formatTime } from './utils/format.js';

export function createApp({ data, storage }) {
  const main = $('#main');
  const state = {
    settings: normalizeSettings(storage.loadSettings(), data),
    history: storage.loadHistory(),
    attempt: null,
    pending: restoreAttempt(data, storage.loadSession()),
    view: 'dashboard',
    filter: 'all',
    timerId: null,
  };

  const saveSettings = () => storage.saveSettings(state.settings);
  const persist = () => { if (state.attempt && state.attempt.finished === null) storage.saveSession(serializeAttempt(state.attempt)); };
  const stopTimer = () => { clearInterval(state.timerId); state.timerId = null; };
  const startTimer = () => { stopTimer(); state.timerId = setInterval(tick, 500); tick(); };

  function changeView(view, breadcrumb) {
    state.view = view;
    $('#breadcrumb').textContent = breadcrumb;
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  // ---- Dashboard -------------------------------------------------------
  function showDashboard() {
    stopTimer();
    changeView('dashboard', 'Tạo bài luyện tập');
    main.innerHTML = renderDashboard({ data, settings: state.settings, session: state.pending, history: state.history, persistent: storage.persistent });
    syncDashboard(main, { data, settings: state.settings });
  }

  const available = () => countAvailable(data, state.settings.chapters);

  function readForm() {
    const s = state.settings;
    if (!$('#count').disabled) s.count = Number($('#count').value);
    if (s.timer) s.minutes = Number($('#minutes').value);
    return validateForStart(s, available());
  }

  function startFromSettings() {
    const error = readForm();
    if (error) { $('#config-error').textContent = error; return; }
    begin(() => buildQuiz(data, state.settings), 'custom');
  }

  function begin(buildQuestions, kind) {
    const run = () => {
      try {
        const questions = buildQuestions();
        const s = state.settings;
        state.attempt = createAttempt(questions, { mode: s.mode, timerMinutes: s.timer ? s.minutes : null, kind });
        state.pending = null;
        saveSettings();
        persist();
        showQuiz();
      } catch (e) {
        const box = $('#config-error');
        if (box) box.textContent = e.message;
      }
    };
    if (state.pending) {
      confirmAction({
        title: 'Thay bài đang làm dở?', text: 'Bài làm dở hiện tại sẽ bị xóa nếu bạn bắt đầu bài mới.',
        confirmLabel: 'Bắt đầu bài mới', cancelLabel: 'Giữ bài cũ', danger: true, action: run,
      });
    } else run();
  }

  function onDashboardChange(el) {
    const s = state.settings;
    if (el.name === 'chapter') {
      const checked = new Set($$('[name=chapter]:checked', main).map(x => x.value));
      s.chapters = data.chapters.map(c => c.id).filter(id => checked.has(id));
    } else if (['all', 'shuffleQuestions', 'shuffleOptions', 'timer'].includes(el.name)) {
      s[el.name] = el.checked;
    } else if (el.name === 'mode') {
      s.mode = el.value;
    } else if (el.name === 'count') {
      const max = Math.max(1, available());
      s.count = Math.min(max, Math.max(1, Math.round(Number(el.value)) || 1));
      el.value = s.count;
    } else if (el.name === 'minutes') {
      const { min, max } = LIMITS.minutes;
      s.minutes = Math.min(max, Math.max(min, Math.round(Number(el.value)) || s.minutes));
      el.value = s.minutes;
    } else return;
    if (!s.all && s.count > available() && available() > 0) s.count = available();
    $('#count').value = s.count;
    saveSettings();
    syncDashboard(main, { data, settings: s });
  }

  // ---- Quiz ------------------------------------------------------------
  function showQuiz() {
    changeView('quiz', state.attempt.mode === 'practice' ? 'Đang luyện tập' : 'Đang làm bài');
    main.innerHTML = renderQuiz(state.attempt, data);
    updateNavigation(state.attempt);
    startTimer();
  }

  function tick() {
    const a = state.attempt;
    if (state.view !== 'quiz' || !a || a.finished !== null) return;
    const now = Date.now();
    if (a.deadline && now >= a.deadline) { finish(true); return; }
    const seconds = a.deadline ? Math.ceil((a.deadline - now) / 1000) : elapsedMs(a, now) / 1000;
    const value = $('#time-value');
    if (value) {
      value.textContent = formatTime(seconds);
      $('#timer').classList.toggle('urgent', Boolean(a.deadline) && seconds <= LIMITS.urgentSeconds);
    }
  }

  function renderCard({ focusFeedback = false } = {}) {
    $('#question-card').innerHTML = renderQuestionCard(state.attempt, data);
    updateNavigation(state.attempt);
    (focusFeedback ? $('#feedback') : $('#question-title'))?.focus({ preventScroll: !focusFeedback });
  }

  function goTo(index) {
    const a = state.attempt;
    a.index = Math.min(a.questions.length - 1, Math.max(0, index));
    persist();
    renderCard();
  }

  function answer(optionId) {
    const a = state.attempt;
    const q = a.questions[a.index];
    if (isLocked(a, q) || !q.options.some(o => o.id === optionId)) return;
    a.answers[q.id] = optionId;
    persist();
    if (a.mode === 'practice') renderCard({ focusFeedback: true });
    else updateNavigation(a);
  }

  function toggleFlag() {
    const a = state.attempt;
    const id = a.questions[a.index].id;
    if (!a.flags.delete(id)) a.flags.add(id);
    const btn = $('[data-action=flag]');
    btn.setAttribute('aria-pressed', String(a.flags.has(id)));
    btn.textContent = a.flags.has(id) ? '⚑ Đã đánh dấu' : '⚐ Đánh dấu';
    persist();
    updateNavigation(a);
  }

  function submit() {
    const a = state.attempt;
    const remaining = a.questions.length - Object.keys(a.answers).length;
    confirmAction({
      title: 'Nộp bài luyện tập?',
      text: remaining
        ? `Bạn còn ${remaining} câu chưa trả lời. Các câu này sẽ được tính 0 điểm. Bạn vẫn muốn nộp bài?`
        : 'Bạn đã trả lời tất cả câu hỏi. Nộp bài để xem điểm và giải thích đáp án.',
      confirmLabel: 'Nộp bài', cancelLabel: 'Tiếp tục làm', action: () => finish(false),
    });
  }

  function finish(expired) {
    const a = state.attempt;
    if (state.view !== 'quiz' || !a || a.finished !== null) return;
    stopTimer();
    closeDialog();
    finishAttempt(a, { expired });
    storage.clearSession();
    state.history = storage.addHistory(historyEntry(a));
    state.filter = 'all';
    changeView('results', 'Kết quả luyện tập');
    main.innerHTML = renderResults(a, state.filter);
  }

  /** Leaves the quiz but keeps it resumable (in memory and in storage). */
  function leaveQuiz() {
    const a = state.attempt;
    stopTimer();
    persist();
    state.pending = restoreAttempt(data, serializeAttempt(a));
    state.attempt = null;
    showDashboard();
  }

  function requestHome() {
    if (state.view !== 'quiz') { showDashboard(); return; }
    confirmAction({
      title: 'Rời bài đang làm?',
      text: storage.persistent
        ? 'Bài làm được lưu lại. Bạn có thể tiếp tục từ trang chọn chương.'
        : 'Trình duyệt đang chặn lưu trữ nên bài làm chỉ còn trong phiên này; hãy giữ trang mở nếu muốn tiếp tục.',
      confirmLabel: 'Về chọn chương', cancelLabel: 'Ở lại', action: leaveQuiz,
    });
  }

  function resume() {
    state.attempt = resumeAttempt(state.pending);
    state.pending = null;
    showQuiz();
  }

  function retryMissed() {
    const a = state.attempt;
    const ids = questionIdsByResult(a.questions, a.answers, ['wrong', 'blank']);
    begin(() => buildQuizFromIds(data, ids, state.settings), 'retry');
  }

  function retrySame() {
    const a = state.attempt;
    if (a.kind === 'retry') {
      const ids = a.questions.map(q => q.id);
      begin(() => buildQuizFromIds(data, ids, state.settings), 'retry');
    } else {
      begin(() => buildQuiz(data, state.settings), 'custom');
    }
  }

  // ---- Event wiring ----------------------------------------------------
  const actions = {
    home: requestHome,
    exit: requestHome,
    theme() { state.settings.theme = nextTheme(state.settings.theme); applyTheme(state.settings.theme); saveSettings(); },
    'select-all'() {
      state.settings.chapters = state.settings.chapters.length === data.chapters.length ? [] : data.chapters.map(c => c.id);
      saveSettings();
      syncDashboard(main, { data, settings: state.settings });
    },
    single(btn) {
      state.settings.chapters = [btn.dataset.id];
      if (!state.settings.all) state.settings.count = Math.min(state.settings.count, available());
      $('#count').value = state.settings.count;
      saveSettings();
      syncDashboard(main, { data, settings: state.settings });
      $('#start').focus();
    },
    resume,
    'discard-session'() {
      confirmAction({
        title: 'Bỏ bài đang làm dở?', text: 'Toàn bộ câu trả lời của bài này sẽ bị xóa.',
        confirmLabel: 'Bỏ bài này', cancelLabel: 'Giữ lại', danger: true,
        action() { storage.clearSession(); state.pending = null; showDashboard(); },
      });
    },
    'clear-history'() {
      confirmAction({
        title: 'Xóa lịch sử luyện tập?', text: 'Danh sách các bài đã làm trên thiết bị này sẽ bị xóa.',
        confirmLabel: 'Xóa lịch sử', cancelLabel: 'Giữ lại', danger: true,
        action() { storage.clearHistory(); state.history = []; showDashboard(); },
      });
    },
    next: () => goTo(state.attempt.index + 1),
    previous: () => goTo(state.attempt.index - 1),
    jump: btn => goTo(Number(btn.dataset.index)),
    flag: toggleFlag,
    submit,
    dashboard: showDashboard,
    retry: retrySame,
    'retry-missed': retryMissed,
    filter(btn) {
      state.filter = btn.dataset.filter;
      $('#filters').innerHTML = filterBar(state.attempt, state.filter);
      $('#review-list').innerHTML = reviewList(state.attempt, state.filter);
    },
  };
  const quizActions = new Set(['next', 'previous', 'jump', 'flag', 'submit']);

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    const handler = btn && actions[btn.dataset.action];
    if (!handler) return;
    if (state.view === 'quiz') { tick(); if (state.view !== 'quiz' && quizActions.has(btn.dataset.action)) return; }
    handler(btn);
  });

  main.addEventListener('change', e => {
    if (state.view === 'dashboard') onDashboardChange(e.target);
    else if (state.view === 'quiz' && e.target.name === 'answer') {
      tick();
      if (state.view === 'quiz') answer(e.target.value);
    }
  });

  main.addEventListener('submit', e => {
    if (e.target.id !== 'config-form') return;
    e.preventDefault();
    startFromSettings();
  });

  document.addEventListener('keydown', e => {
    if (state.view !== 'quiz' || isDialogOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.('input:not([type=radio]), textarea, select')) return;
    const key = e.key.toLowerCase();
    const a = state.attempt;
    const optionIndex = 'abcd'.indexOf(key) >= 0 ? 'abcd'.indexOf(key) : '1234'.indexOf(key);
    if (optionIndex >= 0) {
      const input = $$('[name=answer]', main)[optionIndex];
      if (input && !input.disabled) { e.preventDefault(); tick(); if (state.view === 'quiz') answer(input.value); }
    } else if (key === 'arrowright' || key === 'arrowleft') {
      e.preventDefault();
      tick();
      if (state.view === 'quiz') goTo(a.index + (key === 'arrowright' ? 1 : -1));
    } else if (key === 'f') {
      e.preventDefault();
      toggleFlag();
    }
  });

  document.addEventListener('visibilitychange', () => { tick(); if (document.hidden) persist(); });
  window.addEventListener('pagehide', persist);
  window.addEventListener('beforeunload', e => {
    if (state.view === 'quiz' && !storage.persistent) { e.preventDefault(); e.returnValue = ''; }
  });

  return {
    start() {
      applyTheme(state.settings.theme);
      showDashboard();
    },
  };
}

export function renderLoadError(message) {
  $('#main').innerHTML = `
    <div class="card result-panel"><div>
      <h1>Chưa tải được câu hỏi</h1>
      <p>Hãy chạy ứng dụng qua máy chủ HTTP (<code>npm start</code>) và kiểm tra file <code>data/questions.json</code>.</p>
      <p class="error">${esc(message)}</p>
      <button type="button" class="btn btn-primary" id="reload">Thử lại</button>
    </div></div>`;
  $('#reload').addEventListener('click', () => location.reload());
}
