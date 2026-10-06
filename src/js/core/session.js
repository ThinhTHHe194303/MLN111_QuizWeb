// Attempt lifecycle: creation, (de)serialisation for resume, timing and history records.
import { OPTION_IDS } from '../config.js';
import { flattenQuestions, grade } from './quiz.js';

export const SESSION_VERSION = 1;

export function createAttempt(questions, { mode, timerMinutes = null, kind = 'custom', now = Date.now() }) {
  return {
    questions,
    answers: {},
    flags: new Set(),
    index: 0,
    mode,
    kind,
    started: now,
    segmentStart: now,
    activeMs: 0,
    paused: false,
    deadline: timerMinutes ? now + timerMinutes * 60000 : null,
    finished: null,
    expired: false,
  };
}

/** Milliseconds spent on the attempt. Untimed attempts ignore time spent away from the page. */
export function elapsedMs(attempt, now = Date.now()) {
  if (attempt.finished !== null && attempt.durationMs !== undefined) return attempt.durationMs;
  if (attempt.deadline) return Math.max(0, Math.min(now, attempt.deadline) - attempt.started);
  if (attempt.paused) return attempt.activeMs;
  return attempt.activeMs + Math.max(0, now - attempt.segmentStart);
}

/** Restored attempts stay paused (clock stopped) until the learner resumes them. */
export function resumeAttempt(attempt, now = Date.now()) {
  attempt.paused = false;
  attempt.segmentStart = now;
  return attempt;
}

export function isLocked(attempt, question) {
  return attempt.mode === 'practice' && Boolean(attempt.answers[question.id]);
}

export function serializeAttempt(attempt, now = Date.now()) {
  return {
    v: SESSION_VERSION,
    mode: attempt.mode,
    kind: attempt.kind,
    started: attempt.started,
    deadline: attempt.deadline,
    activeMs: attempt.deadline ? 0 : elapsedMs(attempt, now),
    index: attempt.index,
    answers: attempt.answers,
    flags: [...attempt.flags],
    questions: attempt.questions.map(q => ({ id: q.id, options: q.options.map(o => o.id) })),
  };
}

/** Rebuilds an attempt from a snapshot. Returns null when the snapshot is stale or corrupt. */
export function restoreAttempt(data, snap, now = Date.now()) {
  try {
    if (!snap || snap.v !== SESSION_VERSION || !Array.isArray(snap.questions) || !snap.questions.length) return null;
    const bank = new Map(flattenQuestions(data).map(q => [q.id, q]));
    const questions = snap.questions.map(({ id, options }) => {
      const base = bank.get(id);
      if (!base || !Array.isArray(options) || options.length !== OPTION_IDS.length) throw new Error('stale');
      const byId = new Map(base.options.map(o => [o.id, o]));
      if (new Set(options).size !== OPTION_IDS.length || options.some(o => !byId.has(o))) throw new Error('stale');
      return { ...base, options: options.map(o => ({ ...byId.get(o) })) };
    });
    const known = new Map(questions.map(q => [q.id, q]));
    const answers = {};
    for (const [qid, pick] of Object.entries(snap.answers ?? {})) {
      if (known.get(qid)?.options.some(o => o.id === pick)) answers[qid] = pick;
    }
    const flags = new Set((snap.flags ?? []).filter(id => known.has(id)));
    const deadline = Number.isFinite(snap.deadline) ? snap.deadline : null;
    const started = Number.isFinite(snap.started) ? snap.started : now;
    return {
      questions,
      answers,
      flags,
      index: Math.min(Math.max(0, Number(snap.index) || 0), questions.length - 1),
      mode: snap.mode === 'practice' ? 'practice' : 'exam',
      kind: snap.kind === 'retry' ? 'retry' : 'custom',
      started,
      segmentStart: now,
      paused: true,
      activeMs: Number.isFinite(snap.activeMs) ? snap.activeMs : 0,
      deadline,
      finished: null,
      expired: false,
    };
  } catch {
    return null;
  }
}

export function finishAttempt(attempt, { expired = false, now = Date.now() } = {}) {
  attempt.durationMs = expired && attempt.deadline ? attempt.deadline - attempt.started : elapsedMs(attempt, now);
  attempt.finished = now;
  attempt.expired = expired;
  return attempt;
}

export function historyEntry(attempt) {
  const g = grade(attempt.questions, attempt.answers);
  return {
    id: `${attempt.started}`,
    finishedAt: attempt.finished,
    score: Math.round(g.score * 10) / 10,
    correct: g.correct,
    total: g.total,
    durationSec: Math.round(attempt.durationMs / 1000),
    expired: attempt.expired,
    mode: attempt.mode,
    kind: attempt.kind,
    chapterIds: [...new Set(attempt.questions.map(q => q.chapterId))],
  };
}
