import { LIMITS, MODES } from '../config.js';
import { countAvailable } from '../core/quiz.js';
import { validateForStart } from '../core/settings.js';
import { elapsedMs } from '../core/session.js';
import { esc, formatDate, formatScore, formatTime } from '../utils/format.js';
import { $, $$ } from '../utils/dom.js';

const modeOption = (settings, mode) => `
  <label class="segment">
    <input type="radio" name="mode" value="${mode.id}" ${settings.mode === mode.id ? 'checked' : ''}>
    <span><b>${mode.label}</b><small>${mode.hint}</small></span>
  </label>`;

const toggle = (name, label, checked) => `
  <label class="setting">${label}<input role="switch" type="checkbox" name="${name}" ${checked ? 'checked' : ''}></label>`;

function chapterCard(c, i, settings) {
  const selected = settings.chapters.includes(c.id);
  return `
  <article class="card chapter ${selected ? 'selected' : ''}">
    <label class="chapter-main">
      <span class="chapter-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <span class="chapter-content">
        <small class="kicker">CHƯƠNG ${i + 1}</small>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.description)}</p>
      </span>
      <input type="checkbox" name="chapter" value="${esc(c.id)}" ${selected ? 'checked' : ''} aria-label="Chọn chương ${i + 1}: ${esc(c.title)}">
    </label>
    <div class="chapter-bottom">
      <span class="pill">${c.questions.length} câu hỏi</span>
      <button type="button" class="link-button" data-action="single" data-id="${esc(c.id)}">Ôn riêng chương này</button>
    </div>
  </article>`;
}

function resumeBanner(session) {
  if (!session) return '';
  const answered = Object.keys(session.answers).length;
  const total = session.questions.length;
  const spent = formatTime(elapsedMs(session) / 1000);
  const expired = session.deadline && Date.now() >= session.deadline;
  return `
  <section class="banner" aria-labelledby="resume-title">
    <div>
      <h2 id="resume-title">Bạn có một bài đang làm dở</h2>
      <p>${answered}/${total} câu đã trả lời · ${expired ? 'đã hết giờ' : `đã làm ${spent}`}</p>
    </div>
    <div class="banner-actions">
      <button type="button" class="btn btn-primary" data-action="resume">${expired ? 'Xem kết quả' : 'Tiếp tục làm bài'}</button>
      <button type="button" class="btn btn-light" data-action="discard-session">Bỏ bài này</button>
    </div>
  </section>`;
}

function historyPanel(history, data) {
  if (!history.length) return '';
  const names = new Map(data.chapters.map((c, i) => [c.id, `C${i + 1}`]));
  const rows = history.slice(0, 5).map(h => `
    <li>
      <span class="history-score ${h.score >= 5 ? 'good' : 'low'}">${formatScore(h.score)}</span>
      <span class="history-meta">
        <b>${h.correct}/${h.total} câu đúng</b>
        <small>${formatDate(h.finishedAt)} · ${formatTime(h.durationSec)} · ${h.chapterIds.map(id => names.get(id) ?? '?').join(', ')}${h.kind === 'retry' ? ' · ôn câu sai' : ''}${h.expired ? ' · hết giờ' : ''}</small>
      </span>
    </li>`).join('');
  return `
  <section class="card history" aria-labelledby="history-title">
    <div class="section-heading"><h2 id="history-title">Lịch sử gần đây</h2>
      <button type="button" class="link-button" data-action="clear-history">Xóa lịch sử</button></div>
    <ul class="history-list">${rows}</ul>
  </section>`;
}

