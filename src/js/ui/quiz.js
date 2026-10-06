import { isLocked } from '../core/session.js';
import { esc, letter, percent } from '../utils/format.js';
import { $ } from '../utils/dom.js';

function optionMarkup(attempt, q, o, i) {
  const picked = attempt.answers[q.id];
  const locked = isLocked(attempt, q);
  let state = '';
  let tag = '';
  if (locked) {
    if (o.id === q.correctAnswer) { state = 'right'; tag = '<span class="answer-tag correct-text">✓ Đáp án đúng</span>'; }
    else if (o.id === picked) { state = 'wrong'; tag = '<span class="answer-tag wrong-text">✗ Bạn đã chọn</span>'; }
  }
  return `
  <label class="option ${state}">
    <input type="radio" name="answer" value="${esc(o.id)}" data-key="${letter(i)}" ${picked === o.id ? 'checked' : ''} ${locked ? 'disabled' : ''}>
    <span class="letter" aria-hidden="true">${letter(i)}</span>
    <span class="option-text">${esc(o.text)}${tag}</span>
  </label>`;
}

function feedbackMarkup(attempt, q) {
  if (!isLocked(attempt, q)) return '';
  const ok = attempt.answers[q.id] === q.correctAnswer;
  return `
  <div class="feedback ${ok ? 'ok' : 'bad'}" id="feedback" tabindex="-1" role="status">
    <strong>${ok ? 'Chính xác!' : 'Chưa đúng.'}</strong> ${esc(q.explanation)}
    <span class="reference">Đối chiếu giáo trình: ${esc(q.source || q.chapterTitle)}</span>
  </div>`;
}

export function renderQuestionCard(attempt, data) {
  const q = attempt.questions[attempt.index];
  const last = attempt.index === attempt.questions.length - 1;
  const flagged = attempt.flags.has(q.id);
  const chapterNo = data.chapters.findIndex(c => c.id === q.chapterId) + 1;
  return `
  <div class="q-meta">
    <span class="q-label">CÂU ${attempt.index + 1} / ${attempt.questions.length} · CHƯƠNG ${chapterNo}</span>
    <button type="button" class="flag-btn" data-action="flag" aria-pressed="${flagged}">${flagged ? '⚑ Đã đánh dấu' : '⚐ Đánh dấu'}</button>
  </div>
  <h2 class="question-title" id="question-title" tabindex="-1">${esc(q.question)}</h2>
  <div class="options" role="radiogroup" aria-labelledby="question-title">${q.options.map((o, i) => optionMarkup(attempt, q, o, i)).join('')}</div>
  ${feedbackMarkup(attempt, q)}
  <div class="question-controls">
    <button type="button" class="btn btn-light" data-action="previous" ${attempt.index === 0 ? 'disabled' : ''}>← Câu trước</button>
    ${last
      ? '<button type="button" class="btn btn-primary" data-action="submit">Nộp bài</button>'
      : '<button type="button" class="btn btn-primary" data-action="next">Câu tiếp theo →</button>'}
  </div>`;
}

export function renderQuiz(attempt, data) {
  const timed = Boolean(attempt.deadline);
  const modeLabel = attempt.mode === 'practice' ? 'LUYỆN TẬP · XEM ĐÁP ÁN NGAY' : 'KIỂM TRA';
  return `
  <div class="quiz-top">
    <div>
      <div class="kicker">${modeLabel}</div>
      <h1>${esc(data.title ?? 'Bài luyện tập')}</h1>
      <button type="button" class="link-button" data-action="exit">← Về chọn chương</button>
    </div>
    <div class="timer" id="timer" role="timer" aria-label="${timed ? 'Thời gian còn lại' : 'Thời gian đã làm'}">
      <small>${timed ? 'THỜI GIAN CÒN LẠI' : 'THỜI GIAN ĐÃ LÀM'}</small><span id="time-value">00:00</span>
    </div>
  </div>
  <div class="quiz-layout">
    <section aria-label="Câu hỏi">
      <div class="card question-card" id="question-card">${renderQuestionCard(attempt, data)}</div>
      <p class="quiz-note">Phím tắt: <kbd>A</kbd>–<kbd>D</kbd> hoặc <kbd>1</kbd>–<kbd>4</kbd> chọn đáp án · <kbd>←</kbd> <kbd>→</kbd> chuyển câu · <kbd>F</kbd> đánh dấu.</p>
    </section>
    <aside class="card navigator" aria-label="Điều hướng câu hỏi">
      <h2>Tiến độ làm bài</h2>
      <div class="progress-caption"><span id="answered-count"></span><span id="answered-percent"></span></div>
      <div class="progress" role="progressbar" aria-label="Số câu đã trả lời" aria-valuemin="0" aria-valuemax="${attempt.questions.length}" aria-valuenow="0"><div class="progress-bar"></div></div>
      <div class="question-grid" id="question-grid"></div>
      <div class="legend"><span>Đã trả lời</span><span>Đánh dấu</span></div>
      <button type="button" class="btn btn-dark" data-action="submit">Nộp bài luyện tập</button>
    </aside>
  </div>`;
}

export function updateNavigation(attempt) {
  const total = attempt.questions.length;
  const answered = Object.keys(attempt.answers).length;
  const pct = percent(answered, total);
  $('#answered-count').textContent = `${answered}/${total} đã trả lời`;
  $('#answered-percent').textContent = `${pct}%`;
  $('.progress').setAttribute('aria-valuenow', answered);
  $('.progress-bar').style.width = `${pct}%`;
  $('#question-grid').innerHTML = attempt.questions.map((q, i) => {
    const done = Boolean(attempt.answers[q.id]);
    const flagged = attempt.flags.has(q.id);
    const current = i === attempt.index;
    const cls = ['number-btn', done && 'answered', flagged && 'flagged', current && 'current'].filter(Boolean).join(' ');
    const label = `Câu ${i + 1}${done ? ', đã trả lời' : ', chưa trả lời'}${flagged ? ', đã đánh dấu' : ''}`;
    return `<button type="button" class="${cls}" data-action="jump" data-index="${i}" aria-label="${label}" ${current ? 'aria-current="step"' : ''}>${i + 1}</button>`;
  }).join('');
}
