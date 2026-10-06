import { chapterBreakdown, grade, resultType } from '../core/quiz.js';
import { esc, formatScore, formatTime, letter, percent } from '../utils/format.js';

const STATUS_LABEL = { correct: 'Trả lời đúng', wrong: 'Trả lời sai', blank: 'Chưa trả lời' };

function breakdownMarkup(attempt) {
  const rows = chapterBreakdown(attempt.questions, attempt.answers);
  return `<section class="card breakdown" aria-label="Kết quả theo chương"><h2>Kết quả theo chương</h2>${rows.map(r => `
    <div class="breakdown-row">
      <span class="breakdown-title">${esc(r.title)}</span>
      <span class="breakdown-bar" role="img" aria-label="${r.correct} trên ${r.total} câu đúng"><i style="width:${percent(r.correct, r.total)}%"></i></span>
      <span class="breakdown-count">${r.correct}/${r.total}</span>
    </div>`).join('')}</section>`;
}

export function reviewList(attempt, filter) {
  const items = attempt.questions
    .map((q, i) => ({ q, i, type: resultType(q, attempt.answers) }))
    .filter(({ q, type }) => filter === 'all' || (filter === 'flagged' ? attempt.flags.has(q.id) : filter === type));
  if (!items.length) return '<p class="empty">Không có câu hỏi trong nhóm này.</p>';
  return items.map(({ q, i, type }) => `
  <article class="card review-card">
    <div class="q-meta">
      <span class="q-label">CÂU ${i + 1}${attempt.flags.has(q.id) ? ' · ⚑ ĐÁNH DẤU' : ''}</span>
      <span class="status ${type}">${STATUS_LABEL[type]}</span>
    </div>
    <h3>${esc(q.question)}</h3>
    <div class="review-options">${q.options.map((o, j) => {
      const right = o.id === q.correctAnswer;
      const selected = o.id === attempt.answers[q.id];
      const tag = right || selected
        ? `<span class="answer-tag ${right ? 'correct-text' : 'wrong-text'}">${right ? '✓ Đáp án đúng' : ''}${right && selected ? ' · ' : ''}${selected ? 'Bạn đã chọn' : ''}</span>`
        : '';
      return `<div class="review-option ${right ? 'right' : selected ? 'wrong' : ''}"><b>${letter(j)}.</b><div>${esc(o.text)}${tag}</div></div>`;
    }).join('')}</div>
    <div class="explanation"><strong>Giải thích</strong><br>${esc(q.explanation)}<span class="reference">Đối chiếu giáo trình: ${esc(q.source || q.chapterTitle)}</span></div>
  </article>`).join('');
}

export function filterBar(attempt, filter) {
  const g = grade(attempt.questions, attempt.answers);
  const filters = [['all', 'Tất cả', g.total], ['wrong', 'Trả lời sai', g.wrong], ['blank', 'Chưa trả lời', g.blank], ['flagged', 'Đánh dấu', attempt.flags.size]];
  return filters.map(([id, label, n]) =>
    `<button type="button" class="filter ${filter === id ? 'active' : ''}" aria-pressed="${filter === id}" data-action="filter" data-filter="${id}">${label} (${n})</button>`).join('');
}

export function renderResults(attempt, filter) {
  const g = grade(attempt.questions, attempt.answers);
  const missed = g.wrong + g.blank;
  const message = attempt.expired
    ? 'Đã hết thời gian. Bài làm của bạn được tự động nộp.'
    : 'Bài làm đã được chấm. Hãy xem lại giải thích để củng cố kiến thức.';
  return `
  <section class="intro">
    <div class="kicker">KẾT QUẢ LUYỆN TẬP</div>
    <h1>Mỗi lần ôn, hiểu thêm một chút.</h1>
    <p>${message}</p>
  </section>
  <section class="card result-panel" aria-label="Tổng kết">
    <div class="score-ring" style="--percent:${g.percentage}%"><div class="score-inner"><strong>${formatScore(g.score)}</strong><span>ĐIỂM / 10</span></div></div>
    <div class="result-content">
      <h2>${g.correct} / ${g.total} câu trả lời đúng</h2>
      <p>Hoàn thành trong ${formatTime(attempt.durationMs / 1000)} · Chính xác ${Math.round(g.percentage)}%</p>
      <div class="stats">
        <div class="stat correct-text"><strong>${g.correct}</strong><span>Đúng · ${percent(g.correct, g.total)}%</span></div>
        <div class="stat wrong-text"><strong>${g.wrong}</strong><span>Sai · ${percent(g.wrong, g.total)}%</span></div>
        <div class="stat"><strong>${g.blank}</strong><span>Chưa trả lời · ${percent(g.blank, g.total)}%</span></div>
      </div>
    </div>
    <div class="result-actions">
      <button type="button" class="btn btn-primary" data-action="retry">Làm lại bài mới</button>
      <button type="button" class="btn btn-light" data-action="retry-missed" ${missed ? '' : 'disabled'}>Ôn lại ${missed} câu chưa đúng</button>
      <button type="button" class="btn btn-light" data-action="dashboard">Chọn chương khác</button>
    </div>
  </section>
  ${breakdownMarkup(attempt)}
  <section aria-labelledby="review-title">
    <div class="section-heading"><h2 id="review-title">Xem lại bài làm</h2><span class="muted">${attempt.questions.length} câu hỏi</span></div>
    <div class="filters" id="filters" role="group" aria-label="Lọc câu hỏi">${filterBar(attempt, filter)}</div>
    <div id="review-list">${reviewList(attempt, filter)}</div>
  </section>`;
}