export function renderDashboard({ data, settings, session, history, persistent }) {
  const total = data.chapters.reduce((n, c) => n + c.questions.length, 0);
  const allSelected = settings.chapters.length === data.chapters.length;
  return `
  <section class="intro">
    <div class="kicker">LUYỆN TẬP THEO CHƯƠNG</div>
    <h1>Hôm nay, bạn muốn ôn gì?</h1>
    <p>Chọn nội dung, tạo bài luyện tập và kiểm tra điều bạn đã hiểu.</p>
  </section>
  ${resumeBanner(session)}
  <div class="workspace">
    <section aria-labelledby="chapters-title">
      <div class="section-heading">
        <h2 id="chapters-title">Nội dung ôn tập <span class="muted">/ ${data.chapters.length} chương</span></h2>
        <button type="button" class="link-button" data-action="select-all" id="select-all">${allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button>
      </div>
      ${data.chapters.map((c, i) => chapterCard(c, i, settings)).join('')}
      <p class="source-note"><span aria-hidden="true">ⓘ</span><span><strong>Theo ${esc(data.sourceDocument ?? 'giáo trình')}.</strong><br>${total} câu hỏi tự biên soạn từ tài liệu bạn cung cấp, kèm giải thích và mục tham chiếu. Không phải đề thi chính thức.</span></p>
      ${historyPanel(history, data)}
    </section>
    <form class="card config" id="config-form" novalidate>
      <h2>Thiết lập bài luyện tập</h2>
      <p class="config-summary" id="config-summary"></p>
      <fieldset class="segments"><legend class="field-label">Chế độ</legend>
        ${modeOption(settings, MODES.exam)}${modeOption(settings, MODES.practice)}
      </fieldset>
      <label class="field-label" for="count">Số câu hỏi</label>
      <input class="form-control" id="count" name="count" type="number" inputmode="numeric" min="1" step="1" value="${settings.count}">
      <label class="inline-check"><input id="all" name="all" type="checkbox" ${settings.all ? 'checked' : ''}>Làm toàn bộ câu hỏi đã chọn</label>
      <div class="setting-block">
        ${toggle('shuffleQuestions', 'Đảo thứ tự câu hỏi', settings.shuffleQuestions)}
        ${toggle('shuffleOptions', 'Đảo thứ tự đáp án', settings.shuffleOptions)}
      </div>
      <div class="setting-block">
        ${toggle('timer', 'Đồng hồ đếm ngược', settings.timer)}
        <div id="minutes-field">
          <label class="field-label" for="minutes">Thời gian (phút)</label>
          <input class="form-control" id="minutes" name="minutes" type="number" inputmode="numeric" min="${LIMITS.minutes.min}" max="${LIMITS.minutes.max}" step="1" value="${settings.minutes}">
        </div>
      </div>
      <p class="error" id="config-error" role="alert"></p>
      <button class="btn btn-primary start" id="start" type="submit">Bắt đầu luyện tập</button>
      <p class="config-hint">${persistent ? 'Cài đặt và bài đang làm được lưu trên thiết bị này.' : 'Trình duyệt đang chặn lưu trữ: bài làm sẽ mất khi tải lại trang.'}</p>
    </form>
  </div>`;
}

/** Applies the current settings to the already-rendered dashboard without re-rendering it. */
export function syncDashboard(root, { data, settings }) {
  const available = countAvailable(data, settings.chapters);
  $$('.chapter', root).forEach(card => {
    card.classList.toggle('selected', settings.chapters.includes($('[name=chapter]', card).value));
  });
  $$('[name=chapter]', root).forEach(el => { el.checked = settings.chapters.includes(el.value); });
  $('#select-all', root).textContent = settings.chapters.length === data.chapters.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả';
  $('#config-summary', root).textContent = `${settings.chapters.length} chương đã chọn · ${available} câu hỏi có sẵn`;
  const count = $('#count', root);
  count.max = available;
  count.disabled = settings.all;
  $('#all', root).checked = settings.all;
  $('#minutes-field', root).hidden = !settings.timer;
  $('#minutes', root).disabled = !settings.timer;
  $('#start', root).disabled = available === 0;
  $('#config-error', root).textContent = available === 0 ? validateForStart(settings, available) : '';
}
